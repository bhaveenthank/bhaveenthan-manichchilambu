"""
Four layers of checks, because they catch different things:

  shape    : SHACL over the RDF export. Is the record well formed?
  story    : Python checks over the fold. Does the sequence make sense? Has a claim leaked into the facts?
             These need time and mood together, which shape rules can't see easily.
  identity : OWL reasoning over sameAs and differentFrom. Have two known-distinct things been merged?
  citation : does the cited verse exist, and does it contain the quoted phrase?

None of them can tell if a reading of the Tamil is right. A wrong agent with a real citation passes all
four. That part needs the Tier 3 judge or a scholar, and the mutation test measures exactly that gap.
"""
from collections import defaultdict
import re

import owlrl
import yaml
from rdflib import Graph, Literal, Namespace, OWL, RDF
from pyshacl import validate as shacl_validate

from manichchilambu.ledger import ROOT, FLUENT
from manichchilambu.text import line_text, squash

IY = Namespace("https://example.org/manichchilambu#")
ITEM = Namespace("https://example.org/manichchilambu/item/")
MOODS = {"asserted": IY.Asserted, "negated": IY.Negated, "claimed": IY.Claimed, "thought": IY.Thought, "command": IY.Command,
         "conditional": IY.Conditional, "intended": IY.Intended, "predicted": IY.Predicted, "wish": IY.Wish,
         "metaphor": IY.Metaphor, "address": IY.Address, "dreamed": IY.Dreamed, "question": IY.Question}


def to_rdf(records):
    g = Graph()
    g.bind("iy", IY)
    g.bind("i", ITEM)
    for r in records:
        node = ITEM[r["id"]]
        g.add((node, RDF.type, IY.Belief if r["kind"] == "believe" else IY.Record))
        if r["kind"] == "believe":
            g.add((node, RDF.type, IY.Record))
        if r.get("voice"):
            for depth, who in enumerate(r["voice"]):
                link = ITEM[f"{r['id']}_v{depth}"]
                g.add((node, IY.voice, link))
                g.add((link, IY.speaker, ITEM[who]))
                g.add((link, IY.depth, Literal(depth)))
        if r.get("mood"):
            g.add((node, IY.mood, MOODS.get(r["mood"], ITEM[r["mood"]])))
        if "t" in r:
            g.add((node, IY.storyTime, Literal(r["t"])))
        g.add((node, IY.kind, Literal(r["kind"])))
        g.add((node, IY.birth, Literal(r.get("life", "main"))))
        for line in r.get("lines", []):
            g.add((node, IY.evidence, Literal(line)))
        for role, val in r.get("roles", {}).items():
            pred = {"holder": IY.holder, "agent": IY.agent, "patient": IY.patient, "theme": IY.theme,
                    "recipient": IY.recipient, "target": IY.target, "addressee": IY.addressee}.get(role, IY[role])
            for v in (val["one_of"] if isinstance(val, dict) else val if isinstance(val, list) else [val]):
                g.add((node, pred, ITEM[v]))
        if "content" in r:
            g.add((node, IY.content, ITEM[r["content"]]))
        if "stance" in r:
            g.add((node, IY.stance, Literal(r["stance"])))
        if "contradicts" in r:
            g.add((node, IY.contradicts, ITEM[r["contradicts"]]))
    return g


def check_shape(records):
    shapes = Graph().parse(ROOT / "ontology" / "shapes.ttl")
    ok, report, text = shacl_validate(to_rdf(records), shacl_graph=shapes, inference="none")
    # Count individual violations in the human-readable report.
    return [] if ok else re.findall(r"Message: (.*)", text)


def check_citations(records):
    """Every cited line has to exist and contain the record's quoted phrase. Shape rules can't see this."""
    text = line_text()
    bad = []
    for r in records:
        if not r.get("lines"):
            continue
        missing = [l for l in r["lines"] if l not in text]
        if missing:
            bad.append(f"{r['id']}: no such line {missing}")
        elif "check" in r and squash(r["check"]) not in squash("".join(text[l] for l in r["lines"])):
            bad.append(f"{r['id']}: phrase not in cited lines")
    return bad


