# Experimental log

All experiments are deterministic: `./run_all.sh` reruns everything with no network or model, and two runs in a row match exactly. Raw outputs in `reports/`. Every hand label, question and ledger record was written by one reader (not a Tamil scholar) who also wrote the method; high ledger scores are therefore weak evidence that the format *can hold* these cases.

## 0. Data and resource statistics
- Corpus: 10,209 lines, 64 cantos (SIL 0–32 incl. Patikam; MAN 0–30). In mixed-metre cantos (SIL 7, 10, 12, 17, 20, 23, 24, 29) the edition restarts or stops numbering; ids use our count.
- Hand records (current): 359, in all 64 cantos, citing 746 of 10,209 lines (7.3%). Mood families: happened 273, said 54, wanted 20, imagined 12 → 86 records not told as fact. Voice-chain depth: 1: 180, 2: 160, 3: 18, 4: 1 → 179 records told through a character. Births: main 343, previous birth as Bharatan 9, as Lakshmi 5, other births 2 (16 off-main-birth). 5 records conflict with/contradict another. 12 recorded gaps (each with the tempting wrong answer). 8 objects whose custody path is replayed.
- Experiment ledger (used by Exps. 7–13): 163 records (89 SIL, 74 MAN) across 22 episodes, 121 questions; 121 records told straight, 42 not; only 14 deliberately plain.
- Machine drafts (Tier 2, claude-sonnet-5-5, few-shot): 525 calls, 7,177 records kept, 83 rejected for a bad citation; cite 9,264 lines (91%); hand+drafts 9,285 (91%). Moods of drafts: 4,335 asserted; claims 630; commands 474; the rest questions, negations, conditions, metaphors, predictions, plans, wishes, thoughts, addresses, dreams. No draft tells Kovalan stealing the anklet as fact. 3,467 distinct entity ids in drafts (not yet merged); 363 records with no roles (mostly lists of goods). A gap pass added 608 records → 9,927 of 10,209 lines (97%) in a draft.
- Every-line pass: all 10,209 lines noted. Senses: literal 8,550, figurative 948, mixed 711 (1,659 figurative or mixed). Unread-lines pass: 131 calls, 920 notes, 608 records, 14 rejected; 4 lines skipped (3 are the rubric வேறு).
- Entities: 611 in graph, 338 of them named in drafts and described by a model (marked as such). 85 kinds.
- Ontology: core + 20 modules; consistent under OWL RL with all data (349 triples, 6,199 closure triples, 0 clashes), 0 SHACL violations; 2 modules unused (lexicon, emotion).
- Tier provenance layers on the site (lines): hand 746, checked (second-model agreed) 2,774, drafted 9,927, noted 10,209.

## 1. Name finding (Tier 1)
Three cantos, hand-labelled, 87 mentions.
| Matcher | P | R | F1 |
|---|---|---|---|
| Exact word | .93 | .16 | .27 |
| Word starts with name | .95 | .21 | .34 |
| Ignore spaces | .95 | .21 | .34 |
| + canto-scoped epithets | .95 | .70 | .81 |
| + stop list of lookalikes | .97 | .71 | .82 |
Optimistic (epithets written while reading these cantos). Only about 6% of lines name a known entity: most reference is by title or dropped subject.

## 2. Event inventory by verb stems
10 stem classes, 825 candidates on 800 lines. Fixed random sample of 40: about 27 real (≈2/3). Recall on ledger's told-straight records .29. Weak net.

## 3. Co-occurrence
Five scores × five windows, ranked against pairs with a ledger link. Best: raw count, 3-line window, AP .572 (P@20 .65); count at 5 lines AP .556. PMI worst at wide windows.

## 4. Pattern bootstrapping (Snowball/BREDS style): failed
| Relation | Start | Round 1 | Round 2 | Round 3 |
|---|---|---|---|---|
| kinship | hand words | 1 of 9 | 1 of 4 | none |
| kinship | learned | 2 of 40 | 2 of 40 | 2 of 40 |
| spouse | hand words | 1 of 7 | 0 of 2 | none |
| spouse | learned | 1 of 33 | 2 of 40 | 0 of 40 |
By round 3 learned cues include "big flower" and "long eyes". Names don't sit near relation words in free-word-order verse with dropped subjects.

