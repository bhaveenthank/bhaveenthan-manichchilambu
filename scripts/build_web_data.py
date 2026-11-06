"""
Turn the ledger, the corpus and the finders' output into small JSON files for the web app.

The app is static, so it can live on GitHub Pages with no server. Canto text is split per canto and only
loaded when someone opens one. Everything the site shows comes from here and stays marked as draft.
"""
import csv
import json
from collections import Counter, defaultdict
from itertools import combinations
from pathlib import Path

import yaml

from manichchilambu.compose import reading_time
from manichchilambu.discover import GENERIC, WarrantGraph, surprise, things
from manichchilambu.ledger import Ledger, load
from manichchilambu.text import entities, line_text, lines, mentions

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "public" / "data"
(OUT / "cantos").mkdir(parents=True, exist_ok=True)
WEB = ROOT / "data" / "web"
SEEDS = ROOT / "data" / "seeds"
GLOSS = {**yaml.safe_load((WEB / "record_glosses.yaml").read_text(encoding="utf-8")), **yaml.safe_load((WEB / "material_glosses.yaml").read_text(encoding="utf-8")), **yaml.safe_load((WEB / "coverage_glosses.yaml").read_text(encoding="utf-8"))}
THINGS = things()
NAMES = {**yaml.safe_load((WEB / "names.yaml").read_text(encoding="utf-8")), **THINGS}
CANTO_INFO = yaml.safe_load((WEB / "cantos.yaml").read_text(encoding="utf-8"))
TEXT = line_text()
ROWS = lines()
MENTIONS = mentions()
RECORDS = load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml", "ledger_material.yaml", "ledger_coverage.yaml")

# Things that aren't in the entity list get their class here.
OBJECTS = {"ank_pair", "ank_k1", "ank_k2", "ank_q", "gems", "pearls", "other_bowl", "garland", "kannagi_image", "sceptre", "himalaya_stone", "sword", "mantra"}
PLACES = {"palace_gate", "prison_site", "kannagi_temple", "temple_lodging", "flower_grove", "crystal_room", "seat_of_buddha"}
GROUPS = {"goldsmiths_1000", "brahmins", "the_virtuous", "cows", "chaste_women", "the_old", "children", "prisoners", "townsfolk", "northern_kings", "hill_folk", "guards"}
DEITIES = {"vindhya_demoness", "pillar", "unnamed_deity"}
OTHER = {"knowledge", "birth", "fire", "risen_kovalan", "unnamed", "disguised_woman", "town_woman", "male_ascetic"}
# Voices and stand-ins that shouldn't float around the graph as if they were characters.
NOT_NODES = {"poet", "unnamed", "knowledge", "birth", "risen_kovalan"}
ROLE_ORDER = ("agent", "holder", "patient", "target", "recipient", "addressee", "theme", "later", "earlier",
              "beneficiary", "companion", "source", "place", "instrument", "form", "seen", "is", "content_of")
FORMS = (("காதை", "Narrative canto (kātai)"), ("கதை", "Narrative canto (kātai)"), ("வரி", "Song sequence (vari)"), ("குரவை", "Round dance (kuravai)"),
         ("மாலை", "Garland of verses (mālai)"), ("பாடல்", "Song of blessing (pāṭal)"), ("பதிகம்", "Prologue (patikam)"), ("கட்டுரை", "Closing statement (kaṭṭurai)"))


# Which graph layer a record belongs to. Material episodes are provenance; lies and beliefs are testimony.
MATERIAL_EPS = {"meal", "craft", "jewels", "gifts", "pavilion", "tribute", "wreck", "festival", "child", "bowl", "city", "letter"}


def layer_of(r):
    if r["kind"] == "believe" or r["mood"] in ("claimed", "thought") or "content" in r:
        return "belief"
    return "material" if r["ep"] in MATERIAL_EPS else "event"


def class_of(eid, ent_by_id):
    if eid in THINGS:
        cls = THINGS[eid]["cls"]
        return "Object" if cls == "Thing" else cls
    if eid in ent_by_id:
        return ent_by_id[eid]["cls"]
    for name, group in (("Object", OBJECTS), ("Place", PLACES), ("Group", GROUPS), ("Deity", DEITIES), ("Other", OTHER)):
        if eid in group:
            return name
    return "Person"


def values(v):
    if isinstance(v, dict):
        return v["one_of"]
    return v if isinstance(v, list) else [v]


