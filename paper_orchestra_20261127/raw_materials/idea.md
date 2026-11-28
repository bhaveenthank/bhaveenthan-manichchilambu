# Idea summary (no results)

## Working title
Said Is Not Done: Epistemic Leakage in Literary Knowledge Graphs, and a Voice-Scoped Ledger for the Two Classical Tamil Epics

System/resource name: **Maṇichchilambu** ("the gem anklet"). Kannagi's case in the epic is settled by what is inside her anklet: gems, not the queen's pearls (மணியுடை அரியே, line SIL-20-0078).

## Material
Silappatikāram (SIL) and Maṇimēkalai (MAN), the two linked classical Tamil epics ("twin epics"), from the Project Madurai e-texts. 10,209 lines in 64 cantos. Every line gets a stable id, e.g. SIL-16-0145 = Silappatikāram, canto 16, line 145. Maṇimēkalai is the sequel: its heroine is the daughter of Silappatikāram's hero; Silappatikāram's last canto points at the sequel (SIL-32-0017).

## The problem: epistemic leakage (said ≠ done)
In narrative text, a large share of what is "said" never happened: accusations, lies, orders, plans, wishes, dreams, beliefs, metaphors, statements set in an earlier birth. A knowledge graph (KG) built from such text stores one world; once a character's claim is written as a triple it becomes a fact every query trusts. We call this **epistemic leakage** (a claim promoted to a fact).

Canonical case (the anklet, SIL-16): a goldsmith who has secretly taken the queen's anklet (கரந்தியான் கொண்ட காலணி, SIL-16-0127) accuses Kovalan of stealing it (SIL-16-0145). The king believes him, gives a conditional order ("if it is in the thief's hand, kill him and bring it", SIL-16-0152/3), a guard objects (SIL-16-0163), one drunk man kills Kovalan (SIL-16-0212), and the poet gives two reasons in consecutive lines (the bent sceptre, 0216; old karma, 0217). Later the king says "I am the thief" (யானே கள்வன், SIL-20-0086) — a metaphor/confession, not a theft. Five separate parties (accuser, believer, orderer, men sent, killer).

Key observation driving the design: **an event node for "Kovalan stole the queen's anklet" looks exactly like one for "Kovalan took Kannagi's anklet".** The standard fix for triples — reifying the relation as an n-ary event node (W3C n-ary relations pattern) — fixes argument structure but makes a lie *neater*, not less false.

Other hard-case groups from close reading (14 groups, ranked by damage: a false fact is worse than a missing one, worse than a clumsy one): said-not-done; ordered/planned/wished-not-done; looks-like-isn't (disguise); different heads, same moment (two men hold opposite beliefs about one disguised woman, MAN-20); who holds what when (custody); earlier births (Kovalan was Bharatan in a past life, who falsely called Sangaman a spy, SIL-23-0156 — the same story mirrored); same word other thing (homonyms like பாத்திரம் "bowl" for two different bowls); many reasons for one thing; five hands in one deed; text leaves it open or disagrees with itself (which anklet broke, SIL-20-0082; three accounts of how Maṇimēkalai got the bowl); nested tellers (MAN-26-0027 is four voices deep: poet > Kannagi > Madurapati > Bharatan's lie); retold in another book (SIL-23 retold in MAN-26); figures of speech; things that change function.

## Method: five pieces

### 1. The ledger (record format)
Nothing is stored as simply true. Each record says: this voice chain tells us this, in this mood.

r = ⟨what, roles, voice, mood, t, birth, changes, reasons, links, lines⟩

- voice: chain of tellers, outermost first, e.g. [poet, kannagi, madurapati, bharatan]
- mood: one of 13: asserted, negated, claimed, thought, command, conditional, intended, predicted, wish, metaphor, address, dreamed, question
- t: story time, not reading order
- changes: fluent changes, e.g. +holds(a,b), −alive(a)
- reasons: typed `because` links (causes, enables, motivates, karma, moral, fulfils, foreshadowed), each with its own voice
- links: carries, contradicts, conflicts, retells
- lines: verse ids plus a quoted phrase that must be found in those lines
- birth: which life the record is set in

**Core rule: only an `asserted` record can change the state of the world.**

Gaps are first-class records: "not stated" is stored together with the tempting wrong answer (e.g., "Who made Kannagi's anklet?" — not stated; tempting: the goldsmith). Kinds vs individuals are different nodes ("a mango" vs "this mango"); every line is labelled literal, figurative or mixed, so "coral lips" never yields a coral object.

### 2. The fold (state by replay; viewer-relative worlds)
Event-calculus style replay in story order:

state(t, policy) = replay changes of records with r.t ≤ t and policy(r)
view(viewer, t, policy) = records passing policy + claims the viewer accepts at t − claims the viewer has rejected by t

