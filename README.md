# Maṇichchilambu (மணிச்சிலம்பு)

A knowledge graph of Silappatikāram and Maṇimēkalai that keeps track of who says what, and doesn't let a lie turn into a fact.

The name means "the gem anklet". Kannagi's case is settled by what's inside her anklet: gems, not the queen's pearls (மணியுடை அரியே, SIL-20-0078). மணி also opens the name of the second epic, Maṇimēkalai. In code and file names it's `manichchilambu`. The folder stays `Twin_Epics`.

**Status:** foundations and a web app, built and tested on a hand-written pilot of 163 records from both epics, plus 196 more drafted across food, crafts, cameos and every remaining canto ([docs/13](docs/13_material_and_discovery.md), [docs/14](docs/14_full_epics.md)). Every canto now has records, though unevenly. Nothing has been reviewed by a scholar, and the LLM pilot has finished with mixed results ([docs/14](docs/14_full_epics.md)). What's needed from you: [docs/07_what_you_need_to_do.md](docs/07_what_you_need_to_do.md). To publish: [docs/12_publishing.md](docs/12_publishing.md).

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
| `annotation/` | The sheet for the scholar |
| `ontology/` | Core, 20 modules, SHACL shapes |
| `web/` | The site: React and Sigma.js, static, no server |
| `src/manichchilambu/` | The method: ledger, composer, validator, standards baseline, paths, echoes, scorer |
| `scripts/` | Pipeline steps, one per tier, plus small text tools |
| `experiments/` | The tests |
| `tests/` | Quick checks of the rules everything rests on |
| `reports/` | Experiment outputs |

## Running it

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
