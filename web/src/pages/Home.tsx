import * as Slider from "@radix-ui/react-slider";
import { ArrowRight, BookOpen, CircleHelp, Compass, GitCompare, Info, Languages, Network, Search } from "lucide-react";
import { useState } from "react";
import { AnkletIcon, MoodTag } from "../components/Marks";
import { go, useApp, useT } from "../lib/app";
import { beliefAt, holdersAt } from "../lib/model";

// One short walk through the anklet episode, driven by the real ledger, so the idea lands before any explaining.
const BEATS = [
  { t: 9.8, rec: "a01" }, { t: 16.1, rec: "a03" }, { t: 16.14, rec: "a08" }, { t: 16.16, rec: "a12" }, { t: 16.2, rec: "a15" }, { t: 20.6, rec: "a20" }, { t: 20.7, rec: "a22" },
];

function OneMoment() {
  const { corpus, lang } = useApp();
  const t = useT();
  const [i, setI] = useState(2);
  const beat = BEATS[i];
  const record = corpus.byId.get(beat.rec)!;
  const who = (ids: string[]) => ids.map((id) => corpus.nodeById.get(id)?.[lang] ?? id).join(", ") || "—";
  const belief = beliefAt(corpus, "pandya_king", "a09", beat.t);
  return (
    <section className="panel moment" aria-labelledby="moment-h">
      <div>
        <h2 id="moment-h">{t("What the king believes", "அரசன் நம்புவது")}</h2>
        <p className="fine" style={{ marginTop: 4 }}>{t("Drag through the anklet episode. A lie stays a lie, even while the king believes it.", "சிலம்புப் பகுதியில் நகர்த்துங்கள். அரசன் நம்பும்போதும் பொய் பொய்யாகவே இருக்கும்.")}</p>
      </div>
      <div className="record__tags"><MoodTag mood={record.mood} /><a className="mono" href={`#/songs/${record.lines[0].id.slice(0, 6)}?line=${record.lines[0].id}`}>{record.lines[0].id}</a></div>
      <p className="moment__event" aria-live="polite" lang={lang}>{lang === "ta" ? record.ta : record.en}</p>
      <div className="moment__grid">
        <div><h3>{t("Who really has the queen's anklet", "அரசியின் சிலம்பு உண்மையில் யாரிடம்")}</h3><p className="moment__fact">{who(holdersAt(corpus, "ank_q", beat.t))}</p></div>
        <div><h3>{t("Who has Kannagi's anklet", "கண்ணகியின் சிலம்பு யாரிடம்")}</h3><p className="moment__fact">{who(holdersAt(corpus, "ank_k1", beat.t))}</p></div>
        <div className={belief === "accept" ? "moment__wrong" : ""}><h3>{t("What the king believes", "அரசன் நம்புவது")}</h3><p className="moment__fact">{belief === "accept" ? t("That Kovalan stole it (wrongly)", "கோவலன் திருடினான் என்று (தவறாக)") : belief === "reject" ? t("He knows now that Kovalan didn't", "கோவலன் திருடவில்லை என்று உணர்ந்தான்") : t("Nothing yet. Nobody has accused anyone", "இன்னும் எதுவும் இல்லை; யாரும் குற்றம் சாட்டவில்லை")}</p></div>
      </div>
      <Slider.Root className="slider" min={0} max={BEATS.length - 1} step={1} value={[i]} onValueChange={([v]) => setI(v)}>
        <Slider.Track className="slider__track"><Slider.Range className="slider__range" /></Slider.Track>
        <Slider.Thumb className="slider__thumb" aria-label={t("What the king believes: move through the story", "அரசன் நம்புவது: கதையில் நகர்த்துங்கள்")} aria-valuetext={lang === "ta" ? record.ta : record.en} />
      </Slider.Root>
      <p className="moment__hint"><span>{t(`Step ${i + 1} of ${BEATS.length}`, `${BEATS.length} இல் ${i + 1}`)}</span><a className="read-link" href={`#/songs/${record.lines[0].id.slice(0, 6)}?line=${record.lines[0].id}`}>{t("Read this line", "இவ்வரியைப் படிக்க")} {record.lines[0].id}<ArrowRight size={15} aria-hidden="true" /></a></p>
    </section>
  );
}

