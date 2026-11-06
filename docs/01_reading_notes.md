# What the text actually says

Before designing anything I read the key passages line by line. I read about 1,600 of the 10,209 lines. All of SIL-20 and most of SIL-16 and MAN-20, and only stretches of the rest: SIL-00, 03, 07, 09, 15, 19, 21, 22, 23, 24, 25, 26, 27, 28, 30 and MAN-00, 02, 05, 06, 07, 09, 10, 11, 14, 17, 18, 19, 21, 24, 25, 26, 27. So this isn't a reading of the whole of either epic, and anything below saying the text doesn't mention something means I didn't see it in those stretches. Line ids run `SIL-16-0145` = Silappatikaram, canto 16, line 145.

Both plans you gave me are good, but when I checked them against the verse, several things turned out different or richer.

## The anklet

**"Kannagi gave the anklet to Kovalan" isn't what happens.** She says சிலம்புஉள கொண்மின், "there are anklets, take them" (SIL-09-0073), which is an offer of the pair. Much later he says he'll take one of them and go, சீறடிச் சிலம்பி னொன்றுகொண் டியான்போய் (SIL-16-0092). So: an offer of two, then seven cantos later a taking of one, by the other person. The neat sentence we've been using as the example isn't in the text. It's still a fine teaching example, but the paper should quote the real lines.

**The goldsmith isn't mistaken, and the text says so through his own thoughts.** கரந்தியான் கொண்ட காலணி, "the ornament I secretly took" (SIL-16-0127). The Patikam agrees (SIL-00-0025). So at the moment of accusation the queen's real anklet is with him. The earlier framework got this right, and it's stronger than it said: a graph can answer "who actually held it?" with "the accuser".

**The goldsmith also sets the trap with a true-sounding line.** "This anklet could only be the queen's", கோப்பெருந் தேவிக் கல்லதை (SIL-16-0121). Any pattern extractor would happily produce `anklet belongs_to queen`. Kovalan himself had just asked about an ornament fit for the queen (SIL-16-0111).

**The king's order has an "if" in it.** கன்றிய கள்வன் கைய தாகில் கொன்றச் சிலம்பு கொணர்க (SIL-16-0152/3): if it's in the thief's hand, kill him and bring it. A conditional order. Neither plan has this.

**Somebody objects.** The men look at Kovalan and say this is no man to be killed, கொலைப்படு மகனலன் (SIL-16-0163). The goldsmith then talks them round at length, with a whole speech on how thieves work (0166-0201). Neither plan has this either, and it matters for any study of responsibility.

**The killer is one drunk man.** கல்லாக் களிமக னொருவன், "one unlearned drunkard" (SIL-16-0212). So the accuser, the believer, the order-giver, the men sent and the man with the sword are five separate parties. Then the poet gives two reasons side by side in consecutive lines: the king's sceptre bent (0216) and Kovalan's old karma rose up (0217).

**Which anklet did she break? The text doesn't say.** She arrives holding one (SIL-20-0038). The king has the other fetched (0081). Then கண்ணகி அணிமணிக் காற்சிலம் புடைப்ப, she breaks "the anklet" (0082). The verses afterwards still picture her with a lone anklet in hand (0098, 0103), which hints she broke the fetched one, but those verses may be looking back. The earlier framework's example picks the remaining one. I keep it open as `one_of: [ank_k1, ank_k2]`. **A scholar needs to settle this or confirm that it's open.**

**The queen's real anklet just vanishes.** I found nothing saying it came back. Worth asking the scholar.

**"யானே கள்வன்", I am the thief (SIL-20-0086).** The king, in grief. A flat extractor makes him an actual thief, which is a pretty good test sentence.

**The goldsmiths pay later.** A thousand of them are sacrificed by a different king, வெற்றிவேற் செழியன், at SIL-27-0127. That's the catch for entity linking: செழியன் is Neduñceḻiyan in SIL-20-0043 and someone else here.

## The disguise

**Udayakumaran isn't fooled. Only Kanchanan is.** This was the biggest surprise. Maṇimēkalai takes Kāyasaṇṭikai's form (MAN-18-0148/9). Udayakumaran says outright that this is Maṇimēkalai hiding by magic (MAN-18-0155, again MAN-20-0084). Kanchanan, arriving to look for his wife, takes her for his wife (MAN-20-0033). So at the same moment two men look at the same woman and hold opposite beliefs, and the wrong one kills the right one. Each viewer needs their own view of the graph, that's where the viewpoint idea came from.

**Kanchanan is wrong twice.** Wrong that she's his wife, and from that, wrong that the prince is her lover (MAN-20-0077). The second belief rests on the first.

**The real Kāyasaṇṭikai was already dead.** Swallowed on the Vindhya while flying home (MAN-20-0119, 0121). He's looking for someone who's gone.

**She has her own reason for the disguise**, to teach the prince and end his bad karma (MAN-21-0021/2), and she lies to the king while wearing it, saying she's a Vidyadhara woman (MAN-19-0147). So the heroine's speech can't be trusted as fact either. Mood and voice are needed for good people too.

**Birth makes kinship weird.** The pillar goddess tells her he was her son in some births and she his daughter in others (MAN-21-0029/30). He was also her husband as Rāhulan (MAN-09-0046). Without scoping that's incest in a flat graph.

