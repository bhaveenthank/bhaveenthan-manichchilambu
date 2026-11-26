"""
Build the sheet a Tamil scholar works through: one row per hand record, with the verse next to it.

  .venv/bin/python scripts/make_review_sheet.py          write annotation/review_ledger.csv (all 359 records)
  .venv/bin/python scripts/ingest_reviews.py --by "Name"  read the filled sheet back (see that script)

Rows already marked in an earlier sheet keep their marks, so the sheet can be regenerated as records are added.
"""
import csv
from pathlib import Path

from manichchilambu.ledger import load
from manichchilambu.text import line_text

ROOT = Path(__file__).resolve().parent.parent
TEXT = line_text()
LEDGERS = ("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml", "ledger_material.yaml", "ledger_coverage.yaml")
SHEET = ROOT / "annotation" / "review_ledger.csv"
MARK, COMMENT = "CORRECT? (yes/no/unsure)", "your_comment"
# Checked first: the anklet case the first epic turns on, and every record not told as fact, since keeping claims,
# beliefs, orders and dreams apart from events is the project's central promise.
FIRST_EPISODES = {"anklet", "queen", "fire"}


def check_first(r):
    return r["mood"] != "asserted" or r["ep"] in FIRST_EPISODES or r["kind"] in ("believe", "accuse", "claim")


def main():
    kept = {}
    if SHEET.exists():
        for row in csv.DictReader(open(SHEET, encoding="utf-8-sig")):
            if row.get(MARK) or row.get(COMMENT):
                kept[row["id"]] = (row.get(MARK, ""), row.get(COMMENT, ""))
    SHEET.parent.mkdir(exist_ok=True)
    n = 0
    with open(SHEET, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["check_first", "id", "episode", "what_it_says", "who_tells_it", "mood", "birth", "story_time", "lines", "tamil", "note", MARK, COMMENT])
        for r in sorted(load(*LEDGERS), key=lambda r: not check_first(r)):
            roles = ", ".join(f"{k}={'/'.join(v['one_of']) if isinstance(v, dict) else v}" for k, v in r["roles"].items())
            note = "; ".join(str(r[k]) for k in ("inferred", "unresolved", "note", "condition", "purpose") if k in r)
            mark, comment = kept.get(r["id"], ("", ""))
            w.writerow(["yes" if check_first(r) else "", r["id"], r["ep"], f"{r['kind']} ({roles})", " > ".join(r["voice"]), r["mood"], r["life"], r["t"], " ".join(r["lines"]),
                        " / ".join(TEXT[l] for l in r["lines"]), note, mark, comment])
            n += 1
    print(f"wrote {SHEET.relative_to(ROOT)}: {n} records, kept {len(kept)} marks already made")


if __name__ == "__main__":
    main()
