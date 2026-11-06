"""
Several ways of storing the same ledger, all answering through the same small interface.

The point is a fair fight, so each baseline gets the most generous honest reading of
what that representation can hold. If a method can't hold a piece of information it
returns None, which counts as "can't answer" and not as wrong. A wrong answer is
worse than no answer, because a reader trusts it.

  flat_all    : triples from every record, the way a plain extractor would do it
  flat_clean  : triples from asserted records only, the best a triple store can do
  nary        : one node per event with all roles, W3C n-ary pattern, no scope at all
  qualified   : n-ary + qualifiers (mood, last speaker, time, life), the Wikidata style
  contexts    : n-ary inside named graphs keyed by (voice, mood), McCarthy/ist style
  standards   : CIDOC CRM + CRMinf + PROV-O + OWL-Time in real RDF, real SPARQL (standards.py)
  ledger      : the method in ledger.py
"""
from manichchilambu.ledger import Ledger, story, everything

TRANSFER_TO = {"give": "recipient", "take": "agent", "receive": "recipient", "deposit": "place", "bring": "agent"}
TRANSFER_FROM = {"take": "source", "deposit": "agent", "give": "agent"}


def _plain(value):
    """Baselines have no way to say 'one of these', they pick the first."""
    if isinstance(value, dict):
        return value["one_of"][0]
    return value[0] if isinstance(value, list) else value


class Base:
    name = "base"

    def __init__(self, records):
        self.records = sorted(records, key=lambda r: r["t"])

    def size(self):
        return 0

    # Everything starts out as "cannot answer".
    def happened(self, kind, roles): return None
    def tellers(self, kind, roles): return None
    def role_of(self, kind, roles, role): return None
    def holder(self, obj, t): return None
    def belief(self, holder, content, t): return None
    def alive(self, who, t): return None
    def causes(self, kind, roles): return None
    def open_values(self, kind, roles, role): return None
    def conflicts(self, kind, roles): return None
    def viewer_sees(self, viewer, t, kind, roles): return None
    def state_of(self, thing, t): return None
    def retellings(self, kind, roles): return None


class Flat(Base):
    """Triples like (kovalan, steal, ank_q). Star-expanded from whoever the agent-like role is."""

    def __init__(self, records, only_asserted=False):
        super().__init__(records)
        self.name = "flat_clean" if only_asserted else "flat_all"
        self.triples = set()
        for r in self.records:
            if only_asserted and r["mood"] != "asserted":
                continue
            roles = {k: _plain(v) for k, v in r["roles"].items()}
            head = next((roles[k] for k in ("agent", "holder", "theme", "patient", "seen") if k in roles), None)
            for k, v in roles.items():
                if v != head:
                    self.triples.add((head, r["kind"], v))
            if len(roles) == 1:
                self.triples.add((head, r["kind"], None))

    def size(self):
        return len(self.triples)

    def happened(self, kind, roles):
        values = list(roles.values())
        # True if every asked-for value sits on some triple of this kind. No way to check it's one event.
        return all(any(t[1] == kind and v in (t[0], t[2]) for t in self.triples) for v in values)

    def role_of(self, kind, roles, role):
        # A triple has lost the role names. Return a value only when just one candidate is left.
        known = set(roles.values())
        options = set()
        for s, p, o in self.triples:
            if p == kind and (s in known or o in known):
                options |= {s, o} - known - {None}
        return options.pop() if len(options) == 1 else None

    def holder(self, obj, t):
        # No time in a triple, so we can only list everyone ever linked to it by a transfer word.
        got = {s for s, p, o in self.triples if p in ("take", "bring") and o == obj}
        got |= {o for s, p, o in self.triples if p in ("give", "receive") and (s == obj or o != obj) and (s, p, obj) in self.triples}
        return got or None

    def alive(self, who, t):
        return not any(p in ("kill", "die") and who in (s, o) for s, p, o in self.triples)


class Nary(Base):
    """One node per event with named roles. Good for who-did-what-to-whom, blind to who says so."""
    name = "nary"

    def size(self):
        return sum(1 + len(r["roles"]) for r in self.records)

    def _match(self, kind, roles):
        out = []
        for r in self.records:
            if r["kind"] == kind and all(k in r["roles"] and _plain(r["roles"][k]) == v for k, v in roles.items()):
                out.append(r)
        return out

    def happened(self, kind, roles):
        return bool(self._match(kind, roles))

    def role_of(self, kind, roles, role):
        hit = self._match(kind, roles)
        return _plain(hit[0]["roles"][role]) if hit and role in hit[0]["roles"] else None

    def alive(self, who, t):
        return not any(r["kind"] in ("kill", "die") and r["roles"].get("patient") == who for r in self.records)


