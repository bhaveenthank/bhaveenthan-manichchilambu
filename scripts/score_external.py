"""
Score the outside readers' marks on evaluation/answers_to_mark.csv.

Each answer is marked correct, partly or wrong, and separately whether it presented a claim as fact. Counts go to
reports/external_eval.json, overall and by asker, by the kind of question, and by whether the page found an
answer at all. "correct" for a question the graph can't answer means the page said so instead of guessing.

  .venv/bin/python scripts/score_external.py
"""
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    rows = list(csv.DictReader(open(ROOT / "evaluation/answers_to_mark.csv", encoding="utf-8-sig")))
    mark_col = next(k for k in rows[0] if k.startswith("mark"))
    fact_col = next(k for k in rows[0] if k.startswith("claim_as_fact"))
    norm = {"correct": "correct", "right": "correct", "yes": "correct", "partly": "partly", "partial": "partly", "partly correct": "partly", "wrong": "wrong", "no": "wrong", "incorrect": "wrong"}
    by = defaultdict(lambda: defaultdict(Counter))
    total, unsafe, unmarked = Counter(), 0, 0
    for r in rows:
        m = norm.get((r[mark_col] or "").strip().lower())
        if not m:
            unmarked += 1
            continue
        total[m] += 1
        unsafe += (r[fact_col] or "").strip().lower() == "yes"
        by["asker"][r.get("asker") or "?"][m] += 1
        by["read_as"][r.get("read_as") or "?"][m] += 1
        by["found_answer"]["no" if "(no answer)" in (r.get("answer_kind") or "") else "yes"][m] += 1
    marked = sum(total.values())
    score = lambda c: round((c["correct"] + 0.5 * c["partly"]) / max(1, sum(c.values())), 3)
    out = {"questions": len(rows), "marked": marked, "unmarked": unmarked, **total, "score (correct + half of partly)": score(total),
           "claims_given_as_fact": unsafe,
           "by": {k: {g: {**c, "score": score(c)} for g, c in v.items()} for k, v in by.items()}}
    (ROOT / "reports/external_eval.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in out.items() if k != "by"}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
