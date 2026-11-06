# Where things stand against your plan

**Done** means it runs and has numbers. **Pilot** means it runs on the hand ledger only. **Blocked** says on what.

**LLM pilot:** finished and scored. Its frozen recall turned out not to separate reading from chance, so a better test is frozen and waiting on a small run. See [14_full_epics.md](14_full_epics.md).

**Newest work:** food, jewels, cameos, what the text doesn't say, and guarded paths are in [13_material_and_discovery.md](13_material_and_discovery.md). That batch is pilot level too, and it's kept out of the scored experiments.

## Your four contributions

| | Contribution | Status | What's still missing |
|---|---|---|---|
| C1 | Failure taxonomy and benchmark | Pilot | 14 groups, ranked events, 121 questions. Not exhaustive, single reader, no agreement numbers |
| C2 | Composition method | Pilot | Composer works on clean records and beats per-verb across epics. Detection from raw text is unsolved |
| C3 | Validation | Pilot | 4 layers, 28 mutations, 6 valid readings. Precision and recall on real extraction errors need Tier 2 |
| C4 | Evaluation against baselines | Pilot | 7 representations with episode-level intervals. Standards baseline ties. Direct LLM comparison blocked |

## Construction experiments

| ID | Experiment | Status |
|---|---|---|
| X1 | What each tier adds | Blocked on Tier 2 and labels. Tier 0 and 1 done |
| X2 | Calibration | Blocked on scholar labels. Scorer built and run only as a plumbing test (no better than guessing at 120 pairs with a 5% base rate) |
| X3 | Few-shot selection | Code ready, only k=3 wired, blocked on pilot |
| X4 | Pattern induction | Done for hand and learned words. It failed. LLM-proposed patterns blocked |
| X5 | Judge reliability | Code ready. Blocked on a second model family and scholar |
| X6 | Is the LLM reading the Tamil? | Partly answered: it reads and it remembers. Masking failed as a test because the scorer can't match its role words. Counterfactual passages not written |
| X7 | Cross-epic paths | Pilot. Blocked on scholar's rating |
| X8 | Stability of moral findings | Not started. Your moral analyses were on the old records, which I left out |

## Representation experiments

| ID | Experiment | Status |
|---|---|---|
| Y1 | Composition vs simpler | Pilot on questions. Slot-level F1 needs Tier 2 output |
| Y2 | Belief vs fact | Pilot. False-fact rate measured per method |
| Y3 | Object lifecycle | Pilot: anklets, bowl, garland |
| Y4 | Identity and disguise | Pilot, with the identity layer |
| Y5 | Chronology | Pilot through the fold. No separate before/after test |
| Y6 | Causes | Pilot. Each reason typed and voiced |
| Y7 | Module removal | Done as feature removal |
| Y8 | Evidence quality | Citation check runs. Span precision needs Tier 2 |
| Y9 | Retelling alignment | Formula finder done, retelling links encoded. No classifier |
| Y10 | End-to-end answering | Blocked on Tier 2 |

Your baselines B7 and B8 (direct LLM, retrieval + LLM) are blocked on the same thing. They matter a lot: if an LLM with the same text answers just as well, the paper has to rest on auditability.

## Your five completion gates

| Gate | Status |
|---|---|
| 1. Semantic correctness | Passes on the pilot's benchmarked events. Not scholar-checked |
| 2. Reproducible construction | Passes for what exists: identical reruns, no model or network needed |
| 3. Independently evaluated extraction | **Not met.** No extraction has run, no independent labels |
| 4. Scholarly utility | **Not met.** No scholar, no LLM baseline |
| 5. Research-grade release | **Not met** |

## Web app

Built and running, see `11_web_app.md`. The question box got 13 of 20 right on its last round of unseen questions. No confidence slider until there are scholar labels.

## Known weak spots

- One reader for everything, and that reader also built the method.
- 163 records is a pilot. The graph doesn't cover the epics, and Tier 1 covers only names.
- Epithets only exist for cantos I've read closely, so name recall elsewhere is much lower than .71.
- No alias discovery yet. It's in your plan and would help the 6% problem.
- Not done from your brief: an event's mention as a separate object from the event (retells covers part of it), character offsets for spans (line level only), DBpedia, Tamil Wikipedia, and a HermiT run (OWL RL only). TRACER as a formula-finder baseline would be worth adding.
- Prices, like the garland's 1,008 kalanju, aren't recorded.