## 5. Formula (text-reuse) finder
1,342 reused line pairs; 143 between the two epics; 116 canto pairs linked across epics. No lexicon, no labels. Top 25 read: all real shared phrases; around score .5 some are stock phrasing. Example cross-epic pairs: SIL-05-0073 / MAN-01-0071 (வசியும் வளனும் சுரக்க என வாழ்த்தி); SIL-15-0158 / MAN-03-0037 (பாரோர் காணாப் பலர்தொழு படிமையன்); SIL-05-0118 / MAN-12-0097 (கூனும் குறளும் ஊமும் செவிடும்); the goddess's self-introduction SIL-15-0033 / MAN-07-0018 (வந்தேன் அஞ்சல் மணிமேகலை யான்) — found by the finder, not sought.

## 6. Can classical NLP tell what a passage needs? (facet detection) — failed
161 spans; predict which patterns a span needs. Leave-one-episode-out F1:
| Facet | Base rate | Cue words | Char n-gram LR | Always yes |
|---|---|---|---|---|
| voice | .59 | .48 | .68 | .74 |
| mood | .26 | .18 | .33 | .41 |
| state | .22 | .36 | .22 | .37 |
| reason | .12 | .24 | 0 | .22 |
| birth | .09 | 0 | .12 | .17 |
| macro | | .25 | .27 | .38 |
Cross-epic training gives the same macro scores (.25 / .27 / .38). Both lose to always-yes.

## 7. Representation comparison (main)
Same ledger, same questions; each method given the most generous reading. Dev: 3 episodes, 49 questions. Held-out: 7 episodes written after the first format was frozen by hash, 36 questions. Third batch: 12 episodes, format v2, 36 questions. Accuracy; "false facts" = share of questions about claims answered by stating the claim as fact (leak rate). Statements = size of the encoding (held-out/third batch; dev sizes in parentheses).

| Method | Dev (49) | Held-out (36) | Third (36) | Leak d/h/t | Statements |
|---|---|---|---|---|---|
| Flat triples, all records | .163 | .417 | .250 | .75/.75/1.00 | 180 (74) |
| Flat, asserted only | .327 | .556 | .528 | .083/.125/.091 | 144 (57) |
| n-ary event nodes | .224 | .417 | .306 | .667/.75/.909 | 480 (182) |
| n-ary + qualifiers (Wikidata style) | .735 | .750 | .722 | 0 | 1,132 (418) |
| Named-graph contexts | .531 | .833 | .750 | 0 | 643 (241) |
| CIDOC CRM + CRMinf + PROV-O + OWL-Time, SPARQL | 1.00 | 1.00 | 1.00 | 0 | 2,843 (1,081) |
| Ledger | 1.00 | 1.00 | 1.00 | 0 | 1,287 (480) |

Standards baseline needs hand-written SPARQL incl. a hand-written fold: 9 queries / 48 lines (third batch), 9 / 44 (held-out), 11 / 62 (dev). Time per question: standards 3.5–7.5 ms; ledger ≈0.01–0.02 ms. Ledger exports to the exact standards model.
Ledger minus each rival (share of questions), 95% interval from resampling 22 episodes: flat-asserted .545 (.436–.625), n-ary .694 (.573–.793), qualifiers .264 (.190–.336), contexts .314 (.181–.410), standards 0 (0–0).
While writing the third batch three gold answers were found wrong on rereading and fixed.

## 8. Validator: 28 mutation types
| Layer | Caught | Only this layer |
|---|---|---|
| shape | 9 | 7 |
| story | 14 | 8 |
| identity | 5 | 0 |
| citation | 3 | 2 |
| any | 24 of 28 | |
Missed: plan_as_sale, dream_as_event, wrong_killer, doctrine_as_fact (wrong readings with real citations). One catch (invented_participant) was incidental, so the real gap is 5. False alarms on 6 deliberately odd but valid readings: 0 (after adding an `after_death` marker — the dead Kovalan rises and speaks, SIL-19-0062–0067).

