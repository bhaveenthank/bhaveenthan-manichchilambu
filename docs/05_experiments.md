# Experiments: what I tried, what happened, what I chose

All of this reruns with `./run_all.sh`, and two runs in a row match exactly. Raw outputs are in `reports/`.

**Read this first.** Every label, question and ledger record here is mine: one reader, not a Tamil scholar. I wrote the method and its tests, so high scores for the ledger are weak evidence. They show the format *can hold* these cases. **The LLM tiers have not run, so nothing here says whether this can be done automatically.**

The data: 163 records (89 Silappatikāram, 74 Maṇimēkalai) across 22 episodes, 121 questions. 121 of the records are told straight, 42 aren't. Only 14 are deliberately plain, so this is still a sample of hard cases, not of the epics.

## 1. Corpus

10,209 lines, 64 cantos. My count matches the printed numbers in most cantos. In the mixed-metre cantos (7, 10, 12, 17, 20, 23, 24, 29) the edition restarts its numbering or stops printing it, so ids there use my count. SIL-22 and SIL-30 are off by one, not yet tracked down. `data/corpus/cantos.csv` has the comparison. One typo in the source: `20-0810` should be 20-080.

## 2. Finding names

Three cantos, hand labelled, 87 mentions.

| Matcher | Precision | Recall | F1 |
|---|---|---|---|
| Exact word | .93 | .16 | .27 |
| Word starts with name | .95 | .21 | .34 |
| Ignore spaces | .95 | .21 | .34 |
| + epithets limited to their canto | .95 | .70 | .81 |
| + stop list of lookalikes | .97 | .71 | **.82** |

**Choice: canto-scoped epithets with the stop list.** But these scores are optimistic: I wrote the epithets while reading these same cantos. Three labels were added after reading the matcher's output, because they were my misses.

The bigger finding: only **about 6% of lines** name a known entity. Most reference is by title, or by a dropped subject no matcher will find. Everything downstream that depends on names only ever sees that 6%.

## 3. Event inventory by verb stems

10 classes of Tamil stems over the whole corpus: 825 candidates on 800 lines. I read a fixed random sample of 40: about 27 are really that kind of event, so roughly two thirds. Misses are funny and instructive: குரங்கொன்று is "one monkey", not killing (SIL-15-0167), and வந்தனை is worship, not arriving (SIL-03-0120). Recall on the ledger's told-straight records is only **.29**.

**Verdict: a weak net.** It's useful for spotting busy passages and nothing more. It doesn't replace an event inventory, which needs Tier 2.

## 4. Co-occurrence

Five scores across five window sizes, ranked against pairs with a ledger link. Best: **raw count with a 3-line window, average precision .57**, with count at 5 lines close behind. PMI does worst at wide windows, it loves rare pairs. The winner moved from Dice to count when the ledger grew, so don't read much into the exact choice.

**Choice: small window, suggestion layer only.** Never a fact.

## 5. Pattern bootstrapping: failed

| Relation | Start | Round 1 | Round 2 | Round 3 |
|---|---|---|---|---|
| kinship | hand words | 1 of 9 | 1 of 4 | none |
| kinship | learned | 2 of 40 | 2 of 40 | 2 of 40 |
| spouse | hand words | 1 of 7 | 0 of 2 | none |
| spouse | learned | 1 of 33 | 2 of 40 | 0 of 40 |

**Verdict: don't use it for relations.** By round 3 the learned cues include மாமலர் and நெடுங்கண், "big flower" and "long eyes". It assumes names sit near their relation words, and in free word order verse with dropped subjects they don't. A useful negative result for the paper.

## 6. Formula finder

1,342 reused line pairs, **143 between the two epics**, 116 canto pairs linked across the epics. No lexicon, no labels. I read the top 25 and a sample of the rest. The top ones are all real shared phrases, and around score .5 some are just common phrasing.

Worth a scholar's time: the Indra festival (SIL-05, MAN-01), the curse line (SIL-00-0049, MAN-26-0031), the goddess's words (SIL-15-0033, MAN-07-0018), the descriptive passage at SIL-15-0156/7 with MAN-03-0036/7 and MAN-06-0010.

**Choice: keep it.** It found a link I'd missed. Shared phrases don't prove borrowing, they could be shared stock. That's a literary question.

