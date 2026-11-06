"""
Echo finder: two stretches of story with the same shape and different people.

Reading Silappatikaram 16 next to 23 is what started this. Bharatan falsely accuses Sangaman, a king
kills him, in the next birth a goldsmith falsely accuses Kovalan (who WAS Bharatan), a king kills him.
Nobody writes that edge into a knowledge graph, yet it's the moral engine of the epic.

The method is a small version of structure mapping (Gentner 1983; Falkenhainer, Forbus & Gentner 1989):
  - match events of the same kind, in the same order
  - the mapping of people must stay one-to-one throughout: if goldsmith maps to Bharatan in one event,
    he has to in all of them
Scored against two simpler options so we can see if the one-to-one rule earns its keep,
and against shuffled ledgers so we can see how often this much structure turns up by luck.
"""
import random
from collections import Counter

# Connective kinds tell us little. A shared "same_person" or "believe" isn't plot.
PLOT_KINDS = {"accuse", "kill", "steal", "curse", "protest", "burn", "die", "feed", "give", "deposit", "enter_fire",
              "fast_to_death", "disguise", "spy", "convert", "ascend", "buy", "take", "receive", "throw_breast", "correct",
              "swallowed", "sacrifice", "order"}


def segments(records):
    """A segment is one episode inside one birth, in story order. Only told-straight events and claims."""
    segs = {}
    for r in sorted(records, key=lambda r: r["t"]):
        if r["kind"] in PLOT_KINDS and r["mood"] in ("asserted", "claimed"):
            segs.setdefault((r["ep"], r["life"]), []).append(r)
    return {k: v for k, v in segs.items() if len(v) >= 2}


def actors(rec):
    return {k: v for k, v in rec["roles"].items() if isinstance(v, str)}


def align(a, b):
    """Longest in-order matching of events under a consistent one-to-one people map. Plain recursion, segments are small."""
    best = (0, {}, [])

    def go(i, j, mapping, reverse, matched):
        nonlocal best
        if len(matched) > best[0]:
            best = (len(matched), dict(mapping), list(matched))
        if i >= len(a) or j >= len(b):
            return
        for x in range(i, len(a)):
            for y in range(j, len(b)):
                if a[x]["kind"] != b[y]["kind"]:
                    continue
                ra, rb = actors(a[x]), actors(b[y])
                m, rev = dict(mapping), dict(reverse)
                ok = True
                for role in ra.keys() & rb.keys():
                    p, q = ra[role], rb[role]
                    if m.get(p, q) != q or rev.get(q, p) != p:
                        ok = False
                        break
                    m[p], rev[q] = q, p
                if ok:
                    go(x + 1, y + 1, m, rev, matched + [(a[x]["id"], b[y]["id"])])
    go(0, 0, {}, {}, [])
    return best


def lcs(a, b):
    """Same in-order matching but no consistency rule on people. Baseline 2."""
    table = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            table[i + 1][j + 1] = table[i][j] + 1 if x["kind"] == y["kind"] else max(table[i][j + 1], table[i + 1][j])
    return table[-1][-1]


def bag(a, b):
    """Shared event kinds, order ignored. Baseline 1."""
    ca, cb = Counter(r["kind"] for r in a), Counter(r["kind"] for r in b)
    return sum((ca & cb).values())


def rank(records):
    segs = segments(records)
    keys = sorted(segs)
    rows = []
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            a, b = segs[keys[i]], segs[keys[j]]
            n, mapping, matched = align(a, b)
            rows.append({"a": keys[i], "b": keys[j], "consistent": n, "lcs": lcs(a, b), "bag": bag(a, b),
                         "mapping": mapping, "matched": matched, "len_a": len(a), "len_b": len(b)})
    rows.sort(key=lambda r: (-r["consistent"], -r["lcs"]))
    return rows


def shuffled_score(records, a_key, b_key, trials=2000, seed=7):
    """How often does a same-sized random segment get this many matches? Shuffle kinds across all plot records."""
    rng = random.Random(seed)
    segs = segments(records)
    real = align(segs[a_key], segs[b_key])[0]
    pool = [r["kind"] for s in segs.values() for r in s]
    beats = 0
    for _ in range(trials):
        kinds = pool[:]
        rng.shuffle(kinds)
        it = iter(kinds)
        fake = {k: [{**r, "kind": next(it)} for r in v] for k, v in segs.items()}
        if align(fake[a_key], fake[b_key])[0] >= real:
            beats += 1
    return real, (beats + 1) / (trials + 1)
