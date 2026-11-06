import { useMemo, useState } from "react";
import { LinkKey } from "../components/LinkKey";
import { PathCard } from "../components/PathCard";
import { RecordList } from "../components/RecordCard";
import { useApp, useT } from "../lib/app";
import { GuardedGraph } from "../lib/discover";
import type { Tie } from "../lib/types";

type Tab = "paths" | "connect" | "epics" | "lines";
const TABS: { key: Tab; en: string; ta: string }[] = [
  { key: "paths", en: "Unexpected paths", ta: "எதிர்பாராத தொடர்புகள்" }, { key: "connect", en: "Connect any two", ta: "இரண்டை இணை" },
  { key: "epics", en: "Between the epics", ta: "இரு காப்பியங்கள்" }, { key: "lines", en: "Shared lines", ta: "பொது வரிகள்" },
];
const TIE_NAMES: Record<Tie["cls"], [string, string, string, string]> = {
  identity: ["Same individual", "அதே நபர்", "One person or thing, in both poems.", "இரு நூல்களிலும் ஒரே நபர் அல்லது பொருள்."],
  continuation: ["Story carried on", "தொடரும் கதை", "One poem takes up a thread of the other.", "ஒரு நூல் மற்றதன் இழையைத் தொடர்கிறது."],
  motif: ["Recurring motif", "மீண்டும் வரும் கூறு", "Same kind of thing, each occurrence its own.", "ஒரே வகை; ஒவ்வொரு நிகழ்வும் தனி."],
  comparable: ["Comparable, and separate", "ஒப்புமை, ஆனால் தனி", "Two events shaped alike. Nothing passes between them.", "ஒத்த அமைப்பு; இடையே எதுவும் கடக்கவில்லை."],
};
const END_KINDS: [string, string, string][] = [["all", "Everything", "அனைத்தும்"], ["Food", "Food", "உணவு"], ["Material", "Materials", "பொருட்கள்"], ["Object", "Objects", "பொருள்கள்"], ["Group", "Groups", "குழுக்கள்"], ["Place", "Places", "இடங்கள்"]];

// Places to begin, picked by hand from reading. The search underneath still has to find the route for each one.
const STARTERS: [string, string][] = [["cowherd_women", "hill_people_25"], ["hill_people_25", "saduvan"], ["magadha_king", "magadha_workers"], ["blanket_merchant", "manimekalai"], ["aticari", "aputhiran"], ["skilled_woman_16", "manimekalai"], ["kosikan", "manimekalai"], ["mayan", "tamil_workers"], ["drummer_man01", "kovalan"], ["visakai", "manimekalai"]];

function PathsTab() {
  const { corpus, lang } = useApp();
  const t = useT();
  const starters = useMemo(() => { const g = new GuardedGraph(corpus); return STARTERS.map(([a, b]) => g.search(a, b)).filter((x) => !!x); }, [corpus]);
  const [kind, setKind] = useState("all");
  const [crossOnly, setCrossOnly] = useState(true);
  const [shown, setShown] = useState(12);
  const list = corpus.discoveries.filter((d) => (kind === "all" || d.kinds.includes(kind)) && (!crossOnly || d.epics.length > 1));
  return (
    <div className="split">
      <div>
        <h2 style={{ marginBottom: 14 }}>{t("Good places to start", "தொடங்க நல்ல இடங்கள்")}</h2>
        {starters.map((x) => <PathCard key={x.steps[0].from + x.steps[x.steps.length - 1].to} steps={x.steps} />)}
        <h2 style={{ margin: "44px 0 14px" }}>{t("What the program ranked highest", "நிரல் உயர்வாக வரிசைப்படுத்தியவை")}</h2>
        <div className="song-tools__row" style={{ marginBottom: 20 }}>
          <div className="segmented" role="group" aria-label={t("Involving", "தொடர்புடையவை")} style={{ margin: 0 }}>{END_KINDS.map(([k, en, ta]) => <button key={k} aria-pressed={kind === k} onClick={() => { setKind(k); setShown(12); }}>{lang === "ta" ? ta : en}</button>)}</div>
          <label className="check" style={{ margin: 0 }}><input type="checkbox" checked={crossOnly} onChange={(e) => setCrossOnly(e.target.checked)} />{t("Crosses both epics", "இரு காப்பியங்களையும் கடப்பவை")}</label>
        </div>
        {list.slice(0, shown).map((d) => <PathCard key={d.a + d.b} steps={d.steps} />)}
        {!list.length && <p className="empty">{t("No path of this type in the shortlist. Try Connect any two.", "இந்த வகையில் இல்லை. 'இரண்டை இணை' பாருங்கள்.")}</p>}
        {shown < list.length && <button className="pill" onClick={() => setShown(shown + 15)}>{t("Show more", "மேலும்")}</button>}
      </div>
      <aside className="guide">
        <h3>{t("How to read these", "இவற்றைப் படிப்பது எப்படி")}</h3>
        <ul>
          <li>{t("Found by the program, not written by hand. Open one to read its verses.", "நிரல் கண்டறிந்தவை. திறந்தால் பாடல் வரிகள் தெரியும்.")}</li>
          <li>{t("Each label between two names says what kind of link it is. Dashed amber ones are cautions, explained in the key below.", "இரு பெயர்களுக்கு இடையிலான குறி இணைப்பின் வகையைக் கூறும். புள்ளிக்கோட்டு மஞ்சள் குறிகள் எச்சரிக்கைகள்.")}</li>
          <li>{t("A path says these things connect. It isn't a claim that the poets meant anything by it.", "இவை இணைகின்றன என்பதே பொருள். புலவர் கருதியது என்பதல்ல.")}</li>
          <li>{t("The order is a rough guess at what's unusual, and no reader has rated it yet.", "வரிசை ஒரு தோராய மதிப்பீடு; வாசகர் மதிப்பிடவில்லை.")}</li>
        </ul>
        <LinkKey />
      </aside>
    </div>
  );
}