## 9. Composer
121 questions, 163 records.
| Strategy | Statements | Right /121 | False facts |
|---|---|---|---|
| Everything always | 1,456 | 121 | 0 |
| Composed | 1,181 | 121 | 0 |
| One template per verb (trained on all) | 1,243 | 121 | 0 |
| Event + mood + last speaker + time | 1,227 | 65 | 0 |
| Bare events | 722 | 41 | 24 |
Compression 19% overall; 43% on plain records, 17% on hard ones.
Cross-epic (per-verb table only knows verbs it has seen):
| | Per-verb | Composed |
|---|---|---|
| Learn SIL → test MAN | 24/44, 8 false facts | 44/44, 0 |
| Learn MAN → test SIL | 45/77, 16 false facts | 77/77, 0 |
Caveat: composer is handed clean records (mood known).

## 10. Ablation (remove one feature), 121 questions
| Removed | Right | False facts |
|---|---|---|
| nothing | 121 | 0 |
| mood | 94 | 26 |
| state changes | 100 | 0 |
| story time | 104 | 0 |
| voice chain | 110 | 0 |
| belief records | 113 | 0 |
| reasons | 113 | 0 |
| contradictions | 118 | 0 |
| open values | 119 | 0 |
| birth label | 121 | 0 |
Path test agrees for birth: 2,214 connected pairs with the birth rule, 2,214 without.

## 11. Guarded paths
All 3,321 pairs of 82 nodes. Unfiltered search connects 3,084; 1,743 (57%) go through a non-asserted step. With reader policy 2,214 stay connected, none through such an edge; 0 paths mix births. Mean total path length: plain 7,126 hops summed, lawful 7,315. Example: Kovalan → queen's anklet; unfiltered 1 hop "steal" (claimed, SIL-16-0145); guarded 2 hops "show (to goldsmith, SIL-16-0116) > steal (by goldsmith, SIL-00-0025)". Weakness: shortest is not meaningful (Gajabāhu→Kovalan via a boon).
Warrant edge counts: event 120, same 115, place 71, kind 44, wider 4. Tempting paths (e.g., "the goldsmith made Mādhavi's jewels") are flagged.

## 12. Echo finder
| Pair | Matches | Mapping | Shuffle p |
|---|---|---|---|
| Curse vs its retelling | 2 | same people (correct) | .012 |
| Fire vs Rāhulan | 2 | meaningless | .039 |
| Anklet vs curse | 2 | goldsmith→Bharatan, Kovalan→Sangaman, king→Kalinga king (correct) | .16 |
Promising, not proven; not distinguishable from chance at this ledger size. One record was corrected after seeing a failure.

## 13. LLM drafting (Tier 2): pilot on three famous cantos
276 calls. Frozen scores (loose matching, 2 lines slack):
| Mode | Proposals | Recall | Mood agreement | False facts (of 7 traps) |
|---|---|---|---|---|
| zero-shot | 1,248 | .864 | .737 | 1 |
| few-shot | 999 | .886 | .564 | 0 |
| masked names | 1,266 | .523 | .652 | 0 |
| notext (no verse) | 528 | .659 | .690 | 0 |
Diagnosis: recall barely measures reading — moving each proposal to a random line of its canto gives few .832, zero .841, notext .666. Post-hoc same-line match (44 gold):
| Mode | Recall | Chance (top) | Mood right | Always "happened" | Non-facts kept apart |
|---|---|---|---|---|---|
| few | .841 | .563 (.682) | 29/37 | 29/37 | 6/8 |
| zero | .773 | .579 (.727) | 29/34 | 28/34 | 6/6 |
| notext | .591 | .413 (.523) | 15/26 | 20/26 | 2/6 |
| masked | .409 | .200 (.295) | 16/18 | 15/18 | 2/3 |
few finds 10 gold records notext misses and never the reverse (difference .23, 95% CI .11–.36). The zero-shot trap failure: "Kovalan stole the anklet", told as fact. Read of 40 random few proposals: 33 right, 6 partly, 1 wrong.

