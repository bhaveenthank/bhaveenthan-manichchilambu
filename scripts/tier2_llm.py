"""
Tier 2: the LLM reads a window of verse and proposes ledger records.

Conditions, all run through the same schema:
  zero     : schema and definitions only
  few      : plus k worked examples taken from the hand ledger, never from the canto being read
  masked   : names swapped for tokens. If accuracy holds up only on real names, the model is
             remembering the story and not reading the Tamil.
  notext   : the canto's title and line ids only, no verse at all. Whatever comes back is memory.
Three samples per window. Everything is cached by llm.py, so this costs money only once.

Nothing here decides what's true. Each answer gets parsed, then checked: every cited line has to
exist in the window and the quoted phrase has to be in it. What survives goes to candidates.jsonl.
"""
import argparse
import json
import random
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

from manichchilambu.text import entities, lines, squash
from manichchilambu.ledger import load

LINES = lines()
ENTS = entities()
TEXT = {l["id"]: l["text"] for l in LINES}
SIZE, STEP = 25, 20  # 25 lines with a 5 line overlap
# These cantos are what the pilot gets scored on, so their records can never be shown as examples.
TEST_CANTOS = ("SIL-16", "SIL-20", "MAN-20")

SCHEMA = """Read the Tamil verse below and list what it tells us as JSON records. Reply with a JSON array and nothing else.

Each record:
{"kind": short English verb, "roles": {"agent": id, "patient": id, "theme": id, "recipient": id, "target": id, "addressee": id, "place": id, "instrument": id},
 "voice": ["poet", ...who is speaking, outermost first],
 "mood": one of asserted | negated | claimed | thought | command | conditional | intended | predicted | wish | metaphor | address | dreamed | question,
 "lines": [line ids], "quote": "exact Tamil phrase copied from those lines", "unresolved": "note if the text leaves something open"}

Rules that matter:
- mood=asserted only when the text tells it as having happened. An accusation has two records: the accusing (asserted) and the content of what was alleged (claimed, voice includes the accuser).
- An order is not the deed. A plan is not the deed. A wish or curse is not the deed.
- "I am the thief" said in grief is a metaphor. What happens in a dream has mood dreamed.
- Never fill a role the text doesn't give. Leave it out. Never choose between two people if the text doesn't choose.
- Use the given ids where they fit. For anyone else write a short lowercase id.
- Only cite lines shown in this window."""


def windows(prefix=None):
    cur, chunk = None, []
    for l in LINES:
        key = (l["epic"], l["canto"])
        if key != cur:
            if chunk:
                yield from _cut(chunk)
            chunk, cur = [], key
        chunk.append(l)
    if chunk:
        yield from _cut(chunk)


def _cut(chunk):
    for i in range(0, max(1, len(chunk) - SIZE + STEP), STEP):
        part = chunk[i:i + SIZE]
        if part:
            yield part


def known_entities(part):
    key = f"{part[0]['epic']}-{part[0]['canto']:02d}"
    rows = []
    for e in ENTS:
        if part[0]["epic"] in e["epics"]:
            rows.append(f"{e['id']} ({', '.join((e['names'] + e['epithets'].get(key, []))[:4])})")
    return "; ".join(rows)


