# What's already out there, and what I took from it

I searched papers and the web for each problem as it came up. For each item: what it does, what I took, and what it leaves open. Most of what we need has been invented already, so the honest question is what's left.

## Modelling things more complicated than a triple

| Work | What it gives | What I did with it |
|---|---|---|
| [Noy & Rector, W3C n-ary relations](https://www.w3.org/TR/swbp-n-aryRelations/) | Turn the relation into a node | This solves the original silambu problem by itself. An event node with giver, receiver and object. Nothing new to invent there |
| [Bruns et al. 2026, Temporal Modelling in Cultural Heritage KGs](https://drops.dagstuhl.de/entities/document/10.4230/TGDK.4.1.2) | Survey of temporal RDF approaches (named graphs, RDF*, n-ary and others) with decision support | Closest thing to the composer's idea of choosing a representation, for time only. Must be cited and compared with. I've seen the abstract, read the full paper before writing about it |
| [Hernández, Hogan & Krötzsch 2015](https://ddll.inf.tu-dresden.de/w/images/5/52/Hernandez-Hogan-Kroetzsch-RDF-reification-evaluation-SSWS2015.pdf) | Compares reification, n-ary, singleton properties and named graphs on Wikidata | Why I tested several storage shapes. Singleton properties are out, they blow up the number of predicates |
| [McCarthy 1993, Notes on Formalizing Context](https://mlanthology.org/ijcai/1993/mccarthy1993ijcai-notes) | ist(c,p): p is true in context c | The core idea behind the voice chain |
| [de Kleer 1986, An Assumption-based TMS](https://www.dekleer.org/Publications/An%20Assumption-Based%20TMS.pdf) | Keep facts tagged with the assumptions they rest on, so you can switch assumptions without recomputing | Why a reader policy is applied at query time and never baked in |
| [Kowalski & Sergot 1986, event calculus](https://link.springer.com/article/10.1007/BF03037383) | State comes from events that start and end it | The fold. Custody isn't stored, it's replayed |
| [CIDOC CRM](https://cidoc-crm.org/) | Cultural-heritage events; separates custody from ownership | Alignment targets in the ontology |
| [CRMinf](https://cidoc-crm.org/crminf/) | Belief and argument | The belief records are close to its I2 Belief |
| [Saurí & Pustejovsky 2009, FactBank](https://doi.org/10.1007/s10579-009-9089-9) | Event factuality relative to a source | Where the idea of mood per source came from. I couldn't confirm the nested source details from the abstract, so read its section on sources before citing it for that |

## Stories specifically

| Work | What it does | What it leaves open for us |
|---|---|---|
| [Elson 2012, DramaBank](https://aclanthology.org/L12-1515/) | Story Intention Graph: goals, plans, beliefs, hand-annotated | The closest older ancestor. Encoding is mostly manual, and there's no query-time viewpoint |
| [EvolvTrip 2025](https://arxiv.org/abs/2506.13641) | Temporal graph of characters' mental states, helps LLMs on theory-of-mind questions | Very close on belief over time. No voice chains. English novels |
| [NS-ST-GraphRAG 2026](https://arxiv.org/pdf/2609.05139) | Spatio-temporal literary graph with a constraint layer | Tracks when, not who says so. I read the search summary only, read it in full before citing |
| [Narrative World Model 2026](https://arxiv.org/pdf/2607.05577) | Graph with narratology-based node types for fiction writers | Same, summary only so far |
| [Lilly & Kane, Veronica Mars KG](https://www.math.ucla.edu/~bertozzi/papers/LillyKane2020.pdf) | Records who revealed a fact, so you can flag it if that character turns out unreliable | Same instinct as mine, a single speaker and no fold |
| [Narrative Knowledge Weaver 2026](https://arxiv.org/pdf/2606.05724) | Source-grounded bundle of graph, events, facts, profiles and storylines, for question answering on long stories | The nearest current system. Its bundle is built to help retrieval. It doesn't appear to do voice chains or replayed state, but I've read the abstract only, so check before saying so |
| [Drammar 2015](https://content.iospress.com/articles/semantic-web/sw156), [2019](https://content.iospress.com/articles/applied-ontology/ao190204) | OWL ontology of drama: agents, plans, emotions, values, with rules that infer intentions | Align m13 and m16 to it rather than compete. It's hand-annotated, on media like Hamlet, not on verse |
| [Falkenhainer, Forbus & Gentner 1989, SME](https://www.qrg.northwestern.edu/papers/Files/smeff2(searchable).pdf) | Analogy as one-to-one structure mapping | Base of the echo finder |

## Building and scoring

| Work | What it does | What happened when I tried it |
|---|---|---|
| [Agichtein & Gravano 2000, Snowball](https://www.cs.columbia.edu/~julia/papers/agichtein&gravano00.pdf), [BREDS 2015](https://preview.aclanthology.org/moar-dois/D15-1056.pdf), [Gupta et al. 2018](https://arxiv.org/abs/1805.00254) | Seed facts to patterns to new facts, with pattern scoring against drift | Failed on verse. Details in `05_experiments.md` |
| [Tesserae, TRACER and friends](https://ceur-ws.org/Vol-4112/33_main_long.pdf), [Franzini et al. 2018](https://ceur-ws.org/Vol-2253/paper22.pdf) | Text reuse detection for Latin and Greek, mostly lexical | The formula finder is the same family, so it isn't a new idea. What's different is the language and that its output links into a graph. A better paper would run TRACER on the same text as a baseline |
| [Safavi et al. 2020](https://arxiv.org/abs/2004.01168) | Calibration for KG embeddings; notes Knowledge Vault used Platt scaling | Why the scorer is a simple logistic model checked on held-out data |
| [Tamil NER work](https://aclanthology.org/I08-5009/), [history-domain Tamil NER](https://dl.lib.uom.lk/items/75a2605d-300f-47e8-97ce-eb0d3fac39fa) | CRF and LSTM on modern Tamil | Modern-Tamil models and labelled data don't transfer to this verse, so I started from a hand lexicon. I found nothing specific to Sangam-era entity extraction, which is itself a gap the paper can mention |

## So what's actually left?

Be careful here. These claims would be **false**: event nodes for literature (old), keeping claims apart from facts (Veronica Mars, FactBank, CRMinf), tracking belief over time (EvolvTrip, CRMinf), custody vs ownership (CIDOC CRM).

The claim I think survives, though my search wasn't exhaustive and you should run your own before submitting:

> A compact record format that compiles to CIDOC CRM, CRMinf, PROV-O and OWL-Time; a rule-based composer that decides per record which patterns it needs and keeps meaning while storing less; a removal test showing which parts matter; all on classical Tamil. Plus mining mirrored stretches of story across births and works as graph structure, which looks untried.

Note what that leaves out. My standards baseline ties the ledger on every question, so "our representation can express things theirs can't" would be false. See `05_experiments.md`.

One thing from your brief I still haven't verified: the 2026 "Narrative Knowledge Graphs" paper on perspectives and metaphor. OntoClean and NeOn also need finding and reading before citing. They didn't come up in my search, though both are well known.
