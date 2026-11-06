import { useEffect, useMemo, useState } from "react";
import { useApp, useName, useT } from "../lib/app";
import { queryStem, searchVerses, verseIndex, type VerseHit } from "../lib/verses";
import type { LexEntry } from "../lib/types";

const SHELVES: { key: "people" | "places" | "objects" | "foods" | "events" | "epithets"; en: string; ta: string; rule: [string, string] }[] = [
  { key: "people", en: "People", ta: "நபர்கள்", rule: ["Same person only when the context supports it. A title isn't a name.", "சூழல் காட்டும்போது மட்டுமே ஒரே நபர். பட்டம் பெயர் அல்ல."] },
  { key: "places", en: "Places", ta: "இடங்கள்", rule: ["Other names for the same place, kept with the verse that uses them.", "ஒரே இடத்தின் பிற பெயர்கள், பயன்படும் வரியுடன்."] },
  { key: "objects", en: "Objects", ta: "பொருள்கள்", rule: ["A shared word doesn't mean the same object. Two anklets, one word.", "ஒரே சொல் ஒரே பொருளைக் குறிக்காது. இரு சிலம்புகள், ஒரு சொல்."] },
  { key: "foods", en: "Food and crops", ta: "உணவும் பயிரும்", rule: ["Plant, fruit, leaf and dish stay apart. So does a reading from the verse itself.", "செடி, கனி, இலை, உணவு தனித்தனி."] },
  { key: "events", en: "Festivals", ta: "விழாக்கள்", rule: ["One kind of event can happen many times, and each stays its own.", "ஒரு வகை நிகழ்ச்சி பலமுறை நிகழலாம்; ஒவ்வொன்றும் தனி."] },
  { key: "epithets", en: "How Madurai is described", ta: "மதுரையின் அடைமொழிகள்", rule: ["The poet's words, with their verse. Not reduced to 'Madurai is beautiful'.", "புலவரின் சொற்கள், வரியுடன்."] },
];

function Row({ e }: { e: LexEntry }) {
  const t = useT();
  const name = useName();
  return (
    <div className="lex__row">
      <span className="lex__form" lang="ta">{e.form}</span>
      <span className="lex__meaning">{e.meaning ?? (e.entity ? name(e.entity) : "")}{e.source === "reading" && <> <span className="tag">{t("a reading", "ஒரு விளக்கம்")}</span></>}</span>
      {e.note && <span className="fine">{e.note}</span>}
      <a className="lex__line" href={`#/songs/${e.line.slice(0, 6)}?line=${e.line}`}><span lang="ta">{e.text}</span><span className="verse__id">{e.line}</span></a>
    </div>
  );
}

function Lexicons() {
  const { corpus, lang } = useApp();
  const t = useT();
  const [shelf, setShelf] = useState<(typeof SHELVES)[number]["key"]>("epithets");
  const current = SHELVES.find((s) => s.key === shelf)!;
  return (
    <>
      <section>
        <h2>{t("One word, several things", "ஒரே சொல், பல பொருள்")}</h2>
        <p className="fine" style={{ margin: "-10px 0 20px", maxWidth: 720 }}>{t("The commonest way for a Tamil text graph to go wrong. Spelling can't separate these, and only the line around them can.", "தமிழ் உரை வரைபடங்கள் தவறும் பொதுவான இடம். எழுத்துகளால் பிரிக்க முடியாது; சூழலே பிரிக்கும்.")}</p>
        {corpus.lexicon.homonyms.map((h) => (
          <article key={h.form} className="homonym">
            <h3 lang="ta">{h.form}</h3>
            <ol>{h.senses.map((s) => <li key={s.line}><b>{lang === "ta" ? s.ta : s.en}</b><a className="lex__line" href={`#/songs/${s.line.slice(0, 6)}?line=${s.line}`}><span lang="ta">{s.text}</span><span className="verse__id">{s.line}</span></a></li>)}</ol>
          </article>
        ))}
      </section>
      <section>
        <h2>{t("The lexicons", "சொற்றொகுதிகள்")}</h2>
        <div className="tabs" role="tablist">{SHELVES.map((s) => <button key={s.key} role="tab" aria-selected={shelf === s.key} onClick={() => setShelf(s.key)}>{lang === "ta" ? s.ta : s.en}</button>)}</div>
        <p className="fine" style={{ marginBottom: 12 }}>{lang === "ta" ? current.rule[1] : current.rule[0]}</p>
        <div className="lex">{corpus.lexicon[shelf].map((e) => <Row key={e.form + e.line} e={e} />)}</div>
      </section>
    </>
  );
}

interface CatItem { id: string; cat: string; sub: string; ta: string; forms: string[]; search?: string[]; line: string; node?: string; status: "text" | "title" | "reading"; note?: string; text: string; seen: number; also: string[] }
interface Catalogue { taxonomy: { id: string; store: string; module: string; sub: string[] }[]; items: CatItem[] }

