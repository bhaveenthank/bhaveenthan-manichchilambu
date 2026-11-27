# What's new: the Novelty page

The site's **Novelty** page (`#/novelty`) sets out what this knowledge graph does that an ordinary one doesn't. Each item says:
- what goes wrong in an ordinary graph
- what this one does instead
- how it works, with the algorithm and where it is in the code

Each item also has one live figure and worked examples from the epics. `scripts/build_novelty.py` computes every figure from the current data each time the site is built, so the page can't drift from what the system does.

| # | Innovation | Figure (computed at build time) |
|---|---|---|
| 1 | What someone believes is not what happened | **75%** of questions about claims a plain triple graph answers by stating the claim as fact. The ledger: 0% |
| 2 | Who is speaking, and through whom | **179** records told through a character, not by the poet directly |
| 3 | Thirteen kinds of statement, not one | **86** records that are not told as fact, each kept apart |
| 4 | A connection is only as strong as its weakest step | **1,743** of 3,084 connections a plain search finds rest on a claim or another unlawful step, and are refused |
| 5 | One person across several births | **16** records set in an earlier birth, kept apart from the main story |
| 6 | Two accounts of the same thing, both kept | **5** records that conflict with or contradict another |
| 7 | What the text doesn't say is recorded too | **12** recorded gaps, each with the wrong answer people jump to |
| 8 | “A mango” is not “this mango”, and coral lips are not coral | **1,659** lines read as figurative or mixed, so their images aren't taken as objects |
| 9 | Whose hands an object passed through, worked out by replay | **8** objects whose path through the story is replayed |
| 10 | Shared phrasing between the two epics, found without labels | **143** line pairs shared between the epics, found with no hand labels |
| 11 | Answers that never turn a claim into a fact | **19** of 20 held-out questions answered right, against 12 by rules alone |
| 12 | Every line accounted for, every source labelled | **10,209** lines of both epics, every one read and noted |

## The methods behind them

- **Voice-scoped ledger and fold.** Each record carries a voice chain and a mood. Only told-as-fact records change the world when the ledger is replayed in story order (event calculus). Code: `src/manichchilambu/ledger.py`.
- **Viewer-relative worlds.** A character's world is the same fold, plus the claims they accept at that moment, minus the ones they've given up. This is how the site shows what the king believes beside what the text tells, at any point in the story.
- **Reader policies.** Poet only, anyone speaking straight, or everything. The last one exists only to measure what a naive extractor gets wrong.
- **Guarded paths.** Path search over warrant-typed edges, where a path's strength is the minimum over its steps. Steps through claims are refused, and weak steps are flagged as cautions.
- **Births as a dimension.** Every record has a life field, and no path may mix births without a record saying they're the same person.
- **Gaps as first-class records.** "Not stated" is stored with the tempting wrong answer, so neither the rules nor the search fill the gap.
- **Kinds and senses.** Kind and individual are different nodes. Every line is labelled literal, figurative or mixed.
- **Label-free echo finding.** Tamil sequence alignment scored against shuffled baselines.
- **Evidence-gated question answering.** A typed plan, ambiguity grounding, coverage-weighted rank fusion, and a gate by mood before anything is stated as fact.
- **Tiered provenance and line accountability.** Hand records, reader-reviewed drafts, drafts checked by a second model, unchecked drafts, and a note on every line. The tiers never mix. Blind samples with a Wilson interval decide whether a tier can be trusted.

## Honest limits

- The figures describe the method on a pilot of 359 hand records, none yet checked by a scholar.
- Several ideas have roots elsewhere: the event calculus, FactBank source chains, McCarthy's contexts. What's new is combining them for literary voice, mood, viewpoint, rebirth and story time, and keeping them through paths and answers.
- A full CIDOC CRM + CRMinf + PROV-O model scores as well on the representation test. The difference is size: it needs more than twice the statements.
