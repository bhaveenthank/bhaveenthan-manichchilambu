# Annotation manual, first draft

For a person checking or adding ledger records. Fill in `annotation/review_ledger.csv`, or add rows to `data/seeds/`. If you're not sure, say so in the comment. An honest "unsure" helps more than a guess.

## One record, one thing told

Ask in this order.

**1. What's being told?** A verb in plain English, and who's in it. Fill a role only if the text gives it. Sangaman's killer isn't named at SIL-23-0157, so there's no agent.

**2. Who's telling it?** Start with `poet`, and add each speaker inward. Kannagi telling what Madurapati told her of Bharatan's lie is `[poet, kannagi, madurapati, bharatan]`. If a voice has no owner, write `unknown`.

**3. In what mood?**

| Mood | Use when | Example |
|---|---|---|
| asserted | Told as having happened | The drunk man strikes (SIL-16-0213) |
| claimed | Someone says so, and we shouldn't take it as settled | "Stole the queen's anklet" (SIL-16-0145) |
| thought | Inside someone's head | "The ornament I secretly took" (SIL-16-0127) |
| command | An order or request | "Take a different form" (MAN-26-0069) |
| conditional | Depends on an if | "If it's in the thief's hand, kill him" (SIL-16-0152) |
| intended | A plan | Rebuilding their wealth in Madurai (SIL-09-0075) |
| predicted | Foretold | Madurai will burn (SIL-23-0136) |
| wish | Wished or cursed | "May they suffer as I have" (SIL-23-0168) |
| dreamed | Inside a dream | The town slanders her (SIL-09-0048) |
| metaphor | A figure of speech | "I am the thief" (SIL-20-0086) |
| address | A way of calling someone | "Mother Kannagi" (MAN-26-0002) |
| question | Asked, not stated | "Is this an illusion?" (SIL-19-0068) |
| negated | Told as not having happened | |

The trap: asserted isn't the same as true in the world, or even true in the story. It means told straight. An accusation has **two** records: the accusing, which is asserted, and what was alleged, which is claimed.

**4. When in the story?** Story time, not where you're reading. A flashback gets an earlier number than the canto it's told in. Exact values don't matter, only the order.

**5. Does it change anything?** Only an asserted record can. `+holds(a,b)`, `-alive(a)`, `+looks_like(a,b)`. An offer changes nothing. An order changes nothing.

**6. Why?** Only if the text gives a reason. Coming earlier isn't a reason. Types: `causes`, `enables`, `motivates`, `karma`, `moral`, `fulfils`, `foreshadowed`. Give the reason its own voice if someone else says it.

**7. Which lines, and which words?** The fewest lines that carry it, and a phrase copied from them. A script rejects the record if the phrase isn't there.

## Hard calls

- **Text doesn't choose?** Don't choose either. `theme: {one_of: [ank_k1, ank_k2]}` with a note.
- **Two accounts disagree?** Keep both, with `conflicts`. Don't delete the one you like less.
- **Same word, different thing?** Different ids. The bowl at MAN-05-0065 isn't Amudasurabhi.
- **Same event told twice?** Two records joined by `retells`, each with its own voice. Compare them, the telling can change.
- **Dead person acting?** If the text really says so, keep it and add `after_death: true`.
- **My own inference?** Fine, add `inferred:` saying what's inferred. It stays visible.
- **Emotion?** Only when stated. Never infer it from an action.

## Keep separate

Don't use the method's output or a model's guess while labelling a test set. Anything that'll be used to evaluate has to be labelled blind. Group by episode when splitting, and keep both tellings of a retold incident on the same side, otherwise one gives away the other.

## What you'll be measured on

With two annotators, we'll report agreement separately for spans, event kinds, roles, identity, mood and story order, using Krippendorff's alpha where it fits. Disagreements get settled by discussion, and we keep the original answers.
