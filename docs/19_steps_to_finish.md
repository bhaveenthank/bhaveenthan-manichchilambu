# Steps to finish (from 27 November 2026)

You do two things. Everything else is done or runs from one command.

1. **The second-model check.** Leave `tier3_judge.py --source full --per-call 16` running, and rerun it after any stop. When it prints `done`, run:
   ```bash
   ./scripts/after_judge.sh
   ```
   This finishes the small gap check, refreshes the name matching and site data, runs every check, and pushes.
2. **The Tamil scholar's review.** When the sheet comes back, save it as `annotation/review_ledger.csv` and run:
   ```bash
   .venv/bin/python scripts/ingest_reviews.py --by "Her name" && .venv/bin/python scripts/build_web_data.py
   ```
   Then commit and push. Her marks show on every record, and the share she accepts is the accuracy figure.

Done for you:
- every line read and noted
- gap lines drafted
- 338 new entities added
- the checked-links layer on the graph
- the Novelty page
- review status and record citations
- CI, lint, tests and the browser test
