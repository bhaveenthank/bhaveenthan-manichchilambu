"""
Write the graph out in plain JSON for later use (the web app, or anything else).

Every edge keeps what the sliders and filters will need: mood, voice chain, story time, birth, tier and
evidence lines. `score` stays null until there are scholar labels to calibrate against. No made-up numbers.
"""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

import yaml

from manichchilambu.ledger import Ledger, load
from manichchilambu.standards import build as standard_build
from manichchilambu.validate import to_rdf
from manichchilambu.paths import edges_of

OUT = ROOT / "data" / "graph"
OUT.mkdir(parents=True, exist_ok=True)
ents = yaml.safe_load((ROOT / "data/seeds/entities.yaml").read_text(encoding="utf-8"))
mentions = json.loads((ROOT / "data/corpus/mentions.json").read_text(encoding="utf-8"))
counts = Counter(e for v in mentions.values() for e in v)
first_seen = {}
for lid, es in mentions.items():
    for e in es:
        first_seen.setdefault(e, lid)
# Picked by hand from the search results. Matching someone here says nothing about the text, it's just an id.
qids = {"kannagi": "Q3115610", "kovalan": "Q6434829", "gajabahu": "Q5517531", "ilanko": "Q3032538",
        "madurai": "Q228405", "kanchi": "Q212332", "puhar": "Q2135463"}

records = load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml")
nodes = {e["id"]: {"id": e["id"], "label": e["en"], "class": e["cls"], "names_ta": e["names"], "epics": e["epics"],
                   "mentions": counts[e["id"]], "first_line": first_seen.get(e["id"]), "wikidata": qids.get(e["id"]), "review": "draft"}
         for e in ents}
edges = []
for r in records:
    for a, b in edges_of(r):
        for n in (a, b):
            nodes.setdefault(n, {"id": n, "label": n.replace("_", " "), "class": "Unlexed", "names_ta": [], "epics": [],
                                 "mentions": 0, "first_line": None, "wikidata": None, "review": "draft"})
        edges.append({"source": a, "target": b, "kind": r["kind"], "record": r["id"], "layer": "ledger", "tier": 0,
                      "mood": r["mood"], "voice": r["voice"], "t": r["t"], "birth": r["life"], "episode": r["ep"],
                      "lines": r["lines"], "actual": r["mood"] == "asserted", "score": None, "review": "draft"})

# Co-occurrence stays in its own layer, marked as a suggestion, so nobody reads it as a relation.
coo = json.loads((ROOT / "reports/tier1_cooccur.json").read_text())
for c in coo["candidates"]:
    edges.append({"source": c["a"], "target": c["b"], "kind": "co_occurs", "layer": "candidate", "tier": 1, "association": c["score"],
                  "count": c["count"], "mood": None, "voice": None, "t": None, "birth": None, "lines": [], "actual": None, "score": None, "review": "unreviewed"})

# Line-to-line echoes of wording, rolled up to canto pairs.
form = json.loads((ROOT / "reports/formula_pairs.json").read_text(encoding="utf-8"))
canto_links = Counter((f["a"][:6], f["b"][:6]) for f in form if f["a"][:6] != f["b"][:6])
canto_edges = [{"source": a, "target": b, "line_pairs": n, "cross_epic": a[:3] != b[:3]} for (a, b), n in canto_links.most_common()]

(OUT / "nodes.json").write_text(json.dumps(list(nodes.values()), ensure_ascii=False, indent=0), encoding="utf-8")
(OUT / "edges.json").write_text(json.dumps(edges, ensure_ascii=False, indent=0), encoding="utf-8")
(OUT / "canto_echoes.json").write_text(json.dumps(canto_edges, ensure_ascii=False, indent=0), encoding="utf-8")
(OUT / "records.json").write_text(json.dumps(records, ensure_ascii=False, indent=0), encoding="utf-8")
# Timelines the sliders can read straight off, so the app doesn't need to replay anything itself.
ledger = Ledger(records)
ticks = sorted({r["t"] for r in records})
objects = sorted({f[2] for t in ticks for f in ledger.state(t) if f[0] == "holds"})
custody = {}
for obj in objects:
    runs, last = [], None
    for t in ticks:
        now = sorted(ledger.holder(obj, t))
        if now != last:
            runs.append({"from_t": t, "holders": now})
            last = now
    custody[obj] = runs
beliefs = []
for r in records:
    if r["kind"] == "believe":
        beliefs.append({"holder": r["roles"]["holder"], "claim": r["content"], "stance": r["stance"], "t": r["t"], "lines": r["lines"]})
(OUT / "custody_timeline.json").write_text(json.dumps(custody, ensure_ascii=False, indent=0), encoding="utf-8")
(OUT / "belief_timeline.json").write_text(json.dumps(sorted(beliefs, key=lambda b: b["t"]), ensure_ascii=False, indent=0), encoding="utf-8")
# The same ledger in standard vocabularies, for anyone who wants CIDOC CRM + CRMinf + PROV-O.
standard_build(records).serialize(OUT / "ledger_as_standards.ttl", format="turtle")
to_rdf(records).serialize(OUT / "ledger.ttl", format="turtle")
layers = Counter(e["layer"] for e in edges)
print(len(nodes), "nodes;", dict(layers), "edges;", len(canto_edges), "canto links,", sum(c["cross_epic"] for c in canto_edges), "cross-epic")
