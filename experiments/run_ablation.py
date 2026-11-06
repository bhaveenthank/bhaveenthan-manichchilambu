"""Take the ledger apart one feature at a time. A feature that changes nothing has no business being in the method."""
import copy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

import yaml

from manichchilambu.ledger import load
from manichchilambu.representations import LedgerRep


def strip(records, what):
    out = copy.deepcopy(records)
    for r in out:
        if what == "voice_chain":
            r["voice"] = r["voice"][-1:]
        elif what == "mood":
            r["mood"] = "asserted"
        elif what == "time":
            r["t"] = 0
        elif what == "state_changes":
            r.pop("does", None)
        elif what == "open_values":
            for k, v in r["roles"].items():
                if isinstance(v, dict):
                    r["roles"][k] = v["one_of"][0]
        elif what == "contradictions":
            r.pop("contradicts", None)
            r.pop("conflicts", None)
        elif what == "reasons":
            r.pop("because", None)
        elif what == "belief_records":
            if r["kind"] == "believe":
                r["kind"] = "_gone"
                r["t"] = 10**6  # falls out of every fold
        elif what == "birth_scope":
            r["life"] = "main"
    return out


def main():
    # Import here so running this file doesn't kick off the other experiment.
    import importlib.util
    spec = importlib.util.spec_from_file_location("rt", ROOT / "experiments" / "run_representation_test.py")
    rt = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(rt)

    records = load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml")
    qs = []
    for f in ("questions_dev.yaml", "questions_heldout.yaml", "questions_ext.yaml"):
        qs += yaml.safe_load((ROOT / "data/seeds" / f).read_text(encoding="utf-8"))

    def run(recs):
        m = LedgerRep(recs)
        lost = []
        right = leak = 0
        for q in qs:
            try:
                a = rt.ask(m, q)
            except Exception:
                a = "ERR"
            ok = rt.canon(a) == rt.canon(q["gold"])
            right += ok
            if not ok:
                lost.append(q["id"])
            leak += q["op"] in ("happened", "viewer_sees") and q["gold"] is False and a is True
        return right, leak, lost

    base = run(records)
    print(f"{'removed':18}{'right':>6}/{len(qs)}{'leaks':>7}  questions lost")
    print(f"{'nothing':18}{base[0]:>6}{'':>4}{base[1]:>7}")
    for what in ("voice_chain", "mood", "time", "state_changes", "belief_records", "open_values", "contradictions", "reasons", "birth_scope"):
        r = run(strip(records, what))
        print(f"{what:18}{r[0]:>6}{'':>4}{r[1]:>7}  {' '.join(r[2])[:90]}")


if __name__ == "__main__":
    main()
