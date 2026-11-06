import { Command } from "cmdk";
import { ChevronDown, Compass, Contrast, Languages, Network, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppContext, go, useRoute } from "./lib/app";
import { loadCorpus } from "./lib/data";
import { EntityIcon } from "./components/Marks";
import { CONTACT_EMAIL, isMac } from "./lib/site";
import type { Corpus, Lang } from "./lib/types";
import { AboutPage } from "./pages/About";
import { AskPage } from "./pages/Ask";
import { CantoPage } from "./pages/Canto";
import { DiscoverPage } from "./pages/Discover";
import { GraphPage } from "./pages/GraphPage";
import { HomePage } from "./pages/Home";
import { SongsPage } from "./pages/Songs";
import { TracePage } from "./pages/Trace";
import { WordsPage } from "./pages/Words";

// Ask, Trace and Songs carry the story, so they're one click away. The rest sit under Explore.
const NAV = [
  { path: "", en: "Home", ta: "முகப்பு" }, { path: "ask", en: "Ask", ta: "கேள்" }, { path: "trace", en: "Trace", ta: "தடம்" }, { path: "songs", en: "Songs", ta: "பாடல்கள்" },
];
const EXPLORE = [
  { path: "discover", icon: Compass, en: "Discover", ta: "கண்டறி", note: ["Unexpected paths between the epics", "இரு காப்பியங்களுக்கு இடையிலான தொடர்புகள்"] },
  { path: "graph", icon: Network, en: "Graph", ta: "வரைபடம்", note: ["Everyone and everything, filtered", "அனைவரும் அனைத்தும், வடிகட்டலுடன்"] },
  { path: "words", icon: Languages, en: "Words", ta: "சொற்கள்", note: ["Names, words with two senses, line search", "பெயர்கள், இருபொருள் சொற்கள், வரித் தேடல்"] },
];

function ExploreMenu({ current, lang }: { current: string; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [spot, setSpot] = useState({ left: 0, top: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const here = EXPLORE.some((e) => e.path === current);
  useEffect(() => setOpen(false), [current]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === "Escape" : !(e.target as HTMLElement).closest(".nav-menu, .nav-group")) setOpen(false); };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", close); };
  }, [open]);
  const toggle = () => {
    // The nav strip scrolls sideways on small screens, so the menu hangs from the header bar, lined up with the button.
    const r = btn.current?.getBoundingClientRect();
    const bar = btn.current?.closest(".top")?.getBoundingClientRect();
    if (r && bar) setSpot({ left: Math.max(12, Math.min(r.left - 12, window.innerWidth - 312)), top: Math.min(bar.bottom, r.bottom + 6) });
    setOpen(!open);
  };
  return (
    <>
      <span className="nav-group"><button ref={btn} onClick={toggle} aria-expanded={open} aria-haspopup="true" aria-current={here ? "page" : undefined}>{lang === "ta" ? "ஆராய்க" : "Explore"}<ChevronDown size={16} aria-hidden="true" /></button></span>
      {/* Outside the nav, which scrolls and fades on phones and would clip it. */}
      {open && createPortal(
        <div className="nav-menu" role="menu" style={spot}>
          {EXPLORE.map((e) => <a key={e.path} role="menuitem" href={`#/${e.path}`} aria-current={current === e.path ? "page" : undefined}><e.icon size={18} aria-hidden="true" /><span><b>{lang === "ta" ? e.ta : e.en}</b><span>{lang === "ta" ? e.note[1] : e.note[0]}</span></span></a>)}
        </div>, document.body)}
    </>
  );
}
// Links people may already have from the first version of the site.
const OLD_ROUTES: Record<string, string> = { bridges: "discover", things: "trace" };

