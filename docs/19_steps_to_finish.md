# Steps to finish: the quick route (about a week)

**The idea:** you don't read all 7,177 drafts. You mark a random sample of 200, and the sample says how far the drafts the second model agreed on can be trusted. If they can, they're all accepted at once, labelled "sample-verified" with the accuracy figure. Model runs happen overnight, and waiting on other people happens alongside your own work.

| Day | You | The computer (overnight) |
|---|---|---|
| 1 | Finish step 3. Send `evaluation/question_form.html` to your supervisor and 2–3 scholars, with a 4-day deadline | `tier3_judge.py --source full --per-call 16` (about 670 calls) |
| 2 | Spot-check 20 of Claude's rows in `data/seeds/name_decisions.csv` (10 min) | judge continues if needed |
| 3 | Mark `annotation/drafts/SAMPLE.csv`, 200 drafts (about 3 hours) | `ask_llm.py --batch --audit` (optional) |
| 4 | Review `annotation/drafts/SIL-20.csv`, 79 drafts (about 1.5 hours). Ingest and promote | |
| 5 | Questions come back: combine, run, send back for marking | dense retrieval (local, no usage) |
| 6–7 | Marks come back. Score. A scholar checks 30 of your sample decisions during the same visit. Choose a licence; Claude drafts the write-up | |

Everything is still covered:

- **Every line:** has a note.
- **Every draft:** checked by a second model.
- **Drafts the judge agreed on:** accepted with a measured accuracy.
- **The court scene:** reviewed in full.
- **The question answering:** tested by outside readers.
- **The scholar's check:** gives your accuracy figure.

What stays a draft: the careful pile outside canto 20. It's labelled as drafts, which is honest.
