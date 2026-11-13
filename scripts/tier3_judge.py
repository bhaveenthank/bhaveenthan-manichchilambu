"""
Tier 3: a second reader checks each candidate against its lines. It doesn't add anything new.

The judge sees the record and the verse around it, not the proposer's reasoning. It should be a
different model family from Tier 2, or it's just marking its own homework. Right now only one
family is set up, so anything produced with the default model below is a stand-in and has to be
labelled as such in the results. Point --model at another family's wrapper when you have one.

  .venv/bin/python scripts/tier3_judge.py --source full     the 7,177 drafts of the full run, eight per call (about 1,120 calls)
  .venv/bin/python scripts/tier3_judge.py                   the older 4,041-draft run

Every answer is cached, so after a stop (usage limit, lost connection) the same command picks up where it was.
For the full run each draft is put in a pile, which the review sheets (scripts/draft_sheets.py) sort by:
  fast     the judge says SUPPORTED, with the mood and the people right. The quote is always in the lines,
           because tier 2 rejected any draft whose quote wasn't. A quick read and accept.
  careful  anything else, with the judge's reason shown. Read these properly.
"""
import argparse
import json
import re
import sys
from pathlib import Path

from manichchilambu.text import lines

ROOT = Path(__file__).resolve().parent.parent

LINES = lines()
INDEX = {l["id"]: i for i, l in enumerate(LINES)}
VERDICTS = {"SUPPORTED", "CONTRADICTED", "INSUFFICIENT", "EXTERNAL_ONLY", "AMBIGUOUS"}

PROMPT = """You are checking one claim about a Tamil verse. Judge only from the lines shown, never from what you know of the story.

Record: {record}

Lines:
{lines}

Answer as JSON: {{"verdict": "SUPPORTED|CONTRADICTED|INSUFFICIENT|EXTERNAL_ONLY|AMBIGUOUS", "mood_ok": true/false, "roles_ok": true/false, "reason": "one line"}}
SUPPORTED means these lines say it, in this mood, with these people. If the record says something happened but the lines only report that someone alleged it, mood_ok is false."""


BATCH_PROMPT = """You are checking claims about a Tamil verse. Judge each one only from the lines shown, never from what you know of the story.

Lines:
{lines}

Records:
{records}

For every record, give one verdict: SUPPORTED means these lines say it, in this mood, with these people. If a record says
something happened but the lines only report that someone alleged it, mood_ok is false. If a person in the roles is
not the one the lines mean, roles_ok is false.
Reply with JSON only: {{"verdicts": [{{"n": record number, "verdict": "SUPPORTED|CONTRADICTED|INSUFFICIENT|EXTERNAL_ONLY|AMBIGUOUS", "mood_ok": true/false, "roles_ok": true/false, "reason": "one line"}}]}}"""
PER_CALL = 8


def span(recs, around=3):
    idx = [INDEX[l] for r in recs for l in r["lines"] if l in INDEX]
    lo, hi = max(0, min(idx) - around), min(len(LINES), max(idx) + around + 1)
    return "\n".join(f"{l['id']}: {l['text']}" for l in LINES[lo:hi])


def batches(rows):
    """Drafts from the same window, in calls of PER_CALL, so the judge reads each stretch of verse once."""
    by_window = {}
    for i, r in enumerate(rows):
        by_window.setdefault(r.get("window") or r["lines"][0], []).append(i)
    for idx in by_window.values():
        for k in range(0, len(idx), PER_CALL):
            yield idx[k:k + PER_CALL]


def parse_many(answer, n):
    m = re.search(r"\{.*\}", answer, re.S)
    try:
        got = json.loads(m.group(0)).get("verdicts", []) if m else []
    except json.JSONDecodeError:
        got = []
    out = [None] * n
    for v in got if isinstance(got, list) else []:
        if isinstance(v, dict) and v.get("verdict") in VERDICTS and isinstance(v.get("n"), int) and 1 <= v["n"] <= n:
            out[v["n"] - 1] = v
    return out


def context(rec, around=3):
    idx = [INDEX[l] for l in rec["lines"] if l in INDEX]
    lo, hi = max(0, min(idx) - around), min(len(LINES), max(idx) + around + 1)
    return "\n".join(f"{l['id']}: {l['text']}" for l in LINES[lo:hi])


def parse(answer):
    m = re.search(r"\{.*\}", answer, re.S)
    if not m:
        return None
    try:
        v = json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
    return v if v.get("verdict") in VERDICTS else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="claude-haiku-5-5")
    ap.add_argument("--source", choices=["stage", "full"], default="stage", help="full: data/candidates/tier2_full.jsonl")
    args = ap.parse_args()
    from manichchilambu.llm import ask
    src = ROOT / ("data/candidates/tier2_full.jsonl" if args.source == "full" else "data/candidates/tier2.jsonl")
    dst = ROOT / ("data/candidates/tier3_full.jsonl" if args.source == "full" else "data/candidates/tier3.jsonl")
    rows = [json.loads(raw) for raw in src.open(encoding="utf-8")]
    if args.source == "stage":
        judged = ((rec, parse(ask(PROMPT.format(record=json.dumps({k2: rec[k2] for k2 in ("kind", "roles", "voice", "mood", "lines")}, ensure_ascii=False), lines=context(rec)), model=args.model)))
                  for rec in rows)
    else:
        def judged_full():
            groups = list(batches(rows))
            for g, idx in enumerate(groups):
                recs = [rows[i] for i in idx]
                shown = "\n".join(f"{n + 1}. " + json.dumps({k2: r[k2] for k2 in ("kind", "roles", "voice", "mood", "lines")}, ensure_ascii=False) for n, r in enumerate(recs))
                verdicts = parse_many(ask(BATCH_PROMPT.format(lines=span(recs), records=shown), model=args.model), len(recs))
                if (g + 1) % 50 == 0:
                    print(f"call {g + 1}/{len(groups)}", flush=True)
                yield from zip(recs, verdicts)
        judged = judged_full()
    piles = {"fast": 0, "careful": 0}
    partial = dst.with_suffix(".jsonl.partial")
    k = 0
    with open(partial, "w", encoding="utf-8") as f:
        try:
            for k, (rec, verdict) in enumerate(judged):
                fast = bool(verdict and verdict["verdict"] == "SUPPORTED" and verdict.get("mood_ok") and verdict.get("roles_ok"))
                piles["fast" if fast else "careful"] += 1
                f.write(json.dumps({**rec, "judge": verdict, "judge_model": args.model, "pile": "fast" if fast else "careful"}, ensure_ascii=False) + "\n")
        except RuntimeError as stop:
            sys.exit(f"stopped at {k} of {len(rows)}: {stop}\nAnswers so far are cached. Run the same command again.")
    partial.replace(dst)
    print("done", {"drafts": len(rows), **piles}, f"-> {dst.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
