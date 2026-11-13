"""
The long tail of draft names, settled by a model canto by canto, for you to check.

resolve_names.py settles the names it can by rule, and you (or Claude, marked as such) decide the frequent ones.
What's left is about 3,600 (name, canto) pairs, most used once or twice: "woman_with_lamp", "the_old_brahmin",
"her_friend". A rule can't read those, and deciding them all by hand would take weeks. So a model reads each
canto's leftover names beside the quote each draft gave, and the graph's entities for that epic, and says what
each name is. Its answers are checked before they're kept:
  - a graph id must exist and belong to the canto's epic
  - anything else must be new:<slug>, ignore or concept
They go to data/seeds/name_decisions_model.csv with the canto, so "king" can mean one man in canto 20 and another
in canto 25. They count only after your own decisions, and the site and review sheets say "model" beside them.

Run from your own terminal, since `claude -p` only works there:
  .venv/bin/python scripts/resolve_names.py        first, so the leftovers are current
  .venv/bin/python scripts/name_batch.py --dry-run see the first prompt
  .venv/bin/python scripts/name_batch.py           about 115 calls; cached, so a rerun after a stop is free
  .venv/bin/python scripts/resolve_names.py        again, to apply the answers
"""
import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
BATCH = 45
OUT = ROOT / "data/seeds/name_decisions_model.csv"

RULES = """Below are names a machine used for people, groups, places and things in drafts made from one canto of a
Tamil epic, each with the Tamil words the draft quoted. For each name, say what it refers to:
- a graph id from the list, if the name clearly means that entity in this canto
- "new:<slug>" for a specific named person, place, deity or thing the graph doesn't have (a short lowercase slug;
  spellings of the same entity share one slug)
- "ignore" for someone unnamed or generic ("speaker", "women", "a messenger", "her friend") whom the quote
  doesn't identify
- "concept" for an idea, doctrine, quality or abstraction ("karma", "anger", "atoms")
Only use a graph id when the quote or the canto makes it clear. If unsure, use "ignore". Never merge two
different people who share a title: a king in one canto is not the king of another.

Reply with JSON only: {"decisions": [{"name": "...", "decision": "...", "why": "a few words"}]}"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="claude-sonnet-5-5")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    nmap = json.loads((ROOT / "data/candidates/name_map.json").read_text(encoding="utf-8"))
    graph = json.loads((ROOT / "web/public/data/graph.json").read_text(encoding="utf-8"))
    nodes = {n["id"]: n for n in graph["nodes"]}
    quotes = defaultdict(list)
    for raw in open(ROOT / "data/candidates/tier2_full.jsonl", encoding="utf-8"):
        d = json.loads(raw)
        for role, v in (d.get("roles") or {}).items():
            for name in (v if isinstance(v, list) else [v]):
                if isinstance(name, str) and len(quotes[(name, d["lines"][0][:6])]) < 2:
                    quotes[(name, d["lines"][0][:6])].append(f'{d.get("kind")}/{role}: {d.get("quote") or ""}')
    left = defaultdict(list)
    for v in nmap.values():
        if v["how"] in ("unknown", "open_role", "open_many"):
            left[v["canto"]].append(v["name"])
    jobs = []
    for canto, names in sorted(left.items()):
        for i in range(0, len(names), BATCH):
            jobs.append((canto, sorted(names)[i:i + BATCH]))
    print(f"{sum(len(n) for n in left.values())} names left in {len(left)} cantos, {len(jobs)} model calls")

    def prompt(canto, names):
        ents = "\n".join(f'{n["id"]}: {n["en"]}' for n in graph["nodes"] if canto[:3] in n["epics"])
        rows = "\n".join(f'{n} | ' + " ; ".join(quotes[(n, canto)]) for n in names)
        return f"{RULES}\n\nCanto: {canto}\n\nGraph entities:\n{ents}\n\nNames (name | kind/role: quote):\n{rows}"

    if args.dry_run:
        print(prompt(*jobs[0]))
        return
    from manichchilambu.llm import ask
    kept, bad = [], 0
    try:
        for k, (canto, names) in enumerate(jobs):
            text = ask(prompt(canto, names), model=args.model, sample=0)
            m = re.search(r"\{.*\}", text, re.S)
            try:
                got = json.loads(m.group(0)).get("decisions", []) if m else []
            except json.JSONDecodeError:
                got = []
            for g in got:
                name, dec = g.get("name"), (g.get("decision") or "").strip()
                ok = name in names and ((dec in nodes and canto[:3] in nodes[dec]["epics"]) or dec in ("ignore", "concept") or re.fullmatch(r"new:[a-z0-9_]+", dec))
                if ok:
                    kept.append({"name": name, "canto": canto, "decision": dec, "decided_by": "model", "note": (g.get("why") or "")[:80]})
                else:
                    bad += 1
            print(f"{k + 1}/{len(jobs)} {canto}", flush=True)
    except RuntimeError as stop:
        print(f"stopped: {stop}\nAnswers so far are cached. Run the same command again.")
    with open(OUT, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["name", "canto", "decision", "decided_by", "note"])
        w.writeheader()
        w.writerows(kept)
    print("done", {"decisions": len(kept), "rejected": bad}, f"-> {OUT.relative_to(ROOT)}. Now run scripts/resolve_names.py again.")


if __name__ == "__main__":
    main()