/** How much of the text is behind the graph, said plainly, so "the passages read so far" means something. */
function Coverage() {
  const { corpus, lang } = useApp();
  const t = useT();
  const lines = corpus.cantos.reduce((n, c) => n + c.lines, 0);
  const cited = corpus.cantos.reduce((n, c) => n + c.cited, 0);
  const drafted = corpus.cantos.reduce((n, c) => n + c.drafted, 0);
  const pct = (x: number) => `${Math.round((x / lines) * 100)}%`;
  return (
    <section className="panel home-coverage" aria-label={t("How much of the text is covered", "நூலில் எவ்வளவு உள்ளடக்கப்பட்டது")}>
      <h2>{t(`The graph rests on ${pct(cited)} of the lines so far`, `வரைபடம் இதுவரை ${pct(cited)} வரிகளை மட்டுமே சார்ந்துள்ளது`)}</h2>
      <CoverageBar lines={lines} cited={cited} drafted={drafted} big />
      <p className="fine">{lang === "ta"
        ? `${corpus.records.length} கைப்பதிவுகள் ${lines.toLocaleString()} வரிகளில் ${cited.toLocaleString()} வரிகளைச் சுட்டுகின்றன. சரிபார்க்கப்படாத இயந்திர வரைவுகள் ${pct(drafted)} வரை செல்கின்றன; அவை வரைபடத்திலோ விடைகளிலோ இல்லை, ஒவ்வொரு பாடல் பக்கத்திலும் மட்டும்.`
        : `${corpus.records.length} hand-made records cite ${cited.toLocaleString()} of ${lines.toLocaleString()} lines. Unchecked machine drafts reach ${pct(drafted)}. Those stay out of the graph and the answers, and show only on each song's page.`}</p>
    </section>
  );
}

export function CoverageBar({ lines, cited, drafted, big }: { lines: number; cited: number; drafted: number; big?: boolean }) {
  const t = useT();
  const w = (x: number) => `${Math.max(x ? 1.5 : 0, (x / lines) * 100)}%`;
  const pct = (x: number) => `${Math.round((x / lines) * 100)}%`;
  return (
    <div className={big ? "coverage coverage--big" : "coverage"}>
      <div className="coverage__bar" role="img" aria-label={t(`${cited} of ${lines} lines in the graph, ${drafted} with drafts`, `${lines} இல் ${cited} வரிகள் வரைபடத்தில், ${drafted} வரைவுகளுடன்`)}>
        <span className="coverage__draft" style={{ width: w(drafted) }} />
        <span className="coverage__graph" style={{ width: w(cited) }} />
      </div>
      {big && <p className="coverage-key"><span><i className="key-hand" />{t("in the graph", "வரைபடத்தில்")} · {pct(cited)}</span><span><i className="key-draft" />{t("unchecked machine drafts", "சரிபார்க்காத இயந்திர வரைவுகள்")} · {pct(drafted)}</span><span><i className="key-none" />{t("not read into records yet", "இன்னும் பதியப்படாதவை")}</span></p>}
    </div>
  );
}