def canto_key(line_id):
    return line_id[:6]


def build_records():
    out = []
    for r in RECORDS:
        out.append({
            "id": r["id"], "ep": r["ep"], "kind": r["kind"], "en": GLOSS[r["id"]][0], "ta": GLOSS[r["id"]][1], "roles": r["roles"],
            "voice": r["voice"], "mood": r["mood"], "t": r["t"], "birth": r["life"], "epic": r["lines"][0][:3], "layer": layer_of(r),
            "lines": [{"id": l, "text": TEXT[l]} for l in r["lines"]], "quote": r["check"],
            **{k: r[k] for k in ("does", "because", "carries", "content", "stance", "contradicts", "conflicts", "retells", "condition", "inferred", "unresolved", "note", "purpose", "after_death") if k in r},
        })
    return out


def build_graph():
    ents = {e["id"]: e for e in entities()}
    counts = Counter(e for v in MENTIONS.values() for e in v)
    first = {}
    epics = defaultdict(set)
    for lid, es in MENTIONS.items():
        for e in es:
            first.setdefault(e, lid)
            epics[e].add(lid[:3])
    used = set()
    edges = []
    for r in RECORDS:
        names = []
        for role in ROLE_ORDER:
            for v in values(r["roles"].get(role, [])):
                if v not in NOT_NODES and v not in ("sword", "mantra"):
                    names.append((role, v))
        for _, v in names:
            used.add(v)
            epics[v].add(r["lines"][0][:3])
        # Link the lead participant to each of the others, not all pairs, so one event doesn't become a hairball.
        for (lead_role, lead), (role, other) in zip([names[0]] * (len(names) - 1) if names else [], names[1:]):
            if lead != other:
                edges.append({"s": lead, "t": other, "kind": r["kind"], "role": role, "rec": r["id"], "mood": r["mood"],
                              "tm": r["t"], "birth": r["life"], "ep": r["ep"], "epic": r["lines"][0][:3], "layer": layer_of(r), "cause": bool(r.get("because"))})
    nodes = []
    for eid in sorted(used | set(ents)):
        n = NAMES[eid]
        ent = ents.get(eid, {})
        nodes.append({"id": eid, "en": n["en"], "ta": n["ta"], "also": n.get("also", []) + ent.get("names", []), "cls": class_of(eid, ents),
                      "epics": sorted(epics[eid] or set(ent.get("epics", []))), "mentions": counts[eid], "first": first.get(eid), **({"unnamed": True} if n.get("unnamed") else {}),
                      **({"kind": True} if eid in GENERIC or n.get("type") else {}), **({"broader": n["broader"]} if n.get("broader") else {}), **({"gloss": n["gloss"]} if n.get("gloss") else {})})
    coo = json.loads((ROOT / "reports/tier1_cooccur.json").read_text())
    suggestions = [{"s": c["a"], "t": c["b"], "n": c["count"]} for c in coo["candidates"] if not c["in_ledger"] and c["a"] in used | set(ents) and c["b"] in used | set(ents)]
    return {"nodes": nodes, "edges": edges, "suggested": suggestions}


def build_cantos():
    csv_rows = {f"{r['epic']}-{int(r['canto']):02d}": r for r in csv.DictReader(open(ROOT / "data/corpus/cantos.csv", encoding="utf-8"))}
    people = defaultdict(Counter)
    for lid, es in MENTIONS.items():
        people[canto_key(lid)].update(es)
    events = defaultdict(Counter)
    for raw in open(ROOT / "data/candidates/tier1_events.jsonl", encoding="utf-8"):
        item = json.loads(raw)
        events[canto_key(item["line"])][item["class"]] += 1
    recs = defaultdict(list)
    for r in RECORDS:
        for key in {canto_key(l) for l in r["lines"]}:
            recs[key].append(r["id"])
    # How much of each canto the records actually cite, so the site can show coverage instead of implying it.
    cited, drafted = defaultdict(set), defaultdict(set)
    for r in RECORDS:
        for l in r["lines"]:
            cited[canto_key(l)].add(l)
    for key, rows in build_machine().items():
        for row in rows:
            drafted[key] |= {l["id"] for l in row["lines"]}
    formula = json.loads((ROOT / "reports/formula_pairs.json").read_text(encoding="utf-8"))
    echo = Counter()
    for f in formula:
        if f["cross_epic"]:
            echo[canto_key(f["a"])] += 1
            echo[canto_key(f["b"])] += 1
    out = []
    for key, row in csv_rows.items():
        info = CANTO_INFO[key]
        title = row["title"] if key != "MAN-00" else "பதிகம்"
        form = next((label for stem, label in FORMS if stem in title), "Narrative canto (kātai)")
        if key == "MAN-00":
            form = "Prologue (patikam)"
        n = int(row["lines"])
        out.append({"key": key, "epic": row["epic"], "n": int(row["canto"]), "title": title, "en": info["en"], "lines": n, "form": form,
                    "metres": [m for m in row["metres"].split(" | ") if m], "setting": info["setting"], "themes": info["themes"],
                    "kandam": next((r["kandam"] for r in ROWS if r["id"].startswith(key)), ""), "people": [e for e, _ in people[key].most_common(8)],
                    "events": dict(events[key].most_common(4)), "records": recs[key], "echo": echo[key],
                    "cited": len(cited[key]), "drafted": len(drafted[key] | cited[key]),
                    "length": "Short, under 100 lines" if n < 100 else "Medium, 100 to 199 lines" if n < 200 else "Long, 200 lines or more"})
    return out