function ConnectTab() {
  const { corpus, lang } = useApp();
  const t = useT();
  const graph = useMemo(() => new GuardedGraph(corpus), [corpus]);
  const options = useMemo(() => corpus.graph.nodes.filter((n) => graph.adj.has(n.id) && n.cls !== "Other").sort((a, b) => a[lang].localeCompare(b[lang])), [corpus, graph, lang]);
  const [a, setA] = useState("cowherd_women");
  const [b, setB] = useState("hill_people_25");
  const [said, setSaid] = useState(false);
  const [weak, setWeak] = useState(true);
  const [places, setPlaces] = useState(true);
  const [avoid, setAvoid] = useState("");
  const found = useMemo(() => (a === b ? null : graph.search(a, b, { said, weak, places, banned: avoid ? [avoid] : [] })), [graph, a, b, said, weak, places, avoid]);
  return (
    <section className="find-path">
      <h2>{t("Connect any two", "எவையேனும் இரண்டை இணை")}</h2>
      <div style={{ marginTop: 18 }}><LinkKey /></div>
      <div className="find-path__row">
        <label className="field"><span>{t("From", "இருந்து")}</span><select value={a} onChange={(e) => setA(e.target.value)}>{options.map((n) => <option key={n.id} value={n.id}>{n[lang]}</option>)}</select></label>
        <span aria-hidden="true">↔</span>
        <label className="field"><span>{t("To", "வரை")}</span><select value={b} onChange={(e) => setB(e.target.value)}>{options.map((n) => <option key={n.id} value={n.id}>{n[lang]}</option>)}</select></label>
      </div>
      <div className="chips">
        <label className="check"><input type="checkbox" checked={weak} onChange={(e) => setWeak(e.target.checked)} />{t("Allow 'same kind of thing'", "'ஒரே வகை' அனுமதி")}</label>
        <label className="check"><input type="checkbox" checked={places} onChange={(e) => setPlaces(e.target.checked)} />{t("Allow 'same place'", "'ஒரே இடம்' அனுமதி")}</label>
        <label className="check"><input type="checkbox" checked={said} onChange={(e) => setSaid(e.target.checked)} />{t("Include things only said", "கூற்றுகளையும் சேர்")}</label>
      </div>
      <label className="field" style={{ maxWidth: 340, margin: "20px 0" }}><span>{t("Find a way around", "இதைத் தவிர்த்து")}</span>
        <select value={avoid} onChange={(e) => setAvoid(e.target.value)}><option value="">{t("Nobody", "யாரையும் இல்லை")}</option>{options.filter((n) => n.id !== a && n.id !== b).map((n) => <option key={n.id} value={n.id}>{n[lang]}</option>)}</select>
      </label>
      {a === b ? <p className="fine">{t("Pick two different ones.", "இரண்டு வெவ்வேறானவற்றைத் தேர்ந்தெடுங்கள்.")}</p>
        : found ? <><p className="find-path__sum">{t(`${found.steps.length} step${found.steps.length > 1 ? "s" : ""}.`, `${found.steps.length} படிகள்.`)}</p><PathCard key={a + b + said + weak + places + avoid} steps={found.steps} startOpen /></>
        : <p className="fine">{t("No path under these rules. Loosen them, or it may just not be recorded yet: this is a pilot.", "இந்த விதிகளில் தொடர்பு இல்லை. விதிகளைத் தளர்த்துங்கள், அல்லது இன்னும் பதியப்படாமல் இருக்கலாம்.")}</p>}
    </section>
  );
}