## The bowl

**Three accounts of how Maṇimēkalai got it.** The Patikam: Tīpatilakai gave it, மடக்கொடிக்கு அளித்ததும் (MAN-00-0054). Canto 11: it rose from the pond and entered her hand on its own, பாத்திரம் புகுதலும் (MAN-11-0058), with no giver at all. Her own words to the king: a deity gave it (MAN-19-0151/2). All three go in the graph, marked as disagreeing. None gets deleted.

**Aputhiran talks to the bowl.** "Show yourself one day each year, and if someone is there who protects life, go into their hands" (MAN-14-0092 to 0094). An order, addressed to an object, with a condition. And a pond holds it for a while, so custody can't be person to person.

**Another bowl.** MAN-05-0065 has the same word and the same phrase for a different bowl, given to Sutamati. Matching on பாத்திரம் would merge them.

## The two big links nobody asked me to look for

**The same story happens twice, and the epic knows it.** In a past birth Kovalan was Bharatan, who falsely called the merchant Sangaman a spy, ஒற்றன் இவனென (SIL-23-0156), and had him killed. In this birth a goldsmith falsely calls Kovalan a thief and has him killed. Their widows get the same words:

- கொலைக்களப் பட்ட கோவலன் மனைவி / நிலைக்களம் காணாள் (SIL-00-0031/2)
- கொலைக்களப் பட்ட சங்கமன் மனைவி / நிலைக்களங் காணாள் (SIL-23-0158/9)

The accuser becomes the accused. That's what the echo finder tries to detect.

**Maṇimēkalai retells it.** In MAN-26-0013 to 0032, Kannagi, now a goddess, tells Maṇimēkalai what Madurapati told her about Bharatan. So the voice runs poet > Kannagi > Madurapati > Bharatan's lie, four deep. And it adds something: குற்றம் இலோனை, "the innocent man" (MAN-26-0028). I didn't see that said outright in the part of SIL-23 I read (lines 1-30, 130-226). Place names change too: SIL says சிங்கபுரம், MAN-26-0022 says அரிபுரம், which I read as the same city (அரி = lion).

**Why she's named Maṇimēkalai.** Kovalan names his daughter after his family's goddess, who once rescued his ancestor at sea (SIL-15-0029 to 0037). The goddess introduces herself in nearly the same words in both epics: வந்தேன் அஞ்சல் மணிமே கலையான் (SIL-15-0033), வந்தேன் அஞ்சல் மணிமேகலை யான் (MAN-07-0018). The formula finder is what surfaced this, I wasn't looking. It's also a trap: in both lines "மணிமேகலை" is the goddess, not the girl.

## More that turned up on the second pass

**The dead man rises.** After Kannagi embraces the body, நின்றான் எழுந்து, he stands up, wipes her tears, tells her to stay and goes (SIL-19-0062 to 0067). The poet tells this straight. Kannagi herself wonders: மாயங்கொல், is this illusion, or a god deceiving me (0068)? So the graph needs a dead person acting without that being an error, and her doubt kept as a question. My "the dead don't act" check flagged this until I gave records an `after_death` marker. A rule that can't cope with this text is the wrong rule.

**Kovalan's misreading is why he left Mādhavi.** He hears her song and decides she sang with her mind on someone else (SIL-07-0306/7), and the very next line says his old karma rose up (0308). The text never says whether he was right. So it stays his thought, no more.

**Mādhavi calls Maṇimēkalai the daughter of the great Pattini** (MAN-02-0055). SIL-15-0023 says Mādhavi bore the child. MAN-26-0002 calls Kannagi her mother too. Three lines, and a flat `child_of` can't hold them. It's an address, not kinship, and it's a claim about who she belongs to, worth a scholar's comment.

**Being entrusted isn't being handed over.** Kavunti gives Kannagi into Mātari's care with a limit: until she reaches the house of rich folk (SIL-15-0129/30). Mātari later cries அடைக்கல மிழந்தேன், I've lost my ward (SIL-27-0076).

**The northern expedition is told in both epics.** SIL-25 to 28 at length, and MAN-26-0077 to 0090 in fourteen lines, including the stone placed on the conquered kings' heads.

**Maṇimēkalai also takes a man's form**, a male ascetic, at Kannagi's own suggestion, so people won't dismiss her as a young girl (MAN-26-0068 to 0071). The goddess Maṇimēkalā disguises herself too, as a local woman (MAN-05-0096).

## Questions to put to the scholar

1. Which anklet breaks at SIL-20-0082?
2. Does the queen's real anklet ever come back?
3. Is அரிபுரம் really சிங்கபுரம?
4. At SIL-30-0164, is the unseen voice Kannagi's?
5. Does மணிச்சிலம்பு read well as a name? It is built from SIL-20-0078 and SIL-20-0082, not taken whole from a line.
6. Is it Kovalan speaking at SIL-15-0037, naming the child? I read it that way, inside Mātalaṉ's speech.
7. How should MAN-02-0055 be taken: an honorific, or a real claim that Kannagi counts as her mother?
8. At MAN-26-0087 to 0089, I read the stone as placed on the conquered kings' heads. Is that right?