Reader policies (applied at query time, never written into the data, in the spirit of assumption-based truth maintenance): `poet_only`, `story` (anyone speaking straight), `everything` (exists only to measure what a naive extractor would get wrong). Examples: holder(queen's anklet, 16.5) = goldsmith, while the king's view says Kovalan; view(Kanchanan, 20.4) contains "she is Kāyasaṇṭikai", view(Udayakumaran, 20.4) does not; belief(king, a09, t) goes none → accept → reject.

Births as a dimension: every record has a life field; no path may mix births without a `same_person` record with its own teller.

### 3. The composer (per-record representation selection)
For each record, decide from what it actually says which representation patterns it needs; keep only those; let the rest fall back to defaults on reading (no voice → the poet said it; no mood → told straight; no time → reading order).

needs(r) = {event, evidence}
 + voice if the teller isn't just the poet
 + mood if not told straight
 + state if it changes something
 + time if it changes something, is a belief, gives reasons, or something points at it
 + belief, speech, reason, conflict, retell, birth, note when those fields are present

Hard constraint: **a field may be dropped only if its default means the same thing** — compression can never turn a claim into a fact (checked by a test). Deliberately not a weighted optimiser: once the hard constraint is in, each pattern is either required or not, so a cost function would only add knobs.

The ledger compiles (exports) to a standards model: CIDOC CRM + CRMinf (belief/argumentation) + PROV-O + OWL-Time in RDF; so it is a way of writing to existing standards, not a rival standard.

### 4. The validator (four layers)
shape (SHACL: well-formed?), story (Python over the fold: does the sequence make sense? has a claim become a fact? two holders at once? dead actor?), identity (OWL RL: have known-distinct things been merged?), citation (does the line exist and contain the quoted phrase?). None can tell whether a reading of the Tamil is right.

### 5. Guarded paths and label-free echo/formula finders
- Guarded paths: path search over warrant-typed edges (event, same, kind, place, wider); a path's strength is the minimum over its steps; steps through claims (non-asserted records) are refused, weak steps flagged as cautions.
- Formula finder: compares all line pairs by overlapping 6-character chunks with spaces removed, IDF-weighted (robust to editors' word division); text only, no lexicon, no labels.
- Echo finder: longest in-order match of event kinds between two story stretches under a one-to-one mapping of participants (structure-mapping style), scored against shuffled baselines. Built for the anklet/curse mirror (goldsmith→Bharatan, Kovalan→Sangaman, king→Kalinga king).

## Scaling with LLMs, under tiered provenance
- Tier 1: classical NLP (name matching with canto-scoped epithets, verb-stem event inventory, co-occurrence, pattern bootstrapping).
- Tier 2: an LLM (claude-sonnet-5-5) proposes ledger records per canto window, must cite lines and a phrase that is checked to occur; plus an every-line pass giving each of the 10,209 lines a note: function (event, speech, description, list, comparison, address, doctrine, frame), categories, literal/figurative/mixed, short English gist.
- Tier 3: a second model (judge) labels each draft SUPPORTED / CONTRADICTED / INSUFFICIENT / EXTERNAL_ONLY / AMBIGUOUS with mood_ok and roles_ok.
- Tiers never mix: hand records, reviewed, checked drafts, unchecked drafts, line notes. Drafts are kept out of the graph, the question box and every score. A pre-registered (hash-frozen) GO/NO-GO stage test decides whether the LLM tier can run on the whole text. Wikidata is quarantined as external, never text evidence.
- Pilot design includes ablation modes: zero-shot, few-shot, masked (names hidden), notext (no verse given) — to separate reading from recall of a famous story.

## Evidence-gated question answering (hybrid layer)
Retrieval on top of the ledger, not in place of it. Runs in the browser (static site, offline).
1. Typed plan: language (Tamil, English, Thanglish), question kind (who-is, what happened, custody, did-it-happen-or-only-said, belief, why, cross-epic, provenance, theme, comparison, where, open), grounded names, epic, evidence policy.
2. Ambiguity grounding: names scored against all proper names; if unresolved (e.g., "Kausikan" is a messenger in SIL and Cutamati's father in MAN), the system asks instead of merging.
3. Four routes ranking hand records: rule (existing hand-written rules, trusted only if their records cover the question's words), graph (records naming the question's entities), words (BM25 over record text in English and Tamil), lines (BM25 over all 10,209 lines incl. line notes, credited to citing records). Cross-language through the graph: grounded names enter the query in both languages. Light Tamil stemming.
4. Fusion: reciprocal rank fusion (k=60); a fitting rule counts double, a non-fitting one half; the fused score is multiplied by coverage of the question's words.
5. Evidence classes (told as fact, said/claimed, wanted/ordered, imagined/dreamed, believed): only told-as-fact may answer as fact; if the best record is a claim the headline says "Only claimed, not told as fact".
6. Reply type: rule answer; "answer, from the records" (best record covers ≥2/3 of the question's words); "closest match, not an answer"; "no answer in the graph" (abstain).
Optional LLM writer → rule-based checker (drops claims citing absent evidence, stated as fact on non-fact evidence, unattributed speech/belief, or resting only on drafts) → optional auditor. Contrast: generic KG-QA/RAG checks relevance; this checks *what kind of statement* the evidence is.

## Contributions (as positioned)
1. Name and measure epistemic leakage in literary KGs; show that event nodes (the usual fix) leak as much as triples.
2. A voice-scoped event ledger with a viewer-relative fold and reader policies; honest finding that a carefully built standards model (CIDOC CRM + CRMinf + PROV-O + OWL-Time + SPARQL) ties on expressivity — so the contribution is economy and discipline (fewer statements, no hand-written queries per verb, exports to the standards), not expressive power.
3. A rule-based composer with a meaning-preserving hard constraint that generalises across epics where per-verb templates leak.
4. Ablation evidence that mood is the single feature preventing false facts; birth labels do nothing (identity by birth-specific ids suffices).
5. Guarded paths and evidence-gated QA that never present a claim as a fact.
6. The first full-coverage, provenance-tiered KG resource of the two Tamil epics (10,209 lines), with LLM drafting gated by a pre-registered stage test that separates reading from recall.
7. Negative results useful to low-resource/classical NLP: surface cues cannot predict what a passage needs; pattern bootstrapping fails on free-word-order verse with dropped subjects.

## Honest scope
Single annotator (not a Tamil scholar) wrote all hand records, questions and gold; a scholar's review is under way but not finished. Ideas with roots elsewhere: event calculus, n-ary relations, FactBank source chains, McCarthy's contexts, ATMS, CIDOC CRM/CRMinf, structure mapping. What is new is the combination for literary voice, mood, viewpoint, rebirth and story time, kept through paths and answers.