## 7. Can classical NLP tell what a passage needs?

From the Tamil alone, predict which patterns a span needs. 161 spans.

| | Share of spans | Cue words F1 | Character n-gram model F1 | Just saying yes F1 |
|---|---|---|---|---|
| voice | .59 | .48 | .68 | .74 |
| mood | .26 | .18 | .33 | .41 |
| state | .22 | .36 | .22 | .37 |
| reason | .12 | .24 | 0 | .22 |
| birth | .09 | 0 | .12 | .17 |
| **macro** | | **.25** | **.27** | **.38** |

Those are leave-one-episode-out. Training on one epic and testing on the other gives the same macro scores.

**Verdict: this failed, clearly.** Both lose to saying yes every time, on a small sample. So the composer can't be driven by surface cues. Its input has to come from the LLM tier or a person, and when unsure the safe choice is to keep everything. This is the most important thing to test next.

## 8. How to store it: the main comparison

Same ledger, same questions, each method given the most generous reading I could manage. Dev: 3 episodes. Held-out: 7 episodes written after the first format was frozen by hash. Third batch: 12 episodes under format v2.

| Method | Dev (49) | Held-out (36) | Third (36) | False facts (d/h/t) | Statements |
|---|---|---|---|---|---|
| Flat, all records | .16 | .42 | .25 | .75 / .75 / 1.0 | 180 |
| Flat, only asserted | .33 | .56 | .53 | .08 / .12 / .09 | 144 |
| n-ary events | .22 | .42 | .31 | .67 / .75 / .91 | 480 |
| n-ary + qualifiers | .73 | .75 | .72 | 0 | 1,132 |
| Named-graph contexts | .53 | .83 | .75 | 0 | 643 |
| **CIDOC + CRMinf + PROV + OWL-Time, SPARQL** | **1.00** | **1.00** | **1.00** | 0 | **2,843** |
| **Ledger** | **1.00** | **1.00** | **1.00** | 0 | **1,287** |

Ledger minus each rival, with a 95% interval from resampling whole episodes: flat .55 (.44 to .63), n-ary .69 (.57 to .79), qualifiers .26 (.19 to .34), contexts .31 (.18 to .41), **standards 0 (0 to 0)**.

Honest reading:

- **Event nodes alone don't help with truth.** That's what people usually propose, and it leaks as much as raw triples.
- **The standards model ties. The ledger isn't more expressive.** I gave it the full voice chain and every state change, then wrote 9 SPARQL queries (48 lines), including the fold by hand. This is the result your brief warned might happen, and it's why the paper can't claim new expressive power.
- **What's left for the ledger:** 45% of the statements, no query writing for new verbs, and much faster per question (about 7ms against well under 1ms, which matters little at this size). The ledger also exports to that exact model, `data/graph/ledger_as_standards.ttl`, so it isn't a rival standard, it's a way of writing to the existing ones.
- **The 100%s mean little by themselves.** I wrote the questions knowing the format. While writing the third batch, three of my gold answers turned out wrong on rereading (e06, e16, e22), and I fixed those questions. That's normal, and also exactly why a scholar should write the next set.

**Choice: the ledger as the working format, standards as the export.**

## 9. Validator: 28 kinds of damage

| Layer | Caught | Only this layer caught |
|---|---|---|
| shape | 9 | 7 |
| story | 14 | 8 |
| identity | 5 | 0 |
| citation | 3 | 2 |
| **any** | **24 of 28** | |

**Missed: `plan_as_sale`, `dream_as_event`, `wrong_killer`, `doctrine_as_fact`.** I expected this. A wrong reading with a real citation looks fine to every rule, which is what Tier 3 and the scholar are for. One catch (`invented_participant`) was luck, a shape rule fired only because that record had no theme, so count the real gap as five.

False alarms on the 6 deliberately odd but valid readings: **0**, after fixing one thing: the "dead don't act" rule fired on Kovalan rising until records could say `after_death`. The identity layer never catches alone yet, since a simple story rule also bans `same_as`. It would matter once merges come in through `owl:sameAs` from outside.

I wrote the mutations and the checks both. It shows the checks do what they say, and where they stop.

## 10. Composer

