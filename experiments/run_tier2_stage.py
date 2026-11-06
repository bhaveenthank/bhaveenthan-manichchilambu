"""
The stage test: does the model read cantos it wasn't piloted on, or only the famous ones?

Written and frozen BEFORE any output exists for these cantos. The hash is in reports/tier2_stage_freeze.sha256.
It fixes what the pilot's measure got wrong. That measure allowed 2 lines of slack, and shuffling proposals
to random lines scored nearly the same, so it couldn't tell reading from guessing.

Gold is the coverage batch for five cantos. I wrote it from the verse, and the model's worked examples never
draw on it. Gold is still my own draft, so this says whether the full run is worth doing and nothing grander.

Match: shares a cited line with the gold record, and shares a person. Models name people their own way here
because many of these aren't in the known-ids list, so a person counts as shared if a word of 4+ letters is.
Chance: every proposal moved to a random line of its own canto, 200 times.

GO for the full run only if ALL of these hold for `few`:
  1. same-line recall is at least 0.60
  2. it beats the 97.5th percentile of chance
  3. it beats `notext` by at least 0.10, so the verse is really doing something
  4. at least half of the gold records that aren't told as fact are kept apart from fact
"""
import json
import random
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from manichchilambu.ledger import load  # noqa: E402

CANTOS = ("SIL-10", "SIL-14", "MAN-13", "MAN-23", "MAN-28")
GENERIC = {"person", "unnamed", "woman", "people", "group", "unknown", "speaker", "poet", "with", "from", "that", "this"}


def words(rec):
    out = set()
    for value in (rec.get("roles") or {}).values():
        for item in value["one_of"] if isinstance(value, dict) else value if isinstance(value, list) else [value]:
            out |= {w for w in re.split(r"[^a-z0-9]+", str(item).lower()) if len(w) >= 4 and w not in GENERIC}
    return out


def matches(rows, g):
    gold_lines, gold_words = set(g["lines"]), words(g)
    return [c for c in rows if gold_lines & set(c["lines"]) and gold_words & words(c)]


def recall(rows, gold):
    return sum(bool(matches(rows, g)) for g in gold) / len(gold) if gold else 0.0


def chance(rows, gold, runs=200, seed=0):
    by_canto = defaultdict(list)
    for c in rows:
        by_canto[c["lines"][0][:6]].extend(c["lines"])
    rng = random.Random(seed)
    results = sorted(recall([{**c, "lines": [rng.choice(by_canto[c["lines"][0][:6]])]} for c in rows], gold) for _ in range(runs))
    return sum(results) / runs, results[int(runs * 0.975) - 1]


def told_apart(rows, gold):
    """Of gold records not told as fact and found at all, how many does the majority of matches keep apart?"""
    kept = total = 0
    for g in gold:
        found = matches(rows, g)
        if g["mood"] == "asserted" or not found:
            continue
        total += 1
        kept += Counter(c.get("mood") == "asserted" for c in found).most_common(1)[0][0] is False
    return kept, total


def evaluate(cands, gold):
    few = [c for c in cands if c["mode"] == "few"]
    notext = [c for c in cands if c["mode"] == "notext"]
    r_few, r_notext = recall(few, gold), recall(notext, gold)
    mean, top = chance(few, gold)
    kept, total = told_apart(few, gold)
    checks = {"recall_at_least_0.60": r_few >= 0.60, "beats_chance": r_few > top, "beats_notext_by_0.10": r_few - r_notext >= 0.10, "keeps_half_of_non_facts_apart": total > 0 and kept / total >= 0.5}
    return {"gold": len(gold), "few_proposals": len(few), "few_recall": round(r_few, 3), "notext_recall": round(r_notext, 3), "chance_mean": round(mean, 3), "chance_97_5": round(top, 3),
            "non_facts_kept_apart": f"{kept}/{total}", "by_canto": {k: round(recall(few, [g for g in gold if g["lines"][0].startswith(k)]), 3) for k in CANTOS}, "checks": checks, "verdict": "GO" if all(checks.values()) else "NO-GO"}


def main():
    path = ROOT / "data/candidates/tier2_stage.jsonl"
    if not path.exists():
        sys.exit("No finished stage run yet. It appears once every call is in.")
    cands = [json.loads(l) for l in open(path, encoding="utf-8")]
    gold = [r for r in load("ledger_coverage.yaml") if r["lines"][0][:6] in CANTOS]
    report = evaluate(cands, gold)
    (ROOT / "reports/tier2_stage.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
