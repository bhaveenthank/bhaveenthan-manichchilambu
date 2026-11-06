import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ReadLink, RecordCard, RecordList } from "../components/RecordCard";
import { useApp, useName, useT } from "../lib/app";
import { roleValues } from "../lib/model";

const FlowChain = lazy(() => import("../components/FlowChain").then((m) => ({ default: m.FlowChain })));

// Each trail is a run of records in story order. A gap is something the text leaves open, shown right beside it.
const TRAILS = [
  { id: "meal", en: "Kannagi's meal", ta: "கண்ணகியின் உணவு", lead: ["Who asked, who supplied, who lit the fire, who cooked, who ate, and an unnamed woman who wove the mat he sat on.", "யார் கேட்டார், யார் தந்தார், யார் தீ மூட்டினார், யார் சமைத்தார், யார் உண்டார்; அவர் அமர்ந்த தவிசை நெய்த பெயரில்லாப் பெண்ணும்."], recs: ["n01", "n02", "n03", "n04", "n05", "n06", "n07", "n08", "n09"], gaps: ["g03", "g04"] },
  { id: "anklet", en: "Kannagi's anklet", ta: "கண்ணகியின் சிலம்பு", lead: ["Owned, offered, carried, examined and misidentified. It's made of gems, diamonds and gold, but nobody here is said to have made it.", "உரிமை, தருதல், கொண்டு செல்லுதல், ஆய்வு, தவறான அடையாளம். செய்தவர் கூறப்படவில்லை."], recs: ["a00", "v005", "a01", "a03", "n12", "a04", "n10", "n11", "a05", "a08", "v059", "v062", "a18"], gaps: ["g01", "g09"] },
  { id: "queen", en: "The queen's anklet", ta: "அரசியின் சிலம்பு", lead: ["The other anklet, the one that really went missing.", "உண்மையில் காணாமல் போன மற்றொரு சிலம்பு."], recs: ["a06", "a06b", "a07", "a19"], gaps: ["g02"] },
  { id: "bowl", en: "The Amudasurabhi", ta: "அமுதசுரபி", lead: ["An object with a long social life: given, used, left in a pond, risen again and carried into a prison.", "கொடுக்கப்பட்டு, பயன்பட்டு, பொய்கையில் இடப்பட்டு, மீண்டும் தோன்றி, சிறைக்குள் செல்லும் பொருள்."], recs: ["c01", "c02", "c04", "c07", "v097", "v109", "n68", "n69", "h01", "v133"], gaps: ["g10"] },
  { id: "tribute", en: "The hill people's gifts", ta: "மலைமக்கள் காணிக்கை", lead: ["A long list carried to Cenkuttuvan, and a piece of news they didn't know the meaning of.", "செங்குட்டுவனிடம் கொண்டுவந்த நீண்ட பட்டியலும், பொருள் அறியாத ஒரு செய்தியும்."], recs: ["n50", "n51", "n52"], gaps: ["g04", "g06"] },
  { id: "pavilion", en: "The gold pavilion", ta: "பொன் மண்டபம்", lead: ["Five crews from five regions, one building. A rare moment where the poem credits labour by origin and trade.", "ஐந்து நாட்டு வினைஞர்கள், ஒரு மண்டபம்."], recs: ["n35", "n37", "n38", "n39", "n40", "n36", "n41"], gaps: ["g08"] },
  { id: "gifts", en: "Gifts at Puhar", ta: "புகார்ப் பரிசுகள்", lead: ["Three northern kings give three things, and the poet goes out of his way to say craftsmen didn't make them.", "மூன்று வட அரசர் மூன்று பரிசுகள்; கம்மியர் செய்தவை அல்ல என்று புலவர் கூறுகிறார்."], recs: ["n33", "n30", "n31", "n32"], gaps: ["g11"] },
  { id: "wreck", en: "Saduvan's goods", ta: "சாதுவன் பொருள்கள்", lead: ["Fragrant wood, cloth and treasure, off the bodies of men the Nagas ate. Then charity at home.", "நாகர்கள் உண்டவர்களிடம் கிடைத்த பொருள்கள்; பின்னர் ஊரில் அறம்."], recs: ["n60", "n61", "n62", "n63", "n64", "n65", "n66", "n67"], gaps: ["g06", "g07"] },
  { id: "child", en: "Pilivalai's child", ta: "பீலிவளையின் குழந்தை", lead: ["A baby passed to a merchant, a wreck, a forgotten festival, and a city under the sea. Here the text does say each caused the next.", "ஒரு குழந்தை, ஒரு கப்பல் விபத்து, மறந்த விழா, கடலுள் மூழ்கிய நகரம்."], recs: ["n70", "n71", "n72", "n73", "n74"], gaps: [] },
  { id: "drum", en: "The festival drum", ta: "விழா முரசு", lead: ["Almost the same lines in both poems. The drum has a home, and the drummer doesn't.", "இரு நூல்களிலும் ஏறக்குறைய ஒரே வரிகள்."], recs: ["n45", "n46", "n47"], gaps: ["g05"] },
  { id: "city", en: "Madurai by trade", ta: "மதுரை வணிகம்", lead: ["Korkai pearls, Tondi cargo, and the gem, gold, cloth and grain streets. These lines actually name sources, which is rare.", "கொற்கை முத்து, தொண்டிச் சரக்கு, மணி, பொன், அறுவை, கூல வீதிகள். இவ்வரிகள் மூலத்தைக் கூறுகின்றன."], recs: ["v046", "v047", "v048", "v049", "v050", "v051", "v052", "v032"], gaps: [] },
  { id: "letter", en: "The refused letter", ta: "மறுத்த முடங்கல்", lead: ["A letter on a screw-pine leaf: who made it, who carried it, who turned it away, and who came back with the news.", "தாழை இலை மடல்: யார் எழுதினார், யார் கொண்டு சென்றார், யார் மறுத்தார்."], recs: ["v007", "v008", "v009", "v010", "v011", "v012", "v013"], gaps: [] },
  { id: "aputhiran", en: "Aputhiran", ta: "ஆபுத்திரன்", lead: ["A baby left in a grove, nursed by a cow, adopted, cast out as a thief, and feeding the helpless in Madurai before the bowl ever comes to him.", "தோட்டத்தில் விடப்பட்ட குழந்தை, ஆ வளர்த்தவன், கள்வன் எனப்பட்டவன்."], recs: ["v098", "v099", "v100", "v101", "v102", "v103", "v105", "v106", "c01", "c02"], gaps: [] },
  { id: "famine", en: "To Kanchi", ta: "காஞ்சிக்கு", lead: ["Masattuvan tells her of the famine, she flies there with the bowl and feeds everyone.", "மாசாத்துவான் பஞ்சத்தைக் கூற, அவள் பாத்திரத்துடன் பறந்து உணவளிக்கிறாள்."], recs: ["v124", "v128", "v129", "v130", "v131", "v132", "v133"], gaps: [] },
  { id: "jewels", en: "Madhavi's jewels", ta: "மாதவியின் அணிகள்", lead: ["Materials, setting and body part, item by item. One phrase here returns word for word on Kannagi's anklet ten cantos later.", "ஒவ்வொன்றாக அணிகள். ஒரு தொடர் பத்துக் காதைகளுக்குப் பின் கண்ணகி சிலம்பிலும் வருகிறது."], recs: ["n20", "n21", "n22", "n23", "n24", "n12"], gaps: [] },
];
const OBJECTS: [string, string, string][] = [["amudasurabhi", "The Amudasurabhi", "அமுதசுரபி"], ["ank_k1", "Kannagi's anklet", "கண்ணகியின் சிலம்பு"], ["ank_q", "The queen's anklet", "அரசியின் சிலம்பு"], ["royal_infant", "Pilivalai's child", "பீலிவளையின் குழந்தை"]];

