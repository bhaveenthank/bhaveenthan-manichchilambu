"""Exhaustive path test over all entity pairs, plus hand-picked scholarly pairs, plus the echo ranking."""
import json
import sys
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

from manichchilambu.echo import rank, shuffled_score, segments
from manichchilambu.ledger import load, story, everything
from manichchilambu.paths import build, shortest

records = load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml")
plain, actual = build(records, everything), build(records, story)
nodes = sorted(set(plain) | set(actual))
report = {"nodes": len(nodes), "pairs": 0}
tot = {"plain_found": 0, "plain_bad": 0, "actual_found": 0, "lawful_found": 0, "len_plain": 0, "len_lawful": 0, "both": 0, "life_mix": 0}
for a, b in combinations(nodes, 2):
    report["pairs"] += 1
    p = shortest(plain, a, b)
    if p:
        tot["plain_found"] += 1
        tot["plain_bad"] += any(r["mood"] != "asserted" for r in p)
    if shortest(actual, a, b):
        tot["actual_found"] += 1
        # Does the best 'actual' path slide between births with no same_person step? That's what lawful forbids.
        q = shortest(actual, a, b)
        lives = {r["life"] for r in q if r["kind"] != "same_person"}
        tot["life_mix"] += len(lives) > 1 and not any(r["kind"] == "same_person" for r in q)
    l = shortest(actual, a, b, lawful=True)
    if l:
        tot["lawful_found"] += 1
        if p:
            tot["both"] += 1
            tot["len_plain"] += len(p)
            tot["len_lawful"] += len(l)
report.update(tot)
print(json.dumps(report, indent=1))

PAIRS = [("manimekalai", "kannagi"), ("manimekalai", "pandya_king"), ("kovalan", "sangaman"), ("udayakumaran", "kovalan"),
         ("kovalan", "ank_q"), ("kanchanan", "manimekalai"), ("aputhiran", "manimekalai"), ("punyarasan", "amudasurabhi"),
         ("kannagi", "cenkuttuvan"), ("neeli", "kannagi"), ("gajabahu", "kovalan"), ("goldsmith", "kovalan")]
rows = []
for a, b in PAIRS:
    for name, g, law in (("plain", plain, False), ("lawful", actual, True)):
        path = shortest(g, a, b, lawful=law)
        steps = " > ".join(f"{r['kind']}[{r['id']}:{r['mood'][:3]}]" for r in path) if path else "NO PATH"
        rows.append({"a": a, "b": b, "mode": name, "hops": len(path) if path else None, "steps": steps,
                     "lines": [r["lines"][0] for r in path] if path else []})
        print(f"{a:13}{b:13}{name:7}{steps[:130]}")

ech = rank(records)
print("\n-- echoes, top 10")
for r in ech[:10]:
    print(f"{r['a']} ~ {r['b']} consistent {r['consistent']} lcs {r['lcs']} bag {r['bag']} map {r['mapping']}")
sig = []
segs = segments(records)
for r in ech[:6]:
    if r["consistent"] >= 2:
        real, p = shuffled_score(records, r["a"], r["b"])
        sig.append({"a": r["a"], "b": r["b"], "matches": real, "p": round(p, 4)})
        print("shuffle test", r["a"], r["b"], real, f"p={p:.4f}")
(ROOT / "reports" / "paths_and_echoes.json").write_text(json.dumps(
    {"exhaustive": report, "pairs": rows, "echoes": [{**r, "a": list(r["a"]), "b": list(r["b"])} for r in ech[:25]], "shuffle": sig},
    ensure_ascii=False, indent=1, default=str), encoding="utf-8")
