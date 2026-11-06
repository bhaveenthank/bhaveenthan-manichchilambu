import { useMemo, useState } from "react";
import { go, useApp, useName, useT } from "../lib/app";
import type { Canto } from "../lib/types";
import { CoverageBar } from "./Home";

export const THEMES: Record<string, [string, string]> = {
  love_home: ["Love and home", "காதலும் இல்லறமும்"], art_festival: ["Dance, song and festival", "ஆடல், பாடல், விழா"], city: ["The city", "நகரம்"], dream_omen: ["Dreams and omens", "கனவும் நிமித்தமும்"],
  journey: ["Journeys", "பயணம்"], justice: ["Justice and the king", "நீதியும் அரசும்"], identity_deceit: ["Deceit and false identity", "வஞ்சமும் மாறுவேடமும்"], grief_fire: ["Grief and fire", "துயரும் தீயும்"],
  karma_rebirth: ["Karma and rebirth", "ஊழும் மறுபிறப்பும்"], goddess_worship: ["Gods and worship", "தெய்வமும் வழிபாடும்"], kingship_war: ["Kings and war", "அரசும் போரும்"], charity_hunger: ["Hunger and charity", "பசியும் அறமும்"], doctrine: ["Teaching and doctrine", "அறவுரையும் சமயமும்"], frame: ["Prologues and closings", "பதிகமும் கட்டுரையும்"],
};
const EVENTS: Record<string, [string, string]> = {
  give: ["Giving", "கொடுத்தல்"], take_receive: ["Taking and receiving", "பெறுதல்"], speak: ["Speech", "உரையாடல்"], move: ["Going and coming", "செல்லுதல்"], kill_harm: ["Killing and harm", "கொலை"], see: ["Seeing", "காணுதல்"], feed: ["Feeding", "உணவளித்தல்"], worship: ["Worship", "வழிபாடு"], die: ["Death", "இறப்பு"], dream_curse: ["Dreams and curses", "கனவும் சாபமும்"],
};

type GroupKey = "book" | "form" | "theme" | "setting" | "person" | "happens" | "length" | "metre" | "echo";
const VIEWS: { key: GroupKey; en: string; ta: string; why: [string, string] }[] = [
  { key: "book", en: "Book", ta: "நூல்", why: ["The poets' own order.", "புலவர்களின் வரிசை."] },
  { key: "theme", en: "Theme", ta: "பொருள்", why: ["Draft tags, from the titles and the parts read closely.", "தலைப்புகளிலிருந்தும் படித்த பகுதிகளிலிருந்தும் எடுத்த வரைவுக் குறிச்சொற்கள்."] },
  { key: "form", en: "Form", ta: "வடிவம்", why: ["What kind of composition it calls itself in its title.", "தலைப்பில் தன்னை எவ்வகையாகக் கூறுகிறது."] },
  { key: "setting", en: "Place", ta: "இடம்", why: ["Where it mainly takes place. Draft.", "பெரும்பாலும் எங்கு நிகழ்கிறது. வரைவு."] },
  { key: "person", en: "Person", ta: "நபர்", why: ["Songs that name this person, by name or known title.", "இவரைப் பெயராலோ பட்டத்தாலோ குறிப்பிடும் பாடல்கள்."] },
  { key: "happens", en: "What happens", ta: "நிகழ்வது", why: ["Rough, from verb stems. Good for browsing, not for counting.", "வினை அடிகளிலிருந்து தோராயமாக. பார்வைக்கு மட்டும்."] },
  { key: "echo", en: "Shared lines", ta: "பொதுவரிகள்", why: ["Songs sharing near-identical lines with the other epic.", "மற்றக் காப்பியத்துடன் ஏறக்குறைய ஒரே வரிகளைக் கொண்டவை."] },
  { key: "length", en: "Length", ta: "நீளம்", why: ["For when you have ten minutes, or an evening.", "பத்து நிமிடமோ ஒரு மாலையோ இருந்தால்."] },
  { key: "metre", en: "Metre", ta: "பாவகை", why: ["Only as labelled in this edition, mostly the first book.", "இப்பதிப்பில் குறித்துள்ளபடி மட்டும்; பெரும்பாலும் முதல் காண்டம்."] },
];
const BOOK_NAMES: Record<string, [string, string]> = { "SIL-புகார்": ["Silappatikāram · Book of Pukār", "சிலப்பதிகாரம் · புகார்க் காண்டம்"], "SIL-மதுரை": ["Silappatikāram · Book of Madurai", "சிலப்பதிகாரம் · மதுரைக் காண்டம்"], "SIL-வஞ்சி": ["Silappatikāram · Book of Vañci", "சிலப்பதிகாரம் · வஞ்சிக் காண்டம்"], "MAN-": ["Maṇimēkalai", "மணிமேகலை"] };

function keysFor(c: Canto, view: GroupKey): string[] {
  switch (view) {
    case "book": return [`${c.epic}-${c.kandam}`];
    case "form": return [c.form];
    case "theme": return c.themes;
    case "setting": return c.setting.length ? c.setting : ["Not one place"];
    case "person": return c.people;
    case "happens": return Object.keys(c.events).length ? Object.keys(c.events) : ["none"];
    case "length": return [c.length];
    case "metre": return c.metres.length ? c.metres : ["Not labelled in this edition"];
    case "echo": return [c.echo >= 5 ? "Five or more shared lines" : c.echo >= 1 ? "One to four shared lines" : "None found"];
  }
}

