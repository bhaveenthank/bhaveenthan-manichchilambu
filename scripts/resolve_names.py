"""
Match the names the machine drafts use to the graph's entities.

The full run (tier2_full.jsonl) wrote 7,177 drafts. The model named people and things however it liked, so the
same man turns up as `pandya_king`, `king`, `nedunchezhiyan` and `the_king`. Until those names point at the
graph's ids, a draft can't join the graph and the Ask page can't tell that a draft about `sathuvan` is about Saduvan.

Each name in each draft is settled by the first of these that works, and the way it was settled is kept:
  exact     the name is already a graph id
  alias     it matches a node's English name or one of its listed spellings
  spelling  it matches once spelling differences are folded away (th/t, dh/d, zh/l, aa/a, doubled letters...)
  context   a bare role word ("king", "queen", "the_sage") in a canto where the hand records name exactly one
            entity that fits that role. This is the weakest of the four, and the review sheet says so.
A match must belong to the draft's own epic. A name that fits more than one entity is left open, with the
candidates listed, rather than guessed: two people called Kausikan must never be merged.

Everything not settled goes to reports/name_review.csv, most frequent first, with suggestions, for you to decide.
Decisions live in data/seeds/name_decisions.csv (name, decision, decided_by, note). A decision is one of:
  <graph id>     the name is that entity
  new:<slug>     a real entity the graph doesn't have yet; names sharing a slug are the same one
  ignore         someone or something the draft didn't name ("speaker", "people")
  concept        an idea or doctrine, not an entity ("dharma", "atoms")
  per canto      means different things in different cantos; left to the context step
Copy rows from reports/name_review.csv into it, fill in the decision, and run this again. Rows decided by Claude
say so in decided_by: check them, and change decided_by to your name when you agree.
Decisions from scripts/name_batch.py (a model, for the long tail) are in data/seeds/name_decisions_model.csv and
count only after yours.

  .venv/bin/python scripts/resolve_names.py
Outputs:
  data/candidates/name_map.json     every (name, canto) pair and what it resolved to
  reports/name_resolution.json      how many names and mentions each step settled
  reports/name_review.csv           the names left to decide
"""
import csv
import difflib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRAFTS = ROOT / "data/candidates/tier2_full.jsonl"
DECISIONS = ROOT / "data/seeds/name_decisions.csv"

# Role words that name a different person in every canto. Never matched by alias, only by context.
ROLES = {
    "king": ["king", "mannan", "arasan", "ventan", "vendan", "vendhan", "monarch", "ruler", "sovereign"],
    "queen": ["queen", "arasi", "devi"],
    "prince": ["prince", "ilavarasan"],
    "sage": ["sage", "ascetic", "monk", "muni", "adigal", "adikal", "teacher", "elder"],
    "goddess": ["goddess", "deity", "deivam", "god"],
    "brahmin": ["brahmin", "brahman", "anthanan"],
    "mother": ["mother", "thai"],
    "father": ["father", "thanthai"],
    "merchant": ["merchant", "vanikan", "chetti"],
    "maid": ["maid", "servant", "attendant", "companion", "friend", "thozhi"],
    "messenger": ["messenger", "envoy"],
    "husband": ["husband", "kanavan"],
    "wife": ["wife", "manaivi"],
}
FILLER = {"the", "a", "an", "great", "old", "young", "unnamed", "this", "that", "her", "his", "their", "our", "my", "your", "own", "chaste", "good", "noble", "addressed", "addressee", "speaking", "unnamed"}
# Which entities each role word may stand for. The node's English name or listed spellings must contain the role
# word, or it's added here by hand.
ROLE_EXTRA = {
    "king": ["cenkuttuvan", "killi", "punyarasan", "gajabahu", "vetrivel_celiyan", "chola_conqueror", "bhumichandran"],
    "queen": ["chola_queen", "pandya_queen", "pilivalai"],
    "prince": ["udayakumaran"],
    "sage": ["aravanan", "kavunti", "manmukan", "viruchikan", "matalan"],
    "goddess": ["manimekhala_deity", "madurapati", "korravai", "tivatilakai", "pillar", "chintadevi"],
    "husband": ["kovalan"],
    "wife": ["kannagi"],
}
# Common nouns the drafts use as role fillers. They're not people and the graph doesn't need them as entities.
COMMON = {"sea", "moon", "sun", "earth", "sky", "audience", "speaker", "narrator", "listener", "people", "women", "men", "living_beings",
          "beings", "world", "city", "town", "crowd", "everyone", "someone", "they", "he", "she", "we", "you", "i", "all", "others", "wind",
          "rain", "fire", "water", "night", "day", "heaven", "hell", "body", "mind", "heart", "unnamed_speaker", "singer", "singers"}


