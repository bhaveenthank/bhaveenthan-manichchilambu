"""
Guarded paths: find surprising links across the epics without letting the graph claim more than the verses do.

Every shortest-path search over a story graph has the same two faults. It runs through whatever is most connected
(Puhar, "the king", "gold"), and it treats every step as equally solid, so a chain that goes through "both mention
mango" reads like a chain that goes through "she handed it to him".

So each step here carries a warrant saying what kind of link it is, and a path can only conclude what its weakest
warrant allows:

    event  : both are in one told-straight record
    said   : both are in a record somebody only said, dreamed or planned
    same   : walking through one individual (a person, the actual anklet)
    place  : walking through a place. Two events at Puhar are at Puhar and that's all
    kind   : walking through a KIND of thing. Two mangoes are two mangoes
    gloss  : a reading from outside the verse, such as kōḷi fruit = jackfruit
    wider  : one kind sits inside a wider kind. Sandalwood is a fragrant wood, not the other way round

The cost of passing through a node grows with its degree, the idea behind Adamic-Adar link prediction, so rare
connectors win and hubs lose. Two rules are hard limits rather than costs: at most one weak kind-level hop per
path, and said-only records stay out unless the reader asks for them.

Output includes `no`, the sentences the path may not be read as saying. The test in experiments/run_discovery_test.py
checks those against tempting false conclusions, and against a plain path search that has no warrants.
"""
import heapq
import math
from collections import defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
SKIP = {"poet", "unnamed", "knowledge", "birth", "risen_kovalan", "sword", "mantra", "unknown"}
WEAK = {"kind", "gloss", "wider"}
# Groups that are a word and not a set of people. "The townsfolk" of Puhar aren't the townsfolk of Madurai.
GENERIC = {"townsfolk", "brahmins", "the_virtuous", "cows", "chaste_women", "the_old", "children", "prisoners", "guards", "guard", "northern_kings", "young_animals"}
# What each role says the person actually did to the thing. Being in the same record says nothing about making it.
MAKES = {"make", "build_together"}


def things():
    return yaml.safe_load((ROOT / "data/seeds/things.yaml").read_text(encoding="utf-8"))


def _vals(v):
    if isinstance(v, dict):
        return v["one_of"]
    return v if isinstance(v, list) else [v]