class Qualified(Nary):
    """n-ary plus qualifiers: mood, last speaker, time, life. The strongest baseline by some distance."""
    name = "qualified"

    def size(self):
        return sum(1 + len(r["roles"]) + 4 for r in self.records)

    def happened(self, kind, roles):
        return any(r["mood"] == "asserted" for r in self._match(kind, roles))

    def tellers(self, kind, roles):
        # Only the last speaker fits in one qualifier, the chain above it is gone.
        hit = self._match(kind, roles)
        return [[r["voice"][-1]] for r in hit] if hit else None

    def holder(self, obj, t):
        # Latest asserted transfer before t. This is hand-written query logic, the store itself doesn't know.
        latest = None
        for r in self.records:
            if r["t"] <= t and r["mood"] == "asserted" and r["kind"] in TRANSFER_TO and _plain(r["roles"].get("theme")) == obj:
                latest = r["roles"].get(TRANSFER_TO[r["kind"]])
        return {latest} if latest else None

    def belief(self, holder, content, t):
        # The stance can be a qualifier and the claim can be pointed at by id, so this works.
        stance = None
        for r in self.records:
            if r["kind"] == "believe" and r["roles"].get("holder") == holder and r.get("content") == content and r["t"] <= t:
                stance = r["stance"]
        return stance

    def alive(self, who, t):
        return not any(r["t"] <= t and r["mood"] == "asserted" and r["kind"] in ("kill", "die", "swallowed") and r["roles"].get("patient") == who for r in self.records)

    def causes(self, kind, roles):
        hit = [r for r in self._match(kind, roles) if r["mood"] == "asserted"]
        return {(c["of"], c["rel"]) for r in hit for c in r.get("because", [])} if hit else None


class Contexts(Nary):
    """Each (voice, mood) gets its own named graph. Scope is perfect, time isn't there."""
    name = "contexts"

    def size(self):
        return sum(1 + len(r["roles"]) + 1 for r in self.records)

    def happened(self, kind, roles):
        return any(r["mood"] == "asserted" for r in self._match(kind, roles))

    def tellers(self, kind, roles):
        hit = self._match(kind, roles)
        return [r["voice"] for r in hit] if hit else None

    def conflicts(self, kind, roles):
        hit = self._match(kind, roles)
        if not hit:
            return None
        ids = {h["id"] for h in hit}
        return {r["id"] for r in self.records if r.get("conflicts") in ids or r.get("contradicts") in ids}

    def causes(self, kind, roles):
        hit = [r for r in self._match(kind, roles) if r["mood"] == "asserted"]
        return {(c["of"], c["rel"]) for r in hit for c in r.get("because", [])} if hit else None


class LedgerRep(Base):
    name = "ledger"

    def __init__(self, records):
        super().__init__(records)
        self.L = Ledger(records)

    def size(self):
        # event node + roles + voice chain links + mood + time + life + state changes
        return sum(1 + len(r["roles"]) + len(r["voice"]) + 3 + len(r.get("does", [])) for r in self.records)

    def happened(self, kind, roles):
        return bool(self.L.find(kind, roles, policy=story))

    def tellers(self, kind, roles):
        return self.L.tellers(kind, roles) or None

    def role_of(self, kind, roles, role):
        hit = self.L.find(kind, roles)
        return _plain(hit[0]["roles"][role]) if hit and role in hit[0]["roles"] else None

    def holder(self, obj, t):
        return self.L.holder(obj, t) or None

    def belief(self, holder, content, t):
        return self.L.belief(holder, content, t)

    def alive(self, who, t):
        return self.L.alive(who, t)

    def causes(self, kind, roles):
        hit = self.L.find(kind, roles, policy=story)
        return {(c["of"], c["rel"]) for r in hit for c in r.get("because", [])} if hit else None

    def open_values(self, kind, roles, role):
        hit = self.L.find(kind, roles)
        return self.L.open_values(hit[0]["id"], role) if hit else None

    def conflicts(self, kind, roles):
        hit = self.L.find(kind, roles)
        return set().union(*[self.L.conflicts(h["id"]) for h in hit]) if hit else None

    def state_of(self, thing, t):
        return sorted(" ".join(f) for f in self.L.state_of(thing, t))

    def retellings(self, kind, roles):
        hit = self.L.find(kind, roles)
        return set().union(*[self.L.retellings(h["id"]) for h in hit]) if hit else None

    def viewer_sees(self, viewer, t, kind, roles):
        seen = self.L.view(viewer, t)
        return any(r["kind"] == kind and all(r["roles"].get(k) == v for k, v in roles.items()) for r in seen)


def all_methods(records):
    from manichchilambu.standards import Standards  # imported here because it needs this module's Base
    return [Flat(records), Flat(records, only_asserted=True), Nary(records), Qualified(records),
            Contexts(records), Standards(records), LedgerRep(records)]
