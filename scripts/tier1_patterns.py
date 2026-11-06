"""
Tier 1c: pattern bootstrapping, Snowball style (Agichtein & Gravano 2000), cut down to fit verse.

1. Start from a few seed facts like (kovalan, child_of, masattuvan), each with a verse line behind it.
2. Find places where both names sit within a small window, and keep the other words around them.
3. Score each word as a pattern: how often it sits by a known fact vs by pairs that have no such fact.
4. Fire the good patterns on the rest of the text to get new candidate pairs.
5. Stop after 3 rounds. Each round's accepted pairs become seeds for the next, which is exactly
   how drift gets in, so I log which pattern and which round produced every candidate.

Two starting points are compared: A) a hand list of Tamil kinship words, B) words learned from seeds only.
"""
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

from manichchilambu.text import entities, lines, mentions, nfc

ROOT = Path(__file__).resolve().parent.parent
LINES = lines()
MENTIONS = mentions()
ENTS = {e["id"]: e for e in entities()}
PEOPLE = {k for k, v in ENTS.items() if v["cls"] in ("Person", "Deity")}

SEEDS = {
    "kin": {("kovalan", "masattuvan"), ("kannagi", "manaikan"), ("manimekalai", "madhavi"), ("manimekalai", "kovalan"),
            ("punyarasan", "bhumichandran")},
    "spouse": {("kannagi", "kovalan"), ("kanchanan", "kayasandikai"), ("lakshmi", "rahulan"), ("neeli", "sangaman")},
}
# Hand list. Tamil kinship and marriage words, written by reading, in the shapes the text uses.
HAND = {
    "kin": ["மகன்", "மகள்", "மகனை", "மகளை", "தாதை", "தந்தை", "தாய்", "புதல்வ", "பெற்ற", "வயிற்று"],
    "spouse": ["மனைவி", "கணவன்", "கணவ", "கொழுந", "காதலி", "காதலன்", "மணமகன்", "கேள்வன்", "துணைவ"],
}
STOP = {"என்", "என", "தன்", "அவன்", "அவள்", "இவன்", "இவள்", "தான்", "நின்", "யான்", "நீ", "ஆங்கு", "ஈங்கு", "அந்", "இந்", "ஓர்", "ஒரு"}


def tokens(text):
    return nfc(re.sub(r"[^஀-௿ ]", " ", text)).split()


def contexts(window=2):
    """Yield (entities in window, words in window, line ids) for every line that names someone."""
    by_canto = defaultdict(list)
    for i, line in enumerate(LINES):
        by_canto[(line["epic"], line["canto"])].append(line)
    for lines in by_canto.values():
        for i in range(len(lines)):
            chunk = lines[i:i + window + 1]
            ents = {e for l in chunk for e in MENTIONS.get(l["id"], []) if e in PEOPLE}
            if len(ents) >= 2:
                yield ents, [w for l in chunk for w in tokens(l["text"])], [l["id"] for l in chunk]


def word_hits(word, words):
    return any(w.startswith(word) for w in words)


def learn_cues(seeds, ctxs, min_support=2):
    """Which words sit next to seed pairs more often than next to other pairs?"""
    pos, neg = Counter(), Counter()
    for ents, words, _ in ctxs:
        pairs = {(a, b) for a in ents for b in ents if a != b}
        known = any(p in seeds or (p[1], p[0]) in seeds for p in pairs)
        for w in set(words):
            if w in STOP or len(w) < 3 or any(w.startswith(n) for e in ents for n in map(nfc, ENTS[e]["names"])):
                continue
            (pos if known else neg)[w] += 1
    return {w: pos[w] / (pos[w] + neg[w] + 1) for w in pos if pos[w] >= min_support}


def apply_cues(cues, seeds, ctxs):
    """Propose every pair that sits in a window with a cue word. Score = the best cue's reliability."""
    found = {}
    for ents, words, lids in ctxs:
        for cue, rel in cues.items():
            if not word_hits(cue, words):
                continue
            for a in sorted(ents):
                for b in sorted(ents):
                    if a < b and (a, b) not in seeds and (b, a) not in seeds:
                        cur = found.get((a, b))
                        if cur is None or rel > cur["score"]:
                            found[(a, b)] = {"score": round(rel, 3), "cue": cue, "lines": lids}
    return found


def run(relation, start, rounds=3, top_k=5, cue_floor=0.15):
    seeds = set(SEEDS[relation])
    ctxs = list(contexts())
    history = []
    for r in range(1, rounds + 1):
        if start == "hand":
            cues = {c: 0.5 for c in HAND[relation]}
        else:
            cues = learn_cues(seeds, ctxs)
            cues = {k: v for k, v in cues.items() if v >= cue_floor}
        cand = apply_cues(cues, seeds, ctxs)
        ranked = sorted(cand.items(), key=lambda kv: -kv[1]["score"])
        history.append({"round": r, "cues": dict(sorted(cues.items(), key=lambda kv: -kv[1])[:12]),
                        "candidates": [{"pair": list(p), **v} for p, v in ranked[:40]]})
        for p, _ in ranked[:top_k]:
            seeds.add(p)
    return history


def main():
    out = {}
    for relation in SEEDS:
        for start in ("hand", "learned"):
            h = run(relation, start)
            out[f"{relation}/{start}"] = h
            print(f"== {relation} / {start}")
            for rnd in h:
                print(f" round {rnd['round']}: {len(rnd['candidates'])} candidates; cues {list(rnd['cues'])[:6]}")
                for c in rnd["candidates"][:6]:
                    print(f"    {c['pair'][0]:15}{c['pair'][1]:15}{c['score']:<6}{c['cue']:<10}{c['lines'][0]}")
    (ROOT / "reports" / "tier1_patterns.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
