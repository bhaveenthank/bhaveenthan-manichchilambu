"""
Find repeated phrasing across both epics: same formula, retelling, or quoted line.

The two editions split words differently (Manimekalai is cut into words, Silappatikaram mostly isn't),
so I drop all spaces and compare overlapping 6-letter chunks of the Tamil text. To get past very
common phrases, a chunk found in many lines counts for less, same idea as tf-idf.
"""
import json
import math
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

from manichchilambu.text import lines

ROOT = Path(__file__).resolve().parent.parent
LINES = lines()
N = 6


def grams(text):
    s = re.sub(r"[^஀-௿]", "", unicodedata.normalize("NFC", text))
    return {s[i:i + N] for i in range(len(s) - N + 1)}


def main(min_score=0.45, min_len=14):
    gram_sets = [grams(l["text"]) for l in LINES]
    df = Counter(g for gs in gram_sets for g in gs)
    posting = defaultdict(list)
    for i, gs in enumerate(gram_sets):
        for g in gs:
            if df[g] <= 40:  # very common chunks would make this quadratic and tell us nothing
                posting[g].append(i)
    idf = {g: math.log(len(LINES) / df[g]) for g in df}
    pairs = Counter()
    for g, ids in posting.items():
        for x in range(len(ids)):
            for y in range(x + 1, len(ids)):
                pairs[(ids[x], ids[y])] += idf[g]
    out = []
    for (i, j), shared in pairs.items():
        a, b = LINES[i], LINES[j]
        if (a["epic"], a["canto"]) == (b["epic"], b["canto"]) and abs(a["line"] - b["line"]) < 3:
            continue
        wa, wb = sum(idf[g] for g in gram_sets[i]), sum(idf[g] for g in gram_sets[j])
        score = shared / min(wa, wb) if min(wa, wb) else 0
        if score >= min_score and min(len(a["text"]), len(b["text"])) >= min_len:
            out.append({"a": a["id"], "b": b["id"], "score": round(score, 3), "cross_epic": a["epic"] != b["epic"],
                        "text_a": a["text"], "text_b": b["text"]})
    out.sort(key=lambda r: -r["score"])
    (ROOT / "reports" / "formula_pairs.json").write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
    cross = [r for r in out if r["cross_epic"]]
    print(f"{len(out)} line pairs above {min_score}, {len(cross)} between the two epics")
    # Group into runs: several neighbouring pairs in a row means a passage is being reused.
    runs = Counter((r["a"][:6], r["b"][:6]) for r in out)
    print("canto pairs with most reuse:", runs.most_common(12))
    print("-- cross-epic, top 25")
    for r in cross[:25]:
        print(f"{r['score']:.2f} {r['a']} {r['text_a'][:42]} || {r['b']} {r['text_b'][:42]}")


if __name__ == "__main__":
    main()
