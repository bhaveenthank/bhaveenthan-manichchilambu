# The Maṇichchilambu method, and how I got to it

Five pieces: the **ledger** (a record format), the **fold** (working out state from it), the **composer** (what each record needs), the **validator** (four kinds of check) and two finders for links nobody wrote down (**echo** and **formula**).

## How it developed

**Step 1: triples.** `kannagi gave kovalan` loses the anklet. Everyone knows this.

**Step 2: event nodes.** The W3C n-ary pattern fixes the anklet. It's from 2006, so this answers your original silambu question and isn't new.

**Step 3: then I read SIL-16.** An event node for "Kovalan stole the queen's anklet" looks just like one for "Kovalan took Kannagi's anklet". Event nodes make a lie *neater*. In testing they let false claims through about as often as plain triples.

**Step 4: add qualifiers.** Wikidata style: mood, speaker, time. This stops the false facts. But one qualifier holds only the last speaker, MAN-26-0027 is four voices deep, and every custody question needs its own hand-written logic. Mine broke on `buy` because I hadn't listed that verb.

**Step 5: stop storing state.** Each record says what it starts and ends, then you replay. "Who holds it at time t" becomes one function for any verb. That's the event calculus, from 1986.

**Step 6: read MAN-20.** Two men, one woman, opposite beliefs. So there's no single state of the world. Replay has to take a viewer.

**Step 7: read SIL-23 next to SIL-16.** The same story, twice, and no edge says so. That led to the echo finder.

**Step 8: build the strongest rival properly.** CIDOC CRM, CRMinf, PROV-O and OWL-Time in real RDF with real SPARQL. It tied on every question. That killed the idea that the storage was the contribution, and moved the weight to what's around it.

**Step 9: notice the waste.** A full record for "Mādhavi danced" costs as much as one for a nested lie. That led to the composer.

## The record

Nothing is stored as simply true. Each record only says: this voice chain tells us this, in this mood.

```
r = ⟨ what, roles, voice, mood, t, birth, changes, reasons, links, lines ⟩
```

- **voice**: chain of tellers, outermost first: `[poet, kannagi, madurapati, bharatan]`
- **mood**: `asserted, negated, claimed, thought, command, conditional, intended, predicted, wish, metaphor, address, dreamed, question`
- **t**: story time, not reading order
- **changes**: `+holds(a,b)`, `-alive(a)`
- **reasons**: `because` with a type (`causes, enables, motivates, karma, moral, fulfils, foreshadowed`), each with its own voice
- **links**: `carries`, `contradicts`, `conflicts`, `retells`
- **lines**: verse ids, plus a phrase that must be found in them

And the rule that does most of the work:

> **Only an `asserted` record can change the state of the world.**

## The fold

```
state(t, policy)        = replay changes of records with r.t ≤ t and policy(r)
view(viewer, t, policy) = records passing policy
                          + claims the viewer accepts at t
                          − claims the viewer has rejected by t
```

A **reader policy** decides what counts: `poet_only`, `story`, `everything`. It's applied when you ask and never written into the data, so different readers can read one ledger differently. Your filter sliders can drive this directly.

- `holder(ank_q, 16.5)` gives `goldsmith`, while the king believes it's Kovalan
- `view(kanchanan, 20.4)` contains "she is Kāyasaṇṭikai", `view(udayakumaran, 20.4)` doesn't
- `belief(king, a09, t)` gives nothing, then `accept`, then `reject`

## The composer

This does the job you called the representation selector. For each record, work out what it needs from what it actually says, keep only that, and let the rest fall back to a default on reading:

```
no voice → the poet said it     no mood → told straight     no time → reading order
```

```
needs(r) = {event, evidence}
         + voice    if the teller isn't just the poet
         + mood     if it isn't told straight
         + state    if it changes something
         + time     if it changes something, is a belief, gives reasons, or something points at it
         + belief, speech, reason, conflict, retell, birth, note   when those fields are present
```

The hard constraint: **a field can only be dropped if its default means the same thing.** That's what stops compression from turning a claim into a fact, and a test checks it.

It's deliberately not an optimiser. Your brief suggested minimising a cost function with penalties. Once the hard constraint is in, there's nothing left to trade off: each pattern is either required or it isn't. A weighted optimiser would only add settings to tune. Simple rules got the same answers, so I kept the rules.

## The validator

| Layer | Asks | Tool |
|---|---|---|
| shape | Is it well formed? | SHACL |
| story | Does the sequence make sense? Has a claim become a fact? | Python over the fold |
| identity | Have two known-distinct things been merged? | OWL RL |
| citation | Does the line exist, and contain the quoted phrase? | Python |

None of them can tell if a reading of the Tamil is right. That gap is measured in experiment 9.

## Echo finder

Given two stretches of story, find the longest in-order match of event kinds where the mapping of people stays one-to-one. Anklet vs curse returns `goldsmith→bharatan, kovalan→sangaman, pandya_king→kalinga_king`. Promising, not proven, see experiment 13.

## Formula finder

Compares all lines using overlapping 6-letter chunks with spaces removed, weighted so rare chunks count more. Works across different editors' word divisions, and reads only the text.

## What's actually new, honestly

| Part | Status |
|---|---|
| Event nodes, qualifiers, contexts, provenance, event calculus, belief records | **All old.** Credited in `03_related_work.md` |
| Being able to express these distinctions at all | **Not new.** The standards baseline does it too |
| Compact format that compiles to the standards, with a single fold instead of hand-written queries | **Useful, modest claim.** Less than half the statements, nine fewer queries to maintain |
| The composer | **Best candidate for a method claim.** Bruns et al. 2026 is the closest I found, for time only. Works when it's given clean records, needs testing on real extraction |
| Echo finder | **I found nothing like it, and it's the least tested part** |
| Text reuse | **Not new as a method.** New use on this material, I think |

So today I can defend *a method and a working implementation*, not "a new algorithm that beats the state of the art".

## What it costs

Someone, or some model, has to work out voice, mood and story time for every record. That's the real cost, and experiment 7 shows classical NLP can't do it. Whether an LLM can is the main open question.
