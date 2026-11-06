"""
Score the Tier 2 pilot. All rules here were written BEFORE any model output existed, so they
couldn't be tuned to the results. Change them later and you must say so in the write-up.

Measures, per condition (zero / few / masked / notext):
  recall       : of the hand ledger's records in the test cantos, how many got a matching proposal?
                 Match = cited lines within 2 of the gold's, and at least one person in common.
  mood         : on those matches, does it agree on happened vs didn't happen?
  false facts  : the pre-registered traps below. Did it tell any of them as having happened?
  stability    : how many of the 3 samples agree on the same record?

Gold is my own draft and small, so these are pilot numbers, for deciding if a full run is worth paying for.
Precision can't be scored here: a proposal the ledger lacks may be perfectly right. Those go to a sheet for review.
"""
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

from manichchilambu.ledger import load
from manichchilambu.text import entities

ENTS = entities()
TEST = ("SIL-16", "SIL-20", "MAN-20")

# Trap: if a candidate near these lines has a matching kind and is marked asserted, a claim became a fact.
TRAPS = [
    ("Kovalan stole the queen's anklet", "SIL-16", 145, 147, r"steal|stole|theft|thief|rob"),
    ("the ordered killing already done", "SIL-16", 150, 153, r"kill|execut|slay|behead"),
    ("the anklet belongs to the queen", "SIL-16", 121, 122, r"belong|suit|fit|own"),
    ("the men's objection as settled fact", "SIL-16", 162, 163, r"innocen|not.*kill|unworthy"),
    ("the king is a thief", "SIL-20", 86, 86, r"steal|thief|theft|is_"),
    ("the woman is Kayasandikai", "MAN-20", 33, 37, r"identi|is_|recogni|same"),
    ("Udayakumaran is her lover", "MAN-20", 77, 78, r"lover|love|beloved"),
]


def where(line):
    """'SIL-16-0145' -> ('SIL-16', 145)"""
    return line[:6], int(line[7:])


def people(rec):
    out = set()
    for v in rec.get("roles", {}).values():
        for x in (v["one_of"] if isinstance(v, dict) else [v]):
            if isinstance(x, str):
                # Masked runs answer in NAME tokens, so turn those back into ids before scoring.
                m = re.fullmatch(r"NAME(\d+)", x)
                out.add(ENTS[int(m.group(1))]["id"] if m and int(m.group(1)) < len(ENTS) else x.lower())
    return out


def near(a, b, slack=2):
    for x in a:
        cx, lx = where(x)
        for y in b:
            cy, ly = where(y)
            if cx == cy and abs(lx - ly) <= slack:
                return True
    return False


def evaluate(cands, gold):
    report = {}
    for mode in sorted({c["mode"] for c in cands}):
        rows = [c for c in cands if c["mode"] == mode]
        hit, mood_ok, mood_n, missed = 0, 0, 0, []
        for g in gold:
            found = [c for c in rows if near(c["lines"], g["lines"]) and people(c) & people(g)]
            if not found:
                missed.append(g["id"])
                continue
            hit += 1
            # Majority view across the proposals, so one sample can't decide it.
            votes = Counter(c.get("mood") == "asserted" for c in found)
            mood_n += 1
            mood_ok += votes.most_common(1)[0][0] == (g["mood"] == "asserted")
        fell = []
        for name, canto, lo, hi, pattern in TRAPS:
            bad = [c for c in rows if c.get("mood") == "asserted" and re.search(pattern, str(c.get("kind", "")).lower())
                   and any(where(l)[0] == canto and lo <= where(l)[1] <= hi for l in c["lines"])]
            if bad:
                fell.append({"trap": name, "samples": sorted({c["sample"] for c in bad})})
        groups = defaultdict(set)
        for c in rows:
            groups[(c["lines"][0], str(c.get("kind")).lower(), tuple(sorted(people(c))))].add(c["sample"])
        agree = Counter(len(v) for v in groups.values())
        report[mode] = {"proposals": len(rows), "gold": len(gold), "recall": round(hit / len(gold), 3) if gold else None,
                        "mood_agreement": round(mood_ok / mood_n, 3) if mood_n else None,
                        "traps_fallen": len(fell), "traps_total": len(TRAPS), "fell": fell,
                        "sample_agreement": {str(k): agree[k] for k in sorted(agree)}, "missed": missed}
    return report


def main(path=ROOT / "data/candidates/tier2.jsonl"):
    cands = [json.loads(l) for l in open(path, encoding="utf-8")]
    gold = [r for r in load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml") if any(l.startswith(TEST) for l in r["lines"])]
    report = evaluate(cands, gold)
    tally = ROOT / "data/candidates/tier2_tally.json"
    if tally.exists():
        report["citations"] = json.loads(tally.read_text())
    (ROOT / "reports" / "tier2_pilot.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    for mode, r in report.items():
        if mode != "citations":
            print(f"{mode:8} proposals {r['proposals']:4}  recall {r['recall']}  mood {r['mood_agreement']}  traps {r['traps_fallen']}/{r['traps_total']}  agreement {r['sample_agreement']}")
            for f in r["fell"]:
                print("    fell for:", f["trap"], f["samples"])
    print("citations:", report.get("citations"))
    with open(ROOT / "annotation" / "review_tier2.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["mode", "sample", "lines", "kind", "roles", "voice", "mood", "quote", "CORRECT? (yes/no/unsure)", "your_comment"])
        for c in cands:
            w.writerow([c["mode"], c["sample"], " ".join(c["lines"]), c.get("kind"), json.dumps(c.get("roles"), ensure_ascii=False),
                        " > ".join(c.get("voice") or []), c.get("mood"), c.get("quote"), "", ""])


if __name__ == "__main__":
    main(*sys.argv[1:])
