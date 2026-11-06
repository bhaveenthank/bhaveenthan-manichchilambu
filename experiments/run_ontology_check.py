"""
Do the ontology files parse, is the whole thing consistent, and which modules does real data use?

Coverage matters because a module nobody uses is just a list of labels. So for each module I count the
records that would need it, and list the ones sitting empty.
"""
import json
from pathlib import Path

import owlrl
from rdflib import Graph, OWL

from manichchilambu.ledger import load
from manichchilambu.validate import check_shape, to_rdf

ROOT = Path(__file__).resolve().parent.parent
records = load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml")


def holds(r, name):
    return any(name in c for c in r.get("does", []))


def roles(r):
    return r.get("roles", {})


USES = {
    "m01_source": lambda r: bool(r.get("lines")),
    "m02_lexicon": lambda r: False,  # used by the matcher over the corpus, not by ledger records
    "m03_agents": lambda r: "agent" in roles(r),
    "m04_objects": lambda r: any(str(v).startswith(("ank_", "amudasurabhi", "other_bowl", "garland", "kannagi_image", "himalaya")) for v in roles(r).values()),
    "m05_events": lambda r: r["mood"] == "asserted" and bool(roles(r)),
    "m06_custody": lambda r: holds(r, "holds") or holds(r, "in_care_of"),
    "m07_states": lambda r: any(holds(r, n) for n in ("alive", "broken", "hungry", "function")),
    "m08_time": lambda r: r["t"] < 0 or r.get("life") != "main",
    "m09_place": lambda r: "place" in roles(r) or holds(r, "at"),
    "m10_speech": lambda r: len(r["voice"]) > 1 or bool(r.get("carries")),
    "m11_belief": lambda r: r["kind"] == "believe" or r["mood"] == "claimed",
    "m12_identity": lambda r: holds(r, "looks_like") or r["kind"] in ("same_person", "is_identity"),
    "m13_plans": lambda r: r["mood"] == "intended" or "purpose" in r,
    "m14_causes": lambda r: bool(r.get("because")),
    "m15_social": lambda r: r["kind"] in ("child_of", "spouse", "rules"),
    "m16_emotion": lambda r: False,
    "m17_cosmology": lambda r: r["kind"] in ("same_person", "curse", "fate_explains", "inexhaustible") or r["mood"] == "predicted",
    "m18_interpretation": lambda r: r["mood"] in ("dreamed", "metaphor", "address"),
    "m19_crosstext": lambda r: bool(r.get("retells")),
    "m20_provenance": lambda r: "check" in r,
}

g = Graph().parse(ROOT / "ontology" / "core.ttl")
files = sorted((ROOT / "ontology" / "modules").glob("*.ttl"))
for f in files:
    g.parse(f)
print(f"{len(files)} modules + core: {len(g)} triples parse fine")

# Close under OWL RL, data included, and look for a thing that's different from itself.
data = to_rdf(records)
both = g + data
owlrl.DeductiveClosure(owlrl.OWLRL_Semantics).expand(both)
clashes = [s for s, o in both.subject_objects(OWL.differentFrom) if s == o]
shape = check_shape(records)
print("after OWL RL closure with the data:", len(both), "triples, identity clashes:", len(clashes), " SHACL violations:", len(shape))

cover = {name: sum(fn(r) for r in records) for name, fn in USES.items()}
for name, n in cover.items():
    print(f"  {name:20}{n:5} records")
empty = [k for k, v in cover.items() if v == 0]
print("no records use:", empty)
(ROOT / "reports" / "ontology_check.json").write_text(json.dumps(
    {"modules": len(files), "triples": len(g), "closure_triples": len(both), "clashes": len(clashes), "shacl": len(shape), "coverage": cover, "unused": empty}, indent=1))