export function HomePage() {
  const { corpus, lang } = useApp();
  const t = useT();
  const [q, setQ] = useState("");
  const samples = lang === "ta" ? ["கண்ணகியின் சிலம்பைச் செய்தவர் யார்?", "கோவலனைக் கொன்றது யார்?", "மணிமேகலைக்கும் கண்ணகிக்கும் என்ன தொடர்பு?"] : ["Who made Kannagi's anklet?", "manimegalai appa yaar", "Did Kovalan steal the anklet?"];
  const submit = (text: string) => { if (text.trim()) go(`/ask?q=${encodeURIComponent(text)}`); };
  // Four ways in for a newcomer, each with a real example from the data. The other pages follow.
  const starts = [
    { href: "#/ask", icon: <CircleHelp size={16} aria-hidden="true" />, page: t("Ask", "கேள்"), title: t("Ask a question", "ஒரு கேள்வி கேளுங்கள்"), text: t("In Tamil, English or Thanglish. Answers come only from verse-backed records, and it says when the poem doesn't say.", "தமிழ், ஆங்கிலம், தங்கிலீஷில் கேளுங்கள். பாடல் வரிகளுடன் உள்ள பதிவுகளில் இருந்தே விடை; நூல் கூறாவிட்டால் அதையும் கூறும்."), go: t("Open the question box", "கேள்விப் பெட்டி") },
    { href: "#/trace", icon: <AnkletIcon size={16} />, page: t("Trace", "தடம்"), title: t("Follow the anklet", "சிலம்பைப் பின்தொடருங்கள்"), text: t("Follow a meal, a jewel or a bowl through every hand it passed, and see what's left unsaid.", "ஓர் உணவு, அணி, பாத்திரம் கடந்த கைகளைப் பின்தொடருங்கள்."), go: t("Follow a trail", "தொடர") },
    { href: "#/songs/SIL-20", icon: <BookOpen size={16} aria-hidden="true" />, page: t("Songs", "பாடல்கள்"), title: t("Read a song", "ஒரு பாடலைப் படியுங்கள்"), text: t(`Start with வழக்குரை காதை, Kannagi's case in court, or browse all ${corpus.cantos.length} cantos and 10,209 lines.`, `கண்ணகியின் வழக்குரை காதையில் தொடங்குங்கள், அல்லது ${corpus.cantos.length} காதைகளையும் பாருங்கள்.`), go: t("Read canto 20", "காதை 20 படிக்க") },
    { href: "#/discover?tab=epics", icon: <GitCompare size={16} aria-hidden="true" />, page: t("Discover", "கண்டறி"), title: t("Who's in both epics", "இரண்டிலும் வருபவர் யார்"), text: t("The people and things the two poems share, and how sure each tie is.", "இரு நூல்களும் பகிரும் நபர்களும் பொருள்களும், ஒவ்வொரு தொடர்பும் எவ்வளவு உறுதி என்பதும்."), go: t("See the ties", "பார்க்க") },
  ];
  const more = [
    { href: "#/discover", icon: <Compass size={16} aria-hidden="true" />, title: t("Unexpected paths", "எதிர்பாராத தொடர்புகள்"), text: t(`${corpus.discoveries.length} paths across people, food and craft, each one honest about how strong it is.`, `மக்கள், உணவு, கலை வழியாக ${corpus.discoveries.length} எதிர்பாராத தொடர்புகள்.`) },
    { href: "#/graph", icon: <Network size={16} aria-hidden="true" />, title: t("The graph", "வரைபடம்"), text: t(`${corpus.graph.nodes.length} people, places and things, from the whole web down to a few nodes you pick.`, `${corpus.graph.nodes.length} நபர்கள், இடங்கள், பொருள்கள்.`) },
    { href: "#/words", icon: <Languages size={16} aria-hidden="true" />, title: t("Words", "சொற்கள்"), text: t("Why கூடல் is a city in one line and an embrace in another, and search over every line.", "கூடல் ஒரு வரியில் நகரம், மற்றொன்றில் புணர்ச்சி.") },
    { href: "#/about", icon: <Info size={16} aria-hidden="true" />, title: t("About", "பற்றி"), text: t("How it's built, how far to trust it, and what no scholar has checked yet.", "எப்படிச் செய்யப்பட்டது, எவ்வளவு நம்பலாம்.") },
  ];
  const steps = [
    [t("Parse the text", "உரையைப் பிரித்தல்"), t("Both epics split into 64 cantos and 10,209 numbered lines.", "இரு நூல்களும் 64 காதைகள், 10,209 எண்ணிட்ட வரிகள்.")],
    [t("Record what's told", "கூறப்பட்டதைப் பதிதல்"), t(`${corpus.records.length} draft records of who did what, each citing its lines.`, `${corpus.records.length} வரைவுப் பதிவுகள், ஒவ்வொன்றும் வரிகளுடன்.`)],
    [t("Mark who says it", "யார் கூறுகிறார்"), t("Poet, character, or a character quoting someone else. A lie stays marked as said.", "புலவரா, பாத்திரமா. பொய் கூற்றாகவே இருக்கும்.")],
    [t("Replay the story", "கதையை ஓட்டுதல்"), t("Who holds what, who's alive and who believes what are worked out at any moment.", "யாரிடம் எது, யார் எதை நம்புகிறார் என்பது எந்தக் கணத்திலும் கணக்கிடப்படும்.")],
    [t("Check the rules", "விதிகளைச் சரிபார்த்தல்"), t("A script confirms every quoted phrase is in its line. Other checks catch impossible stories.", "ஒவ்வொரு மேற்கோளும் வரியில் உள்ளதா என்று நிரல் பார்க்கும்.")],
    [t("Find guarded paths", "பாதுகாப்பான தொடர்புகள்"), t("Links get a label for how strong they are, and sharing a mango never becomes trading one.", "இணைப்புக்கு வலிமைக் குறி உண்டு; ஒரே கனி வணிகம் ஆகாது.")],
  ];
  return (
    <>
      <section className="hero">
        <p className="eyebrow">{t("A knowledge graph of Silappatikāram and Maṇimēkalai", "சிலப்பதிகாரம், மணிமேகலை ஆகியவற்றின் அறிவு வரைபடம்")}</p>
        <h1>{t("Who did it, who only said so, and who believed them.", "செய்தவர் யார், சொன்னவர் யார், நம்பியவர் யார்.")}</h1>
        <p className="hero__lead">{t("Most story graphs would record that Kovalan stole the anklet, because a character said it. This one keeps the lie as a lie, won't say a goldsmith made what he only looked at, and points every step to its Tamil verse.", "ஒரு பாத்திரம் சொன்னதால் கோவலன் திருடினான் என்று பெரும்பாலான வரைபடங்கள் பதிவு செய்துவிடும். இங்கு பொய் பொய்யாகவே இருக்கும்; ஒவ்வொரு படியும் தமிழ்ப் பாடல் வரியைச் சுட்டும்.")}</p>
        <form className="ask-box" onSubmit={(e) => { e.preventDefault(); submit(q); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Ask in Tamil, English or Thanglish", "தமிழ், ஆங்கிலம் அல்லது தங்கிலீஷில் கேளுங்கள்")} aria-label={t("Ask a question", "கேள்வி கேளுங்கள்")} />
          <button type="submit"><Search size={16} aria-hidden="true" />{t("Ask", "கேள்")}</button>
        </form>
        <div className="chips"><span className="fine">{t("Try:", "முயலுங்கள்:")}</span>{samples.map((s) => <button key={s} className="chip" onClick={() => submit(s)}>{s}</button>)}</div>
      </section>

      <h2 className="start-h">{t("Start here", "இங்கே தொடங்குங்கள்")}</h2>
      <div className="desk">
        {starts.map((c) => (
          <a key={c.href} href={c.href} className="desk__card">
            <span className="desk__page">{c.icon}{c.page}</span>
            <h3>{c.title}</h3>
            <p>{c.text}</p>
            <span className="go">{c.go}</span>
          </a>
        ))}
      </div>

      <div className="panels">
        <OneMoment />
        <Coverage />
      </div>

      <h2 className="start-h">{t("More to explore", "மேலும் ஆராய")}</h2>
      <div className="desk desk--more">
        {more.map((c) => (
          <a key={c.href} href={c.href} className="desk__card">
            <span className="desk__page">{c.icon}</span>
            <h3>{c.title}</h3>
            <p>{c.text}</p>
          </a>
        ))}
      </div>

      <section className="how">
        <h2>{t("How does Maṇichchilambu work?", "மணிச்சிலம்பு எப்படி இயங்குகிறது?")}</h2>
        <p>{t("We read the verses, record who says what, and only then let the program look for connections. No language model runs on this site.", "பாடல்களைப் படித்து, யார் எதைக் கூறுகிறார் என்று பதிந்த பின்னரே நிரல் தொடர்புகளைத் தேடும். இந்தத் தளத்தில் மொழி மாதிரி இயங்குவதில்லை.")}</p>
        <ol className="how__grid">
          {steps.map(([title, text], i) => <li key={i} className="how__step"><span className="how__n">{i + 1}</span><h3>{title}</h3><p>{text}</p></li>)}
          <li className="how__step"><span className="how__n">{steps.length + 1}</span><h3>{t("Say what's missing", "இல்லாததைக் கூறுதல்")}</h3><p>{t("Who made the anklet? The passages read so far don't say, and neither does this.", "சிலம்பைச் செய்தவர் யார்? படித்த பகுதிகளில் இல்லை; இங்கும் இல்லை.")}</p></li>
        </ol>
      </section>
    </>
  );
}