def write_canto_text():
    by_canto = defaultdict(list)
    mentioned = defaultdict(list)
    for r in RECORDS:
        for l in r["lines"]:
            mentioned[l].append(r["id"])
    for row in ROWS:
        by_canto[canto_key(row["id"])].append({"id": row["id"], "n": row["line"], "text": row["text"], "who": MENTIONS.get(row["id"], []), "rec": mentioned.get(row["id"], [])})
    for key, rows in by_canto.items():
        (OUT / "cantos" / f"{key}.json").write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def build_echoes():
    formula = json.loads((ROOT / "reports/formula_pairs.json").read_text(encoding="utf-8"))
    cross = [{"a": f["a"], "b": f["b"], "score": f["score"], "ta": f["text_a"], "tb": f["text_b"]} for f in formula if f["cross_epic"]]
    pairs = Counter((canto_key(f["a"]), canto_key(f["b"])) for f in formula if f["cross_epic"])
    links = [{"a": a, "b": b, "n": n} for (a, b), n in pairs.most_common()]
    return {"lines": cross, "cantos": links}


def build_timelines():
    ledger = Ledger(RECORDS)
    ticks = sorted({r["t"] for r in RECORDS})
    objects = sorted({f[2] for t in ticks for f in ledger.state(t) if f[0] == "holds"})
    custody = {}
    for obj in objects:
        runs, last = [], None
        for t in ticks:
            now = sorted(ledger.holder(obj, t))
            if now != last:
                source = next((r["id"] for r in ledger.records if r["t"] == t and any(obj in c for c in r.get("does", []))), None)
                runs.append({"t": t, "holders": now, "rec": source})
                last = now
        custody[obj] = runs
    return {"custody": custody}


def build_discoveries(graph):
    """Rank guarded paths between minor nodes. Heavily connected endpoints are dull, everyone can reach them."""
    cls = {n["id"]: n["cls"] for n in graph["nodes"]}
    names = {n["id"]: {"en": n["en"], "ta": n["ta"]} for n in graph["nodes"]}
    g = WarrantGraph(RECORDS, cls, THINGS, names)
    ends = sorted(n for n in g.adj if g.degree(n) <= 9 and cls.get(n) in ("Person", "Group", "Object", "Food", "Material", "Deity", "Place") and n not in GENERIC)
    found = []
    for i, a in enumerate(ends):
        for b in ends[i + 1:]:
            if cls[a] == cls[b] == "Place":
                continue
            path, _ = g.search(a, b, max_hops=6)
            if not path or len(path) < 3:
                continue
            epics = sorted({g.records[s["rec"]]["lines"][0][:3] for s in path if s["rec"]})
            found.append({"a": a, "b": b, "score": surprise(g, path), "epics": epics, "warrants": sorted(g.warrants(path)), "kinds": sorted({cls.get(a), cls.get(b)}),
                          "steps": [{"from": s["from"], "to": s["to"], "rec": s["rec"], "w": s["w"], "via": s["via"]} for s in path],
                          "no": [{"en": e, "ta": t} for e, t in dict.fromkeys(g.limits(path))]})
    found.sort(key=lambda p: (-p["score"], p["a"], p["b"]))
    # Keep the list varied: no endpoint or middle node gets to dominate it.
    used, keep = Counter(), []
    for p in found:
        middle = [s["to"] for s in p["steps"][:-1]]
        if used[p["a"]] >= 4 or used[p["b"]] >= 4 or any(used[f"m:{m}"] >= 14 for m in middle):
            continue
        keep.append(p)
        used.update([p["a"], p["b"], *[f"m:{m}" for m in middle]])
        if len(keep) == 120:
            break
    return keep