const CAT_NAMES: Record<string, [string, string]> = {
  PERSON: ["People", "நபர்கள்"], DEITY: ["Deities and spirits", "தெய்வங்கள்"], GROUP: ["Groups and communities", "குழுக்கள்"], KINSHIP: ["Kin and social ties", "உறவுகள்"],
  PLACE: ["Places", "இடங்கள்"], BUILDING: ["Buildings and institutions", "கட்டடங்கள், அமைப்புகள்"], OBJECT: ["Objects and instruments", "பொருள்கள், கருவிகள்"], JEWEL: ["Jewels and ornaments", "அணிகலன்கள்"],
  FOOD: ["Food and drink", "உணவு"], PLANT_ANIMAL: ["Plants and animals", "தாவரம், விலங்கு"], MATERIAL: ["Materials and goods", "பொருட்கள்"], OCCUPATION: ["Trades and crafts", "தொழில்கள்"],
  EVENT: ["Events", "நிகழ்ச்சிகள்"], STATE: ["States", "நிலைகள்"], CLAIM: ["Claims and speech", "கூற்றுகள்"], BELIEF: ["Beliefs", "நம்பிக்கைகள்"], INTENTION: ["Plans and motives", "நோக்கங்கள்"],
  TIME: ["Time and order", "காலம்"], CAUSE: ["Causes", "காரணங்கள்"], FESTIVAL_ART: ["Festivals, rites and arts", "விழா, சடங்கு, கலை"], RELIGION: ["Religion and doctrine", "சமயம், கொள்கை"],
  COSMOLOGY: ["Curses, rebirth, karma", "சாபம், மறுபிறப்பு, வினை"], CROSS_TEXT: ["Across the two epics", "இரு நூல்களுக்கு இடையே"], EVIDENCE: ["Evidence and sources", "சான்று"],
};
const STORE: Record<string, [string, string]> = { entity: ["kept as things in the graph", "வரைபடத்தில் பொருளாக"], record: ["kept as records of their own", "தனிப் பதிவுகளாக"], relation: ["kept as kinds of link", "இணைப்பு வகைகளாக"], provenance: ["kept on every record as its evidence", "ஒவ்வொரு பதிவின் சான்றாக"] };

