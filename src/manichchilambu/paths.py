"""
Path search on the ledger. Three settings, from careless to careful:

  plain   : every record is an edge, whoever said it, in whatever mood.
  actual  : only records that count as having happened under the reader policy.
  lawful  : actual, and you can't walk from one birth into another except across a same_person record.

The output is the steps and the verse lines behind each, so a reader can check every hop.
"""
from collections import deque

from manichchilambu.ledger import story, everything

PEOPLE_ROLES = ("agent", "holder", "patient", "target", "recipient", "addressee", "theme", "later", "earlier",
                "beneficiary", "companion", "source", "place", "instrument", "form", "seen", "is", "content_of")
# Things that would connect anything to anything. Same trick as dropping hub nodes in any path study.
HUBS = {"sword", "mantra", "fire", "guards"}


def edges_of(rec):
    roles = rec["roles"]
    names = []
    for key in PEOPLE_ROLES:
        v = roles.get(key)
        for x in (v if isinstance(v, list) else [v]):
            if isinstance(x, str) and x not in HUBS:
                names.append((key, x))
    out = []
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            out.append((names[i][1], names[j][1]))
    return out


def build(records, policy):
    graph = {}
    for r in records:
        if not policy(r):
            continue
        for a, b in edges_of(r):
            graph.setdefault(a, []).append((b, r))
            graph.setdefault(b, []).append((a, r))
    return graph


def shortest(graph, start, goal, lawful=False):
    """Breadth-first. For lawful search the state includes which birth we're standing in."""
    if start not in graph or goal not in graph:
        return None
    first = (start, None)
    seen = {first}
    queue = deque([(first, [])])
    while queue:
        (node, life), path = queue.popleft()
        if node == goal:
            return path
        for nxt, rec in graph.get(node, []):
            crossing = rec["kind"] == "same_person"
            if lawful and not crossing:
                if life is not None and rec["life"] != life:
                    continue
            # Crossing a same_person record frees you to enter the other birth.
            new_life = None if crossing else rec["life"]
            state = (nxt, new_life)
            if state in seen:
                continue
            seen.add(state)
            queue.append((state, path + [rec]))
    return None
