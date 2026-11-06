# Hard cases: what breaks a normal graph

These groups came from reading the passages, not from a theory beforehand. The ranking is by how much damage a plain triple graph does: a false fact sitting in the graph is worse than a missing one, and a missing one is worse than a clumsy one. **The list isn't exhaustive.** It covers what I read. Tier 2 and a scholar will find more.

## The groups, worst first

| Rank | Group | What goes wrong | Fix | Examples |
|---|---|---|---|---|
| 1 | **Said, not done** | A lie or accusation ends up as a fact | Voice chain + mood | Theft (SIL-16-0145), spy (SIL-23-0156), "only the queen's" (SIL-16-0121), her Vidyadhara lie (MAN-19-0147) |
| 2 | **Ordered, planned or wished, not done** | An intention counts as the act | Mood; only `asserted` changes state | The order (SIL-16-0152), the sale (SIL-09-0075), Neeli's curse (SIL-23-0168), sparing the good (SIL-21-0053), future births (MAN-26-0041) |
| 3 | **Looks like, isn't** | Two people or a person and an image merge | Fluent `looks_like`, per-viewer belief, never sameAs | Disguise (MAN-18-0149), image and goddess (MAN-26-0004) |
| 4 | **Different heads, same moment** | One graph can hold only one truth about a person's mind | Viewer views | Kanchanan vs Udayakumaran (MAN-20-0033, 0084), the king before and after (SIL-16-0149, SIL-20-0086) |
| 5 | **Who holds what, when** | Possession flattens into "X has Y" forever | Replay state from events | Anklet, bowl, garland (SIL-03-0167, 0171) |
| 6 | **Earlier births** | Different lives merge; kinship turns absurd | Birth-specific ids + `same_person` record with its teller | Bharatan (SIL-23-0154), Rāhulan (MAN-10-0043), son/daughter (MAN-21-0029/30), Aputhiran (MAN-14-0104) |
| 7 | **Same word, other thing; other word, same thing** | Bad merges, missed links | Canto-scoped lexicon, object ids | பாத்திரம் (MAN-05-0065 vs MAN-14-0016), செழியன் (SIL-20-0043 vs SIL-27-0127), the goddess மணிமேகலை (MAN-07-0018), கோவலர் = cowherds (SIL-16-0098), இளங்கோ வேந்தன் = young king (SIL-16-0193), தனிச்சிலம்பு of the goddess (SIL-23-0010) |
| 8 | **Many reasons for one thing** | One `caused_by` edge erases the rest | Several typed reasons, each with its own voice | Kovalan's death (SIL-16-0216, 0217), Udayakumaran's (MAN-20-0123, 0125), Madurai's fire (SIL-21-0052, 0056, SIL-23-0136) |
| 9 | **Five hands in one deed** | "The king killed Kovalan" | Separate accuser, believer, orderer, group sent, doer | SIL-16-0145 to 0213 |
| 10 | **Text leaves it open, or disagrees with itself** | Forced choice looks like knowledge | `one_of`, `conflicts`, no deletion | Which anklet (SIL-20-0082), who gave the bowl (three accounts), the unseen voice (SIL-30-0164) |
| 11 | **Nested tellers** | Who actually says this? | Full chain, not just the last speaker | MAN-26-0027 is four deep |
| 12 | **Retold in another book** | Treated as two events, or merged and differences lost | `retells` link, compare the records | SIL-23 and MAN-26 |
| 13 | **Figures of speech and address** | A metaphor becomes a fact | Moods `metaphor`, `address` | "I am the thief" (SIL-20-0086), "mother Kannagi" (MAN-26-0002) |
| 14 | **Things that change function** | A new node, or wrongly the same | State change on the site | Prison to charity house (MAN-19-0161) |

## Events ranked one by one

