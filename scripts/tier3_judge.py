"""
Tier 3: a second reader checks each candidate against its lines. It doesn't add anything new.

The judge sees the record and the verse around it, not the proposer's reasoning. It should be a
different model family from Tier 2, or it's just marking its own homework. Right now only one
family is set up, so anything produced with the default model below is a stand-in and has to be
labelled as such in the results. Point --model at another family's wrapper when you have one.
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
    args = ap.parse_args()
    from manichchilambu.llm import ask
    src = ROOT / "data/candidates/tier2.jsonl"
    with open(ROOT / "data/candidates/tier3.jsonl", "w", encoding="utf-8") as f:
        for raw in src.open(encoding="utf-8"):
            rec = json.loads(raw)
            shown = {k: rec[k] for k in ("kind", "roles", "voice", "mood", "lines")}
            verdict = parse(ask(PROMPT.format(record=json.dumps(shown, ensure_ascii=False), lines=context(rec)), model=args.model))
            f.write(json.dumps({**rec, "judge": verdict, "judge_model": args.model}, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