function Trails() {
  const { corpus, lang } = useApp();
  const t = useT();
  const [id, setId] = useState("meal");
  const [pick, setPick] = useState<string | null>(null);
  const trail = TRAILS.find((x) => x.id === id)!;
  const recs = trail.recs.filter((r) => corpus.byId.has(r));
  const gaps = corpus.gaps.filter((g) => trail.gaps.includes(g.id));
  const shown = pick && corpus.byId.get(pick);
  const detail = useRef<HTMLDivElement>(null);
  // The step opens in the side column. Where that column sits below the flow, bring it into view.
  useEffect(() => { if (shown && window.innerWidth < 980) detail.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [shown]);
  return (
    <>
      <div className="pick-trail">
        <label className="field"><span>{t("Trail", "தடம்")}</span>
          <select value={id} onChange={(e) => { setId(e.target.value); setPick(null); }}>{TRAILS.map((x) => <option key={x.id} value={x.id}>{lang === "ta" ? x.ta : x.en}</option>)}</select>
        </label>
        <span className="fine">{t(`${TRAILS.length} trails. Click any step in the diagram to read it.`, `${TRAILS.length} தடங்கள். படத்தில் எந்தப் படியையும் அழுத்திப் படிக்கலாம்.`)}</span>
      </div>
      <p style={{ marginBottom: 20, maxWidth: 760 }}>{lang === "ta" ? trail.lead[1] : trail.lead[0]}</p>
      <div className="split">
        <div>
          <Suspense fallback={<div className="flow" />}><FlowChain recs={recs} selected={pick} onPick={setPick} /></Suspense>
          <p className="flow__key"><span><span className="key-line" />{t("the text gives this as a cause", "காரணமாகக் கூறப்பட்டது")}</span><span><span className="key-line key-line--then" />{t("only comes next, no cause claimed", "அடுத்து வருவது மட்டும்")}</span><span>{t("Tinted box: said, planned or imagined, not told as fact.", "நிறப் பெட்டி: கூற்று அல்லது கற்பனை.")}</span></p>
          <h2 className="sub">{t("Every step, in order", "எல்லாப் படிகளும், வரிசையில்")}</h2>
          <RecordList ids={recs} compact />
        </div>
        <aside className="guide">
          <div ref={detail} style={{ scrollMarginTop: 90 }}>
            {shown ? <><h3>{t("The step you picked", "நீங்கள் தேர்ந்த படி")}</h3><RecordCard record={shown} /><button className="link" style={{ margin: "12px 0 22px" }} onClick={() => setPick(null)}>{t("Close", "மூடு")}</button></>
              : <p className="fine" style={{ marginBottom: 18 }}>{t("Click a step in the diagram and it opens here.", "படத்தில் ஒரு படியை அழுத்தினால் இங்கே திறக்கும்.")}</p>}
          </div>
          <h3>{t("What the text doesn't say", "நூல் கூறாதவை")}</h3>
          {gaps.length ? gaps.map((g) => (
            <div key={g.id} className="gap">
              <p className="gap__q">{lang === "ta" ? g.q[1] : g.q[0]}</p>
              <p>{lang === "ta" ? g.a[1] : g.a[0]}</p>
              <span className="gap__no">{t("Tempting and wrong: ", "தவறான ஊகம்: ")}<s>{lang === "ta" ? g.tempting[1] : g.tempting[0]}</s></span>
            </div>
          )) : <p className="fine">{t("No open question recorded for this one yet.", "இதற்கு இன்னும் திறந்த கேள்வி பதியப்படவில்லை.")}</p>}
          <p className="fine" style={{ marginTop: 14 }}>{t("Not found in the passages read so far. A scholar may yet find more.", "இதுவரை படித்த பகுதிகளில் இல்லை. அறிஞர் மேலும் காணலாம்.")}</p>
        </aside>
      </div>
    </>
  );
}

function Hands() {
  const { corpus, lang } = useApp();
  const t = useT();
  const name = useName();
  const [obj, setObj] = useState("amudasurabhi");
  const steps = (corpus.timelines.custody[obj] ?? []).filter((s, i) => i > 0 || s.holders.length);
  return (
    <>
      <div className="pick-trail"><label className="field"><span>{t("Object", "பொருள்")}</span><select value={obj} onChange={(e) => setObj(e.target.value)}>{OBJECTS.map(([id, en, ta]) => <option key={id} value={id}>{lang === "ta" ? ta : en}</option>)}</select></label></div>
      <p className="fine">{t("Worked out by replaying the story, and not stored anywhere as a list.", "கதையை மீண்டும் ஓட்டிக் கணக்கிடப்படுகிறது.")}</p>
      <ol className="timeline">
        {steps.map((s, i) => {
          const r = s.rec ? corpus.byId.get(s.rec) : undefined;
          return <li key={i} className={s.holders.length ? "" : "timeline__gone"}>
            <span className="timeline__who">{s.holders.length ? s.holders.map(name).join(", ") : t("Nobody we can name", "பெயர் தெரியாது")}</span>
            {r && <span className="timeline__how">{lang === "ta" ? r.ta : r.en} <ReadLink line={r.lines[0].id} /></span>}
          </li>;
        })}
      </ol>
      {obj === "ank_q" && <p className="fine">{t("While the king believes Kovalan has it, the goldsmith does. No line has turned up yet where it comes back, which is a question for a scholar.", "கோவலனிடம் இருப்பதாக அரசன் நம்பும்போது, அது பொற்கொல்லனிடமே உள்ளது. அது திரும்பக் கிடைக்கும் வரி இதுவரை காணப்படவில்லை.")}</p>}
      {obj === "ank_k1" && <p className="fine">{t("One of the pair gets broken in court (SIL-20-0082). The text doesn't say which, so this timeline doesn't claim it.", "இரண்டில் ஒன்று அவையில் உடைக்கப்படுகிறது (SIL-20-0082). எது என்று நூல் கூறவில்லை.")}</p>}
      {obj === "amudasurabhi" && <p className="fine">{t("There are three accounts of how Maṇimēkalai got it: it rose by itself, Tīpatilakai gave it, or a deity gave it. This follows the canto where it's narrated in full.", "மணிமேகலைக்கு அது கிடைத்ததைப் பற்றி மூன்று கூற்றுகள் உள்ளன. இது விரிவாகக் கூறும் காதையைப் பின்பற்றுகிறது.")}</p>}
    </>
  );
}

function Minds() {
  const { corpus, lang } = useApp();
  const t = useT();
  const name = useName();
  const holders = useMemo(() => [...new Set(corpus.records.filter((r) => r.kind === "believe").flatMap((r) => roleValues(r.roles.holder)))], [corpus]);
  const [who, setWho] = useState("pandya_king");
  const beliefs = corpus.records.filter((r) => r.kind === "believe" && roleValues(r.roles.holder).includes(who)).sort((a, b) => a.t - b.t);
  return (
    <>
      <div className="pick-trail"><label className="field"><span>{t("Whose mind", "யாருடைய மனம்")}</span><select value={who} onChange={(e) => setWho(e.target.value)}>{holders.map((h) => <option key={h} value={h}>{name(h)}</option>)}</select></label></div>
      <ol className="beliefs">
        {beliefs.map((b) => {
          const claim = corpus.byId.get(b.content!)!;
          return <li key={b.id} className={b.stance === "accept" ? "belief belief--accept" : "belief belief--reject"}>
            <p className="belief__stance">{b.stance === "accept" ? t("Accepts", "ஏற்கிறார்") : t("Drops it", "கைவிடுகிறார்")}</p>
            <p>{lang === "ta" ? claim.ta : claim.en}</p>
            <RecordCard record={b} compact />
          </li>;
        })}
      </ol>
      {who === "kanchanan" && <><h3 className="sub">{t("At the very same moment", "அதே கணத்தில்")}</h3><p className="fine" style={{ marginBottom: 14 }}>{t("Udayakumaran looks at the same woman and knows who she is. One man's wrong belief kills the man who had it right.", "அதே பெண்ணைக் கண்ட உதயகுமரன் அவள் யார் என்று அறிகிறான். ஒருவனின் தவறான நம்பிக்கை சரியாக அறிந்தவனைக் கொல்கிறது.")}</p><RecordList ids={["b07", "b08", "b13"]} compact /></>}
    </>
  );
}

export function TracePage() {
  const { lang } = useApp();
  const t = useT();
  const TABS = [["trails", "Trails", "தடங்கள்"], ["hands", "Whose hands", "யார் கையில்"], ["minds", "Who believed what", "யார் எதை நம்பினார்"]] as const;
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("trails");
  return (
    <div>
      <header className="section-head">
        <h1>{t("Trace", "தடம்")}</h1>
        <p>{t("Follow a fruit, a jewel or a bowl through the verses: who supplied it, who held it, who only looked at it. Where the poem doesn't say, this says so, and doesn't fill in a likely answer.", "ஒரு கனி, ஓர் அணி, ஒரு பாத்திரத்தைப் பின்தொடருங்கள்: யார் தந்தார், யார் வைத்திருந்தார், யார் பார்த்தார் மட்டும். நூல் கூறாததை இங்கும் கூறுவதில்லை.")}</p>
      </header>
      <div className="band" role="tablist">{TABS.map(([k, en, ta]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{lang === "ta" ? ta : en}</button>)}</div>
      {tab === "trails" && <Trails />}
      {tab === "hands" && <Hands />}
      {tab === "minds" && <Minds />}
    </div>
  );
}