| Strategy | Statements | Right (of 121) | False facts |
|---|---|---|---|
| Everything always | 1,456 | 121 | 0 |
| **Composed** | **1,181** | **121** | **0** |
| One template per verb, trained on all | 1,243 | 121 | 0 |
| Event + mood + last speaker + time | 1,227 | 65 | 0 |
| Bare events | 722 | 41 | 24 |

Compression is 19% overall, 43% on the plain records and 17% on the hard ones. The real epics are mostly plain, so the saving there should be higher, but I haven't measured that.

The important test is across the epics, since a per-verb table only knows verbs it's seen:

| | Per-verb | Composed |
|---|---|---|
| Learn on Silappatikāram, test on Maṇimēkalai | 24 of 44, **8 false facts** | 44 of 44, 0 |
| Learn on Maṇimēkalai, test on Silappatikāram | 45 of 77, **16 false facts** | 77 of 77, 0 |

**Choice: composed.** Big caveat: it's handed clean records, so it knows the mood already, and experiment 7 says that's the hard part. This shows the rules are sound, not that the pipeline works. I also skipped building a weighted optimiser, see `04_method.md`.

## 11. Removing one feature at a time

121 questions.

| Removed | Right | False facts |
|---|---|---|
| nothing | 121 | 0 |
| mood | 94 | **26** |
| state changes | 100 | 0 |
| story time | 104 | 0 |
| voice chain | 110 | 0 |
| belief records | 113 | 0 |
| reasons | 113 | 0 |
| contradictions | 118 | 0 |
| open values | 119 | 0 |
| **birth label** | **121** | 0 |

Mood is the one that stops false facts. **The birth label does nothing.** The path test agrees: 2,214 connected pairs with the birth rule, and 2,214 without. What really separates births is each life having its own id (`bharatan`, `kovalan`) and a `same_person` record.

**Decision: keep it as a UI filter, don't claim it as part of the method.**

## 12. Paths

All 3,321 pairs of the 82 nodes. Unfiltered search connects 3,084, and **1,743 of those (57%) go through something that didn't happen**. With the reader policy, 2,214 stay connected and none use such an edge. The ledger is full of hard episodes, so 57% is high for a whole-epic graph. The direction will hold, the size won't.

Example: Kovalan to the queen's anklet. Unfiltered, 1 hop: he stole it. With policy, 2 hops: he showed an anklet to the goldsmith, who took the queen's.

**Weakness:** shortest isn't meaningful. Gajabāhu to Kovalan comes out as "asked a boon of Kannagi, who offered Kovalan anklets", which is valid and useless. Paths need typed filters and a scholar's judgement.

## 13. Echo finder

| Pair | Matches | Mapping | Shuffle p |
|---|---|---|---|
| Curse vs its retelling | 2 | same people (correct, same event) | .012 |
| Fire vs Rāhulan | 2 | queen→Rāhulan, Mātari→Lakshmi (meaningless) | .039 |
| **Anklet vs curse** | 2 | goldsmith→Bharatan, Kovalan→Sangaman, king→Kalinga king (correct) | **.16** |

**Verdict: promising, not proven.** Right mapping on the case I built it for, but not distinguishable from chance on a ledger this small, and a meaningless pair ranks about as high. Also, my first encoding made it fail, I then found that record over-claimed and fixed it (`data/seeds/ledger_heldout.yaml`, d04). The fix is right by the text, but I'd seen the result. The fair test is on a ledger written by someone else or by Tier 2, with expected echoes declared first.

## 14. Wikidata

Looked up 17 terms, matched 10 items by hand. Useful for ids, Tamil Wikipedia links, and it agrees on the marriage and Maṇimēkalai's parents. Not useful for:

- her birthplace, given as *Poompuhar Assembly constituency*, a modern electoral district
- Ilango's religion, given as Hinduism while its own description calls him a Jain monk
- the Pandya king: several Nedunjeliyans, and nothing in the epic says which, so I matched none
- Gajabahu I of Anuradhapura, a historical identification the verse alone doesn't establish

**Choice: quarantine.** Stored as external, never counts as text evidence.

## 15. Ontology

20 modules plus a core parse and stay consistent under OWL RL with all the data, 0 SHACL violations. Two modules have no ledger records: m16 emotion (none encoded yet), and m02 lexicon (it's used by the name matcher, not by records). See `08_ontology.md`.

## Not done

See `10_status.md` for the full list against your plan.
