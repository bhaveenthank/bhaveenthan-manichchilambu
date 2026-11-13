# Steps to finish (from 13 November 2026)

**Done:**

- Every one of the 10,209 lines has a note. The 213 gaps were a parser problem, not a problem with the model's answers.
- The search is rebuilt.
- 50 random notes were checked against the Tamil: 48 right, 1 partly right, 1 wrong.
- The names in the drafts are partly matched to the graph: 40% of mentions point at an existing entity, and 51% are accounted for.
- The draft review sheets and the fair-test kit are built.

What's left, in order:

| # | Step | Who | Time | Command or file |
|---|---|---|---|---|
| 1 | Commit and push | you | 2 min | `git add . && git commit && git push` |
| 2 | Check Claude's name decisions | you | 30 min | `data/seeds/name_decisions.csv` |
| 3 | Settle the long tail of names | the computer | 1 evening | `scripts/name_batch.py` |
| 4 | Second model checks every draft | the computer | 2–3 days | `scripts/tier3_judge.py --source full` |
| 5 | Review the drafts, one canto a day | you, then a scholar | 3–6 weeks | `annotation/drafts/*.csv` |
| 6 | Fair test with outside questions | supervisor and scholars | 1–2 weeks | `evaluation/README.md` |
| 7 | Optional extras: meaning-based search, written answers | the computer | 1 evening | `run_dense_retrieval.py --dense`, `ask_llm.py --batch --audit` |
| 8 | Licence and write-up | you and Claude | 1–2 weeks | after step 6 |

Steps 5 and 6 run side by side. The full commands are in the conversation and in each script's header.