def check_identity(records):
    """
    OWL's job: reason over sameAs and differentFrom and look for a clash. Who's known to be distinct
    lives in data/seeds/distinct.yaml. Everything else about the records is left out on purpose.
    """
    g = Graph()
    distinct = yaml.safe_load((ROOT / "data/seeds/distinct.yaml").read_text(encoding="utf-8"))
    for a, b in distinct:
        g.add((ITEM[a], OWL.differentFrom, ITEM[b]))
    for r in records:
        if r.get("kind") == "same_as":
            names = [v for v in r["roles"].values() if isinstance(v, str)]
            if len(names) == 2:
                g.add((ITEM[names[0]], OWL.sameAs, ITEM[names[1]]))
    owlrl.DeductiveClosure(owlrl.OWLRL_Semantics).expand(g)
    return [f"{s} is declared different from itself" for s, o in g.subject_objects(OWL.differentFrom) if s == o]


def check_story(records):
    """Return a list of problems the fold can see."""
    problems = []
    ordered = sorted(records, key=lambda r: r.get("t", 0))
    by_id = {r["id"]: r for r in records}

    # 1. A claim must never change the world. If it has state changes, its mood must be asserted
    #    (thought/claimed changes are kept for the viewer's head, but the fold skips them).
    # 2. Something can't be held by two people at once, unless the text left it open.
    holders = defaultdict(set)
    dead = {}
    for r in ordered:
        if r.get("mood") != "asserted":
            continue
        for change in r.get("does", []):
            sign, name, args = FLUENT.match(change).groups()
            parts = [a.strip() for a in args.split(",")]
            if name == "holds":
                who, obj = parts
                if sign == "+":
                    others = holders[obj] - {who}
                    if others and not any(c == f"-holds({o},{obj})" for o in others for c in r["does"]):
                        problems.append(f"{r['id']}: {obj} held by {sorted(others)} and {who} at once")
                    holders[obj].add(who)
                else:
                    if who not in holders[obj]:
                        problems.append(f"{r['id']}: {who} gives up {obj} without holding it")
                    holders[obj].discard(who)
            if name == "alive" and sign == "-":
                dead.setdefault(parts[0], r.get("t", 0))

    # 3. The dead don't act in the same birth.
    for r in ordered:
        if r.get("mood") != "asserted":
            continue
        who = r.get("roles", {}).get("agent")
        # Sometimes the text really does this (Kovalan rises at SIL-19-0062), and then the record says so.
        if isinstance(who, str) and who in dead and r.get("t", 0) > dead[who] and r.get("life", "main") == "main" and not r.get("after_death"):
            problems.append(f"{r['id']}: {who} acts after death")

    for r in records:
        # 4. A disguise or rebirth must never be written as plain identity.
        if r.get("kind") == "same_as":
            problems.append(f"{r['id']}: same_as used, should be disguise, same_person or a claim")
        # 5. Promotion: a record that says the same thing as a contradicted claim, but marked as fact.
        target = r.get("promotes")
        if target:
            problems.append(f"{r['id']}: restates {target} as fact")
        # 6. A belief's claim has to exist, and be something somebody said.
        if r.get("kind") == "believe" and r.get("content") not in by_id:
            problems.append(f"{r['id']}: belief points at missing claim")
        # 7. An intention or order must not carry an effect that takes hold.
        if r.get("mood") in ("command", "conditional", "intended", "predicted", "wish") and r.get("does"):
            problems.append(f"{r['id']}: {r['mood']} record has state changes")

    # 8. Contradiction check: a claim that is contradicted can't also be told straight.
    told_straight = {(r["kind"], tuple(sorted((k, str(v)) for k, v in r["roles"].items()))) for r in records if r.get("mood") == "asserted"}
    for r in records:
        if r.get("mood") == "claimed" and any(o.get("contradicts") == r["id"] for o in records):
            key = (r["kind"], tuple(sorted((k, str(v)) for k, v in r["roles"].items())))
            if key in told_straight:
                problems.append(f"{r['id']}: contradicted claim also told as fact")

    # 9. Belief timeline: reject without an earlier accept means the sequence is out of order.
    stances = defaultdict(list)
    for r in ordered:
        if r.get("kind") == "believe":
            stances[(r["roles"].get("holder"), r.get("content"))].append(r["stance"])
    for key, seq in stances.items():
        if seq[0] == "reject":
            problems.append(f"belief {key}: rejected before ever accepted")

    return problems