def examples(part, k, seed=0):
    """Few-shot examples from the hand ledger. Never from the canto being read, never from a test canto."""
    prefix = f"{part[0]['epic']}-{part[0]['canto']:02d}"
    banned = (prefix, *TEST_CANTOS)
    pool = [r for r in load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml") if not any(l.startswith(banned) for l in r["lines"])]
    random.Random(seed).shuffle(pool)
    out = []
    for r in pool[:k]:
        lines = " / ".join(f"{l}: {TEXT[l]}" for l in r["lines"])
        rec = {"kind": r["kind"], "roles": r["roles"], "voice": r["voice"], "mood": r["mood"], "lines": r["lines"], "quote": r["check"]}
        out.append(f"Verse: {lines}\nRecord: {json.dumps(rec, ensure_ascii=False)}")
    return "\n\n".join(out)


def mask_names(text):
    """Swap every known name for a token. Same token for the same person, so the grammar still works."""
    mapping = {}
    for i, e in enumerate(ENTS):
        for n in e["names"]:
            if n in text:
                text = text.replace(n, f"NAME{i}")
                mapping[n] = f"NAME{i}"
    return text, mapping


def prompt_for(part, mode, k=3):
    if mode == "notext":
        ids = f"{part[0]['id']} to {part[-1]['id']}"
        return (SCHEMA + f"\n\nThe verse isn't available. From what you remember of canto '{part[0]['canto_title']}', "
                f"list what you'd expect lines {ids} to tell us. Use these line ids. Put \"\" for quote.")
    body = "\n".join(f"{l['id']}: {l['text']}" for l in part)
    parts = [SCHEMA]
    if mode == "masked":
        body, _ = mask_names(body)
        parts.append("People and places are hidden as NAME tokens. Use the token as their id.")
    else:
        parts.append("Known ids: " + known_entities(part))
    if mode == "few":
        parts.append("Worked examples:\n\n" + examples(part, k))
    parts.append("Verse:\n" + body)
    return "\n\n".join(parts)


def parse_answer(answer, part, need_quote=True):
    """Pull the JSON out and keep only records whose citation checks out against the text."""
    match = re.search(r"\[.*\]", answer, re.S)
    if not match:
        return [], ["no json array"]
    try:
        records = json.loads(match.group(0))
    except json.JSONDecodeError as err:
        return [], [f"bad json: {err}"]
    allowed = {l["id"] for l in part}
    kept, rejected = [], []
    for rec in records:
        lines = rec.get("lines") or []
        if not lines or not set(lines) <= allowed:
            rejected.append("cited a line outside the window")
            continue
        joined = squash("".join(TEXT[l] for l in lines))
        if need_quote and (squash(rec.get("quote", "")) not in joined or not rec.get("quote")):
            rejected.append("quote not found in cited lines")
            continue
        kept.append(rec)
    return kept, rejected


def run_window(args):
    part, mode, sample, model = args
    from manichchilambu.llm import ask
    answer = ask(prompt_for(part, mode), model=model, sample=sample)
    kept, rejected = parse_answer(answer, part, need_quote=mode != "notext")
    for rec in kept:
        rec.update(window=part[0]["id"], mode=mode, sample=sample, model=model, tier=2)
    return kept, rejected


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cantos", default="SIL-16,SIL-20,MAN-20", help="comma list of cantos, or ALL")
    ap.add_argument("--modes", default="zero,few,masked,notext")
    ap.add_argument("--samples", type=int, default=3)
    ap.add_argument("--model", default="claude-sonnet-5-5")
    # One at a time by default. Parallel calls may fight over refreshing the login, and that isn't ruled out yet.
    ap.add_argument("--workers", type=int, default=1)
    ap.add_argument("--out", default="tier2", help="output name in data/candidates. Use tier2_full for the whole-epic run, so it can't overwrite the pilot")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    wanted = None if args.cantos == "ALL" else set(args.cantos.split(","))
    parts = [p for p in windows() if not wanted or f"{p[0]['epic']}-{p[0]['canto']:02d}" in wanted]
    jobs = [(p, m, s, args.model) for p in parts for m in args.modes.split(",") for s in range(args.samples)]
    print(f"{len(parts)} windows, {len(jobs)} model calls")
    if args.dry_run:
        print(prompt_for(parts[0], "few")[:1500])
        return
    out = ROOT / "data" / "candidates"
    out.mkdir(exist_ok=True)
    # Rewritten from the cache on every run, so a rerun can't double-count and a crash loses nothing.
    # It only gets the real name once every call is in, so half a run can't be scored by mistake.
    final, partial = out / f"{args.out}.jsonl", out / f"{args.out}.jsonl.partial"
    final.unlink(missing_ok=True)
    tally = {}
    with ThreadPoolExecutor(args.workers) as pool, open(partial, "w", encoding="utf-8") as f:
        try:
            for job, (kept, bad) in zip(jobs, pool.map(run_window, jobs)):
                t = tally.setdefault(job[1], {"calls": 0, "kept": 0, "rejected": 0})
                t["calls"] += 1
                t["kept"] += len(kept)
                t["rejected"] += len(bad)
                for rec in kept:
                    f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        except RuntimeError as stop:
            pool.shutdown(cancel_futures=True)
            done = sum(t["calls"] for t in tally.values())
            sys.exit(f"stopped at {done} of {len(jobs)} calls: {stop}\n"
                     "Saved answers are kept. Run the same command again and it picks up from here.")
    partial.replace(final)
    (out / f"{args.out}_tally.json").write_text(json.dumps(tally, indent=1))
    print("done", tally)


if __name__ == "__main__":
    main()
