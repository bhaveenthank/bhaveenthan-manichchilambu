"""
The every-line pass. Where tier2_llm.py asks "what does this window tell us?", this asks about each line in turn,
so a line can't be skipped without it showing.

For every target line the model must return one line note:
  what       : event, speech, description, list, comparison, address, doctrine, frame or other
  categories : which of the 24 catalogue categories the line touches
  sense      : literal, figurative or mixed. A woman's coral lips aren't a coral ornament.
  gist       : a few English words
and, unless --notes-only, records in the usual schema for anything a line tells that isn't a record yet.

Scopes:
  unread : only the lines no record or draft cites yet (reports/line_audit.json). The default.
  all    : every line in both epics, notes only. This is the full line-by-line reading.

Run it from your own terminal: `claude -p` only works there. Answers are cached like the other runs,
and anything a run misses is listed at the end and in reports/tier2_lines_missed.json.
"""
import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "scripts"))

import yaml  # noqa: E402

from tier2_llm import LINES, SCHEMA, known_entities, parse_answer  # noqa: E402

CATEGORIES = [t["id"] for t in yaml.safe_load((ROOT / "data/seeds/catalogue.yaml").read_text(encoding="utf-8"))["taxonomy"]]
WHAT = ["event", "speech", "description", "list", "comparison", "address", "doctrine", "frame", "other"]
CONTEXT, SIZE = 2, 22  # targets per call, plus two lines either side so a sentence isn't cut off

NOTE_RULES = f"""For EVERY line marked with >, give exactly one line note:
{{"type": "line_note", "line": line id, "what": one of {" | ".join(WHAT)}, "categories": [from: {", ".join(CATEGORIES)}], "sense": "literal" | "figurative" | "mixed", "gist": "a few English words"}}

- A comparison or figure of speech is "figurative". Don't let it add a real object: coral lips aren't a coral ornament.
- A line that only continues the sentence before it still gets its own note.
- Lines without > are context. Don't write notes for them.
- Use only the categories listed. Leave categories empty rather than guess."""

# Two worked notes, written by hand from lines a script has checked. Never shown for their own canto.
EXAMPLES = [
    ("SIL-06-0084", {"type": "line_note", "line": "SIL-06-0084", "what": "list", "categories": ["JEWEL"], "sense": "literal", "gist": "four foot ornaments Madhavi puts on"}),
    ("SIL-16-0026", {"type": "line_note", "line": "SIL-16-0026", "what": "list", "categories": ["FOOD", "PLANT_ANIMAL"], "sense": "literal", "gist": "mango and plantain given for the meal"}),
    ("MAN-17-0030", {"type": "line_note", "line": "MAN-17-0030", "what": "event", "categories": ["FOOD", "PERSON"], "sense": "literal", "gist": "the sage holds up one naval fruit"}),
]
TEXT = {l["id"]: l["text"] for l in LINES}
BY_CANTO = defaultdict(list)
for l in LINES:
    BY_CANTO[l["id"][:6]].append(l)


def windows(targets):
    """Cut each canto's target lines into calls of SIZE, each with a little context around it."""
    out = []
    for key, rows in BY_CANTO.items():
        idx = [i for i, l in enumerate(rows) if l["id"] in targets]
        for start in range(0, len(idx), SIZE):
            chunk = idx[start:start + SIZE]
            lo, hi = max(0, chunk[0] - CONTEXT), min(len(rows), chunk[-1] + CONTEXT + 1)
            # A long stretch between two targets would make a huge call, so split there.
            if hi - lo > SIZE * 2:
                half = len(chunk) // 2
                for part in (chunk[:half], chunk[half:]):
                    a, b = max(0, part[0] - CONTEXT), min(len(rows), part[-1] + CONTEXT + 1)
                    out.append((rows[a:b], {rows[i]["id"] for i in part}))
                continue
            out.append((rows[lo:hi], {rows[i]["id"] for i in chunk}))
    return out