## 14. LLM drafting: pre-registered stage test on five lesser-known cantos (GO)
Frozen by hash before any output. Cantos SIL-10, SIL-14, MAN-13, MAN-23, MAN-28; 56 gold records; 102 calls; 656 few-shot proposals.
| Check | Needed | Got |
|---|---|---|
| few same-line recall | ≥ .60 | .804 |
| beats chance (97.5th pct) | > .554 | .804 (chance mean .452) |
| beats notext | by .10 | by .375 (notext .429) |
| non-facts kept apart | ≥ half | 6 of 10 |
Recall by canto: MAN-13 1.00, MAN-23 .90, MAN-28 .846, SIL-10 .786, SIL-14 .50. Without the verse recall sits at chance on lesser-known cantos. 44 of 656 proposals have no roles (lists of goods). Read of 30 random proposals: 24 right, 4 partly, 2 wrong.

## 15. Line notes spot check
50 random line notes read against the Tamil: 48 right, 1 partly right, 1 wrong (checked by the same model family, not by a scholar). Earlier 30-note sample from the unread pass: 24 right, 4 partly, 1 wrong, 1 unsure.

## 16. Second-model judge (Tier 3), in progress
Judge claude-haiku-5-5 over claude-sonnet-5-5 drafts (same model family; a stand-in for a different family).
- Gap drafts (complete, 608): SUPPORTED 362 (59.5%), AMBIGUOUS 114, INSUFFICIENT 91, CONTRADICTED 31, EXTERNAL_ONLY 10; mood_ok & roles_ok both 436.
- Full drafts (partial, 3,650 of 7,177 judged): SUPPORTED 2,318 (63.5%), AMBIGUOUS 658, INSUFFICIENT 370, EXTERNAL_ONLY 174, CONTRADICTED 101, unparsable 29; mood_ok true in 3,390 of 3,621 with a value (93.6%); roles_ok true in 2,694 of 3,608 (74.7%).

## 17. Evidence-gated question answering
Right = the answer's own records (first five shown) include the gold record; for unanswerable questions, right = nothing presented as an answer.
| Question set | Rules alone | Hybrid |
|---|---|---|
| Open, written before hybrid existed (32) | 16 | 30 |
| Fresh round 1 (34) | 29 | 31 |
| Fresh round 2 (25) | 20 | 23 |
| Fresh round 3 (20) | 14 | 17 |
| Held-out, written after tuning, scored once (20) | 12 | 19 |
Only held-out is fair. Six of the open-question rule misses were confident wrong answers (keyword fired; "Where did Kovalan wait inside the city?" got anklet contents); the hybrid catches them by checking rule coverage.

Retrieval by route, 122 questions with a known record:
| System | Recall@5 | MRR@10 | Held-out R@5 |
|---|---|---|---|
| rule | .47 | .41 | .21 |
| graph | .73 | .56 | .68 |
| words (BM25) | .83 | .66 | .95 |
| lines (BM25 via verse) | .48 | .35 | .53 |
| chars (n-gram TF-IDF) | .80 | .63 | .84 |
| RRF words+graph+lines | .81 | .58 | .89 |
| RRF + chars | .83 | .61 | .89 |
| Full system (all routes + evidence checks) | .91 | .74 | .95 |
Plain RRF ≈ BM25 alone; the gain is from coverage weighting and rule checking. Dense embeddings not run. LLM writer/auditor not run (checker tested by 8 hand-written bad answers).

## 18. Wikidata
17 terms looked up, 10 items matched by hand. Errors: heroine's birthplace given as a modern electoral constituency; poet's religion inconsistent with item's own description; ambiguous Pandya king; historical identification of Gajabāhu not established by the verse. Quarantined.

## Known open issues
SIL-22 and SIL-30 line counts off by one vs edition. "Why" questions return most relevant record, not a cause; family rule ignores direction. No inter-annotator agreement yet.

## 19. Clarifications added during refinement (from code and report files)
- Leak-rate denominators (questions about claims): dev 12 (flat_all leaks 9), held-out 8 (6), third batch 11 (11).
- Why "flat, asserted only" still leaks (1 question per set): triples lose role names and event identity, so the "happened?" check matches values from different asserted events of the same kind (no way to check it is one event).
- Statement counts are different units. Table "representation": each representation's own size (triples, nodes+roles, RDF statements) for the episode batch. Composer table: a per-record field cost (1 + roles + lines + voice entries + changes + reasons + one per optional field present) over all 163 records.
- The ledger's fold (state, holder, belief, viewer view) is about 45 lines of verb-independent Python in a 149-line module, written once; the standards model needs 9–11 SPARQL queries (44–62 lines) per question set.