function Palette({ corpus, lang, open, setOpen }: { corpus: Corpus; lang: Lang; open: boolean; setOpen: (v: boolean) => void }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(!open); } };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open, setOpen]);
  const pick = (path: string) => { setOpen(false); setText(""); go(path); };
  const tamil = /[஀-௿]/.test(text);
  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label={lang === "ta" ? "தேடு" : "Search"} className="palette" overlayClassName="palette__overlay" contentClassName="palette__content">
      <div className="palette__bar"><Search size={18} aria-hidden="true" /><Command.Input value={text} onValueChange={setText} placeholder={lang === "ta" ? "ஒருவர், பாடல் அல்லது கேள்வி..." : "A person, a song, a food, or a question..."} className="palette__input" /><kbd>Esc</kbd></div>
      <Command.List className="palette__list">
        <Command.Empty>{lang === "ta" ? "ஒன்றும் கிடைக்கவில்லை" : "Nothing found"}</Command.Empty>
        {text.length > 2 && (
          <Command.Group heading={lang === "ta" ? "கேள்வி" : "Ask or search"}>
            <Command.Item value={`ask ${text}`} onSelect={() => pick(`/ask?q=${encodeURIComponent(text)}`)}>{lang === "ta" ? "கேள்:" : "Ask:"} “{text}”</Command.Item>
            {tamil && <Command.Item value={`verse ${text}`} onSelect={() => pick(`/words?q=${encodeURIComponent(text)}`)}>{lang === "ta" ? "வரிகளில் தேடு:" : "Search lines:"} “{text}”</Command.Item>}
          </Command.Group>
        )}
        <Command.Group heading={lang === "ta" ? "நபர்கள், இடங்கள், பொருள்கள்" : "People, places, things"}>
          {corpus.graph.nodes.filter((n) => n.cls !== "Other").map((n) => <Command.Item key={n.id} value={`${n.en} ${n.ta} ${n.also.join(" ")}`} onSelect={() => pick(`/graph?focus=${n.id}`)}><EntityIcon cls={n.cls} id={n.id} kind={n.kind} /><span>{n[lang]}</span><span className="palette__hint" lang={lang === "ta" ? "en" : "ta"}>{lang === "ta" ? n.en : n.ta}</span></Command.Item>)}
        </Command.Group>
        <Command.Group heading={lang === "ta" ? "பாடல்கள்" : "Songs"}>
          {corpus.cantos.map((c) => <Command.Item key={c.key} value={`${c.key} ${c.title} ${c.en}`} onSelect={() => pick(`/songs/${c.key}`)}><span lang={lang === "ta" ? "ta" : "en"}>{lang === "ta" ? c.title : c.en}</span><span className="palette__hint mono">{c.key}</span></Command.Item>)}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

function savedTheme(): "light" | "dark" | null {
  try { const v = localStorage.getItem("theme"); return v === "light" || v === "dark" ? v : null; } catch { return null; }
}

