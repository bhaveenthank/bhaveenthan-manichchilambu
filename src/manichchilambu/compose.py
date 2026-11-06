"""
The Maṇichchilambu composer: decide, record by record, which patterns a fact really needs.

A full ledger record costs about 8 times a plain triple, and most of that is wasted on dull facts.
"Madhavi danced" needs no voice chain or story time. "Kovalan stole the anklet" dies without its mood.
So instead of one template for everything, or one per verb, look at what each record actually
requires, keep just that, and let everything else fall back to a safe default on reading:

    no voice -> the poet said it      no mood -> told straight      no time -> reading order

The hard rule: a field may only be dropped when its default gives the same meaning. That's what
stops the compression from quietly turning a claim into a fact.
"""
import copy
import re

ALWAYS = {"event", "evidence"}
# Pattern -> the record fields it brings along. "event" also carries kind and id, handled in strip().
PATTERNS = {
    "event": ["roles"],
    "evidence": ["lines", "check"],
    "voice": ["voice"],
    "mood": ["mood"],
    "state": ["does"],
    "time": ["t"],
    "belief": ["content", "stance", "heard_by"],
    "speech": ["carries"],
    "reason": ["because"],
    "conflict": ["contradicts", "conflicts"],
    "retell": ["retells"],
    "birth": ["life"],
    "note": ["condition", "inferred", "unresolved", "note", "purpose", "after_death", "account", "addressee"],
}


def _is_open(rec):
    return any(isinstance(v, dict) for v in rec["roles"].values())


def requirements(rec, referenced=frozenset()):
    """
    Which patterns does this record need? Looks at what the record says, never at its verb.
    `referenced` holds ids other records point at: beliefs about a claim need the claim's time.
    """
    need = set(ALWAYS)
    if rec["voice"] != ["poet"]:
        need.add("voice")
    if rec["mood"] != "asserted":
        need.add("mood")
    if rec.get("does"):
        need |= {"state", "time"}
    if rec["kind"] == "believe":
        need |= {"belief", "time"}
    if rec["id"] in referenced or rec.get("because"):
        need.add("time")
    if rec.get("carries"):
        need.add("speech")
    if rec.get("because"):
        need.add("reason")
    if rec.get("contradicts") or rec.get("conflicts"):
        need.add("conflict")
    if rec.get("retells"):
        need.add("retell")
    if rec.get("life", "main") != "main":
        need.add("birth")
    if any(k in rec for k in PATTERNS["note"]):
        need.add("note")
    return need


def references(records):
    """Ids that other records point to, so we know they need to keep their place in time."""
    out = set()
    for r in records:
        for key in ("content", "carries", "contradicts", "conflicts", "retells"):
            if r.get(key):
                out.add(r[key])
        for c in r.get("because", []):
            out.add(c["of"])
    return out


def strip(rec, patterns):
    """Keep only the fields of the chosen patterns."""
    kept = {"id": rec["id"], "ep": rec["ep"], "kind": rec["kind"]}
    for p in patterns:
        for field in PATTERNS[p]:
            if field in rec:
                kept[field] = copy.deepcopy(rec[field])
    return kept


def reading_time(rec):
    """SIL-16-0145 -> 16.145. Reading order, the default when story time doesn't matter."""
    if not rec.get("lines"):
        return 0.0
    m = re.match(r"\w+-(\d+)-(\d+)", rec["lines"][0])
    return int(m.group(1)) + int(m.group(2)) / 1000


def expand(rec):
    """Fill the defaults back in, so a stripped record can go through the normal ledger."""
    out = dict(rec)
    out.setdefault("voice", ["poet"])
    out.setdefault("mood", "asserted")
    out.setdefault("life", "main")
    out.setdefault("roles", {})
    out.setdefault("lines", [])
    if "t" not in out:
        out["t"] = reading_time(out)
    return out


def statements(rec):
    """Rough graph cost of a stored record, counted the same way for every strategy."""
    n = 1 + len(rec.get("roles", {})) + len(rec.get("lines", []))
    n += len(rec.get("voice", [])) + len(rec.get("does", [])) + len(rec.get("because", []))
    for field in ("mood", "t", "content", "stance", "carries", "contradicts", "conflicts", "retells",
                  "condition", "inferred", "unresolved", "note", "purpose", "after_death", "account", "addressee"):
        n += field in rec
    n += "life" in rec and rec["life"] != "main"
    return n


# ---- the strategies being compared -----------------------------------------------------------
def everything(records, **_):
    """One template for all: keep every field."""
    return [strip(r, PATTERNS) for r in records]


def composed(records, **_):
    """Each record gets just what it needs."""
    ref = references(records)
    return [strip(r, requirements(r, ref)) for r in records]


def qualified_template(records, **_):
    """One smaller template for all: event + mood + last speaker + time, the Wikidata-ish habit."""
    out = []
    for r in records:
        s = strip(r, {"event", "evidence", "mood", "time", "birth"})
        s["voice"] = r["voice"][-1:]
        out.append(s)
    return out


def bare_event(records, **_):
    """Just who did what to whom, the plain n-ary event."""
    return [strip(r, ALWAYS) for r in records]


def per_verb(records, train=None, **_):
    """
    One template per verb, learned from the training records: what a schema-first pipeline does.
    A verb it hasn't seen falls back to a bare event.
    """
    train = records if train is None else train
    ref = references(records)
    table = {}
    for r in train:
        table.setdefault(r["kind"], set()).update(requirements(r, ref))
    return [strip(r, table.get(r["kind"], ALWAYS)) for r in records]


STRATEGIES = {"everything": everything, "composed": composed, "qualified_template": qualified_template,
              "per_verb": per_verb, "bare_event": bare_event}
