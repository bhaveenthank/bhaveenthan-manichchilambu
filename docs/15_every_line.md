# Every line, and the 24 categories

Short version: every one of the 10,209 lines now has a row saying whether anything reads it. 924 lines are still unread. A ready-made model pass gives each of them its own note, and a second pass does the same for every line in both epics. Both have to run from your terminal.

## Where the lines stand

`scripts/build_line_index.py` writes one row per line to `data/lines/line_index.jsonl`, and a summary to `reports/line_audit.json`.

| Status | Lines | What it means |
|---|---|---|
| In the graph | 746 | A hand record cites it |
| Drafted | 8,539 | Only unchecked machine drafts cite it |
| Unread | 924 | Nothing cites it yet |

The unread lines are spread over every canto except MAN-14, mostly in descriptive and doctrinal stretches. The most are in SIL-03 (48), SIL-07 (39), SIL-23 (39), SIL-05 (37), SIL-08 (37) and MAN-29 (32). The full list is in the audit file.

"Drafted" isn't the same as read well. The stage test put the drafts at roughly 1 in 15 wrong and 1 in 7 partly wrong, and nobody has checked them at this scale.

## The catalogue you sent: what held up

I checked every item in it against the text. Its line numbers follow a printed edition. Ours count lines within each canto, so I give our ids.

**Confirmed and added** (`data/seeds/catalogue.yaml`, 76 items, each checked by `scripts/check_catalogue.py`):

- **People:** Atirai (MAN-16-0022), Irasamadevi (MAN-23-0007, the Chola queen already in the graph), Kanakan and Visayan (SIL-26-0159), and Etti Sayalan, whose household fed the monkey (SIL-15-0163).
- **Deities:** Champapati (MAN-00-0008), and the pillar goddess (MAN-28-0185).
- **Places:** Maruvurpakkam and Pattinappakkam, two quarters of Puhar (SIL-05-0039, 0058), the day market, Kanchanapuram, Samanoli on Lanka, Uvavanam, the Cakkaravala Kottam, Ulaka Aravi and the Aravor Palli.
- **Jewels:** all thirteen pieces of Madhavi's adornment named in SIL-06-0084 to 0107, from பரியகம் to தொய்யகம்.
- **Dances:** the eleven dances, SIL-06-0043 to 0063. The catalogue named four, and the poem counts eleven itself at SIL-06-0066.
- **Food:** the nāval fruit, the teak leaf it lay on, மோதகம், the six tastes, meat, white salt, grain, and the cow's milk for the infant Aputhiran (MAN-13-0013).
- **Plants and animals:** the monkey, the vengai tree and the lotus.
- **Trades:** fifteen, from Puhar's streets in SIL-05.
- **Doctrine:** dāna and sīla (MAN-30-0001), and dependent arising (MAN-30-0023).

**Corrected or qualified:**

- The anklet quotes are SIL-20-0078, Kannagi's (மணியுடை அரியே), and SIL-20-0080, the king's (முத்துடை அரியே).
- நாளங்காடி is spelt நாள்அங் காடி in this edition (SIL-05-0063).
- அறக்கோட்டம் is only in the title of MAN-19. No line of the verse uses the word.
- கந்திற்பாவை is in the title of MAN-21, but in the verse it's at MAN-28-0185. MAN-21's first line has கந்தின், the pillar.
- Irasamadevi is in MAN-21, MAN-23 and MAN-24, not 22 to 24.
- ஆயர்பாடி at SIL-16-0046 is Krishna's, in a comparison. It isn't Matari's village by name.
- பொதியில் at SIL-00-0040 is a hall (மன்றப் பொதியில்), not the mountain.
- குமரிக் கோடு (SIL-11-0020) is the peak the sea swallowed. Matching it to today's Kanyakumari is a separate claim.
- பரியகம் comes back among the bangles at SIL-06-0093, so it may not be only a foot ornament. This one needs a scholar.

