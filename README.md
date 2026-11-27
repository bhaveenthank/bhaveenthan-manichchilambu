# Maṇichchilambu (மணிச்சிலம்பு)

A knowledge graph of Silappatikāram and Maṇimēkalai that keeps track of who says what, and doesn't let a lie turn into a fact.

The name means "the gem anklet". Kannagi's case is settled by what's inside her anklet: gems, not the queen's pearls (மணியுடை அரியே, SIL-20-0078). மணி also opens the name of the second epic, Maṇimēkalai. In code and file names it's `manichchilambu`. The folder stays `Twin_Epics`.

**Live site:** <https://bhaveenthank.github.io/bhaveenthan-manichchilambu/>

**Status:**
- **Text:** both epics in full: 10,209 lines in 64 cantos. Every line has been read and given a machine note.
- **Hand records:** 359, citing 7% of the lines. Each keeps who says it and in what mood. A Tamil scholar's review is under way.
- **Machine drafts:** 9,927 of 10,209 lines (97%) are in a draft. A second model is checking every draft, and the drafts it agrees with become a separate "checked" layer on the site.
- **Entities:** 611 in the graph. 338 of them were named in the drafts and described by a model, and are marked that way.
- **Novelty page:** what this graph does that others don't, with live figures ([docs/21](docs/21_novelty.md)).
- **What's left:** [docs/19](docs/19_steps_to_finish.md).

## Short version of what's been found

- Event nodes alone let false claims through about as often as plain triples.
- A properly built CIDOC CRM + CRMinf + PROV-O model ties our ledger on every question, so expressive power isn't the contribution. The ledger uses 45% of the statements, needs no hand-written queries, and exports to that same model.
- The composer decides per record what to store. Across epics it keeps every answer, while per-verb templates lose nearly half and invent false facts. But it's given clean records, and classical NLP can't produce those from the Tamil.
- Validators catch 24 of 28 kinds of damage. What gets through is wrong readings with real citations, which needs the LLM judge or a scholar.
- A phrase finder links the two epics at 143 line pairs with no labels at all.

## Read in this order

1. [What the text actually says](docs/01_reading_notes.md)
2. [Hard cases, and your 28 ranked events](docs/02_hard_cases.md)
3. [Related work](docs/03_related_work.md)
4. [The method](docs/04_method.md)
5. [Experiments, with what I chose and why](docs/05_experiments.md)
6. [How the name was chosen](docs/06_name_choices.md)
7. [What I need from you](docs/07_what_you_need_to_do.md)
8. [The ontology](docs/08_ontology.md)
9. [Annotation manual](docs/09_annotation_manual.md)
10. [Status against your plan](docs/10_status.md)
11. [The web app](docs/11_web_app.md)
12. [Putting it on GitHub and hosting it](docs/12_publishing.md)
13. [Material culture and the discovery engine](docs/13_material_and_discovery.md)
14. [Records for the full epics](docs/14_full_epics.md)
15. [The every-line pass](docs/15_every_line.md)
16. [The brief for the interface redesign](docs/16_ui_redesign_prompt.md)
17. [The interface redesign](docs/17_ui_redesign.md)
18. [Answering questions: the hybrid layer](docs/18_question_answering.md)
19. [Steps to finish](docs/19_steps_to_finish.md)
20. [Two decisions for the reviewer: licence and romanisation](docs/20_decisions_for_review.md)
21. [What's new: the Novelty page](docs/21_novelty.md)

There's also a 21-page overview with examples and screenshots: [docs/Manichchilambu_project_report.pdf](docs/Manichchilambu_project_report.pdf).

## What's where

| Path | What |
|---|---|
| `data/raw/` | The four Project Madurai files, untouched |
| `data/corpus/` | Generated: all 10,209 lines with stable ids, and who's named where |
| `data/seeds/` | Hand work: entities, ledgers, questions, labels. All draft |
| `data/external/` | Wikidata responses, kept apart from text evidence |
| `data/candidates/` | Tier output: the verb-stem inventory, and Tier 2 and 3 once they run |
| `data/llm_cache/` | Every model prompt and answer, once it runs |
| `data/graph/` | Generated for the web app: nodes, edges, timelines, RDF |
| `annotation/` | Review sheets: the ledger for the scholar, and the machine drafts one canto at a time |
| `evaluation/` | The fair test: a question form for outside readers, a runner and a scorer |
| `ontology/` | Core, 20 modules, SHACL shapes |
| `web/` | The site: React and Sigma.js, static, no server |
| `src/manichchilambu/` | The method: ledger, composer, validator, standards baseline, paths, echoes, scorer |
| `scripts/` | Pipeline steps, one per tier, plus small text tools |
| `experiments/` | The tests |
| `tests/` | Quick checks of the rules everything rests on |
| `reports/` | Experiment outputs |

## Running it

Every command runs from the project folder.

### The web app

Needs Node 20 or later. The site is static and fully offline: fonts and icons come from npm, with no CDN.

```bash
cd web && npm install && npm run dev
```

Then open the address it prints, usually <http://localhost:5173>. Other commands, all from `web/`:

- `npm test`: the rule and question-answering tests, which also write the scores to `reports/`
- `npm run build`: the static site in `web/dist`, the folder GitHub Pages serves
- `npx tsc --noEmit`: strict type-checking
- `npm run lint` and `npm run format:check`: oxlint and Prettier
- `npx playwright test`: opens every page in a browser and clicks a graph filter. Locally, point it at a Chromium-based browser you have, for example `PW_BROWSER="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" npx playwright test`

For a scholar's review of the hand records: `.venv/bin/python scripts/make_review_sheet.py` writes `annotation/review_ledger.csv`, and `.venv/bin/python scripts/ingest_reviews.py --by "Name"` reads it back. Each record then shows as reviewed or disputed on the site.

The site reads the JSON in `web/public/data/`. After changing anything under `data/`, rebuild it:

```bash
.venv/bin/python scripts/build_web_data.py
```

### The pipeline

Setup, if `.venv` is ever missing:

```bash
python3 -m venv .venv && .venv/bin/pip install -e '.[dev]'
```

Rebuild everything. Takes a few minutes, needs no network or model, and gives the same results each time:

```bash
./run_all.sh
```

To look at the text:

```bash
.venv/bin/python scripts/show.py SIL-16 145 153
```

```bash
.venv/bin/python scripts/grep_lines.py 'கோவலன்'
```

The Tamil text comes from Project Madurai and stays under their terms, keep their header if you redistribute it.
