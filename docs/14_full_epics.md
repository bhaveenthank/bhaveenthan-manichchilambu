# Taking this across both whole epics

Short version: every canto now has records, but that's not the same as the whole text being encoded. The rest needs the machine run, and that run has to wait for the pilot's result.

## Where it stands

| | Before | Now |
|---|---|---|
| Cantos with at least one record | 43 of 64 | 64 of 64 |
| Hand-drafted records | 222 | 359 |
| Lines cited by a record | 377 of 10,209 | 746 of 10,209, about 7% |
| Nodes in the graph | 189 | 273 |

I read all 21 cantos that had nothing, about 3,000 lines, and wrote 137 records for their main events. A script confirms each quoted phrase is in its lines. No scholar has read them.

Coverage is still uneven, and it's better to say so. SIL-16 has 30-odd records. MAN-29, at 472 lines, has one. MAN-27 and SIL-26 have one or two. Doctrine-heavy cantos like MAN-27, MAN-29 and MAN-30 only got their frame, since what's in them is argument and not events. My Tamil reading is also fallible, so please treat these as drafts for checking.

Worth a look from this pass:

- **The poem points at its sequel.** SIL-32-0017 says the meaning completes along with Maṇimēkalai, and SIL-29-0074 reports her renunciation.
- **Kovalan's father appears in both.** Maṇimēkalai finds Masattuvan as a monk at Vanci (MAN-28-0073), and he sends her to Kanchi.
- **Real provenance at last.** Korkai pearls (SIL-14-0080), Tondi's cargo (SIL-14-0107), and what grows on Sirumalai (SIL-11-0080), where jackfruit is named outright as பலா.
- **More names that must not merge.** கௌசிகன் is Kovalan's messenger in one epic and Cutamati's father in the other. There's a second Kovalan nine generations back, and two different attendants called கஞ்சுகன்.
- **Fragrant wood isn't rare.** விரை மரம் also washes up on Manipallavam's shore (MAN-08-0005).

## What the pilot showed

All 276 calls finished, on three of the best-known cantos. The frozen scores, with rules unchanged since before any output existed:

| Mode | Proposals | Recall | Mood agreement | False facts (of 7 traps) |
|---|---|---|---|---|
| zero: no examples | 1,248 | .864 | .737 | 1 |
| few: worked examples | 999 | .886 | .564 | 0 |
| masked: names hidden | 1,266 | .523 | .652 | 0 |
| notext: no verse at all | 528 | .659 | .690 | 0 |

**Those numbers can't carry what I built them to carry, and that's my error.**

- **Recall barely measures reading.** I moved every proposal to a random line of its canto and recall stayed about the same: `few` .886 against .832 by chance, `zero` .864 against .841, `notext` .659 against .666. Allowing 2 lines of slack with a dozen-plus proposals per call makes matching too easy.
- **The masked test doesn't test memory.** Only about 6% of masked role values used the NAME tokens. The model wrote "king", "husband" and "goldsmith" instead, which my scorer can't match to ids. So that low recall is largely my scorer, and the "is it remembering or reading?" question this mode was meant to settle wasn't settled by it.
- **Mood agreement is noisy** for a related reason: loose matches can pair a proposal with a different event.

So I looked further. None of this is frozen, since I chose it after seeing the results (`reports/tier2_pilot_analysis.json`):

| Same-line match | Recall | Chance | Mood right | Always saying "happened" | Non-facts kept apart |
|---|---|---|---|---|---|
| few | .841 | .563 (top .682) | 29/37 | 29/37 | 6/8 |
| zero | .773 | .579 (top .727) | 29/34 | 28/34 | 6/6 |
| notext | .591 | .413 (top .523) | 15/26 | 20/26 | 2/6 |
| masked | .409 | .200 (top .295) | 16/18 | 15/18 | 2/3 |

What I take from it, with only 44 gold records and all of them mine:

- **It does read the verse.** Having the text beats not having it: `few` finds 10 gold records `notext` misses, and never the reverse (loose match, difference .23, interval .11 to .36).
- **It also remembers the story.** With no verse it still beats chance, so some of what looks like reading could be memory. Masking was meant to measure how much and couldn't.
- **The verse helps most on claims.** With it, `few` kept 6 of 8 non-facts apart from fact and `zero` 6 of 6, and without it `notext` kept 2 of 6. Those are tiny numbers, but it's the right direction on the error this project exists to catch.
- **Examples don't clearly help.** `few` and `zero` are within noise of each other. I'm using `few` because it fell for no traps. `zero` fell for one in one sample: Kovalan stole the anklet, told as fact.

I also read 40 random `few` proposals against the verse (`annotation/tier2_read_sample.csv`): 33 right, 6 partly right, 1 wrong. The wrong one turned "do not approach" into approaching. The partly right ones were mostly the wrong voice. It's more detailed than my hand records, around 7 times as many per canto. Don't lean on this: I'm the same model family marking it, I wasn't blind, and these are the cantos it knows best.

## The machine run

The pilot says the model is promising on famous cantos. It doesn't say so for the rest, and the full run costs days of your usage limit. So there was a smaller test first.

**1. Run the stage test. Done.** It covers five less famous cantos, with my new hand records as the answer key, which the model's examples never draw on. It's 102 calls, about 2.5 hours and about one limit window.

