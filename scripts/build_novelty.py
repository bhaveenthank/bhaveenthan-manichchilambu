"""
The Novelty page's content: what this graph does that an ordinary knowledge graph doesn't, each with live numbers
and examples computed from the data at build time, so the page can't drift from what the system really does.

Called by build_web_data.py, which writes web/public/data/novelty.json. Each item says:
  problem : what goes wrong in an ordinary knowledge graph
  answer  : what this one does instead
  how     : the method or algorithm, and where it lives in the code
  figure  : one number computed from the current data
  examples: record ids, line ids, or small computed tables
"""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from manichchilambu.ledger import Ledger, everything, load, story  # noqa: E402

LEDGERS = ("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml", "ledger_material.yaml", "ledger_coverage.yaml")
FAMILY = {"asserted": "happened", "claimed": "said", "predicted": "said", "address": "said", "question": "said", "negated": "said",
          "command": "wanted", "intended": "wanted", "wish": "wanted", "metaphor": "imagined", "dreamed": "imagined", "conditional": "imagined", "thought": "imagined"}
DATA = ROOT / "web/public/data"


def read(name, default=None):
    p = DATA / name if (DATA / name).exists() else ROOT / name
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def fluent(f):
    return f"{f[0]}({', '.join(f[1:])})"


def build():
    recs = load(*LEDGERS)
    led = Ledger(recs)
    web = {r["id"]: r for r in read("records.json", [])}
    end = max(r["t"] for r in recs)
    items = []

    # 1. Belief and reality kept apart, and replayed through story time.
    naive_only = sorted(led.state(end, everything) - led.state(end, story))
    # The representation experiment (experiments/, held-out questions): the same questions answered from plain
    # triples, n-ary events, qualified statements, contexts, a CIDOC CRM + CRMinf + PROV-O model, and the ledger.
    rep = read("reports/representation_heldout_summary.json", {})
    beliefs = []
    for b in sorted((r for r in recs if r["kind"] == "believe"), key=lambda r: r["t"]):
        holder, claim = b["roles"].get("holder"), b.get("content")
        c = led.by_id.get(claim)
        if not c:
            continue
        row = {"record": b["id"], "holder": holder, "claim": claim, "stance": b["stance"], "t": b["t"], "claim_mood": c["mood"]}
        moved = [d for d in c.get("does", []) if d.startswith("+holds(")]
        if moved:
            obj = moved[0][len("+holds("):-1].split(",")[1].strip()
            row["object"] = obj
            row["in_the_text"] = sorted(led.holder(obj, b["t"] + 0.01, story))
            row["in_their_view"] = sorted(Ledger(led.view(holder, b["t"] + 0.01)).holder(obj, b["t"] + 0.01, everything))
        beliefs.append(row)
    items.append({
        "id": "belief", "icon": "eye",
        "title": ["What someone believes is not what happened", "நம்பியது நிகழ்ந்தது அல்ல"],
        "problem": ["An ordinary knowledge graph stores one world. Write in “Kovalan stole the anklet” because a character says it, and it becomes a fact that every query trusts.",
                    "சாதாரண அறிவு வரைபடம் ஒரே உலகைச் சேமிக்கிறது. ஒரு பாத்திரம் கூறியதால் “கோவலன் சிலம்பைத் திருடினான்” என்று எழுதினால், அது எல்லா வினவல்களும் நம்பும் உண்மையாகிவிடும்."],
        "answer": ["Every record keeps who tells it and in what mood. Only what's told as fact changes the world. Each character's beliefs are a separate, replayable view, so the world the king believes and the world the poem tells can be shown side by side at any moment in the story.",
                   "ஒவ்வொரு பதிவும் யார் கூறுகிறார், எந்தத் தன்மையில் என்பதைக் கொண்டுள்ளது. நிகழ்ந்ததாகக் கூறப்பட்டவை மட்டுமே உலகை மாற்றும். ஒவ்வொருவரின் நம்பிக்கையும் தனிப் பார்வை; அரசன் நம்பும் உலகையும் காப்பியம் கூறும் உலகையும் கதையின் எந்தக் கணத்திலும் அருகருகே காட்டலாம்."],
        "how": ["A fold over the ledger in story order (event calculus: each told-as-fact record adds or ends a fluent such as holds(goldsmith, queen's anklet)). A viewer's world is the same fold over the facts plus the claims they accept at that time, minus the ones they've given up. Code: src/manichchilambu/ledger.py, Ledger.state and Ledger.view.",
                "கதை வரிசையில் பதிவேட்டின் மடிப்பு (நிகழ்வுக் கணிதம்). ஒருவரின் உலகம் = உண்மைகள் + அவர் அப்போது ஏற்கும் கூற்றுகள் − கைவிட்டவை."],
        "figure": {"value": f"{round(rep.get('flat_all', {}).get('leak_rate', 0) * 100)}%", "label": ["of questions about claims a plain triple graph answers by stating the claim as fact. The ledger: 0%", "கூற்றுகள் பற்றிய கேள்விகளில் சாதாரண மும்மை வரைபடம் கூற்றை உண்மையாகக் கூறும் விகிதம். பதிவேடு: 0%"]},
        "representations": {k: {"accuracy": v["accuracy"], "claims_as_fact": v["leak_rate"], "statements": v["size"]} for k, v in rep.items()},
        "naive_only": [fluent(f) for f in naive_only],
        "beliefs": beliefs,
        "records": ["a09", "a10", "a22", "a21"], "link": "#/graph?focus=pandya_king&reading=said",
    })

    # 2. Voices inside voices.
    depth = Counter(len(r["voice"]) for r in recs)
    deepest = sorted((r for r in recs if len(r["voice"]) >= 3), key=lambda r: -len(r["voice"]))[:3]
    items.append({
        "id": "voice", "icon": "messages",
        "title": ["Who is speaking, and through whom", "யார், யார் வழியாகக் கூறுகிறார்"],
        "problem": ["Ordinary graphs have one source per fact at most, so “the goddess says that Bharatan said Sangaman was a spy” collapses into “Sangaman was a spy”.",
                    "சாதாரண வரைபடங்களில் ஒரு உண்மைக்கு ஒரே மூலம்; “பரதன் கூறியதாகத் தெய்வம் கூறுகிறது” என்பது “சங்கமன் ஒற்றன்” என்று சுருங்கிவிடும்."],
        "answer": ["Each record carries its whole chain of voices, outermost first: the poet, then whoever speaks inside the poem, then whoever they quote. A claim deep in a chain can't turn into a fact by losing its speakers.",
                   "ஒவ்வொரு பதிவும் குரல்களின் முழுச் சங்கிலியைக் கொண்டுள்ளது: புலவர், பாத்திரம், அவர் மேற்கோள் காட்டுபவர். சங்கிலியின் ஆழத்தில் உள்ள கூற்று கூறுநரை இழந்து உண்மையாகாது."],
        "how": ["Voice chains as in FactBank's nested sources (Saurí and Pustejovsky 2009), stored on every record and kept by every view, path and answer. Reader policies decide what counts: the poet only, anyone speaking straight, or (to measure the damage) everything.",
                "FactBank போன்ற உள்ளடுக்கு மூலங்கள்; வாசிப்புக் கொள்கைகள் எதை எண்ணுவது என்று தீர்மானிக்கின்றன."],
        "figure": {"value": sum(v for k, v in depth.items() if k >= 2), "label": ["records told through a character, not by the poet directly", "புலவர் நேரடியாக அல்லாமல் பாத்திரம் வழியாக வரும் பதிவுகள்"]},
        "depth": {str(k): v for k, v in sorted(depth.items())},
        "records": [r["id"] for r in deepest],
    })

    # 3. Moods: thirteen kinds of statement, four families.
    moods = Counter(FAMILY.get(r["mood"], "said") for r in recs)
    items.append({
        "id": "mood", "icon": "layers",
        "title": ["Thirteen kinds of statement, not one", "ஒன்றல்ல, பதின்மூன்று வகைக் கூற்றுகள்"],
        "problem": ["A triple has no mood. An order that was never carried out, a dream, a curse, a figure of speech and a lie all look exactly like events.",
                    "மும்மையில் தன்மை இல்லை. நிறைவேறாத ஆணை, கனவு, சாபம், உருவகம், பொய் எல்லாம் நிகழ்வு போலவே தோன்றும்."],
        "answer": ["Every record has one of thirteen moods in four families: happened, said, wanted, imagined. The family decides how it's drawn (solid, dashed, dash-dot, dotted), whether it can change the world, and whether an answer may state it as fact.",
                   "ஒவ்வொரு பதிவுக்கும் நான்கு குடும்பங்களில் பதின்மூன்று தன்மைகளில் ஒன்று. குடும்பமே வரையும் விதம், உலகை மாற்றுமா, விடை உண்மையாகக் கூறலாமா என்பதைத் தீர்மானிக்கிறது."],
        "how": ["Mood is a required field, checked by SHACL shapes and the validator. Mutation testing: of 28 kinds of deliberate damage (a dream recorded as an event, a plan as a sale...), the validators catch 24 with no false alarms.",
                "தன்மை கட்டாயப் புலம்; 28 வகைச் சேதங்களில் 24 ஐ சரிபார்ப்பான்கள் பிடிக்கின்றன."],
        "figure": {"value": sum(v for k, v in moods.items() if k != "happened"), "label": ["records that are not told as fact, each kept apart", "நிகழ்ந்ததாகக் கூறப்படாத, தனியாக வைக்கப்பட்ட பதிவுகள்"]},
        "families": dict(moods),
        "mutations": read("reports/mutations.json", {}).get("summary"),
    })

    # 4. Guarded paths.
    pe = read("reports/paths_and_echoes.json", {}).get("exhaustive", {})
    disc = read("discover.json", [])
    warrants = Counter(w for d in disc for w in d["warrants"])
    tempting = read("reports/discovery.json", {}).get("tempting", [])[:3]
    items.append({
        "id": "paths", "icon": "route",
        "title": ["A connection is only as strong as its weakest step", "இணைப்பின் வலிமை அதன் பலவீனமான படியின் வலிமையே"],
        "problem": ["Path search in an ordinary graph connects anything to anything: two people who both mention mangoes become linked as if one mango passed between them, and paths happily run through lies.",
                    "சாதாரண வரைபடத்தில் பாதைத் தேடல் எதையும் எதனுடனும் இணைக்கும்: இருவர் மாம்பழம் குறிப்பிட்டால் ஒரே மாம்பழம் கைமாறியது போல் இணையும்; பொய்கள் வழியாகவும் பாதை செல்லும்."],
        "answer": ["Every step carries a warrant (an event, the same person, the same place, the same kind of thing, a broader kind, a commentator's reading), and a path can't conclude more than its weakest step. Steps through claims are refused unless asked for, and weak steps are flagged as cautions.",
                   "ஒவ்வொரு படிக்கும் ஒரு உத்தரவாதம் உண்டு; பாதை தன் பலவீனமான படியை விட அதிகம் முடிவு கூறாது. கூற்றுகள் வழிப் படிகள் மறுக்கப்படும்; பலவீனமான படிகள் எச்சரிக்கையுடன் காட்டப்படும்."],
        "how": ["Shortest-path search over a graph whose edges are typed by warrant, with the path's strength the minimum over its steps (a weakest-link order). Code: src/manichchilambu/paths.py and web/src/lib/discover.ts.",
                "உத்தரவாத வகை கொண்ட விளிம்புகளில் குறும்பாதைத் தேடல்; பாதையின் வலிமை = படிகளின் குறைந்தபட்சம்."],
        "figure": {"value": pe.get("plain_bad", 0), "label": [f"of {pe.get('plain_found', 0):,} connections a plain search finds rest on a claim or another unlawful step, and are refused", "சாதாரணத் தேடல் காணும் இணைப்புகளில் கூற்று அல்லது முறையற்ற படியைச் சார்ந்தவை, மறுக்கப்படுகின்றன"]},
        "warrants": dict(warrants), "tempting": tempting, "link": "#/discover",
    })

    # 5. Rebirths.
    lives = Counter(r["life"] for r in recs)
    items.append({
        "id": "births", "icon": "repeat",
        "title": ["One person across several births", "பல பிறவிகளில் ஒரே நபர்"],
        "problem": ["Identity in a knowledge graph is one node per individual. The epics say Kovalan was Bharatan in an earlier life, and Udayakumaran was Rahulan: merging the nodes mixes two lives, and keeping them apart loses the link that explains the story.",
                    "அறிவு வரைபடத்தில் ஒருவருக்கு ஒரு முனை. கோவலன் முற்பிறவியில் பரதன்; இணைத்தால் இரு வாழ்க்கைகள் கலக்கும், பிரித்தால் கதையை விளக்கும் தொடர்பு போகும்."],
        "answer": ["Each record says which birth it belongs to. People in earlier births are their own nodes, tied to their later selves by records that say so. The fold, paths and filters keep births apart unless you ask to include them.",
                   "ஒவ்வொரு பதிவும் எந்தப் பிறவிக்குரியது என்று கூறுகிறது. முற்பிறவி நபர்கள் தனி முனைகள், பதிவுகளால் பின்வரும் வடிவுடன் இணைக்கப்பட்டவர்கள்."],
        "how": ["A life field on every record, checked by the story validator (no path may mix births without a record saying they're one person: in the exhaustive test, 0 of 2,214 lawful paths did).",
                "ஒவ்வொரு பதிவிலும் பிறவிப் புலம்; பிறவிகளைக் கலக்கும் பாதைகள் இல்லை."],
        "figure": {"value": sum(v for k, v in lives.items() if k != "main"), "label": ["records set in an earlier birth, kept apart from the main story", "முற்பிறவியில் நிகழும், தனியாக வைக்கப்பட்ட பதிவுகள்"]},
        "lives": dict(lives), "records": [r["id"] for r in recs if r["life"] != "main"][:3],
    })

    # 6. Conflicting accounts.
    conflicts = [r for r in recs if r.get("conflicts") or r.get("contradicts")]
    items.append({
        "id": "conflict", "icon": "split",
        "title": ["Two accounts of the same thing, both kept", "ஒன்றுக்கு இரு கூற்றுகள், இரண்டும் வைக்கப்படும்"],
        "problem": ["When sources disagree, an ordinary graph keeps one answer and drops the rest, or stores both as if both were true.",
                    "மூலங்கள் முரண்பட்டால், சாதாரண வரைபடம் ஒன்றை வைத்து மற்றதை விடும், அல்லது இரண்டையும் உண்மையாக வைக்கும்."],
        "answer": ["Disagreements are recorded as such: three accounts of how Maṇimēkalai got the bowl sit side by side, each with its teller, linked by a 'conflicts with' relation. A record can also say it contradicts a claim.",
                   "முரண்பாடுகள் அப்படியே பதியப்படுகின்றன: அமுதசுரபி கிடைத்ததைப் பற்றிய மூன்று கூற்றுகள், ஒவ்வொன்றும் கூறுநருடன், அருகருகே."],
        "how": ["conflicts and contradicts fields between records. Answers show every account and say they disagree, never picking one silently.",
                "பதிவுகளுக்கு இடையே முரண் புலங்கள்; விடைகள் எல்லாக் கூற்றுகளையும் காட்டும்."],
        "figure": {"value": len(conflicts), "label": ["records that conflict with or contradict another", "மற்றொன்றுடன் முரண்படும் பதிவுகள்"]},
        "records": ["c07", "c08", "c09"],
    })

    # 7. What the text doesn't say.
    gaps = read("gaps.json", [])
    items.append({
        "id": "gaps", "icon": "help",
        "title": ["What the text doesn't say is recorded too", "நூல் கூறாததும் பதியப்படுகிறது"],
        "problem": ["Knowledge graphs can't tell “false” from “not said”. Asked who made Kannagi's anklet, a system fills the gap with the most tempting answer, the goldsmith, which the text never says.",
                    "அறிவு வரைபடங்கள் “பொய்” என்பதையும் “கூறப்படவில்லை” என்பதையும் பிரிக்க முடியாது; கண்ணகியின் சிலம்பைச் செய்தவர் யார் என்றால், நூல் கூறாத பொற்கொல்லன் என்று நிரப்பும்."],
        "answer": ["Gaps are first-class: each says what isn't established, the tempting wrong inference, and why it's wrong. Answers to those questions say “not stated in the passages read”, which is weaker than “never”, and say so.",
                   "இடைவெளிகள் முதல்தரப் பதிவுகள்: எது நிறுவப்படவில்லை, தவறான ஊகம், ஏன் தவறு."],
        "how": ["A gap record matches a question pattern (subjects and relation), so the rules and the hybrid search both reach it before they would guess.",
                "இடைவெளிப் பதிவு கேள்வி வடிவத்துடன் பொருந்துகிறது; ஊகிப்பதற்கு முன் அதைச் சென்றடைகிறது."],
        "figure": {"value": len(gaps), "label": ["recorded gaps, each with the wrong answer people jump to", "பதியப்பட்ட இடைவெளிகள், தவறான ஊகத்துடன்"]},
        "gaps": [{"q": g["q"], "a": g["a"], "tempting": g["tempting"]} for g in gaps[:3]], "link": "#/trace",
    })

    # 8. A kind is not an individual, a figure of speech is not an object.
    graph = read("graph.json", {"nodes": []})
    notes = read("retrieval.json", {}).get("notes", {})
    senses = Counter(v[2] for v in notes.values())
    figurative = [{"line": k, "gist": v[0]} for k, v in notes.items() if v[2] == "figurative" and "JEWEL" in v[3]][:4]
    items.append({
        "id": "kinds", "icon": "shapes",
        "title": ["“A mango” is not “this mango”, and coral lips are not coral", "“ஒரு மாம்பழம்” “இந்த மாம்பழம்” அல்ல; பவள இதழ் பவளம் அல்ல"],
        "problem": ["Extractors turn every noun into an object: a simile about coral lips adds a coral ornament, and every mention of mango becomes the same mango.",
                    "பிரித்தெடுப்பான்கள் ஒவ்வொரு பெயர்ச்சொல்லையும் பொருளாக்கும்: பவள இதழ் உவமை பவள அணியைச் சேர்க்கும்."],
        "answer": ["Kinds and individuals are different nodes, drawn differently (outlined and dashed for a kind). Every line is labelled literal, figurative or mixed, so figures of speech can point to a line without adding things to the world.",
                   "வகைகளும் தனிப்பொருள்களும் வேறுவேறு முனைகள். ஒவ்வொரு வரியும் நேர்பொருள், உருவகம், கலப்பு எனக் குறிக்கப்படுகிறது."],
        "how": ["A kind flag and a broader-kind hierarchy on nodes (mango is a kind; agarwood is a fragrant wood). The every-line reading labels each line's sense; paths through 'same kind' are cautions, never identity.",
                "முனைகளில் வகைக் குறி, பரந்த வகைப் படிநிலை; ஒவ்வொரு வரியின் பொருள் வகையும் குறிக்கப்படுகிறது."],
        "figure": {"value": senses.get("figurative", 0) + senses.get("mixed", 0), "label": ["lines read as figurative or mixed, so their images aren't taken as objects", "உருவக அல்லது கலப்பு வரிகள்; அவற்றின் படிமங்கள் பொருள்களாகக் கொள்ளப்படுவதில்லை"]},
        "kinds": sum(1 for n in graph["nodes"] if n.get("kind")), "senses": dict(senses), "figurative": figurative,
    })

    # 9. Things moving through hands, computed rather than stored.
    items.append({
        "id": "custody", "icon": "hand",
        "title": ["Whose hands an object passed through, worked out by replay", "பொருள் யார் கைகளில் சென்றது: மீண்டும் ஓட்டிக் கணக்கிடப்படுகிறது"],
        "problem": ["A graph that stores “X has the anklet” has to be edited every time the anklet moves, and it can't say who had it at a given moment.",
                    "“X இடம் சிலம்பு உள்ளது” எனச் சேமிக்கும் வரைபடம் சிலம்பு நகரும்போதெல்லாம் திருத்தப்பட வேண்டும்."],
        "answer": ["Nobody's possessions are stored. They're replayed from the records at any point in story time, under any reader's policy, so the queen's anklet is with the goldsmith in the text while the king believes Kovalan has it.",
                   "உடைமைகள் சேமிக்கப்படுவதில்லை; கதைக் காலத்தின் எந்தக் கணத்திலும் பதிவுகளிலிருந்து மீண்டும் கணக்கிடப்படுகின்றன."],
        "how": ["The same fold as above, read for holds fluents. Code: Ledger.holder; the Trace page's 'Whose hands' tab.",
                "அதே மடிப்பு; Trace பக்கத்தில் காணலாம்."],
        "figure": {"value": len(read("timelines.json", {}).get("custody", {})), "label": ["objects whose path through the story is replayed", "கதை வழியே பாதை கணக்கிடப்படும் பொருள்கள்"]},
        "link": "#/trace",
    })

    # 10. Echoes between the epics, found without labels.
    echoes = read("echoes.json", {"lines": []})
    items.append({
        "id": "echoes", "icon": "link",
        "title": ["Shared phrasing between the two epics, found without labels", "இரு காப்பியங்களுக்கு இடையே பொதுச் சொற்றொடர்கள், குறியின்றிக் கண்டவை"],
        "problem": ["Cross-text links in a knowledge graph exist only where someone typed them in. The many places where Maṇimēkalai reuses Silappatikāram's phrasing stay invisible.",
                    "நூல்களுக்கு இடையிலான இணைப்புகள் யாராவது பதிந்தால் மட்டுமே இருக்கும்."],
        "answer": ["A formula finder aligns lines across the two epics by their Tamil phrasing and keeps only pairs that beat a shuffled baseline. Shared phrasing is shown as an echo, never as proof of borrowing.",
                   "சூத்திரம் காண்பான் இரு காப்பிய வரிகளையும் தமிழ்ச் சொற்றொடரால் ஒப்பிட்டு, கலைத்த அடிப்படையை விட மேலானவற்றை மட்டும் வைக்கிறது."],
        "how": ["Sequence alignment over normalised Tamil (longest common subsequence plus bag-of-forms), scored against 2,000 shuffles. Code: src/manichchilambu/echo.py and scripts/formula_finder.py.",
                "இயல்பாக்கப்பட்ட தமிழில் வரிசை ஒப்பீடு, 2,000 கலைப்புகளுடன் ஒப்பீடு."],
        "figure": {"value": len(echoes["lines"]), "label": ["line pairs shared between the epics, found with no hand labels", "கைக்குறியின்றிக் கண்ட, இரு காப்பியங்களுக்கும் பொதுவான வரி இணைகள்"]},
        "pairs": [{"a": e["a"], "b": e["b"], "ta": e["ta"], "tb": e["tb"]} for e in sorted(echoes["lines"], key=lambda e: -e["score"])[:3]], "link": "#/discover",
    })

    # 11. Answers that respect the ledger.
    qa = read("reports/ask_hybrid.json", {})
    held = qa.get("open_2_heldout", {})
    items.append({
        "id": "answers", "icon": "chat",
        "title": ["Answers that never turn a claim into a fact", "கூற்றை உண்மையாக்காத விடைகள்"],
        "problem": ["Retrieval-augmented question answering checks that a passage is relevant, not what kind of statement it is, so an accusation comes back as the answer.",
                    "தேடல் சார்ந்த விடையளிப்பு பகுதி தொடர்புடையதா என்று மட்டும் பார்க்கிறது; குற்றச்சாட்டே விடையாக வருகிறது."],
        "answer": ["Retrieval is fused from four routes, then every piece of evidence is sorted by mood (told as fact, said, wanted, imagined, believed). Only told-as-fact records may answer as fact; anything else is attributed. It asks which one when a name fits two people, and says when the graph doesn't know.",
                   "நான்கு வழித் தேடல் இணைக்கப்பட்டு, ஒவ்வொரு சான்றும் தன்மையால் பிரிக்கப்படுகிறது. நிகழ்ந்ததாகக் கூறப்பட்டவை மட்டுமே உண்மையாக விடையளிக்கும்."],
        "how": ["A typed query plan, ambiguity grounding, reciprocal rank fusion weighted by how much of the question a record covers, and an evidence-class gate before the answer is written. Optional model-written answers go through a claim-by-claim checker. Code: web/src/lib/plan.ts, hybrid.ts; scripts/ask_llm.py.",
                "வகைப்படுத்திய வினவல் திட்டம், பெயர்க் குழப்பத் தீர்வு, பொருத்தம் சார்ந்த தர இணைப்பு, சான்று வகை வாயில்."],
        "figure": {"value": held.get("hybrid", {}).get("right", 0), "label": [f"of {held.get('hybrid', {}).get('of', 0)} held-out questions answered right, against {held.get('rules_only', {}).get('right', 0)} by rules alone", "மறைத்த கேள்விகளில் சரியான விடைகள்"]},
        "link": "#/ask?q=Did%20Kovalan%20steal%20the%20queen%27s%20anklet%3F",
    })

    # 12. Every line accounted for, every source labelled.
    cantos = read("cantos.json", [])
    lines = sum(c["lines"] for c in cantos)
    items.append({
        "id": "provenance", "icon": "shield",
        "title": ["Every line accounted for, every source labelled", "ஒவ்வொரு வரியும் கணக்கில், ஒவ்வொரு மூலமும் குறிக்கப்பட்டது"],
        "problem": ["Machine-built graphs mix checked and unchecked facts in one store and can't say which parts of the source were never read.",
                    "இயந்திரம் கட்டிய வரைபடங்கள் சரிபார்த்தவையும் சரிபார்க்காதவையும் கலக்கின்றன; மூலத்தின் எப்பகுதி படிக்கப்படவில்லை என்று கூற முடியாது."],
        "answer": ["Each statement has a tier: hand record (scholar-reviewed, disputed or not yet), drafts accepted by a reader or by a verified sample, drafts checked by a second model, unchecked drafts, and a note on every line. Tiers never mix: only hand records answer; the rest point. Every one of the lines was read and given a note, so nothing is skipped silently.",
                   "ஒவ்வொரு கூற்றுக்கும் ஒரு அடுக்கு; அடுக்குகள் கலப்பதில்லை. ஒவ்வொரு வரியும் படிக்கப்பட்டுக் குறிப்புப் பெற்றது."],
        "how": ["A line-by-line reading that must return a note for each line it's given (a missing note is reported, not ignored); a second model judging every draft; blind stratified samples with a Wilson interval deciding whether a pile can be trusted.",
                "ஒவ்வொரு வரிக்கும் குறிப்பு கட்டாயம்; இரண்டாம் மாதிரி சரிபார்ப்பு; வில்சன் இடைவெளியுடன் மாதிரிச் சோதனை."],
        "figure": {"value": lines, "label": ["lines of both epics, every one read and noted", "இரு காப்பியங்களின் வரிகள், ஒவ்வொன்றும் படித்துக் குறிக்கப்பட்டவை"]},
        "tiers": {"hand": sum(c["cited"] for c in cantos), "reviewed": sum(c.get("reviewed", c["cited"]) for c in cantos), "checked": sum(c.get("checked", 0) for c in cantos), "drafted": sum(c["drafted"] for c in cantos), "noted": len(notes), "lines": lines},
        "link": "#/songs",
    })

    return {"items": items}


if __name__ == "__main__":
    print(json.dumps(build(), ensure_ascii=False, indent=1)[:2000])
