"""
Read a scholar's marks on annotation/review_ledger.csv into data/seeds/reviews.csv, which the site shows on every record.

  .venv/bin/python scripts/ingest_reviews.py --by "Dr N. Name"
  .venv/bin/python scripts/ingest_reviews.py --by "Dr N. Name" --sheet path/to/their_copy.csv

A mark becomes a review status:
  yes     reviewed   the reading is right
  no      disputed   the reviewer thinks it's wrong; their comment says why
  unsure  disputed   flagged for discussion, with the comment
Blank rows are left as they are. Every review keeps who, when and the comment. A later review of the same record
replaces an earlier one, but the old line stays in the file's history (git), so nothing is lost.
After this, rebuild the site: .venv/bin/python scripts/build_web_data.py
"""
import argparse
import csv
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REVIEWS = ROOT / "data/seeds/reviews.csv"
FIELDS = ["id", "status", "by", "on", "note"]
STATUS = {"yes": "reviewed", "y": "reviewed", "correct": "reviewed", "no": "disputed", "n": "disputed", "wrong": "disputed", "unsure": "disputed", "?": "disputed"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--by", required=True, help="the reviewer's name, as it should show on the site")
    ap.add_argument("--sheet", default=str(ROOT / "annotation/review_ledger.csv"))
    ap.add_argument("--on", default=time.strftime("%Y-%m-%d"), help="date of the review (default today)")
    args = ap.parse_args()
    current = {}
    if REVIEWS.exists():
        current = {r["id"]: r for r in csv.DictReader(open(REVIEWS, encoding="utf-8"))}
    added, unreadable = 0, []
    for row in csv.DictReader(open(args.sheet, encoding="utf-8-sig")):
        mark = (row.get("CORRECT? (yes/no/unsure)") or "").strip().lower()
        if not mark:
            continue
        if mark not in STATUS:
            unreadable.append(row["id"])
            continue
        note = (row.get("your_comment") or "").strip()
        if mark in ("unsure", "?") and not note:
            note = "marked unsure"
        current[row["id"]] = {"id": row["id"], "status": STATUS[mark], "by": args.by, "on": args.on, "note": note}
        added += 1
    with open(REVIEWS, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(sorted(current.values(), key=lambda r: r["id"]))
    counts = {s: sum(1 for r in current.values() if r["status"] == s) for s in ("reviewed", "disputed")}
    print(f"{added} marks read from {args.sheet}. In total: {counts}." + (f" Couldn't read the mark on: {', '.join(unreadable)}" if unreadable else ""))
    print("Now rebuild the site: .venv/bin/python scripts/build_web_data.py")


if __name__ == "__main__":
    main()
