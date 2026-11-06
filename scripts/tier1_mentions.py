"""
Tier 1a: find entity mentions line by line, across the whole corpus.

I try the matchers from dumb to careful and score each on the hand labels. Classical Tamil glues
endings and whole words together, so plain string match should under-find, and loose matching
should start calling cowherds (கோவலர்) Kovalan. The test is there to measure exactly that.
"""
import json
from collections import Counter, defaultdict
from pathlib import Path

import yaml

from manichchilambu.text import entities, lines, nfc

ROOT = Path(__file__).resolve().parent.parent


LINES = lines()
ENTS = entities()
SPLIT_MARKS = str.maketrans({c: " " for c in "'\"‘’“”!?,.;:-—–()"})


def words(text):
    return nfc(text).translate(SPLIT_MARKS).split()


def edit1(a, b):
    """True if a and b differ by at most one letter (substitution, insert or delete)."""
    if a == b:
        return True
    if abs(len(a) - len(b)) > 1:
        return False
    i = 0
    while i < min(len(a), len(b)) and a[i] == b[i]:
        i += 1
    return a[i + 1:] == b[i + 1:] or a[i + 1:] == b[i:] or a[i:] == b[i + 1:]


# Tamil noun endings that can sit right after a name. Used to tell கோவலன்+ஐ from கோவலர்.
SUFFIXES = ("", "ஐ", "க்கு", "ற்கு", "ுக்கு", "ின்", "ின", "ோடு", "ொடு", "ும்", "னும்", "தன்", "ே", "ை", "ுடன்", "இடம்", "ிடம்", "ால்", "ன்", "க்", "ச்", "த்", "ப்", "த்து", "யை", "யின்", "யும்", "யோடு", "யொடு", "யே", "க்கு")


def m_exact(line, ent, scoped):
    toks = words(line["text"])
    return any(nfc(n) in toks for n in ent["names"] if " " not in n)


def _prefix_hit(toks, name):
    return any(t.startswith(name) for t in toks)


def m_prefix(line, ent, scoped):
    """Word starts with the name. Catches case endings, also catches lookalikes."""
    return any(_prefix_hit(words(line["text"]), nfc(n)) if " " not in n else nfc(n) in nfc(line["text"]) for n in ent["names"])


def m_squash(line, ent, scoped):
    """Ignore all spaces, so editors' different word splits stop mattering."""
    joined = nfc(line["text"]).replace(" ", "")
    return any(nfc(n).replace(" ", "") in joined for n in ent["names"])


def m_scoped(line, ent, scoped=True):
    """Prefix on names, plus epithets that only fire inside their listed cantos."""
    if m_prefix(line, ent, scoped):
        return True
    key = f"{line['epic']}-{line['canto']:02d}"
    joined = nfc(line["text"]).replace(" ", "")
    return any(nfc(e).replace(" ", "") in joined for e in ent["epithets"].get(key, []))


def m_guarded(line, ent, scoped=True):
    """
    The one I'd actually use: scoped epithets, plus a stop list for known lookalikes.
    The stop list grew from reading the errors: கோவலர் are cowherds, இளங்கோ வேந்தன் is 'young king'.
    """
    text = nfc(line["text"])
    if ent["id"] == "kovalan" and "கோவலர்" in text and "கோவலன்" not in text:
        return False
    if ent["id"] == "ilanko" and "இளங்கோ வேந்தன்" in text:
        return False
    # "வந்தேன் அஞ்சல் மணிமேகலை யான்" is the goddess introducing herself, not the girl (SIL-15-0033, MAN-07-0018).
    says_goddess = "வந்தேன்அஞ்சல்" in text.replace(" ", "")
    if ent["id"] == "manimekalai" and says_goddess:
        return False
    if ent["id"] == "manimekhala_deity" and says_goddess:
        return True
    if ent["id"] == "madurai" and nfc("கூடல்") not in text and nfc("மதுரை") not in text and nfc("கூடன்") in text:
        return True
    return m_scoped(line, ent, scoped)


METHODS = {"exact": m_exact, "prefix": m_prefix, "squash": m_squash, "scoped": m_scoped, "guarded": m_guarded}


def evaluate():
    gold = yaml.safe_load((ROOT / "data/seeds/mentions_gold.yaml").read_text(encoding="utf-8"))
    test = [l for l in LINES if (l["epic"], l["canto"]) in {("SIL", 16), ("SIL", 20), ("MAN", 20)}
            and not (l["epic"] == "SIL" and l["canto"] == 16 and l["line"] < 55)]
    results = {}
    for name, fn in METHODS.items():
        tp = fp = fn_count = 0
        errors = []
        for line in test:
            pred = {e["id"] for e in ENTS if fn(line, e, True)}
            want = set(gold.get(line["id"], []))
            tp += len(pred & want)
            fp += len(pred - want)
            fn_count += len(want - pred)
            if pred != want:
                errors.append((line["id"], sorted(pred - want), sorted(want - pred)))
        p = tp / (tp + fp) if tp + fp else 0
        r = tp / (tp + fn_count) if tp + fn_count else 0
        f = 2 * p * r / (p + r) if p + r else 0
        results[name] = {"tp": tp, "fp": fp, "fn": fn_count, "precision": round(p, 3), "recall": round(r, 3), "f1": round(f, 3), "errors": errors[:60]}
        print(f"{name:9} P {p:.2f}  R {r:.2f}  F1 {f:.2f}   (tp {tp}, fp {fp}, fn {fn_count})")
    (ROOT / "reports" / "tier1_mentions_eval.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    return results


def tag_corpus(method="guarded"):
    """Write the chosen matcher's output for all 10k lines."""
    fn = METHODS[method]
    out = {}
    for line in LINES:
        hit = [e["id"] for e in ENTS if fn(line, e, True)]
        if hit:
            out[line["id"]] = hit
    (ROOT / "data" / "corpus" / "mentions.json").write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
    counts = Counter(e for v in out.values() for e in v)
    by_epic = defaultdict(Counter)
    for lid, ents in out.items():
        for e in ents:
            by_epic[lid[:3]][e] += 1
    print(f"{len(out)} lines tagged out of {len(LINES)}; {len(counts)} entities seen")
    print("top:", counts.most_common(14))
    return out


if __name__ == "__main__":
    evaluate()
    tag_corpus()
