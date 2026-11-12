# Answering questions: the hybrid layer (November 2026)

The Ask page can now take any question about the two epics, in Tamil, English or Thanglish, not only the kinds the hand-written rules were built for. Everything that makes the project different stays at the centre:
- the ledger
- moods and voices
- the line between what happened and what was only said
- story time
- guarded paths

Retrieval sits on top of the ledger, not in place of it.

## What CultureBot does, and what we took from it

CultureBot (geofila.github.io/CultureBot, paper in preparation) answers questions about 81,852 Greek cultural-heritage records:
1. It grounds the question's terms against a Neo4j graph.
2. A language model writes read-only Cypher, checked with `EXPLAIN` before it runs.
3. It searches record text with BM25 and FAISS, mixed as α·lexical + (1−α)·semantic.
4. It fuses the graph and text results.
5. A model writes an answer that cites records inline, and abstains when evidence is thin.

Six experts wrote 52 queries across 12 personas and made 208 answer ratings. The site says the results haven't been published yet, so none can be cited.

Two figures in the review you pasted don't match the site, so check before citing either:
- The review said 55 queries and 250 sessions. The site says 52 queries and 208 ratings.
- The review said the study showed improvements. The site has no results yet.

**What we took:**
- grounding before retrieval
- several retrievers fused into one ranking
- answers that carry their sources inline
- abstaining instead of guessing
- separate modes for graph, text and both

**What we didn't take, and why:**

| CultureBot | Here | Why |
|---|---|---|
| A language model writes graph queries | A typed plan built by rules, then fixed operations on the ledger | Every plan can be stored and replayed, and the model can't invent a relation. With 359 records a database server isn't needed |
| FAISS embeddings in the live system | BM25 plus graph routes in the browser; embeddings measured offline | The site is static and works offline. Whether embeddings read classical Tamil is measured first (below), not assumed |
| A model writes every answer | Templates write the page's answer. A model writes only in `scripts/ask_llm.py`, under a contract, with every claim checked | Nothing unchecked reaches a reader, and a model can't turn a claim into a fact |
| A citation shows a record was used | A citation shows a record was used, and what kind of statement it is | A catalogue record is just a record. In a story, the same words can be a fact, a lie, an order or a dream |

**The contribution is the step between retrieval and answer.** CultureBot checks that a record is relevant. This system also checks what kind of statement it is, and lets that decide what the answer may say:
- what the text tells as fact
- what a character only claims
- what was ordered or wished
- what was dreamed or believed
- what the text never says

Recent work on verified answering over event graphs (EviGraphRAG, September 2026) covers checking and abstaining in general. What's new here is doing it by literary voice, mood, viewpoint and story time.

## How a question is answered

The code is in `web/src/lib/plan.ts` and `web/src/lib/hybrid.ts`. It all runs in the browser, and `ask.ts` and its rules are unchanged.

**1. Plan** (`planQuery`)
- **Language:** Tamil, English or Thanglish.
- **Kind of question:** who-is, what happened, whose hands it passed through, did it happen or was it only said, what someone believed, why, across the epics, provenance, theme, comparison, where in the text, or open.
- **Grounding:** the names it mentions, grounded to graph nodes.
- **Epic:** which one, if the question says.
- **Evidence policy:** hand records may answer; lines and drafts may only point.

The plan is shown on the page ("Read as…") and stored in every evidence package.

**2. Names that point at more than one.** A name is checked against every proper name in the graph. It scores 3 for a whole name or alias, 2 for the first word of a longer name, 1 for one letter off.
- One clear whole-name match wins: "Kovalan" is Kovalan, not "Kovalan of nine generations back".
- Otherwise the epic named in the question, or the other people it names, can settle it.
- If nothing settles it, the page asks: "Kausikan" could be the messenger in Silappatikāram or Cutamati's father in Maṇimēkalai. It shows no records until you choose, so the two men are never mixed.

**3. Four routes**, each ranking hand records:

