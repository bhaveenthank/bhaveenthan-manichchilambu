"""
Break the graph on purpose and see which checks notice.

Each mutation is damage a bad extractor or a careless annotator would really cause. Some are in here
because I expect them to get through: a wrong reading with a real citation looks fine to every rule.
The clean ledger and the deliberately open readings must pass, otherwise a check is just noise.
"""
import copy
import json
from pathlib import Path

from manichchilambu.ledger import load
from manichchilambu.validate import check_citations, check_identity, check_shape, check_story

ROOT = Path(__file__).resolve().parent.parent
records = load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml")
LAYERS = {"shape": check_shape, "story": check_story, "identity": check_identity, "citation": check_citations}


def by(recs, rid):
    return next(r for r in recs if r["id"] == rid)


def same_as(rs, a, b):
    rs.append({"id": "xm", "ep": "x", "kind": "same_as", "voice": ["poet"], "mood": "asserted", "life": "main", "t": 18.5, "roles": {"agent": a, "target": b}, "lines": ["MAN-18-0149"]})


# ---- structure damage
def m_drop_voice(rs): by(rs, "a08")["voice"] = []
def m_drop_mood(rs): by(rs, "b09").pop("mood")
def m_drop_evidence(rs): by(rs, "c07")["lines"] = []
def m_malformed_line_id(rs): by(rs, "a15")["lines"] = ["page 12"]
def m_no_time(rs): by(rs, "b13").pop("t")
def m_no_believer(rs): by(rs, "b12")["roles"].pop("holder")
def m_recipient_no_theme(rs): by(rs, "c01")["roles"].pop("theme")
def m_bad_stance(rs): by(rs, "a10")["stance"] = "maybe"
# ---- citation damage
def m_wrong_line(rs): by(rs, "a15")["lines"] = ["SIL-16-0001"]
def m_line_does_not_exist(rs): by(rs, "c04")["lines"] = ["MAN-14-0999"]
# ---- story damage
def m_promote_claim(rs): by(rs, "a09")["mood"] = "asserted"
def m_restate_as_fact(rs):
    src = copy.deepcopy(by(rs, "a09"))
    src.update(id="x3", mood="asserted", voice=["poet"])
    rs.append(src)
def m_time_flip(rs): by(rs, "a22")["t"] = 10
def m_two_holders(rs): by(rs, "c07")["does"] = ["+holds(manimekalai,amudasurabhi)"]
def m_give_up_unheld(rs): by(rs, "l02")["does"] = ["-holds(madhavi,garland)", "+holds(kovalan,garland)"]
def m_dead_actor(rs): rs.append({"id": "x1", "ep": "x", "kind": "give", "voice": ["poet"], "mood": "asserted", "life": "main", "t": 21, "roles": {"agent": "kovalan", "theme": "ank_k2", "recipient": "kannagi"}, "lines": ["SIL-21-0001"]})
def m_order_takes_effect(rs): by(rs, "a12")["does"] = ["-alive(kovalan)"]
def m_missing_belief_claim(rs): by(rs, "b10")["content"] = "nope"
# ---- identity damage
def m_disguise_as_identity(rs): same_as(rs, "manimekalai", "kayasandikai")
def m_merge_the_anklets(rs): same_as(rs, "ank_k1", "ank_q")
def m_merge_the_bowls(rs): same_as(rs, "amudasurabhi", "other_bowl")
def m_flatten_rebirth(rs): same_as(rs, "kovalan", "bharatan")
def m_statue_is_goddess(rs): same_as(rs, "kannagi_image", "kannagi")
# ---- wrong readings with real citations: I expect these to get through
def m_plan_as_sale(rs): by(rs, "a02")["mood"] = "asserted"
def m_dream_as_event(rs): by(rs, "x03")["mood"] = "asserted"
def m_wrong_killer(rs): by(rs, "a15")["roles"]["agent"] = "pandya_king"
def m_invented_participant(rs): by(rs, "c02")["roles"]["recipient"] = "kannagi"
def m_doctrine_as_fact(rs): by(rs, "x81")["mood"] = "asserted"


# Readings that are odd on purpose. A check that fires on any of these is wrong, not strict.
def v_clean(rs): pass
def v_extra_reading(rs): by(rs, "a17")["roles"]["theme"] = {"one_of": ["ank_k1", "ank_k2"]}
def v_conflicting_accounts(rs): rs.append({"id": "v1", "ep": "x", "kind": "give", "voice": ["poet", "someone"], "mood": "claimed", "life": "main", "t": 11.2, "conflicts": "c07", "roles": {"agent": "aravanan", "theme": "amudasurabhi"}, "lines": ["MAN-11-0058"]})
def v_dead_man_rises(rs): assert by(rs, "x30")["after_death"]
def v_unknown_speaker(rs): assert "unknown" in by(rs, "m11")["voice"]
def v_claim_contradicted_twice(rs): rs.append({"id": "v2", "ep": "x", "kind": "innocent", "voice": ["poet", "someone"], "mood": "claimed", "life": "main", "t": 21, "contradicts": "a09", "roles": {"theme": "kovalan"}, "lines": ["SIL-27-0075"]})


MUTATIONS = {k[2:]: v for k, v in list(globals().items()) if k.startswith("m_")}
VALID = {k[2:]: v for k, v in list(globals().items()) if k.startswith("v_")}


def run_layers(rs, base):
    out = {}
    for name, fn in LAYERS.items():
        try:
            found = [p for p in fn(rs) if p not in base[name]]
        except Exception as err:
            found = []  # a crash is a bug in the checker, it doesn't count as catching anything
            print(f"   crash in {name}: {type(err).__name__}: {err}")
        out[name] = found
    return out


base = {name: fn(records) for name, fn in LAYERS.items()}
print("clean ledger complaints:", {k: len(v) for k, v in base.items()})
for k, v in base.items():
    if v:
        print("  ", k, v[:4])

rows = []
print(f"{'mutation':24}" + "".join(f"{n:>10}" for n in LAYERS))
for name, fn in MUTATIONS.items():
    rs = copy.deepcopy(records)
    fn(rs)
    res = run_layers(rs, base)
    rows.append({"mutation": name, **{k: bool(v) for k, v in res.items()}, "messages": sum(res.values(), [])[:2]})
    print(f"{name:24}" + "".join(f"{'YES' if res[n] else '-':>10}" for n in LAYERS))

alarms = []
for name, fn in VALID.items():
    rs = copy.deepcopy(records)
    fn(rs)
    res = run_layers(rs, base)
    fired = sum(res.values(), [])
    alarms.append({"reading": name, "false_alarms": fired})
    print(f"valid reading {name:24} false alarms: {len(fired)} {fired[:1]}")

caught_by = {n: sum(r[n] for r in rows) for n in LAYERS}
caught = sum(any(r[n] for n in LAYERS) for r in rows)
missed = [r["mutation"] for r in rows if not any(r[n] for n in LAYERS)]
only = {n: sum(r[n] and not any(r[m] for m in LAYERS if m != n) for r in rows) for n in LAYERS}
summary = {"mutations": len(rows), "caught": caught, "by_layer": caught_by, "only_this_layer": only, "missed": missed,
           "valid_readings": len(alarms), "false_alarms": sum(len(a["false_alarms"]) for a in alarms)}
print(summary)
(ROOT / "reports" / "mutations.json").write_text(json.dumps({"summary": summary, "rows": rows, "valid": alarms}, ensure_ascii=False, indent=1), encoding="utf-8")
