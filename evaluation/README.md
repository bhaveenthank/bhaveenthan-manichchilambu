# A fair test of the Ask page

Every benchmark question so far was written by the person who built the records. A fair test needs questions written by people who haven't seen them. This folder holds everything for that.

## 1. Collect questions

Send `question_form.html` to your supervisor and two or three Tamil scholars or students. It opens in any browser with no internet connection. Each person writes up to ten questions, in Tamil or English, and presses **Save as a file**. That downloads one CSV, which they send back.

Ask them not to look at the website first.

## 2. Put the questions together

Put every returned file in this folder, then run:

```bash
cd ~/Documents/Twin_Epics && .venv/bin/python - <<'PY'
import csv, glob
rows = []
for p in sorted(glob.glob("evaluation/questions_*.csv")):
    rows += list(csv.DictReader(open(p, encoding="utf-8-sig")))
with open("evaluation/questions.csv", "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["asker", "role", "question", "good_answer"])
    w.writeheader(); w.writerows(rows)
print(len(rows), "questions")
PY
```

## 3. Answer them

```bash
cd ~/Documents/Twin_Epics/web && npx vitest run src/lib/eval_external.test.ts
```

This runs the Ask page's own code on every question and writes:

- `answers_to_mark.csv`: one row per question, with how the question was read, the answer in English and Tamil, the first four records (each with its mood) and the first three verses found
- `evidence_packages.json`: the full evidence for each answer, for `scripts/ask_llm.py`

Don't change anything in the code between collecting the questions and running this step. Otherwise the test isn't fair.

## 4. Mark them

Send `answers_to_mark.csv` back to each person, or mark it together. For each row, fill in:

- **mark:** `correct`, `partly` or `wrong`. If the graph can't answer a question and the page says so, that's `correct`.
- **claim_as_fact?:** `yes` if the answer presents something a character only claimed, dreamed or believed as if it happened. This is the project's central promise, so any `yes` matters.
- **comment:** optional.

## 5. Score

```bash
cd ~/Documents/Twin_Epics && .venv/bin/python scripts/score_external.py
```

The score is written to `reports/external_eval.json`, overall and broken down by asker, by kind of question, and by whether the page found an answer.

## Known weak spots, found before the test

These were found with three trial questions while building the runner. They're left unfixed so the test measures the system as it is:

- **"Why" questions** get the most relevant record as the headline, not a cause. For "Why did Kannagi burn Madurai?" the evidence is right, but the headline is "Madhavi retells it: Kannagi set the king's great city on fire."
- **The family rule ignores direction.** "Who was Madhavi's mother?" gets "Madhavi gave birth to a child, Manimekalai." The graph has no record of her mother, Chitrapati, so the right reply is "not in the graph".

One fix was made before the test: the yes/no rule no longer answers a "why", "who" or "how" question with "Yes."