def plain(s):
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = re.sub(r"\(.*?\)", " ", s)
    return re.sub(r"[_\-'’.,]+", " ", s).strip()


def fold(s):
    """A spelling key: the transliteration differences that don't change the name fall away."""
    s = re.sub(r"^the ", "", plain(s)).replace(" ", "")
    for a, b in (("zh", "l"), ("dh", "t"), ("th", "t"), ("ch", "c"), ("sh", "c"), ("kh", "k"), ("gh", "k"), ("ph", "p"), ("bh", "p"),
                 ("aa", "a"), ("ee", "i"), ("ii", "i"), ("oo", "u"), ("uu", "u"), ("g", "k"), ("d", "t"), ("b", "p"), ("j", "c"), ("s", "c"),
                 ("w", "v"), ("ai", "ai")):
        s = s.replace(a, b)
    return re.sub(r"(.)\1+", r"\1", s)


def values(v):
    if isinstance(v, list):
        for x in v:
            yield from values(x)
    elif isinstance(v, str):
        yield v


def main():
    graph = json.loads((ROOT / "web/public/data/graph.json").read_text(encoding="utf-8"))
    records = json.loads((ROOT / "web/public/data/records.json").read_text(encoding="utf-8"))
    nodes = {n["id"]: n for n in graph["nodes"]}
    role_words = {w: role for role, ws in ROLES.items() for w in ws}

    # Names each node goes by. Role words are left out, so "king" can't slip through as an alias of the Pandya king.
    by_alias, by_fold = defaultdict(set), defaultdict(set)
    for n in graph["nodes"]:
        for name in [n["id"], n["en"], *(n.get("also") or [])]:
            p = plain(name)
            if not p or re.search(r"[஀-௿]", p) or set(p.split()) <= set(role_words) | FILLER:
                continue
            by_alias[p].add(n["id"])
            by_alias[re.sub(r"^the ", "", p)].add(n["id"])
            by_fold[fold(p)].add(n["id"])

    # Who fits each role.
    role_nodes = defaultdict(set)
    for n in graph["nodes"]:
        words = set(plain(" ".join([n["en"], *(n.get("also") or [])])).split())
        for w, role in role_words.items():
            if w in words and n["cls"] in ("Person", "Deity"):
                role_nodes[role].add(n["id"])
    for role, ids in ROLE_EXTRA.items():
        role_nodes[role] |= {i for i in ids if i in nodes}

    # Entities the hand records name in each canto: what a role word in that canto can refer to.
    in_canto = defaultdict(set)
    for r in records:
        named = {x for v in r["roles"].values() for x in values(v)} | set(r["voice"]) - {"poet"}
        for l in r["lines"]:
            in_canto[l["id"][:6]] |= {x for x in named if x in nodes}

    decisions = {}
    for path, who in ((ROOT / "data/seeds/name_decisions_model.csv", "model"), (DECISIONS, None)):  # yours last, so they win
        if path.exists():
            for row in csv.DictReader(open(path, encoding="utf-8")):
                if row.get("decision", "").strip():
                    decisions[(row["name"], (row.get("canto") or "").strip() or None)] = (row["decision"].strip(), who or row.get("decided_by") or "you")

    mentions = Counter()
    examples = {}
    for raw in open(DRAFTS, encoding="utf-8"):
        d = json.loads(raw)
        canto = d["lines"][0][:6]
        for v in (d.get("roles") or {}).values():
            for name in values(v):
                mentions[(name, canto)] += 1
                examples.setdefault(name, (d["lines"][0], d.get("quote") or "", d.get("kind")))

    def in_epic(ids, canto):
        return {i for i in ids if canto[:3] in nodes[i]["epics"]}

    def settle(name, canto):
        dec, who = decisions.get((name, canto)) or decisions.get((name, None)) or (None, None)  # a canto's own decision first
        if dec == "per canto":
            dec = None
        tag = "model" if who == "model" else "decided"
        if dec in nodes:
            return tag, dec
        if dec and dec.startswith("new"):
            return tag + "_new", "new:" + (dec.split(":", 1)[1] if ":" in dec else name)
        if dec in ("ignore", "concept"):
            return tag + "_" + dec, None
        if name in nodes:
            return "exact", name
        p = plain(name)
        words = set(p.split())
        role = next((role_words[w] for w in words if w in role_words), None)
        if role and words <= set(role_words) | FILLER:
            fits = role_nodes[role] & in_canto[canto]
            fits = in_epic(fits, canto)
            if len(fits) == 1:
                return "context", next(iter(fits))
            return ("open_role", sorted(fits)) if fits else ("open_role", [])
        for how, ids in (("alias", by_alias.get(p) or by_alias.get(re.sub(r"^the ", "", p))), ("spelling", by_fold.get(fold(p)))):
            if ids:
                ids = in_epic(ids, canto) or ids
                if len(ids) == 1:
                    return how, next(iter(ids))
                return "open_many", sorted(ids)
        if name in COMMON or p.replace(" ", "_") in COMMON:
            return "common", None
        return "unknown", None

    out, steps, steps_m = {}, Counter(), Counter()
    left = defaultdict(lambda: {"mentions": 0, "cantos": set(), "how": set(), "cands": set()})
    for (name, canto), n in mentions.items():
        how, got = settle(name, canto)
        out[f"{name}|{canto}"] = {"name": name, "canto": canto, "how": how, "id": got if isinstance(got, str) else None,
                                  "candidates": got if isinstance(got, list) else None, "mentions": n}
        steps[how] += 1
        steps_m[how] += n
        if how in ("unknown", "open_role", "open_many", "common"):
            row = left[name]
            row["mentions"] += n
            row["cantos"].add(canto)
            row["how"].add(how)
            row["cands"] |= set(got or [])

    # Suggestions for names nothing settled: the nearest spelling keys, shown but never applied.
    keys = {k: ids for k, ids in by_fold.items()}
    def suggest(name, row):
        if row["cands"]:
            return sorted(row["cands"])
        near = difflib.get_close_matches(fold(name), list(keys), n=2, cutoff=0.88)
        return sorted({i for k in near for i in keys[k]})

    def proposal(name, row):
        """A starting point for the decision column, never applied by itself."""
        if row["how"] == {"common"}:
            return "ignore"
        sug = suggest(name, row)
        if len(sug) == 1 and "open_role" not in row["how"]:
            return sug[0]
        if "open_role" in row["how"]:
            return "per canto"
        if row["mentions"] >= 5:
            return "new"
        return ""

    names_total = len({n for n, _ in mentions})
    resolved_names = {v["name"] for v in out.values() if v["id"] and not v["id"].startswith("new:")}
    summary = {
        "drafts": sum(1 for _ in open(DRAFTS, encoding="utf-8")),
        "distinct_names": names_total,
        "mentions": sum(mentions.values()),
        "mentions_by_step": dict(steps_m.most_common()),
        "name_canto_pairs_by_step": dict(steps.most_common()),
        "names_resolved_somewhere": len(resolved_names),
        "share_of_mentions_resolved": round(sum(v for k, v in steps_m.items() if k in ("exact", "alias", "spelling", "context", "decided", "model")) / sum(mentions.values()), 3),
        "share_of_mentions_accounted_for": round(sum(v for k, v in steps_m.items() if k not in ("unknown", "open_role", "open_many")) / sum(mentions.values()), 3),
        "new_entities_proposed": sorted({v["id"] for v in out.values() if v["id"] and v["id"].startswith("new:")}),
        "left_to_decide": len(left),
    }
    (ROOT / "data/candidates/name_map.json").write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
    (ROOT / "reports/name_resolution.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    with open(ROOT / "reports/name_review.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["name", "mentions", "cantos", "why_open", "suggested_ids", "example_line", "example_quote", "example_kind", "suggested_decision", "decision"])
        for name, row in sorted(left.items(), key=lambda x: -x[1]["mentions"]):
            line, quote, kind = examples[name]
            w.writerow([name, row["mentions"], " ".join(sorted(row["cantos"])[:6]) + (" …" if len(row["cantos"]) > 6 else ""),
                        "/".join(sorted(row["how"])), " ".join(suggest(name, row)), line, quote, kind, proposal(name, row), ""])
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