class WarrantGraph:
    def __init__(self, records, node_class, kinds=None, names=None):
        """node_class: id -> Person/Place/... ; kinds: id -> things.yaml entry; names: id -> {en, ta}."""
        self.cls = node_class
        self.kinds = kinds or {}
        self.names = names or {}
        self.adj = defaultdict(list)
        self.records = {r["id"]: r for r in records}
        for r in records:
            told = r["mood"] == "asserted"
            people = [(role, v) for role, val in r["roles"].items() for v in _vals(val) if v not in SKIP]
            seen = set()
            for i, (ra, a) in enumerate(people):
                for rb, b in people[i + 1:]:
                    if a == b or (a, b) in seen:
                        continue
                    seen.add((a, b))
                    step = {"rec": r["id"], "w": "event" if told else "said", "kind": r["kind"], "ra": ra, "rb": rb}
                    self.adj[a].append((b, step))
                    self.adj[b].append((a, {**step, "ra": rb, "rb": ra}))
        for eid, ent in self.kinds.items():
            if ent.get("broader"):
                self._link(eid, ent["broader"], "wider")
            if ent.get("gloss"):
                self._link(eid, ent["gloss"]["of"], "gloss")

    def _link(self, a, b, warrant):
        step = {"rec": None, "w": warrant, "kind": warrant, "ra": "", "rb": ""}
        self.adj[a].append((b, step))
        self.adj[b].append((a, step))

    def degree(self, node):
        return len({n for n, _ in self.adj[node]})

    def through(self, node):
        """What it means to pass through this node."""
        if node in GENERIC or (node in self.kinds and self.kinds[node].get("type")):
            return "kind"
        return "place" if self.cls.get(node) == "Place" else "same"

    def search(self, start, goal, allow_said=False, allow_weak=True, allow_places=True, banned=(), max_hops=7):
        """Cheapest guarded path. A state is (node, weak hops used), so a costly route that kept its weak hop survives."""
        limit = 1 if allow_weak else 0
        best = {}
        queue = [(0.0, 0, start, 0, ())]
        tie = 0
        while queue:
            cost, _, node, weak, path = heapq.heappop(queue)
            if node == goal and path:
                return list(path), cost
            if best.get((node, weak), math.inf) <= cost or len(path) >= max_hops:
                continue
            best[(node, weak)] = cost
            for nxt, step in self.adj[node]:
                if nxt in banned or nxt == start or any(s["to"] == nxt for s in path):
                    continue
                if step["w"] == "said" and not allow_said:
                    continue
                passing = self.through(node) if node != start else None
                if passing == "place" and not allow_places:
                    continue
                # A kind, its gloss and its wider kind are one trip into kind-land, charged once.
                arrived_by_gloss = bool(path) and path[-1]["w"] in ("gloss", "wider")
                entering = (passing == "kind" and not arrived_by_gloss) or (step["w"] in ("gloss", "wider") and passing != "kind" and not arrived_by_gloss)
                spent = weak + (1 if entering else 0)
                if spent > limit:
                    continue
                tie += 1
                price = 1 + math.log1p(self.degree(nxt)) if nxt != goal else 1
                heapq.heappush(queue, (cost + price, tie, nxt, spent, path + ({"from": node, "to": nxt, "via": passing, **step},)))
        return None, math.inf

    def warrants(self, path):
        out = set()
        for s in path:
            out.add(s["w"])
            if s["via"]:
                out.add(s["via"])
        return out

    def limits(self, path):
        """What this path doesn't entitle you to say, as (en, ta) pairs."""
        used = self.warrants(path)
        name = lambda i: (self.names.get(i, {}).get("en", i), self.names.get(i, {}).get("ta", i))
        out = []
        for s in path:
            node = s["from"]
            if s["via"] == "kind":
                en, ta = name(node)
                out.append((f"Both records mention {en} as a kind of thing. Nothing here shows the same {en} in both, or that any moved between them.",
                            f"இரு பதிவுகளும் {ta} என்ற வகையைக் குறிப்பிடுகின்றன. ஒரே பொருளோ இடமாற்றமோ இதனால் நிறுவப்படவில்லை."))
            if s["via"] == "place":
                en, ta = name(node)
                out.append((f"Both things happen at {en}. That doesn't mean anything here was made or grown there, or that the people met.",
                            f"இரண்டும் {ta} இல் நிகழ்கின்றன. அங்கு விளைந்ததாகவோ, செய்யப்பட்டதாகவோ, அவர்கள் சந்தித்ததாகவோ பொருள் இல்லை."))
        if "gloss" in used:
            out.append(("One step rests on a commentator's reading of a word, not on the word itself.", "ஒரு படி உரையாசிரியர் விளக்கத்தைச் சார்ந்தது; சொல்லையே அல்ல."))
        if "wider" in used:
            out.append(("One step goes through a wider category. A sandalwood log is a fragrant wood, but 'fragrant wood' in a verse needn't be sandalwood.", "ஒரு படி பரந்த வகை வழியாகச் செல்கிறது. விரை மரம் என்பது சந்தனமாகத்தான் இருக்க வேண்டும் என்பதில்லை."))
        if "said" in used:
            out.append(("One step is only something a character said, and the graph doesn't count it as having happened.", "ஒரு படி ஒரு பாத்திரத்தின் கூற்று மட்டுமே; நிகழ்ந்ததாகக் கொள்ளப்படவில்லை."))
        return out

    def licences_making(self, who, what):
        """Only an explicit make record can say someone made something. Sharing a record never will."""
        for r in self.records.values():
            if r["kind"] in MAKES and r["mood"] == "asserted" and who in _vals(r["roles"].get("agent", [])) and what in _vals(r["roles"].get("theme", [])):
                return True
        return False


def surprise(graph, path):
    """
    Rare connectors, reach across both epics and a mix of things score high. Weak warrants pay for what they
    can't prove, and very long chains get marked down because they stop saying anything. Nothing has validated
    this as "interesting" yet, that needs readers: it only sets the order things are listed in.
    """
    middle = [s["to"] for s in path[:-1]]
    rare = sum(1 / math.log(2 + graph.degree(n)) for n in middle) / max(len(middle), 1) * 3
    epics = {graph.records[s["rec"]]["lines"][0][:3] for s in path if s["rec"]}
    weak = len(graph.warrants(path) & WEAK)
    classes = {graph.cls.get(n, "Person") for n in [path[0]["from"], *[s["to"] for s in path]]}
    # A place at either end is dull, everything happens somewhere. Things and groups are what this search is for.
    ends = [graph.cls.get(path[0]["from"]), graph.cls.get(path[-1]["to"])]
    # Sharing a city is the thinnest link there is, and it was flooding the top of the list.
    places = sum(st["via"] == "place" for st in path)
    material = -0.8 * places + 0.5 * sum(e in ("Food", "Material", "Thing", "Object", "Group") for e in ends) - 0.6 * ends.count("Place")
    return round(rare + (1.5 if len(epics) > 1 else 0) + 0.3 * len(classes) - 0.3 * weak - 0.35 * max(0, len(path) - 4) + material, 3)
