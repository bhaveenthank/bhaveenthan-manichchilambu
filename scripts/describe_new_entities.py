"""
Describe the entities the drafts name that the graph doesn't have yet, so they can join it.

resolve_names.py marks a draft name `new:<slug>` when it's a real person, place, deity or thing missing from the
graph (the Kaveri, the Buddha, Murugan...). This script gathers every such slug with the names the drafts used for
it and the Tamil words they quoted, and asks a model for what a node needs:
  en, ta   : the display name in English and in Tamil script
  cls      : Person, Group, Deity, Place, Object, Material, Food or Other
  also     : other spellings, in roman letters and Tamil
  kind     : true for a kind of thing ("a ship"), false for one individual ("the ship Saduvan sailed")
  same_as  : an existing graph id or another slug, if it's really the same entity
Answers are checked before they're kept: the class must be one of the eight, the Tamil name must be in Tamil
script, and a same_as must point at something that exists. The result, data/seeds/entities_drafted.yaml, is marked
as machine-described and unreviewed, and the site says so on every such node.

  .venv/bin/python scripts/describe_new_entities.py
Cached like every model call, so a rerun costs nothing.
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
CLASSES = ["Person", "Group", "Deity", "Place", "Object", "Material", "Food", "Other"]
BATCH = 25
TAMIL = re.compile(r"[஀-௿]")

PROMPT = """These are names a machine gave to people, groups, deities, places and things in drafts made from two Tamil
epics, Silappatikaram (SIL) and Manimekalai (MAN). None of them is in the knowledge graph yet. For each slug, using
the names and the quoted Tamil words, give:
- "en": a short English display name (a proper name as it's usually spelled, or "the ..." for an unnamed person or thing)
- "ta": the name in Tamil script, as the text writes it
- "cls": one of Person, Group, Deity, Place, Object, Material, Food, Other
- "also": other spellings people might type, in roman letters and Tamil (up to 4)
- "kind": true if it's a kind of thing (ships in general), false if it's one individual
- "same_as": an existing graph id from the list below, or another slug in this batch, if it is the same entity; else null
Only use same_as when you are sure. Two people who share a title are different people.

Existing graph ids (id: English name):
{existing}

Slugs:
{rows}

Reply with JSON only: {{"entities": [{{"slug": "...", "en": "...", "ta": "...", "cls": "...", "also": [], "kind": false, "same_as": null}}]}}"""


def main():
    nmap = json.loads((ROOT / "data/candidates/name_map.json").read_text(encoding="utf-8"))
    graph = json.loads((ROOT / "web/public/data/graph.json").read_text(encoding="utf-8"))
    existing = {n["id"]: n for n in graph["nodes"]}
    names, cantos, mentions = defaultdict(set), defaultdict(set), defaultdict(int)
    for v in nmap.values():
        if v["id"] and v["id"].startswith("new:"):
            slug = v["id"][4:]
            names[slug].add(v["name"])
            cantos[slug].add(v["canto"])
            mentions[slug] += v["mentions"]
    quotes = defaultdict(list)
    for raw in open(ROOT / "data/candidates/tier2_full.jsonl", encoding="utf-8"):
        d = json.loads(raw)
        canto = d["lines"][0][:6]
        for val in (d.get("roles") or {}).values():
            for name in (val if isinstance(val, list) else [val]):
                got = (nmap.get(f"{name}|{canto}") or {}).get("id") if isinstance(name, str) else None
                if got and got.startswith("new:") and len(quotes[got[4:]]) < 3 and d.get("quote"):
                    quotes[got[4:]].append(d["quote"])
    slugs = sorted(names, key=lambda s: -mentions[s])
    print(f"{len(slugs)} new entities, {sum(mentions.values())} mentions, {-(-len(slugs) // BATCH)} model calls")
    ex = "\n".join(f'{i}: {n["en"]}' for i, n in sorted(existing.items()))
    from manichchilambu.llm import ask
    out, bad = {}, []
    for k in range(0, len(slugs), BATCH):
        part = slugs[k:k + BATCH]
        rows = "\n".join(f'{s} | names: {", ".join(sorted(names[s]))} | cantos: {" ".join(sorted(cantos[s])[:5])} | quotes: {" ; ".join(quotes[s])}' for s in part)
        text = ask(PROMPT.format(existing=ex, rows=rows), model="claude-sonnet-5-5", sample=0)
        m = re.search(r"\{.*\}", text, re.S)
        try:
            got = json.loads(m.group(0)).get("entities", []) if m else []
        except json.JSONDecodeError:
            got = []
        for g in got:
            s = g.get("slug")
            if s not in part:
                continue
            same = g.get("same_as")
            if same and same not in existing and same not in slugs:
                same = None
            if g.get("cls") not in CLASSES or not g.get("en") or not TAMIL.search(g.get("ta") or ""):
                bad.append(s)
                continue
            out[s] = {"id": s, "cls": g["cls"], "en": g["en"].strip(), "ta": g["ta"].strip(), "also": [a for a in (g.get("also") or []) if isinstance(a, str)][:4],
                      "kind": bool(g.get("kind")), "same_as": same, "epics": sorted({c[:3] for c in cantos[s]}), "mentions_in_drafts": mentions[s],
                      "draft_names": sorted(names[s]), "source": "machine-described from the drafts", "review": "draft"}
        print(f"{min(k + BATCH, len(slugs))}/{len(slugs)}", flush=True)
    path = ROOT / "data/seeds/entities_drafted.yaml"
    header = ("# Entities the machine drafts name that the hand-made list (entities.yaml) didn't have.\n"
              "# Written by scripts/describe_new_entities.py: a model described each one, and its answers were checked by rule.\n"
              "# review: draft until a Tamil scholar checks them. The site marks these nodes as machine-described.\n")
    path.write_text(header + yaml.safe_dump(sorted(out.values(), key=lambda e: -e["mentions_in_drafts"]), allow_unicode=True, sort_keys=False, width=200), encoding="utf-8")
    merged = sum(1 for e in out.values() if e["same_as"])
    print("done", {"described": len(out), "same_as_existing_or_other": merged, "rejected": len(bad)}, f"-> {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