function EpicsTab() {
  const { corpus, lang } = useApp();
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  const bridgePeople = corpus.graph.nodes.filter((n) => n.epics.length > 1 && n.cls !== "Other");
  const pick = (p: [string, string]) => (lang === "ta" ? p[1] : p[0]);
  return (
    <>
      {(["identity", "continuation", "motif", "comparable"] as const).map((cls) => {
        const ties = corpus.ties.filter((x) => x.cls === cls);
        const label = TIE_NAMES[cls];
        return (
          <section key={cls}>
            <h2>{lang === "ta" ? label[1] : label[0]}</h2>
            <p className="fine" style={{ margin: "-10px 0 18px" }}>{lang === "ta" ? label[3] : label[2]}</p>
            <div className="tie__grid">
              {ties.map((x) => (
                <article key={x.id} className="tie">
                  <h3>{lang === "ta" ? x.ta : x.en}</h3>
                  <p className="tie__text">{pick(x.text)}</p>
                  <p className="tie__no"><b>{t("Doesn't mean: ", "இதன் பொருள் அல்ல: ")}</b>{pick(x.not_this)}</p>
                  <button className="go" onClick={() => setOpen(open === x.id ? null : x.id)} aria-expanded={open === x.id}>{open === x.id ? t("Hide verses", "மறை") : t("Read the verses", "வரிகளைப் படிக்க")}</button>
                  {open === x.id && <div style={{ marginTop: 16 }}><RecordList ids={x.recs} compact /></div>}
                </article>
              ))}
            </div>
          </section>
        );
      })}
      <section>
        <h2>{t("Who's in both", "இரண்டிலும் வருபவை")} <span className="count-badge">{bridgePeople.length}</span></h2>
        <div className="chips">{bridgePeople.map((n) => <a key={n.id} className="chip" href={`#/graph?focus=${n.id}`}>{n[lang]}</a>)}</div>
      </section>
    </>
  );
}

function LinesTab() {
  const { corpus } = useApp();
  const t = useT();
  const [shown, setShown] = useState(20);
  return (
    <section>
      <h2>{t("Lines the two poems share", "இரு நூல்களுக்கும் பொதுவான வரிகள்")} <span className="count-badge">{corpus.echoes.lines.length}</span></h2>
      <p className="fine">{t("Found by comparing letter patterns across all 10,209 lines, with nothing telling it what to look for. Shared wording doesn't prove one poet borrowed from the other, it could be common stock. Near the bottom of the list, some are just ordinary phrasing.", "10,209 வரிகளிலும் எழுத்து அமைப்புகளை ஒப்பிட்டுக் கண்டறிந்தவை. பொதுச் சொற்கள் ஒருவர் மற்றவரிடம் கடன் பெற்றதை நிரூபிக்காது; பட்டியலின் கீழே சில வெறும் பொதுத் தொடர்கள்.")}</p>
      <div className="echo-table" lang="ta">
        {corpus.echoes.lines.slice(0, shown).map((e) => (
          <div key={e.a + e.b} className="echo-row">
            <a href={`#/songs/${e.a.slice(0, 6)}?line=${e.a}`}>{e.ta}<span className="verse__id">{e.a}</span></a>
            <a href={`#/songs/${e.b.slice(0, 6)}?line=${e.b}`}>{e.tb}<span className="verse__id">{e.b}</span></a>
          </div>
        ))}
      </div>
      {shown < corpus.echoes.lines.length && <button className="pill" onClick={() => setShown(shown + 40)}>{t("Show more", "மேலும்")}</button>}
    </section>
  );
}

export function DiscoverPage({ params }: { params: URLSearchParams }) {
  const { lang } = useApp();
  const t = useT();
  const start = (params.get("tab") as Tab) || "paths";
  const [tab, setTab] = useState<Tab>(TABS.some((x) => x.key === start) ? start : "paths");
  return (
    <div>
      <header className="section-head">
        <h1>{t("Discover", "கண்டறி")}</h1>
        <p>{t("Connections nobody asked for: a cowherd, a shipwreck, a king's gift. Every step shows its verse and says what kind of link it is, so a shared mango never turns into a trade route.", "யாரும் கேட்காத தொடர்புகள்: ஓர் ஆய்ச்சி, ஒரு கப்பல் விபத்து, ஓர் அரசன் பரிசு. ஒவ்வொரு படிக்கும் பாடல் வரி உண்டு; இணைப்பின் வகையும் கூறப்படும்.")}</p>
      </header>
      <div className="band" role="tablist">{TABS.map((x) => <button key={x.key} role="tab" aria-selected={tab === x.key} onClick={() => setTab(x.key)}>{lang === "ta" ? x.ta : x.en}</button>)}</div>
      {tab === "paths" && <PathsTab />}
      {tab === "connect" && <ConnectTab />}
      {tab === "epics" && <EpicsTab />}
      {tab === "lines" && <LinesTab />}
    </div>
  );
}