**New homonyms**, added to the register on the Words page:

- **சாலி:** Aputhiran's mother in MAN-13-0005, and rice in SIL-16-0027.
- **மாபெருந்தேவி:** a title, Cenkuttuvan's queen in SIL-25-0110 and the Chola queen in MAN-23-0080.
- **குழல்:** hair in SIL-02-0020, and the flute in SIL-17-0085.

## How the catalogue's ideas map onto what's here

Most of the 24 categories were already modules in the ontology. The table under `taxonomy:` in the catalogue file says where each one lives, and whether it's stored as a thing, a record, a kind of link, or evidence. Several of its other ideas were already built:

- separate object instances for the anklets
- claims kept apart from facts
- the homonym register
- name forms tied to cantos
- commentary readings marked as readings

Three ideas weren't, and the every-line pass adds them:

- **Plants and animals** as a category of their own.
- **Literal or figurative**, for every line, so a coral comparison never becomes a coral ornament.
- **What a line does:** event, speech, description, list, comparison, address, doctrine or frame.

## The every-line pass

`scripts/tier2_lines.py` asks about each line in turn. For every target line the model must give one note: what the line does, its categories, literal or figurative, and a few words of gist. A line it skips is listed in `reports/tier2_lines_missed.json`, so nothing can drop out without showing. The tests check that every line is a target exactly once.

**1. The 924 unread lines** get notes and records. That's 131 calls, about two hours, likely one usage window:

```bash
cd ~/Documents/Twin_Epics && .venv/bin/python scripts/tier2_lines.py --scope unread 2>&1 | tee reports/tier2_lines.log
```

**2. Every line in both epics** gets notes only. That's 493 calls, likely 2 to 4 days at your limit:

```bash
cd ~/Documents/Twin_Epics && .venv/bin/python scripts/tier2_lines.py --scope all 2>&1 | tee reports/tier2_lines_all.log
```

Both resume the same way the other runs do. When either prints `done`, tell me, and run:

```bash
cd ~/Documents/Twin_Epics && .venv/bin/python scripts/build_line_index.py
```

**This pass hasn't been tested on gold like the drafts were.** The line notes are a new kind of output, and no answer key exists for them yet. Before trusting them, read a random 50 against the verse. A second model family checking them would be better.

## The unread pass: done, 5 November 2026

`done {'calls': 131, 'notes': 920, 'records': 608, 'rejected': 14} lines with no note: 4`

After rebuilding the index:

| Status | Lines |
|---|---|
| In the graph | 746 |
| Drafted | 8,539 |
| Noted | 920 |
| Unread | 4 |

Three of the four it skipped are just the rubric வேறு ("another song"), at SIL-07-0286, SIL-12-0121 and SIL-12-0134. The fourth is a real line, the first of canto 14: SIL-14-0001, புறஞ்சிறைப் பொழிலும் பிறங்குநீர்ப் பண்ணையும். The all-lines pass asks about every line again, so it will pick these up.

The 608 new records cite 1,018 lines. They're drafts like the rest, and none of them is in the graph.

**What the notes say.** 362 descriptions, 102 events, 100 lists, 95 doctrine, 90 frames (headings and "she said" lines), 71 speech, 68 comparisons, 19 addresses and 13 other. 94 are figurative and 95 mixed. 57 have no category, which is allowed, since a guess is worse.

**My read of 30 at random** (seed 20261105, in `annotation/tier2_lines_read_sample.csv`): 24 right, 4 partly right, 1 wrong, 1 I'm unsure of.

- The wrong one is SIL-13-0130. The gist puts in a breeze that isn't in the line.
- The partly right ones mostly add a word, or name the wrong object: at SIL-04-0037 the grinding slab becomes the paste.

That's my own reading. A Tamil scholar's would count for more. It's close to the drafts in the stage test, so it's fine for finding lines but not for citing as fact.
