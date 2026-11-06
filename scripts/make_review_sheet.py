"""Build a spreadsheet a Tamil scholar can work through: one row per ledger record, with the verse next to it."""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
from manichchilambu.ledger import load
from manichchilambu.text import line_text

TEXT = line_text()
(ROOT / "annotation").mkdir(exist_ok=True)
with open(ROOT / "annotation" / "review_ledger.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["id", "episode", "what_it_says", "who_tells_it", "mood", "birth", "story_time", "lines", "tamil", "note", "CORRECT? (yes/no/unsure)", "your_comment"])
    for r in load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml"):
        roles = ", ".join(f"{k}={'/'.join(v['one_of']) if isinstance(v, dict) else v}" for k, v in r["roles"].items())
        note = "; ".join(str(r[k]) for k in ("inferred", "unresolved", "note", "condition", "purpose") if k in r)
        w.writerow([r["id"], r["ep"], f"{r['kind']} ({roles})", " > ".join(r["voice"]), r["mood"], r["life"], r["t"], " ".join(r["lines"]),
                    " / ".join(TEXT[l] for l in r["lines"]), note, "", ""])
print("wrote annotation/review_ledger.csv")