export function SongsPage({ params }: { params: URLSearchParams }) {
  const { corpus, lang } = useApp();
  const t = useT();
  const name = useName();
  const view = (params.get("by") as GroupKey) || "book";
  const [epic, setEpic] = useState<"both" | "SIL" | "MAN">("both");
  const [text, setText] = useState("");
  const current = VIEWS.find((v) => v.key === view) ?? VIEWS[0];
  const groups = useMemo(() => {
    const q = text.trim().toLowerCase();
    const map = new Map<string, Canto[]>();
    corpus.cantos.filter((c) => (epic === "both" || c.epic === epic) && (!q || c.title.includes(text.trim()) || c.en.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)))
      .forEach((c) => keysFor(c, view).forEach((k) => (map.get(k) ?? map.set(k, []).get(k)!).push(c)));
    const entries = [...map.entries()];
    if (["person", "theme", "happens", "setting"].includes(view)) entries.sort((a, b) => b[1].length - a[1].length);
    if (view === "length") entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }, [corpus, epic, text, view]);
  const groupName = (k: string) => {
    if (view === "book") return (lang === "ta" ? BOOK_NAMES[k]?.[1] : BOOK_NAMES[k]?.[0]) ?? k;
    if (view === "theme") return THEMES[k]?.[lang === "ta" ? 1 : 0] ?? k;
    if (view === "person") return name(k);
    if (view === "happens") return EVENTS[k]?.[lang === "ta" ? 1 : 0] ?? t("No verb cue found", "வினைக் குறிப்பு இல்லை");
    return k;
  };
  return (
    <div>
      <header className="section-head"><h1>{t("The songs", "பாடல்கள்")}</h1><p>{t("All 64 cantos of both epics. Choose how to arrange them.", "இரு காப்பியங்களின் 64 காதைகளும். எப்படி அடுக்குவது என்று தேர்ந்தெடுங்கள்.")}</p></header>
      <div className="song-tools">
        <div className="band" style={{ marginBottom: 18 }} role="tablist" aria-label={t("Arrange by", "அடுக்கும் முறை")}>
          {VIEWS.map((v) => <button key={v.key} role="tab" aria-selected={view === v.key} onClick={() => go(`/songs?by=${v.key}`)}>{lang === "ta" ? v.ta : v.en}</button>)}
        </div>
        <div className="song-tools__row">
          <div className="segmented" role="group" aria-label={t("Epic", "காப்பியம்")}>{([["both", "Both", "இரண்டும்"], ["SIL", "Silappatikāram", "சிலம்பு"], ["MAN", "Maṇimēkalai", "மணிமேகலை"]] as const).map(([v, en, ta]) => <button key={v} aria-pressed={epic === v} onClick={() => setEpic(v)}>{lang === "ta" ? ta : en}</button>)}</div>
          <input className="filter-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Filter by title", "தலைப்பால் வடிகட்டு")} aria-label={t("Filter by title", "தலைப்பால் வடிகட்டு")} />
          <a className="go" href="#/words?tab=search">{t("Search every line", "எல்லா வரிகளிலும் தேடு")}</a>
        </div>
        <p className="fine">{lang === "ta" ? current.why[1] : current.why[0]}</p>
        <p className="coverage-key" style={{ marginTop: 10 }}><span><i style={{ background: "var(--copper)" }} />{t("lines the graph's records cite", "வரைபடப் பதிவுகள் சுட்டும் வரிகள்")}</span><span><i style={{ background: "var(--link-soft)" }} />{t("plus unchecked machine drafts", "சரிபார்க்காத இயந்திர வரைவுகளும்")}</span></p>
      </div>
      {groups.map(([k, items]) => (
        <section key={k} className="song-group">
          <h2>{groupName(k)} <span className="count-badge">{items.length}</span></h2>
          <ol className="song-list">
            {items.map((c) => (
              <li key={c.key}><a href={`#/songs/${c.key}`}>
                <span className="song__title" lang="ta">{c.title}</span>
                <span className="song__en">{c.en}</span>
                <span className="song__meta">{c.key} · {c.lines} {t("lines", "வரிகள்")}{c.records.length ? ` · ${c.records.length} ${t("records", "பதிவுகள்")}` : ""}{c.echo ? ` · ${c.echo} ${t("shared", "பொது")}` : ""}</span>
                <CoverageBar lines={c.lines} cited={c.cited} drafted={c.drafted} />
                <span className="coverage__text">{t(`${Math.round((c.cited / c.lines) * 100)}% of lines in the graph · ${Math.round((c.drafted / c.lines) * 100)}% with drafts`, `${Math.round((c.cited / c.lines) * 100)}% வரிகள் வரைபடத்தில் · ${Math.round((c.drafted / c.lines) * 100)}% வரைவுகளுடன்`)}</span>
              </a></li>
            ))}
          </ol>
        </section>
      ))}
      {!groups.length && <p className="empty">{t("No songs match.", "பொருந்தும் பாடல்கள் இல்லை.")}</p>}
    </div>
  );
}