| # | Event | Lines | The exact problem |
|---|---|---|---|
| 1 | Goldsmith's accusation | SIL-16-0145 | A false proposition has to exist in the graph as something said, without ever being a fact, while the true holder is the accuser |
| 2 | Kanchanan and the disguised woman | MAN-20-0033, 0077, 0107 | Two false beliefs in a chain lead to a true killing. Another man at the same moment knows better |
| 3 | Bharatan and Sangaman | SIL-23-0154 to 0169 | Past-birth deed told by a goddess, explains this birth's death, without Kovalan and Bharatan becoming one row |
| 4 | Kannagi retelling it | MAN-26-0013 to 0034 | Four-level voice across books, with content that differs from the first telling |
| 5 | Which anklet broke | SIL-20-0082 | The text doesn't identify the object. Any system that picks one is making it up |
| 6 | Bowl received three ways | MAN-00-0054, MAN-11-0058, MAN-19-0151 | Three incompatible accounts, one has no giver |
| 7 | Kovalan's death, reasons | SIL-16-0212 to 0217 | Human order, a drunk's blow, a bent sceptre and old karma, all from the same voice |
| 8 | King's mind | SIL-16-0149, SIL-20-0086 | Same claim, opposite stance over time, plus the metaphor |
| 9 | The conditional order | SIL-16-0152/3 | The order depends on a condition that's false |
| 10 | Son, daughter, husband | MAN-21-0029/30, MAN-09-0046 | Contradictory-looking kinship, each true in its own birth |
| 11 | Aputhiran to Punyarasan | MAN-14-0104, MAN-24-0170 | A rebirth link split across cantos; the second name isn't in the first passage |
| 12 | Aputhiran commands the bowl | MAN-14-0092 to 0094 | An object is the addressee and later the mover |
| 13 | Madurai's fire | SIL-21-0043 to 0057 | Her act, a god's earlier orders, a prophecy, and a list of exemptions |
| 14 | Same phrase, other bowl | MAN-05-0065 | Object identity can't come from words |
| 15 | Heroine's lie | MAN-19-0147 | A sympathetic character's false statement |
| 16 | The men's objection | SIL-16-0163 | A contradicting claim from minor, unnamed people |
| 17 | Mātari's verdict and death | SIL-27-0075 to 0078 | A judgment reported at second hand |
| 18 | Goddess's name | SIL-15-0033, MAN-07-0018 | A surface name that's the wrong entity in both places |
| 19 | The garland | SIL-03-0167 to 0172 | Goes through a hunchbacked woman, so "Mādhavi gave Kovalan a garland" is wrong |
| 20 | Prison to charity | MAN-19-0157 to 0162 | Request, then deed, then a site with a new function |
| 21 | The image | SIL-25-0118, SIL-30-0151, MAN-26-0004 to 0010 | Stone, image, and a goddess who answers from it |
| 22 | The boon | SIL-30-0160 to 0164 | A voice with no owner; Gajabāhu's link to a dated king is only a hypothesis |

## Your 28 ranked events: where each one stands

Every line here is encoded in the ledger, with citations a script checks, unless it says partly. The ids are in `data/seeds/`.

| Your rank | Event | Records | Status, and anything the text changed |
|---|---|---|---|
| 1 | Two anklet identities | a05 to a09, a19 | Done. Not "wrongly identified" by mistake: the goldsmith does it knowingly |
| 2 | Disguise as Kāyasaṇṭikai | b05 to b18 | Done. Only Kanchanan is fooled, Udayakumaran isn't |
| 3 | False accusation | a08, a09 | Done |
| 4 | Rāhulan and Udayakumaran | f01 to f10, b04 | Done |
| 5 | The bowl's custody | c01 to c09 | Done, including three accounts of how she got it |
| 6 | Aputhiran to Punyarasan | g01 to g04 | Done. The link across cantos 14 and 24 is my inference and is marked so |
| 7 | Neeli's curse | d01 to d10 | Done |
| 8 | Destruction of Madurai | e01 to e08 | Done |
| 9 | Anklet broken in court | a20 to a22 | Done. Which anklet stays open |
| 10 | Kannagi as a goddess | x73, x90 to x92, m07 to m11 | Done |
| 11 | Anklets offered | a01 | Done. An offer of two, not a gift |
| 12 | Stone and image | x70 to x73 | Partly. SIL-26 to 28 has far more than this |
| 13 | Heroine and goddess named alike | x40 to x42, m12, m13 | Done, and listed as distinct |
| 14 | The bowl's power | c06 | Done as one record. Each feeding is its own event |
| 15 | Feeding Kāyasaṇṭikai | b01, b02 | Done |
| 16 | The king's belief | a10, a22 | Done |
| 17 | The execution | a11 to a15 | Done. Five separate parties, and a guard who objects |
| 18 | Prison to charity house | h01 to h03 | Done |
| 19 | The ascetic form | x50, x51 | Done |
| 20 | The image that speaks | b14, b15 | Done, with the pillar goddess as a voice |
| 21 | Entrusted to Mātari | x10, x11 | Done |
| 22 | The attempted sale | a02 | Done |
| 23 | The garland | l01, l02 | Done. The price isn't recorded yet |
| 24 | Carried to Maṇipallavam | x40, x41 | Done |
| 25 | Kannagi's dream | x01 to x05 | Done, plus the queen's dream |
| 26 | The misread song | x20 to x23 | Done from Kovalan's side. Mādhavi's own song isn't encoded |
| 27 | Religious debates | x62, x63, x80 to x82 | Partly. One teacher only, MAN-27 to 30 is huge |
| 28 | People in both epics | r01 to r05, x61, x72, m01 to m13 | Partly. Bridges done, no full list yet |
