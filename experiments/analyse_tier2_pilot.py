"""
Exploratory reading of the Tier 2 pilot, written AFTER seeing the frozen scores. Nothing here replaces them.
The frozen numbers are in reports/tier2_pilot.json. These ask what those numbers can bear:
  - could the scoring itself be unfair to the masked condition?
  - is mood agreement better than always saying "it happened"?
  - when a record didn't happen, does the model say so? That's the error this project cares about.
  - how much of the recall comes from having the verse at all?
"""
import json
import random
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "experiments"))
from run_tier2_eval import TEST, near, people, where  # noqa: E402

from manichchilambu.ledger import load  # noqa: E402

CANDS = [json.loads(l) for l in open(ROOT / "data/candidates/tier2.jsonl", encoding="utf-8")]
GOLD = [r for r in load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml") if any(l.startswith(TEST) for l in r["lines"])]
MODES = ("zero", "few", "masked", "notext")


def hits(rows, g, need_person=True):
    return [c for c in rows if near(c["lines"], g["lines"]) and (not need_person or people(c) & people(g))]


def interval(vals, n=2000):
    rng = random.Random(0)
    means = sorted(sum(rng.choices(vals, k=len(vals))) / len(vals) for _ in range(n))
    return round(means[int(n * .025)], 3), round(means[int(n * .975)], 3)


out = {"gold": len(GOLD), "gold_asserted_share": round(sum(g["mood"] == "asserted" for g in GOLD) / len(GOLD), 3), "by_canto_gold": Counter(g["lines"][0][:6] for g in GOLD)}
for mode in MODES:
    rows = [c for c in CANDS if c["mode"] == mode]
    strict = [int(bool(hits(rows, g))) for g in GOLD]
    loose = [int(bool(hits(rows, g, False))) for g in GOLD]
    matched = [(g, hits(rows, g)) for g in GOLD if hits(rows, g)]
    told = [(g, h) for g, h in matched if g["mood"] == "asserted"]
    untold = [(g, h) for g, h in matched if g["mood"] != "asserted"]
    major = lambda h: Counter(c.get("mood") == "asserted" for c in h).most_common(1)[0][0]
    names = [v for c in rows for v in map(str, sum(([x] if not isinstance(x, list) else x for x in (c.get("roles") or {}).values()), []))]
    out[mode] = {
        "recall": round(sum(strict) / len(GOLD), 3), "recall_95": interval(strict), "line_only_recall": round(sum(loose) / len(GOLD), 3),
        "proposals_per_call": round(len(rows) / 69, 1),
        "told_straight_kept_as_told": f"{sum(major(h) for g, h in told)}/{len(told)}",
        "not_told_straight_kept_apart": f"{sum(not major(h) for g, h in untold)}/{len(untold)}",
        "any_sample_asserted_a_non_fact": f"{sum(any(c.get('mood') == 'asserted' for c in h) for g, h in untold)}/{len(untold)}",
        "moods": dict(Counter(c.get("mood") for c in rows).most_common(5)),
        "recall_by_canto": {k: round(sum(s for s, g in zip(strict, GOLD) if g["lines"][0][:6] == k) / max(1, sum(g["lines"][0][:6] == k for g in GOLD)), 3) for k in TEST},
        "name_tokens_share": round(sum(bool(re.fullmatch(r"NAME\d+", n)) for n in names) / max(1, len(names)), 3),
    }
pairs = {m: [int(bool(hits([c for c in CANDS if c["mode"] == m], g))) for g in GOLD] for m in MODES}
for a, b in (("few", "notext"), ("few", "masked"), ("few", "zero"), ("notext", "masked")):
    d = [x - y for x, y in zip(pairs[a], pairs[b])]
    out[f"{a}_minus_{b}"] = {"difference": round(sum(d) / len(d), 3), "95": interval(d), "only_first": sum(x == 1 for x in d), "only_second": sum(x == -1 for x in d)}
only_memory = [g["id"] for g, n, f in zip(GOLD, pairs["notext"], pairs["few"]) if n and not f]
out["found_by_few_not_notext"] = [g["id"] for g, n, f in zip(GOLD, pairs["notext"], pairs["few"]) if f and not n]
(ROOT / "reports/tier2_pilot_analysis.json").write_text(json.dumps(out, ensure_ascii=False, indent=1, default=dict), encoding="utf-8")
print(json.dumps(out, ensure_ascii=False, indent=0, default=dict))


# ---- a stricter match, also chosen after seeing the frozen result: the same line, one person in common.
def strict_hits(rows, g):
    return [c for c in rows if set(c["lines"]) & set(g["lines"]) and people(c) & people(g)]


LINES_BY_CANTO = defaultdict(list)
for c in CANDS:
    LINES_BY_CANTO[c["lines"][0][:6]].extend(c["lines"])
strict = {}
for mode in MODES:
    rows = [c for c in CANDS if c["mode"] == mode]
    real = sum(bool(strict_hits(rows, g)) for g in GOLD) / len(GOLD)
    rng, runs = random.Random(0), []
    for _ in range(100):
        moved = [{**c, "lines": [rng.choice(LINES_BY_CANTO[c["lines"][0][:6]])]} for c in rows]
        runs.append(sum(bool(strict_hits(moved, g)) for g in GOLD) / len(GOLD))
    runs.sort()
    matched = [(g, strict_hits(rows, g)) for g in GOLD if strict_hits(rows, g)]
    major = lambda h: Counter(c.get("mood") == "asserted" for c in h).most_common(1)[0][0]
    right = sum(major(h) == (g["mood"] == "asserted") for g, h in matched)
    base = sum(g["mood"] == "asserted" for g, h in matched)
    nofact = [(g, h) for g, h in matched if g["mood"] != "asserted"]
    strict[mode] = {"same_line_recall": round(real, 3), "chance_mean": round(sum(runs) / 100, 3), "chance_95_top": runs[97], "mood_right": f"{right}/{len(matched)}", "always_yes_would_get": f"{base}/{len(matched)}",
                    "non_facts_kept_apart": f"{sum(not major(h) for g, h in nofact)}/{len(nofact)}"}
out["same_line_match"] = strict
(ROOT / "reports/tier2_pilot_analysis.json").write_text(json.dumps(out, ensure_ascii=False, indent=1, default=dict), encoding="utf-8")
print(json.dumps(strict, indent=0))
