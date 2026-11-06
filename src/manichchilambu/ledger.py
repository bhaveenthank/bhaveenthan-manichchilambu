"""
The ledger: an append-only list of "things the text tells us", plus the fold that
turns it into a state of the world for a given moment, reader policy and viewer.

Nothing in here is stored as simply true. A record only ever says:
    this voice chain tells us this happened, in this mood, at this point in the story.
Whether it counts as having happened is decided at query time by a policy.

Ideas borrowed, and from where:
  - fold over events with +starts / -ends : event calculus (Kowalski & Sergot 1986)
  - truth relative to a context           : ist(c,p) (McCarthy 1993)
  - nested sources like poet>king>...     : FactBank source chains (Sauri & Pustejovsky 2009)
"""
from pathlib import Path
import re

import yaml

ROOT = Path(__file__).resolve().parents[2]
FLUENT = re.compile(r"([+-])(\w+)\(([^)]*)\)")
ACTUAL = {"asserted"}  # the only mood that can change the world


def load(*names):
    recs = []
    for name in names or ("ledger.yaml",):
        recs += yaml.safe_load((ROOT / "data" / "seeds" / name).read_text(encoding="utf-8"))
    for r in recs:
        r.setdefault("life", "main")
    return recs


# ---- reader policies ---------------------------------------------------------
# A policy answers one question: do we let this record count as having happened?
def poet_only(r):
    """Strictest: only what the poet says in their own voice."""
    return r["mood"] in ACTUAL and r["voice"] == ["poet"]


def story(r):
    """Default reading: anything told straight, by anyone. Lies are coded as claimed, not asserted."""
    return r["mood"] in ACTUAL


def everything(r):
    """No filter at all. This is what a naive triple extractor does, kept here to measure the damage."""
    return True


POLICIES = {"poet_only": poet_only, "story": story, "everything": everything}


class Ledger:
    def __init__(self, records):
        self.records = sorted(records, key=lambda r: r["t"])
        self.by_id = {r["id"]: r for r in self.records}

    # ---- matching -------------------------------------------------------------
    @staticmethod
    def _role_matches(value, wanted):
        if isinstance(value, dict):  # {one_of: [...]} means the text leaves it open
            return wanted in value["one_of"]
        if isinstance(value, list):  # several named parties in one role
            return wanted in value
        return value == wanted

    def find(self, kind, roles=None, policy=everything, life=None):
        out = []
        for r in self.records:
            if r["kind"] != kind or not policy(r):
                continue
            if life and r["life"] != life:
                continue
            if roles and not all(k in r["roles"] and self._role_matches(r["roles"][k], v) for k, v in roles.items()):
                continue
            out.append(r)
        return out

    # ---- the fold -------------------------------------------------------------
    def state(self, t, policy=story, life=None):
        """Replay the ledger up to time t and return the set of fluents that hold."""
        now = set()
        for r in self.records:
            if r["t"] > t or not policy(r) or (life and r["life"] != life):
                continue
            for change in r.get("does", []):
                sign, name, args = FLUENT.match(change).groups()
                fluent = (name, *[a.strip() for a in args.split(",")])
                (now.add if sign == "+" else now.discard)(fluent)
        return now

    def holder(self, obj, t, policy=story):
        return {f[1] for f in self.state(t, policy) if f[0] == "holds" and f[2] == obj}

    def state_of(self, thing, t, policy=story):
        """Every fluent that mentions this thing right now, e.g. what a site's function is."""
        return {f for f in self.state(t, policy) if thing in f[1:]}

    def alive(self, who, t, policy=story):
        """People are alive unless the fold has seen them die."""
        for r in self.records:
            if r["t"] <= t and policy(r) and f"-alive({who})" in r.get("does", []):
                return False
        return True

    # ---- beliefs: the last stance a person took on a claim, at or before t --------
    def belief(self, holder, content, t):
        stance = None
        for r in self.find("believe", {"holder": holder}, policy=story):
            if r.get("content") == content and r["t"] <= t:
                stance = r["stance"]
        return stance

    def viewer_accepts(self, viewer, t):
        """All claims this viewer currently accepts, even when they are false."""
        ids = {r["content"] for r in self.find("believe", {"holder": viewer}) if r["t"] <= t}
        return {i for i in ids if self.belief(viewer, i, t) == "accept"}

    def view(self, viewer, t, policy=story):
        """
        The world as this person has it at time t: what the policy lets through,
        plus the claims they accept, minus the ones they have rejected.
        Two viewers can get different graphs from the same ledger.
        """
        accepted = self.viewer_accepts(viewer, t) if viewer else set()
        keep = []
        for r in self.records:
            if r["t"] > t:
                continue
            if policy(r) or r["id"] in accepted:
                keep.append(r)
        return keep

    # ---- provenance and conflict ----------------------------------------------
    def tellers(self, kind, roles=None):
        return [r["voice"] for r in self.find(kind, roles)]

    def causes(self, rid):
        return {(c["of"], c["rel"]) for c in self.by_id[rid].get("because", [])}

    def conflicts(self, rid):
        return {r["id"] for r in self.records if r.get("conflicts") == rid or r.get("contradicts") == rid}

    def retellings(self, rid):
        return {r["id"] for r in self.records if r.get("retells") == rid}

    def open_values(self, rid, role):
        v = self.by_id[rid]["roles"].get(role)
        return set(v["one_of"]) if isinstance(v, dict) else {v}