| Route | What it does |
|---|---|
| rule | The existing rules, trusted only when their records actually cover the question's own words |
| graph | Records naming the question's people and things, most names first |
| words | BM25 over each record's English, Tamil, kind and names |
| lines | BM25 over all 10,209 lines (the Tamil text plus the every-line pass's English gist), credited to the records that cite each line |

**Crossing languages through the graph.** Every name the question mentions goes into the query in both languages, at a lower weight than the question's own words. That's how an English question reaches Tamil verse without a translation model. The line notes take it further, to lines no record cites yet.

Tamil words are stemmed by removing case, plural and common verb endings, so எரித்தாள் meets எரிக்கிறாள். A short list of related words lets "husband" meet "wife" and "die" meet "killed".

**4. Fusion.** The routes are combined with reciprocal rank fusion (k = 60). A rule that fits counts double, one that doesn't counts half. The fused score is then multiplied by how much of the question a record covers, so a record that only shares names can't outrank one that answers.

**5. Evidence classes.** Every record is sorted by what kind of statement it is: told as fact, said or claimed, wanted or ordered, imagined or dreamed, or believed.
- **Told as fact:** only these may answer as fact.
- **Anything else:** if the best record is a claim, the headline says so: "Only claimed, not told as fact: …". The same applies to closest matches.

**6. What kind of reply.** One of four:
- **The rule's answer**, with the search's other evidence added.
- **"Answer, from the records":** the best record covers two-thirds of the question's own words.
- **"Closest match, not an answer":** something shares words, but not enough.
- **"No answer in the graph":** nothing matches at all.

**On the page:**
- **Read as…:** how the question was understood, with entity icons.
- **Read / Investigate / Research:** three levels of detail over the same evidence.
- **Evidence by class.**
- **Verses with these words:** every line found, with its machine note marked unchecked.
- **Unchecked drafts:** marked as pointers only.
- **The answer graph.**
- **Follow-up questions.**
- **An inspector:** click any line id and it opens beside the answer, with the lines either side and the hand records citing it.
- **Research view:** the query plan, each record's rank in every route, and a downloadable evidence package (JSON).

## Written answers from a model, checked claim by claim

`scripts/ask_llm.py` takes an evidence package and works in three stages:
1. **Writer:** the model writes the answer in English and Tamil, under a contract, as a list of claims. Each claim names its evidence and its stance: fact, said, wanted, imagined, believed or unknown.
2. **Checker:** rules, no model. A claim is dropped if:
   - it cites evidence that isn't in the package
   - it's given as fact while every record it cites is only a claim, order, dream or belief
   - it reports what someone said or believed without saying whose it is
   - it rests only on lines or drafts
3. **Auditor (optional):** a second model call labels each surviving claim as supported, partly supported, contradicted or insufficient. It's advisory only.

Eight tests in `tests/test_ask_llm.py` check the checker with hand-written bad answers. **The writer and auditor haven't run yet**, because `claude -p` only works from your terminal.

## How well it does

These are the answers' own records, first five shown. For a question the graph can't answer, "right" means it didn't present anything as an answer. The figures are written to `reports/ask_hybrid.json` by `npm --prefix web test`.

| Question set | Rules alone | Hybrid |
|---|---|---|
| Open questions, written before the hybrid existed (32) | 16 | 29 |
| Fresh round 1 (34) | 29 | 31 |
| Fresh round 2 (25) | 20 | 23 |
| Fresh round 3 (20) | 14 | 18 |
| **Held-out, written after tuning and scored once (20)** | **12** | **18** |

**Only the held-out row is a fair test.** I tuned the hybrid while looking at the other four sets.

Six of the open-question misses by rules alone were worse than misses: a rule fired on a keyword and answered something else. For example, "Where did Kovalan wait inside the city?" got the contents of the anklets. The hybrid catches those by checking whether the rule's records cover the question.

**Retrieval by route**, from `experiments/run_dense_retrieval.py`, over 122 questions with a known record:

| System | Recall@5 | MRR@10 | Held-out recall@5 |
|---|---|---|---|
| rule | 0.47 | 0.41 | 0.21 |
| graph | 0.73 | 0.56 | 0.68 |
| words (BM25) | 0.83 | 0.66 | **0.95** |
| lines (BM25 via verse) | 0.34 | 0.25 | 0.21 |
| chars (n-gram TF-IDF) | 0.80 | 0.63 | 0.84 |
| RRF words + graph + lines | 0.80 | 0.55 | 0.84 |
| RRF + chars | 0.80 | 0.58 | 0.79 |
| **The Ask page** (all routes plus the evidence checks) | **0.90** | **0.74** | 0.89 |

**What it shows:**
- **Overall:** the full page is best. Plain rank fusion is no better than BM25 alone. The gain comes from weighting by coverage and checking the rules, not from adding retrievers.
- **On the held-out set:** BM25 over the records alone did slightly better than the full page (18 of 19 against 17 of 19). That's a small set, but the next tuning should start from it. It wasn't tuned on here, because that would spoil the held-out set.

**Dense embeddings haven't been run.** The script supports them once `sentence-transformers` is installed (commands in the script's header).

## Limits

- **Cross-language reach:** an English question reaches only lines with a machine note. That's 5,649 of 10,209 until the every-line pass finishes. The notes are unchecked, so a line found through one is labelled a pointer.
- **Paraphrase:** rewording that shares no words with a record still fails. That is exactly what dense embeddings are for, once they've been measured.
- **Who wrote the tests:** every benchmark question was written by me, from the records. A fair test needs questions written by someone who hasn't seen the records, ideally by Tamil scholars and students, as CultureBot's experts did.
- **The written answers:** the model's answers haven't been run, so there are no figures for them yet.