def prompt_for(part, wanted, notes_only):
    canto = part[0]["id"][:6]
    shown = [json.dumps(n, ensure_ascii=False) for lid, n in EXAMPLES if not lid.startswith(canto)][:2]
    ex = "\n".join(f"{lid}: {TEXT[lid]}\n{n}" for (lid, _), n in zip([e for e in EXAMPLES if not e[0].startswith(canto)], shown))
    body = "\n".join(f"{'>' if l['id'] in wanted else ' '} {l['id']}: {l['text']}" for l in part)
    ask = "Reply with a JSON array of line notes and nothing else." if notes_only else \
        "Reply with one JSON array holding the line notes and, for anything a marked line tells that's worth a record, records in the schema above."
    head = NOTE_RULES if notes_only else SCHEMA + "\n\n" + NOTE_RULES
    return "\n\n".join([head, "Known ids: " + known_entities(part), "Worked line notes:\n" + ex, "Verse:\n" + body, ask])


def check(answer, part, wanted, notes_only):
    """Split notes from records, keep what checks out, and say which marked lines got no note."""
    import re
    match = re.search(r"\[.*\]", answer, re.S)
    try:
        items = json.loads(match.group(0)) if match else []
    except json.JSONDecodeError:
        items = []
    notes, recs, bad = [], [], []
    for it in items if isinstance(items, list) else []:
        if not isinstance(it, dict):
            continue
        if it.get("type") == "line_note":
            if it.get("line") in wanted and it.get("what") in WHAT and it.get("sense") in ("literal", "figurative", "mixed"):
                it["categories"] = [c for c in it.get("categories") or [] if c in CATEGORIES]
                notes.append(it)
            else:
                bad.append("note for a line not asked about, or with an unknown label")
        elif not notes_only:
            recs.append(it)
    kept, rejected = parse_answer(json.dumps(recs, ensure_ascii=False), part) if recs else ([], [])
    got = {n["line"] for n in notes}
    return notes, kept, bad + rejected, sorted(wanted - got)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scope", choices=["unread", "all"], default="unread")
    ap.add_argument("--notes-only", action="store_true", help="only line notes, no new records. Always on for --scope all")
    ap.add_argument("--model", default="claude-sonnet-5-5")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    notes_only = args.notes_only or args.scope == "all"
    if args.scope == "unread":
        audit = json.loads((ROOT / "reports/line_audit.json").read_text(encoding="utf-8"))
        targets = {l for ls in audit["unread"].values() for l in ls}
    else:
        targets = set(TEXT)
    jobs = windows(targets)
    out_name = "tier2_lines" if args.scope == "unread" else "tier2_lines_all"
    print(f"{len(targets)} lines to account for, {len(jobs)} model calls ({'notes only' if notes_only else 'notes and records'})")
    if args.dry_run:
        part, wanted = jobs[0]
        print(prompt_for(part, wanted, notes_only))
        return
    from manichchilambu.llm import ask
    out = ROOT / "data/candidates"
    final, partial = out / f"{out_name}.jsonl", out / f"{out_name}.jsonl.partial"
    final.unlink(missing_ok=True)
    missed, tally = [], {"calls": 0, "notes": 0, "records": 0, "rejected": 0}
    with open(partial, "w", encoding="utf-8") as f:
        try:
            for part, wanted in jobs:
                answer = ask(prompt_for(part, wanted, notes_only), model=args.model, sample=0)
                notes, recs, bad, gone = check(answer, part, wanted, notes_only)
                tally["calls"] += 1
                tally["notes"] += len(notes)
                tally["records"] += len(recs)
                tally["rejected"] += len(bad)
                missed += gone
                for n in notes:
                    f.write(json.dumps({**n, "model": args.model, "tier": 2}, ensure_ascii=False) + "\n")
                for r in recs:
                    f.write(json.dumps({**r, "type": "record", "window": part[0]["id"], "mode": "lines", "sample": 0, "model": args.model, "tier": 2}, ensure_ascii=False) + "\n")
        except RuntimeError as stop:
            sys.exit(f"stopped at {tally['calls']} of {len(jobs)} calls: {stop}\n"
                     "Saved answers are kept. Run the same command again and it picks up from here.")
    partial.replace(final)
    (ROOT / f"reports/{out_name}_missed.json").write_text(json.dumps(missed, indent=1), encoding="utf-8")
    print("done", tally, f"lines with no note: {len(missed)}")


if __name__ == "__main__":
    main()
