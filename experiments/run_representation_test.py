"""
Run every question against every representation and score it.

right  : answer equals gold
wrong  : answered, and it's incorrect
blank  : the representation can't express an answer

A leak is a special wrong answer: a claim, lie, order or metaphor reported as having happened.
"""
import csv
import json
import random
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

import yaml

from manichchilambu.ledger import load
from manichchilambu.representations import all_methods


ALL_LEDGERS = ["ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml"]


def canon(x):
    """Lists of lists and sets compare the same whatever the order."""
    if isinstance(x, (set, list, tuple)):
        return sorted((canon(i) for i in x), key=str)
    return x


def ask(method, q):
    op = q["op"]
    if op == "happened":
        return method.happened(q["kind"], q["roles"])
    if op == "tellers":
        return method.tellers(q["kind"], q["roles"])
    if op == "role_of":
        return method.role_of(q["kind"], q["roles"], q["role"])
    if op == "holder":
        return method.holder(q["obj"], q["t"])
    if op == "belief":
        return method.belief(q["holder"], q["content"], q["t"])
    if op == "alive":
        return method.alive(q["who"], q["t"])
    if op == "causes":
        return method.causes(q["kind"], q["roles"])
    if op == "open_values":
        return method.open_values(q["kind"], q["roles"], q["role"])
    if op == "conflicts":
        return method.conflicts(q["kind"], q["roles"])
    if op == "state_of":
        return method.state_of(q["thing"], q["t"])
    if op == "retellings":
        return method.retellings(q["kind"], q["roles"])
    if op == "viewer_sees":
        return method.viewer_sees(q["viewer"], q["t"], q["kind"], q["roles"])
    raise ValueError(op)


# For some questions the honest answer is "nothing": no belief yet, or a person isn't held like an
# object. A method only earns that if it can really express the question, otherwise None means can't tell.
def score(method, q, answer):
    gold = q["gold"]
    can_mean_nothing = q["op"] in ("belief", "holder") and method.name in ("qualified", "standards", "ledger")
    if answer is None and not (gold is None and can_mean_nothing):
        return "blank"
    return "right" if canon(answer) == canon(gold) else "wrong"


def main(ledger_files, question_files, tag):
    records = load(*ledger_files)
    questions = []
    for f in question_files:
        questions += yaml.safe_load((ROOT / "data/seeds" / f).read_text(encoding="utf-8"))
    methods = all_methods(records)
    rows, summary = [], {}
    for m in methods:
        tally = {"right": 0, "wrong": 0, "blank": 0, "leak": 0}
        started = time.perf_counter()
        for q in questions:
            a = ask(m, q)
            s = score(m, q, a)
            tally[s] += 1
            # A leak: the question's true answer is no, but the method says it happened.
            if q["op"] in ("happened", "viewer_sees") and q["gold"] is False and a is True:
                tally["leak"] += 1
            rows.append({"method": m.name, "q": q["id"], "ep": q["ep"], "op": q["op"], "result": s,
                         "answer": json.dumps(canon(a) if a is not None else None, ensure_ascii=False)})
        no_q = sum(1 for q in questions if q["op"] in ("happened", "viewer_sees") and q["gold"] is False)
        summary[m.name] = {**tally, "n": len(questions), "accuracy": round(tally["right"] / len(questions), 3),
                           "leak_rate": round(tally["leak"] / no_q, 3) if no_q else 0, "size": m.size(),
                           "ms_per_question": round(1000 * (time.perf_counter() - started) / len(questions), 2)}
        if hasattr(m, "queries_used"):
            summary[m.name]["sparql_queries"] = len(m.queries_used)
            summary[m.name]["sparql_lines"] = sum(m.queries_used.values())
    out = ROOT / "reports"
    with open(out / f"representation_{tag}_detail.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    (out / f"representation_{tag}_summary.json").write_text(json.dumps(summary, indent=1))
    print(f"{tag}: {len(records)} records, {len(questions)} questions")
    print(f"{'method':12}{'right':>7}{'wrong':>7}{'blank':>7}{'acc':>7}{'leak':>7}{'size':>7}")
    for name, s in summary.items():
        print(f"{name:12}{s['right']:7}{s['wrong']:7}{s['blank']:7}{s['accuracy']:7.2f}{s['leak_rate']:7.2f}{s['size']:7}")
    return summary, rows


def clustered_gap(rows, a, b, trials=5000, seed=11):
    """
    How much better is a than b, with a 95% interval? Resampling whole episodes, not single questions,
    because questions from one episode lean on the same few records and aren't independent.
    """
    by_ep = {}
    for r in rows:
        by_ep.setdefault(r["ep"], {}).setdefault(r["q"], {})[r["method"]] = r["result"] == "right"
    eps = sorted(by_ep)
    rng = random.Random(seed)

    def gap(sample):
        items = [q for e in sample for q in by_ep[e].values()]
        return sum(q[a] - q[b] for q in items) / len(items)

    draws = sorted(gap([rng.choice(eps) for _ in eps]) for _ in range(trials))
    return {"gap": round(gap(eps), 3), "low": round(draws[int(0.025 * trials)], 3), "high": round(draws[int(0.975 * trials)], 3), "episodes": len(eps)}


if __name__ == "__main__":
    _, dev_rows = main(["ledger.yaml"], ["questions_dev.yaml"], "dev")
    # Held-out run: new episodes written after the first format was frozen. The dev ledger stays loaded,
    # because the episodes link to it.
    _, held_rows = main(ALL_LEDGERS, ["questions_heldout.yaml"], "heldout")
    # Third batch: the events from the ranked list that were still missing, under format v2.
    _, ext_rows = main(ALL_LEDGERS, ["questions_ext.yaml"], "ext")
    every = dev_rows + held_rows + ext_rows
    print("\n-- ledger minus each baseline, share of questions, 95% interval from resampling episodes")
    gaps = {}
    for rival in ("flat_clean", "nary", "qualified", "contexts", "standards"):
        gaps[rival] = clustered_gap(every, "ledger", rival)
        print(f"{rival:12}{gaps[rival]}")
    (ROOT / "reports" / "representation_gaps.json").write_text(json.dumps(gaps, indent=1))
