"""
Score the bootstrapped patterns by hand, and use those labels to try out the scorer end to end.

Labels below are my own reading of each proposed pair. One reader, and only about a hundred pairs:
far too few to say anything about calibration. The scorer run is a plumbing test, not a result.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

from manichchilambu.score import fit_and_check

# True relations, both directions, as far as the text I've read supports them.
KIN = {frozenset(p) for p in [("manimekalai", "madhavi"), ("manimekalai", "kovalan"), ("cittirapati", "madhavi"), ("kovalan", "masattuvan"),
                              ("kannagi", "manaikan"), ("punyarasan", "bhumichandran"), ("cittirapati", "manimekalai")]}
SPOUSE = {frozenset(p) for p in [("pandya_king", "pandya_queen"), ("kannagi", "kovalan"), ("kanchanan", "kayasandikai"), ("lakshmi", "rahulan"),
                                 ("neeli", "sangaman"), ("kovalan", "madhavi")]}
TRUTH = {"kin": KIN, "spouse": SPOUSE}

data = json.loads((ROOT / "reports" / "tier1_patterns.json").read_text(encoding="utf-8"))
coo = json.loads((ROOT / "reports" / "tier1_cooccur.json").read_text())
dice = {frozenset((c["a"], c["b"])): c["score"] for c in coo["candidates"]}

summary = []
X, y, groups = [], [], []
for key, hist in data.items():
    rel, start = key.split("/")
    seen = set()
    for rnd in hist:
        rows = rnd["candidates"]
        correct = sum(frozenset(c["pair"]) in TRUTH[rel] for c in rows)
        new = [c for c in rows if frozenset(c["pair"]) not in seen]
        new_correct = sum(frozenset(c["pair"]) in TRUTH[rel] for c in new)
        summary.append({"relation": rel, "start": start, "round": rnd["round"], "proposed": len(rows), "correct": correct,
                        "precision": round(correct / len(rows), 2) if rows else None, "new": len(new), "new_correct": new_correct})
        for c in new:
            seen.add(frozenset(c["pair"]))
            canto = c["lines"][0][:6]
            X.append([c["score"], dice.get(frozenset(c["pair"]), 0.0), rnd["round"], start == "hand", rel == "kin"])
            y.append(frozenset(c["pair"]) in TRUTH[rel])
            groups.append(canto)

print(f"{'relation':8}{'start':9}{'rnd':>4}{'prop':>6}{'right':>6}{'prec':>6}{'new':>5}{'new+':>5}")
for s in summary:
    print(f"{s['relation']:8}{s['start']:9}{s['round']:4}{s['proposed']:6}{s['correct']:6}{str(s['precision']):>6}{s['new']:5}{s['new_correct']:5}")
scored = fit_and_check(X, y, groups) if len(set(y)) > 1 else None
print("scorer plumbing test:", json.dumps(scored))
(ROOT / "reports" / "tier1_pattern_eval.json").write_text(json.dumps({"rounds": summary, "scorer_plumbing_test": scored}, indent=1))