def build_lexicon():
    raw = yaml.safe_load((SEEDS / "lexicon.yaml").read_text(encoding="utf-8"))
    out = {}
    for name, entries in raw.items():
        rows = []
        for e in entries:
            if name == "homonyms":
                e = {**e, "senses": [{**s, "text": TEXT[s["line"]]} for s in e["senses"]]}
            else:
                e = {**e, "text": TEXT[e["line"]]}
            rows.append(e)
        out[name] = rows
    return out


def build_catalogue():
    """The 24 categories and the catalogue items, each with its evidence line and every line its form turns up in.
    Those other lines are string matches: the site labels them as unchecked."""
    cat = yaml.safe_load((SEEDS / "catalogue.yaml").read_text(encoding="utf-8"))
    squashed = [(r["id"], r["text"].replace(" ", "")) for r in ROWS]
    items = []
    for it in cat["items"]:
        forms = [f.replace(" ", "") for f in it["forms"] if len(f.replace(" ", "")) > 3]
        seen = [lid for lid, t in squashed if any(f in t for f in forms)] if it["status"] != "title" else []
        items.append({**it, "text": TEXT[it["line"]], "seen": len(seen), "also": [l for l in seen if l != it["line"]][:24]})
    return {"taxonomy": cat["taxonomy"], "items": items}


def build_machine():
    """Records a model proposed in the full run, by canto. Nobody has checked these, and the site says so."""
    path = ROOT / "data/candidates/tier2_full.jsonl"
    out = defaultdict(list)
    if path.exists():
        for raw in open(path, encoding="utf-8"):
            c = json.loads(raw)
            out[c["lines"][0][:6]].append({"kind": c.get("kind"), "roles": c.get("roles"), "voice": c.get("voice"), "mood": c.get("mood"), "lines": [{"id": l, "text": TEXT[l]} for l in c["lines"]], "quote": c.get("quote")})
    return out


def main():
    records, graph, cantos = build_records(), build_graph(), build_cantos()
    write_canto_text()
    dump = lambda name, data: (OUT / name).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    dump("records.json", records)
    dump("graph.json", graph)
    dump("cantos.json", cantos)
    dump("echoes.json", build_echoes())
    dump("timelines.json", build_timelines())
    discoveries = build_discoveries(graph)
    dump("discover.json", discoveries)
    dump("lexicon.json", build_lexicon())
    dump("gaps.json", yaml.safe_load((SEEDS / "gaps.yaml").read_text(encoding="utf-8")))
    dump("bridges.json", yaml.safe_load((SEEDS / "bridges.yaml").read_text(encoding="utf-8")))
    machine = build_machine()
    (OUT / "machine").mkdir(exist_ok=True)
    for key, rows in machine.items():
        dump(f"machine/{key}.json", rows)
    dump("search.json", [[r["id"], r["text"]] for r in ROWS])
    dump("catalogue.json", build_catalogue())
    summary = {"records": len(records), "nodes": len(graph["nodes"]), "edges": len(graph["edges"]), "lines": len(ROWS), "cantos": len(cantos),
               "crossEpicLines": sum(1 for _ in build_echoes()["lines"]), "discoveries": len(discoveries),
               "crossDiscoveries": sum(1 for d in discoveries if len(d["epics"]) > 1), "machineCantos": sorted(machine), "cantosWithRecords": sum(1 for c in cantos if c["records"])}
    dump("meta.json", summary)
    cited = {l for r in RECORDS for l in r["lines"]}
    per_canto = Counter(k for r in RECORDS for k in {l[:6] for l in r["lines"]})
    (ROOT / "reports/coverage.json").write_text(json.dumps({"records": len(RECORDS), "cantos_with_records": len(per_canto), "lines_cited": len(cited), "lines_total": len(ROWS),
                                                            "share_of_lines_cited": round(len(cited) / len(ROWS), 3), "records_per_canto": dict(sorted(per_canto.items()))}, indent=1), encoding="utf-8")
    print(summary)


if __name__ == "__main__":
    main()
