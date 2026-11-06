"""
Does the composer keep the meaning while storing less?

Each strategy decides what to store. Then everything gets read back through the same ledger with the same
defaults and answers the same questions. Reported: right answers, false facts, and statements stored.

per_verb is the fair rival, so it's trained on one epic and tested on the other, which is how it would
meet new material. The composer has no training at all, its rules were written from the dev episodes.
"""
import importlib.util
import json
from pathlib import Path

import yaml

from manichchilambu.compose import STRATEGIES, expand, per_verb, statements
from manichchilambu.ledger import load
from manichchilambu.representations import LedgerRep

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("rt", ROOT / "experiments" / "run_representation_test.py")
rt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rt)

records = load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml")
questions = []
for f in ("questions_dev.yaml", "questions_heldout.yaml", "questions_ext.yaml"):
    questions += yaml.safe_load((ROOT / "data/seeds" / f).read_text(encoding="utf-8"))


def epic(rec):
    return rec["lines"][0][:3]


# Which epic a question belongs to, from the episode's own records.
ep_epic = {}
for r in records:
    ep_epic.setdefault(r["ep"], []).append(epic(r))
ep_epic = {k: max(set(v), key=v.count) for k, v in ep_epic.items()}


def score(stored, qs):
    m = LedgerRep([expand(r) for r in stored])
    right = leak = 0
    lost = []
    for q in qs:
        try:
            a = rt.ask(m, q)
        except Exception:
            a = "ERR"
        ok = rt.canon(a) == rt.canon(q["gold"])
        right += ok
        leak += q["op"] in ("happened", "viewer_sees") and q["gold"] is False and a is True
        if not ok:
            lost.append(q["id"])
    return right, leak, lost


out = {"questions": len(questions), "records": len(records), "strategies": {}}
print(f"{'strategy':24}{'statements':>11}{'right':>7}{'false facts':>13}")
for name, fn in STRATEGIES.items():
    stored = fn(records)
    n = sum(statements(r) for r in stored)
    right, leak, lost = score(stored, questions)
    out["strategies"][name] = {"statements": n, "right": right, "false_facts": leak, "lost": lost}
    print(f"{name:24}{n:11}{right:7}{leak:13}")

print("\n-- across the epics: trained on one, scored only on the other's questions")
cross = {}
for train_on, test_on in (("SIL", "MAN"), ("MAN", "SIL")):
    train = [r for r in records if epic(r) == train_on]
    qs = [q for q in questions if ep_epic[q["ep"]] == test_on]
    for name, stored in (("per_verb", per_verb(records, train=train)), ("composed", STRATEGIES["composed"](records))):
        right, leak, lost = score(stored, qs)
        cross[f"{train_on}->{test_on}/{name}"] = {"questions": len(qs), "right": right, "false_facts": leak, "lost": lost}
        print(f"train {train_on}, test {test_on}  {name:10} right {right}/{len(qs)}  false facts {leak}")
out["cross_epic"] = cross
(ROOT / "reports" / "composer_test.json").write_text(json.dumps(out, indent=1))