function CatalogueTab() {
  const { lang } = useApp();
  const t = useT();
  const name = useName();
  const [data, setData] = useState<Catalogue | null>(null);
  const [cat, setCat] = useState("JEWEL");
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}data/catalogue.json`).then((r) => r.json()).then(setData).catch(() => setData(null)); }, []);
  if (!data) return <p className="fine">{t("Loading the catalogue...", "பட்டியல் ஏற்றப்படுகிறது...")}</p>;
  const i = lang === "ta" ? 1 : 0;
  const count = (c: string) => data.items.filter((x) => x.cat === c).length;
  const tax = data.taxonomy.find((x) => x.id === cat)!;
  const rows = data.items.filter((x) => x.cat === cat);
  return (
    <section>
      <p className="fine" style={{ maxWidth: 760, marginBottom: 18 }}>{t("Twenty-four kinds of thing to look for in every line. The items here are the ones a review turned up that the graph didn't have yet. Each is checked against the line it cites. The other lines listed are where the same letters occur, which isn't always the same sense.", "ஒவ்வொரு வரியிலும் தேட வேண்டிய இருபத்து நான்கு வகைகள். இங்குள்ளவை வரைபடத்தில் இதுவரை இல்லாதவை; ஒவ்வொன்றும் சுட்டும் வரியுடன் சரிபார்க்கப்பட்டது. பிற வரிகள் எழுத்து ஒப்புமை மட்டுமே.")}</p>
      <div className="pick-trail">
        <label className="field"><span>{t("Category", "வகை")}</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>{data.taxonomy.map((x) => <option key={x.id} value={x.id}>{CAT_NAMES[x.id]?.[i] ?? x.id} ({count(x.id)})</option>)}</select>
        </label>
        <span className="fine">{STORE[tax.store]?.[i]} · {tax.sub.map((s) => s.replace(/_/g, " ")).join(", ")}</span>
      </div>
      {!rows.length && <p className="fine">{t("Nothing new in this category from the review. It's covered by the records and the graph's own links.", "இந்த வகையில் புதியது இல்லை; பதிவுகளும் இணைப்புகளும் இதை உள்ளடக்குகின்றன.")}</p>}
      <div className="lex">
        {rows.map((x) => (
          <div key={x.id} className="lex__row">
            <span className="lex__form" lang="ta">{x.ta}</span>
            <span className="lex__meaning">{x.sub.replace(/_/g, " ")}{x.node ? ` · ${name(x.node)}` : ""}{x.status !== "text" && <> <span className="tag">{x.status === "title" ? t("in the title only", "தலைப்பில் மட்டும்") : t("a reading", "ஒரு விளக்கம்")}</span></>}</span>
            {x.search?.length ? <span className="fine">{t("Also searched as", "தேடல் வடிவங்கள்")}: {x.search.join(", ")}</span> : null}
            {x.note && <span className="fine">{x.note}</span>}
            <a className="lex__line" href={`#/songs/${x.line.slice(0, 6)}?line=${x.line}`}><span lang="ta">{x.text}</span><span className="verse__id">{x.line}</span></a>
            {x.also.length > 0 && <span className="fine">{t(`The same letters in ${x.seen - 1} other line${x.seen - 1 > 1 ? "s" : ""}, unchecked: `, `பிற ${x.seen - 1} வரிகளில் அதே எழுத்துகள் (சரிபார்க்கவில்லை): `)}{x.also.slice(0, 8).map((l) => <a key={l} className="verse__id" style={{ marginLeft: 6 }} href={`#/songs/${l.slice(0, 6)}?line=${l}`}>{l}</a>)}{x.also.length > 8 ? " …" : ""}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const terms = useMemo(() => query.normalize("NFC").split(/\s+/).filter(Boolean).map(queryStem), [query]);
  if (!terms.length) return <>{text}</>;
  const pattern = new RegExp(`(${terms.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return <>{text.split(pattern).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}</>;
}

function VerseSearch({ initial }: { initial: string }) {
  const { lang } = useApp();
  const t = useT();
  const [q, setQ] = useState(initial);
  const [epic, setEpic] = useState<"both" | "SIL" | "MAN">("both");
  const [hits, setHits] = useState<VerseHit[] | null>(null);
  useEffect(() => { void verseIndex(); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setHits(null); return; }
    let live = true;
    const wait = setTimeout(() => searchVerses(q.trim(), epic).then((r) => { if (live) setHits(r); }), 140);
    return () => { live = false; clearTimeout(wait); };
  }, [q, epic]);
  return (
    <section>
      <div className="ask-box"><input value={q} onChange={(e) => setQ(e.target.value)} lang="ta" placeholder={t("Type Tamil: சிலம்பு, கூடல், வாழை...", "தமிழில் தட்டுங்கள்: சிலம்பு, கூடல், வாழை...")} aria-label={t("Search the verses", "வரிகளில் தேடு")} /></div>
      <div className="song-tools__row">
        <div className="segmented" role="group" style={{ margin: 0 }}>{([["both", "Both", "இரண்டும்"], ["SIL", "Silappatikāram", "சிலம்பு"], ["MAN", "Maṇimēkalai", "மணிமேகலை"]] as const).map(([v, en, ta]) => <button key={v} aria-pressed={epic === v} onClick={() => setEpic(v)}>{lang === "ta" ? ta : en}</button>)}</div>
        {hits && <span className="fine">{hits.length === 80 ? t("First 80 lines", "முதல் 80 வரிகள்") : t(`${hits.length} lines`, `${hits.length} வரிகள்`)}</span>}
      </div>
      <p className="fine" style={{ marginBottom: 14 }}>{t("Matches the start of a word, with a little give for long words, across all 10,209 lines. Tamil script only: for English or Thanglish, use Ask.", "10,209 வரிகளிலும் சொல்லின் தொடக்கத்தைப் பொருத்தும். தமிழ் எழுத்தில் மட்டும்; ஆங்கிலத்துக்கு 'கேள்' பக்கம்.")}</p>
      {hits?.map((h) => <a key={h.id} className="hit" href={`#/songs/${h.id.slice(0, 6)}?line=${h.id}`} lang="ta"><span><Highlight text={h.text} query={q} /></span><span className="verse__id">{h.id}</span></a>)}
      {hits && !hits.length && <p className="empty">{/[஀-௿]/.test(q) ? t("No line starts a word like that.", "அப்படி ஒரு சொல் இல்லை.") : t("This searches Tamil script. Try Ask for English or Thanglish.", "இது தமிழ் எழுத்தில் தேடும்.")}</p>}
    </section>
  );
}

export function WordsPage({ params }: { params: URLSearchParams }) {
  const { lang } = useApp();
  const t = useT();
  const [tab, setTab] = useState<"search" | "lex" | "catalogue">(params.get("q") || params.get("tab") === "search" ? "search" : params.get("tab") === "catalogue" ? "catalogue" : "lex");
  return (
    <div>
      <header className="section-head">
        <h1>{t("Words", "சொற்கள்")}</h1>
        <p>{t("How the poems name things, what one word can mean, and every line where a word occurs.", "நூல்கள் எப்படிப் பெயரிடுகின்றன, ஒரு சொல் என்னென்ன பொருள்படும், எந்த வரிகளில் வருகிறது.")}</p>
      </header>
      <div className="band" role="tablist">
        <button role="tab" aria-selected={tab === "lex"} onClick={() => setTab("lex")}>{t("Lexicons and homonyms", "சொற்றொகுதியும் பலபொருளும்")}</button>
        <button role="tab" aria-selected={tab === "catalogue"} onClick={() => setTab("catalogue")}>{t("The 24 categories", "24 வகைகள்")}</button>
        <button role="tab" aria-selected={tab === "search"} onClick={() => setTab("search")}>{lang === "ta" ? "வரிகளில் தேடு" : "Search every line"}</button>
      </div>
      {tab === "lex" ? <Lexicons /> : tab === "catalogue" ? <CatalogueTab /> : <VerseSearch initial={params.get("q") ?? ""} />}
    </div>
  );
}
