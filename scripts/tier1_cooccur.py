"""
Tier 1b: which entity pairs turn up together more than chance?

Co-occurrence never makes an edge on its own, it only suggests pairs worth a closer look.
I compare the usual association scores and window sizes on one question: do they rank the
pairs that really have a recorded link above the ones that don't?

Gold here is every pair linked by a ledger record, plus the hand kinship facts. The ledger only
covers some episodes, so real links outside it count as false. Treat precision as a lower bound.
"""
import json
import math
from collections import Counter
from itertools import combinations
from pathlib import Path

from manichchilambu.ledger import load
from manichchilambu.text import lines, mentions

ROOT = Path(__file__).resolve().parent.parent
import sys
from manichchilambu.ledger import load

LINES = [json.loads(l) for l in (ROOT / "data/corpus/lines.jsonl").open(encoding="utf-8")]
MENTIONS = json.loads((ROOT / "data/corpus/mentions.json").read_text(encoding="utf-8"))


def windows(size):
    """Non-overlapping chunks of `size` lines, never crossing a canto boundary."""
    chunk, current = [], None
    for line in LINES:
        key = (line["epic"], line["canto"])
        if key != current or len(chunk) == size:
            if chunk:
                yield chunk
            chunk, current = [], key
        chunk.append(line["id"])
    if chunk:
        yield chunk


def counts(size):
    single, pair = Counter(), Counter()
    n = 0
    for chunk in windows(size):
        n += 1
        ents = {e for lid in chunk for e in MENTIONS.get(lid, [])}
        single.update(ents)
        pair.update(frozenset(p) for p in combinations(sorted(ents), 2))
    return n, single, pair


def llr(k11, k12, k21, k22):
    """Dunning's log-likelihood ratio, the standard fix for PMI's love of rare pairs."""
    def h(*xs):
        total = sum(xs)
        return sum(x * math.log(x / total) for x in xs if x > 0)
    return 2 * (h(k11, k12, k21, k22) - h(k11 + k12, k21 + k22) - h(k11 + k21, k12 + k22))


def scores(n, single, pair):
    out = {"count": {}, "pmi": {}, "npmi": {}, "dice": {}, "llr": {}}
    for p, c in pair.items():
        a, b = tuple(p)
        ca, cb = single[a], single[b]
        pa, pb, pab = ca / n, cb / n, c / n
        pmi = math.log(pab / (pa * pb))
        out["count"][p] = c
        out["pmi"][p] = pmi
        out["npmi"][p] = pmi / -math.log(pab)
        out["dice"][p] = 2 * c / (ca + cb)
        out["llr"][p] = llr(c, ca - c, cb - c, n - ca - cb + c)
    return out


def gold_pairs():
    gold = set()
    for r in load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml"):
        people = [v for v in r["roles"].values() if isinstance(v, str)]
        for a, b in combinations(set(people), 2):
            gold.add(frozenset((a, b)))
    return gold


def average_precision(ranked, gold):
    hits, total = 0, 0.0
    for i, p in enumerate(ranked, 1):
        if p in gold:
            hits += 1
            total += hits / i
    return total / hits if hits else 0.0


def main():
    gold = gold_pairs()
    report = []
    for size in (3, 5, 10, 25, 50):
        n, single, pair = counts(size)
        known = {p for p in pair if p in gold}
        for name, table in scores(n, single, pair).items():
            ranked = sorted(table, key=lambda p: -table[p])
            top20 = sum(p in gold for p in ranked[:20]) / min(20, len(ranked))
            report.append({"window": size, "score": name, "pairs": len(pair), "gold_in_pairs": len(known),
                           "AP": round(average_precision(ranked, gold), 3), "P@20": round(top20, 2)})
    report.sort(key=lambda r: -r["AP"])
    print(f"{'win':>4} {'score':7} {'pairs':>6} {'gold':>5} {'AP':>6} {'P@20':>5}")
    for r in report[:14]:
        print(f"{r['window']:4} {r['score']:7} {r['pairs']:6} {r['gold_in_pairs']:5} {r['AP']:6.3f} {r['P@20']:5.2f}")
    print("worst:", [(r['window'], r['score'], r['AP']) for r in report[-3:]])
    best = report[0]
    n, single, pair = counts(best["window"])
    table = scores(n, single, pair)[best["score"]]
    cands = [{"a": sorted(p)[0], "b": sorted(p)[1], "score": round(table[p], 3), "count": pair[p],
              "in_ledger": p in gold} for p in sorted(table, key=lambda p: -table[p])]
    (ROOT / "reports" / "tier1_cooccur.json").write_text(json.dumps({"grid": report, "best": best, "candidates": cands}, indent=1))
    print("top pairs:")
    for c in cands[:18]:
        print(f"  {c['a']:16} {c['b']:16} {c['score']:7} n={c['count']:<3} {'known' if c['in_ledger'] else 'NEW'}")


if __name__ == "__main__":
    main()
