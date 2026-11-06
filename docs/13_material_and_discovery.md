# Food, jewels, cameos and finding connections

The counts in this note were taken before the coverage pass in [14_full_epics.md](14_full_epics.md), except the test results, which are current.

This is the work on your research question: can a system find connections nobody asked for, across people, food, jewels, crafts, places and beliefs in both epics, with verse evidence for each one?

Short answer so far: on what's recorded, yes for finding them and for not overclaiming. Whether the connections are *interesting* hasn't been tested, because that needs readers.

## What got added

Everything in this batch stays apart from the 163 records the experiments were scored on, so those numbers still mean what they said.

| File | What it is |
|---|---|
| `data/seeds/ledger_material.yaml` | 59 new records: the meal, the anklet examined, Madhavi's jewels, gifts at Puhar, the gold pavilion, the festival drum, the hill people's gifts, Saduvan's wreck, Pilivalai's child, cameos |
| `data/seeds/things.yaml` | 90-odd new nodes. Unnamed people get their own id (`blanket_merchant`, `skilled_woman_16`), so two merchants never merge into one |
| `data/seeds/gaps.yaml` | 11 things the text doesn't say, each with the tempting wrong answer |
| `data/seeds/bridges.yaml` | Links between the epics, sorted into same individual, story carried on, recurring motif, comparable but separate |
| `data/seeds/lexicon.yaml` | Six lexicons and a homonym register. A script checks every form against the line it cites |
| `src/manichchilambu/discover.py` | The path finder |
| `experiments/run_discovery_test.py` | Its test, written to `reports/discovery.json` |

## Where your notes and the text disagree

I checked your notes against the Project Madurai text before encoding anything. Most of it held up. These didn't, and the graph follows the text:

| The notes say | The text says | What I did |
|---|---|---|
| The meal is in Adaikkala Kathai, verses 18–55 | It's at the start of the next canto, Kolaikkala Kathai, SIL-16-0019 to 0055 | Cited SIL-16 |
| Jackfruit (பலா) is in the meal's provisions | The verse has கோளிப் பாகற் கொழுங்கனி, and the word பலா isn't there. Reading it as jackfruit comes from commentary | Kept as `koli_fruit` with a labelled link to jackfruit. I haven't checked that against a printed commentary, so please do |
| So mango, jackfruit and plantain overlap between the meal and the hill gifts | Mango and plantain do. Jackfruit only through that reading. Areca also turns up in both (SIL-16-0055, SIL-25-0046), which the notes miss | Encoded that way |
| Both works mention sandalwood, so hill gifts and wreck goods connect through it | Maṇimēkalai says விரை மரம், fragrant wood. The word சந்தனம் doesn't occur anywhere in Maṇimēkalai in this edition | The path now goes through "fragrant wood" as a wider category, and warns |
| The drummer belongs to a community from Vachirakottam | The *drum* comes from Vachirakottam (MAN-01-0027). The man is only "born of an old lineage" (MAN-01-0031), with no place | Gap g05 |
| Gurumahan as a character's name | குருமகன் reads as a title, "our chief", and the Naga chief is otherwise unnamed | `naga_chief`, with the title in the lexicon |
| Saduvan's goods as "recovered shipwreck goods" | True, but the chief says outright that they came from men his people ate (MAN-16-0120 to 0122) | Recorded as his claim, and it's a grimmer provenance than the notes give |

Two more that the notes didn't have. Madhavi's bangle (SIL-06-0091) and Kannagi's anklet (SIL-16-0117) share one jeweller's phrase almost letter for letter, மத்தக மணியொடு வயிரம் கட்டிய. And the poet says fine craftsmen never saw the gifts at Puhar and that Mayan made them (SIL-05-0105 to 0108), which is why those are `mayan` and not "craftsmen of Magadha".

**The 300 questions.** The notes point to a Markdown and a JSONL file with 300 question-answer pairs. They weren't attached and I couldn't get at the links, so they aren't in this repo. Send the files if you want them checked against the text and added. I wouldn't trust them as gold without that, given the table above.

## The method: guarded paths

An ordinary shortest-path search has two faults. It runs through whatever is most connected, and it treats every step as equally solid, so "both mention mango" reads like "she handed it to him".

So every step carries a warrant, and a path can't conclude more than its weakest step:

| Warrant | Meaning | What it can't support |
|---|---|---|
| event | both are in one told-straight record | |
| said | both are in something a character only said, planned or dreamed | that it happened |
| same | walking through one individual | |
| place | walking through a place | that anything was made or grown there, or that they met |
| kind | walking through a kind of thing | that it's the same mango, or that any moved |
| gloss | a reading from outside the verse | that the verse says it |
| wider | one kind inside a wider kind | that fragrant wood means sandalwood |

Three rules are hard limits and don't just add cost:

- at most one trip through kind-level links per path
- said-only records stay out unless you ask for them
- only an explicit `make` record can say someone made something

Passing through a node costs more the more connected it is, which is the idea behind Adamic-Adar link prediction. Each path comes out with the sentences it may *not* be read as saying.

## What the test shows

Against a plain breadth-first search over the same records:

| Check | Result |
|---|---|
| Tempting pairs where the guarded path shows the right warning | 8 of 8. I changed one expected answer after seeing the result: Madhavi to the goldsmith honestly goes through Kovalan, not jewels |
| False "X made Y" claims licensed | 0 of 12 |
| True "X made Y" claims missed | 0 of 6 |
| Links I listed by hand, found | 15 of 15, after I added the mat's link to Kovalan, which the first run exposed as missing |
| Average degree of the nodes a path goes through | 15.3 guarded, 18.4 plain, on the larger graph |

Read this with care:

- I wrote the test sets with the method in mind, so it's a regression check and not a blind score.
- The hub cost doesn't do much: 15.3 against 18.4 is a modest difference, and these paths still run through busy nodes. The warrants are what's doing the work, and I wouldn't claim hub-avoidance in a paper on these numbers.
- The false-claim result is close to true by construction, because the rule only accepts an explicit record. Its value is that it stops a mistake a looser system makes, and a comparison against a real KG-completion model would be the fair test.
- The surprise ranking hasn't been tested at all. The list of 120 still has dull entries near the top, so the site puts ten hand-picked starting points above it.

## Depth

Your notes are right that "longest path" is the wrong measure. Reported three ways, on what's recorded now:

| Measure | Now | Note |
|---|---|---|
| Causal chain: longest run where the text gives each step as a reason | 5 records | Pilivalai's child gives the same length: handed over, wreck, report, forgotten festival, curse |
| Story order: stages inside one episode | the road to Madurai 21, anklet 19, disguise 14 | Succession, not causation. The site draws these as dashed lines |
| Cross-epic path | up to 5 steps in the shortlist | The search is capped at 6 hops for the list and 7 in Connect any two, so this is a ceiling set by me as much as a finding |

These will all move as records are added, so don't quote them as properties of the epics.

## What isn't done

- The six layers in the notes are filters on one graph (events, material, belief, cause), not separate stores. The lexical layer lives on the Words page.
- Commentary isn't in the data. Everything marked as a reading is mine or from general knowledge of the tradition.
- Madhavi's character as a claim-evidence matrix isn't built. The records are there to build it from.
- CIDOC CRM, PROV-O and SKOS mapping covers the first 163 records and not this batch yet.
- 59 draft records is a small share of what's there. The lists of crafts and foods are the ones I read, not every one in the epics.