```bash
cd ~/Documents/Twin_Epics && .venv/bin/python scripts/tier2_llm.py --cantos SIL-10,SIL-14,MAN-13,MAN-23,MAN-28 --modes few,notext --samples 1 --out tier2_stage 2>&1 | tee reports/tier2_stage.log
```

**2. Score it. Done: it's a GO.** The test was frozen before any output existed (`experiments/run_tier2_stage.py`, hash in `reports/tier2_stage_freeze.sha256`, checked unchanged). It needed all four of these:

| Check | Needed | Got |
|---|---|---|
| `few` same-line recall, on 56 gold records | at least .60 | .804 |
| Beats chance | above .554 | .804 |
| Beats `notext` | by .10 | by .375 (`notext` got .429) |
| Non-facts kept apart | at least half | 6 of 10 |

Recall by canto: MAN-13 1.0, MAN-23 .90, MAN-28 .846, SIL-10 .786, SIL-14 .50.

This is a much better gap than the pilot's. On lesser-known cantos, the verse clearly matters: without it, recall sits at chance level. That's the evidence that it's reading and not only remembering.

The GO doesn't cover everything, and the weak spots are these:

- **Non-facts passed narrowly.** Two of the ten were ties, so it's 5 or 6 depending on how a tie falls. Either way it clears the line, but only just. Some of the misses may be fair, since an accusation should give one asserted record for the accusing and one claimed for its content, and my check can't tell those apart. Treat mood as the first thing a second reader checks.
- **Lists of goods lose their structure.** Most of SIL-14's misses are the market streets. The model wrote `describe_gems` or `describe_street` with no roles at all, so what's sold where doesn't reach a graph. 44 of 656 proposals have no roles. For material questions, the hand records stay the better source. I'm not changing the prompt now, because the test only vouches for this prompt, and a change would throw away the 74 saved calls.
- **Some misses are my scorer's.** It finds `mockers` and my `wanton_woman_10` to be different people, and `become_jackals` with the right lines still counts as a miss. So .804 could be a little low. Equally, gold is my own draft, and the matching is loose about what counts as the same event, so it could be a little high.

I also read 30 random `few` proposals against the verse (`annotation/tier2_stage_read_sample.csv`): 24 right, 4 partly right, 2 wrong. One gave the queen's words to the king and misread தன் ஓடு, her bowl. The other turned "my tongue utters nothing but his names" into a negated speech about him, the opposite meaning. So roughly 1 in 15 to 1 in 5 needs correcting, and the same caveats apply: I'm the same model family and wasn't blind.

**3. Run everything:**

```bash
cd ~/Documents/Twin_Epics && .venv/bin/python scripts/tier2_llm.py --cantos ALL --modes few --samples 1 --out tier2_full 2>&1 | tee reports/tier2_full.log
```

That's 525 calls. I checked the cache and 74 are already saved, so 451 are left. A `few` call took about 52 seconds in the stage test, so that's about 6.5 hours of running. The pilot reached about 170 calls before a limit, so expect at least 3 limit windows, likely 1 to 3 days. It resumes the same way if it stops.

The full design of 4 modes and 3 samples would be 6,300 calls, about two weeks of nonstop limit windows before counting any weekly cap. One sample is the realistic choice, and the cost is that we lose agreement between samples as a check.

**Done, on 4 November 2026.** It took four sittings, because of two usage limits and a half-hour network drop. There were 525 calls, 7,177 records kept and 83 rejected for a bad citation.

| | Hand records | Machine drafts |
|---|---|---|
| Records | 359 | 7,177 |
| Lines cited | 746 of 10,209 (7%) | 9,264 (91%) |
| Both together | | 9,285 (91%) |

- **Moods:** 4,335 are told as fact. The rest are claims (630), commands (474), questions, negations, conditions, metaphors, predictions, plans, wishes, thoughts, addresses and dreams. No record tells Kovalan stealing the anklet as fact.
- **Thin spots:** SIL-31 (half its lines), SIL-08, SIL-03, SIL-18 and SIL-01 (about three quarters). The closing cantos SIL-31, SIL-32 and MAN-30 have the fewest records per line.
- **Names aren't joined up yet.** The drafts use 3,467 different ids, and many are the same person under another name, like `king` and `pandya_king`. Joining them up has to come before any draft goes into the graph, and it's the next real job.
- **363 records have no roles**, mostly lists of goods and descriptions, as in the stage test.

**4. Build the site data.** Done:

```bash
cd ~/Documents/Twin_Epics && .venv/bin/python scripts/build_web_data.py
```

Each song page then gets a "Machine-read drafts" panel. They stay out of the graph, out of the question box and out of every score, because nothing has checked them except that the quoted words exist. I tried the panel on 205 pilot answers, then removed that test data.

## Why they don't go straight into the graph

A quote check catches a made-up verse. It doesn't catch a real verse with the wrong person, the wrong mood, or a lie recorded as fact, and that's the failure this project exists to prevent. To move machine drafts into the graph, they need a second reader, and that should be a different model family (`scripts/tier3_judge.py`) or a Tamil scholar. Ideally both.

## What only a person can finish

- A Tamil scholar reading the drafts, starting with `annotation/review_ledger.csv`
- A second model family for checking
- Readers rating the unexpected paths, since that ranking hasn't been tested at all
- Commentary, which isn't in the data
