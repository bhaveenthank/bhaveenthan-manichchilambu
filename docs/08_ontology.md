# The ontology

Core in `ontology/core.ttl`, 20 modules in `ontology/modules/`, validation rules in `ontology/shapes.ttl`. You can open them in Protégé. Everything's under `https://example.org/manichchilambu#` for now, change that when there's a real home.

**Your silambu question, answered.** Don't make "silambu" a node everyone shares, and don't make it just an edge label. Each anklet is its own individual, the giving or taking is an event node, and who holds it comes from replaying events:

```
ank_k1, ank_k2  members of Kannagi's pair     contains gems (her claim)
ank_q           the queen's                   contains pearls (the king's claim)
ank_k1 differentFrom ank_q

a01 offer:  kannagi offers the pair to kovalan     SIL-09-0073   changes nothing
a03 take:   kovalan takes ank_k1 from kannagi      SIL-16-0092   -holds(kannagi,ank_k1) +holds(kovalan,ank_k1)
a09 steal:  kovalan took ank_q   voice poet>goldsmith  mood claimed   changes nothing
```

## The modules

| Module | What it covers | Records using it | Closest standard |
|---|---|---|---|
| m01 source | Epic, kandam, canto, line | 163 | CRM E73 |
| m02 lexicon | Names, epithets, lookalikes | used by the matcher | CRM E41 |
| m03 agents | People, rulers, groups | 118 | CRM E39 |
| m04 objects | Anklets, bowl, parts, sets | 30 | CRM E22 |
| m05 events | Roles and event families | 120 | CRM E7 |
| m06 custody | Holding, owning, care | 15 | CRM E10 |
| m07 states | Broken, hungry, alive, function | 15 | CRM E3 |
| m08 time | Story time vs reading order | 27 | OWL-Time |
| m09 place | Cities, ponds, sites, journeys | 20 | CRM E53 |
| m10 speech | Accusing, ordering, teaching | 98 | CRM E7 |
| m11 belief | Claims, stances, revisions | 24 | CRMinf I2 |
| m12 identity | Disguise, same person, distinct | 11 | owl:differentFrom |
| m13 plans | Intentions, attempts, motives | 3 | Drammar, to align |
| m14 causes | Typed reasons with voices | 20 | PROV |
| m15 social | Kinship, marriage, office | 12 | CRM E85 |
| m16 emotion | Grief, anger, judgement | **0, declared only** | Drammar, to align |
| m17 cosmology | Birth, curse, prophecy, miracle | 16 | CRM E5 |
| m18 interpretation | Dreams, figures, readings | 8 | CRMinf I1 |
| m19 crosstext | Retellings, echoes | 5 | CRM P67 |
| m20 provenance | Evidence, runs, review | 163 | PROV-O |

I wrote all 20 because you asked for a complete design, but the classes inside are deliberately lean. A class goes deeper when real records need it. Most of the class names in the modules (Ruler, Temple, Lament and so on) aren't yet used by any record, the counts above are per module.

## Rules that aren't obvious

- **Never `owl:sameAs` for a disguise, a birth, or an image.** It would pass every property across. That's what `looks_like`, `same_person` and `depicts` are for.
- **Ownership isn't asserted anywhere.** Nothing I've read in these passages transfers title, only custody. So `owns` stays empty, and that's correct.
- **A person isn't a role.** The king is one individual who accepts, orders and repents. No `KingAsJudge` node.
- **An object's identity survives breaking.** The anklet has a state change, it doesn't become a new thing.
- **Unknown isn't false.** If the text doesn't say who killed Sangaman, there's no agent. Nothing fills it in.
- **The score, the mood and a character's belief are three separate things.** A false accusation read correctly should score high, with mood `claimed`. They never merge.

## Competency questions

The 121 questions in `data/seeds/questions_*.yaml` are the competency questions. Each has an operator and a gold answer. The questions from your brief are all in there or close: which anklet was wrongly identified (q19, q27), who accused and who ordered (q03, q25), who Kanchanan thought he was approaching (q38), who held the bowl before the pond (q42), which past-life act links to the later suffering (h08).

`src/manichchilambu/standards.py` has the same questions as real SPARQL, if you want to see them in that form.