export function App() {
  const [corpus, setCorpus] = useState<Corpus | null>(null);
  const [failed, setFailed] = useState(false);
  const [lang, setLangState] = useState<Lang>(() => { try { return (localStorage.getItem("lang") as Lang) || "en"; } catch { return "en"; } });
  // Paper is the default look. Dark is a click away, and the choice sticks.
  const [dark, setDark] = useState(() => savedTheme() === "dark");
  const [palette, setPalette] = useState(false);
  const route = useRoute();
  useEffect(() => { loadCorpus().then(setCorpus).catch(() => setFailed(true)); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tab = (e.target as HTMLElement).closest?.('[role="tab"]');
      if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      const tabs = [...(tab.closest('[role="tablist"]')?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])];
      const at = tabs.indexOf(tab as HTMLElement);
      const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (at + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      e.preventDefault();
      tabs[next]?.focus();
      tabs[next]?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem("lang", l); } catch { /* private window, it just won't be remembered */ } };
  const toggleTheme = () => setDark((d) => { const next = !d; try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* same */ } return next; });
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  const value = useMemo(() => (corpus ? { corpus, lang, setLang, go, dark, toggleTheme } : null), [corpus, lang, dark]);

  if (failed) return <main className="page"><p>The data files didn't load. If you opened this from disk, run <code>npm run dev</code> instead.</p></main>;
  if (!value || !corpus) return <main className="splash" aria-busy="true"><p className="splash__name">Maṇichchilambu</p><span className="splash__bar" /><p className="fine">Loading the two epics · இரு காப்பியங்களை ஏற்றுகிறது</p></main>;

  const [rawSection, sub] = route.parts;
  const current = OLD_ROUTES[rawSection ?? ""] ?? rawSection ?? "";
  const page = current === "ask" ? <AskPage question={route.params.get("q") ?? ""} />
    : current === "graph" ? <GraphPage params={route.params} />
    : current === "songs" ? (sub ? <CantoPage key={sub} cantoKey={sub} line={route.params.get("line")} /> : <SongsPage params={route.params} />)
    : current === "discover" ? <DiscoverPage params={route.params} />
    : current === "trace" ? <TracePage />
    : current === "words" ? <WordsPage key={route.params.get("q") ?? ""} params={route.params} />
    : current === "about" ? <AboutPage />
    : <HomePage />;

  return (
    <AppContext.Provider value={value}>
      <header className="top"><div className="top__row">
        <a href="#/" className="brand"><span className="brand__en" lang="en">Maṇichchilambu</span><span className="brand__ta" lang="ta">மணிச்சிலம்பு</span></a>
        <nav aria-label="Main">
          {NAV.map((n) => <a key={n.path} href={`#/${n.path}`} aria-current={current === n.path ? "page" : undefined}>{lang === "ta" ? n.ta : n.en}</a>)}
          <ExploreMenu current={current} lang={lang} />
          <a href="#/about" aria-current={current === "about" ? "page" : undefined}>{lang === "ta" ? "பற்றி" : "About"}</a>
        </nav>
        <div className="top__tools">
          <button className="tool-btn" onClick={() => setPalette(true)} aria-label={lang === "ta" ? "தேடு" : "Search"}><Search size={16} aria-hidden="true" /><span className="tool-btn__label">{lang === "ta" ? "தேடு" : "Search"}</span><kbd>{isMac ? "⌘K" : "Ctrl K"}</kbd></button>
          <div className="lang-toggle" role="group" aria-label="Language · மொழி">
            <button onClick={() => setLang("en")} aria-pressed={lang === "en"} lang="en">EN</button>
            <button onClick={() => setLang("ta")} aria-pressed={lang === "ta"} lang="ta" aria-label="தமிழ்">த</button>
          </div>
          <button className="tool-btn tool-btn--icon" onClick={toggleTheme} aria-label={dark ? "Use the light theme" : "Use the dark theme"} title={dark ? "Use the light theme" : "Use the dark theme"}><Contrast size={18} aria-hidden="true" /></button>
        </div>
      </div></header>
      <main key={current + (sub ?? "")} className={current === "graph" ? "page page--full" : "page"}>{page}</main>
      <Palette corpus={corpus} lang={lang} open={palette} setOpen={setPalette} />
      {current !== "graph" && (
        <footer className="foot"><div className="foot__row">
          <p>{lang === "ta" ? "தமிழ் உரை: மதுரைத் திட்டம் (Project Madurai). வரைபடப் பதிவுகள் வரைவு நிலையில் உள்ளன; அறிஞர் சரிபார்ப்பு நடைபெறவில்லை." : "Tamil text from Project Madurai. Graph records are drafts and haven't been checked by a scholar yet."} <a href="#/about">{lang === "ta" ? "மேலும்" : "More"}</a></p>
          <p className="contact">{lang === "ta" ? "திருத்தங்களும் கருத்துகளும்:" : "Corrections and comments:"} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </div></footer>
      )}
    </AppContext.Provider>
  );
}
