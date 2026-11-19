import * as Slider from "@radix-ui/react-slider";
import { Clock, Download, Eye, Layers, List, Network, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GraphCanvas } from "../components/GraphCanvas";
import { EpicMark, EntityIcon, LineSample, MoodTag } from "../components/Marks";
import { NodePicker } from "../components/NodePicker";
import { RecordCard, RecordList } from "../components/RecordCard";
import { go, useApp, useName, useT } from "../lib/app";
import { CLASSES, defaultFilter, recordMentions, subgraph, type GraphFilter } from "../lib/model";

const EPISODES: [string, string, string][] = [
  ["anklet", "The anklets", "சிலம்புகள்"], ["curse", "Neeli's curse", "நீலியின் சாபம்"], ["fire", "Madurai burns", "மதுரை எரிதல்"], ["disguise", "The disguise", "மாறுவேடம்"], ["bowl", "The bowl", "அமுதசுரபி"],
  ["rahulan", "Rahulan and Lakshmi", "இராகுலன், இலக்குமி"], ["aputhiran", "Aputhiran reborn", "ஆபுத்திரன்"], ["prison", "Prison to charity", "அறக்கோட்டம்"], ["bridge", "Family and worship", "குடும்பமும் வழிபாடும்"], ["retelling", "Retold in Manimekalai", "மறுகூற்று"],
  ["image", "The stone and the image", "கல்லும் படிமமும்"], ["dream", "Dreams", "கனவுகள்"], ["entrust", "The entrusting", "அடைக்கலம்"], ["song", "The misread song", "கானல் வரி"], ["risen", "Kovalan rises", "கோவலன் எழுதல்"], ["transport", "Carried to Manipallavam", "மணிபல்லவம்"],
  ["ascetic", "The ascetic form", "மாதவன் வடிவு"], ["madhavi", "Madhavi's words", "மாதவியின் சொற்கள்"], ["doctrine", "Doctrine", "சமயக் கொள்கை"], ["worship", "The hill folk", "குன்றவர்"], ["garland", "The garland", "மாலை"], ["plain", "Plain events", "எளிய நிகழ்ச்சிகள்"],
  ["meal", "Kannagi's meal", "கண்ணகியின் உணவு"], ["craft", "The goldsmith's craft", "பொற்கொல்லன் தொழில்"], ["jewels", "Madhavi's jewels", "மாதவியின் அணிகள்"], ["gifts", "Gifts at Puhar", "புகார்ப் பரிசுகள்"], ["pavilion", "The gold pavilion", "பொன் மண்டபம்"],
  ["festival", "The festival drum", "விழா முரசு"], ["tribute", "The hill people's gifts", "மலைமக்கள் காணிக்கை"], ["wreck", "Saduvan's wreck", "சாதுவன்"], ["child", "Pilivalai's child", "பீலிவளையின் குழந்தை"], ["cameo", "Cameos", "சிறு பாத்திரங்கள்"],
  ["home", "Setting up house", "இல்லறம்"], ["letter", "The refused letter", "மறுத்த முடங்கல்"], ["journey", "The road to Madurai", "மதுரை வழி"], ["city", "Cities by trade", "நகர வணிகம்"], ["omen", "Omens among the cowherds", "ஆயர் நிமித்தங்கள்"], ["blessing", "What became of everyone", "வாழ்த்து"], ["grove", "The flower grove", "மலர்வனம்"], ["island", "Alone on the island", "மணிபல்லவம்"], ["teaching", "Aravanan's teaching", "அறவணர் போதனை"], ["famine", "Famine at Kanchi", "காஞ்சிப் பஞ்சம்"], ["frame", "Closing frames", "நூல் முடிவு"],
];
const LAYERS: [GraphFilter["layer"], string, string, string, string][] = [
  ["all", "All layers", "அனைத்தும்", "Everything that fits the other filters.", "பிற வடிகட்டிகளுக்குப் பொருந்தும் அனைத்தும்."],
  ["event", "Events", "நிகழ்ச்சிகள்", "Who did what with whom.", "யார் யாருடன் என்ன செய்தார்."],
  ["material", "Material", "பொருள் மூலம்", "Suppliers, makers, food, jewels and movement.", "தருபவர், செய்பவர், உணவு, அணி, இடமாற்றம்."],
  ["belief", "Belief", "நம்பிக்கை", "Claims and who believed them. Turn on 'also what was said' for the claims.", "கூற்றுகளும் நம்பியவர்களும். 'கூற்றுகளும்' என்பதை இயக்குங்கள்."],
  ["cause", "Cause", "காரணம்", "Records where the text gives a reason.", "நூல் காரணம் கூறும் பதிவுகள்."],
];
const CLASS_NAMES: Record<string, [string, string]> = { Person: ["People", "நபர்கள்"], Deity: ["Deities", "தெய்வங்கள்"], Place: ["Places", "இடங்கள்"], Object: ["Objects", "பொருள்கள்"], Group: ["Groups", "குழுக்கள்"], Food: ["Food and crops", "உணவும் பயிரும்"], Material: ["Materials", "பொருட்கள்"] };

// First visit opens small: everything at once is a hairball, and Kannagi is where both stories turn.
const START = "kannagi";
const startFilter = (): GraphFilter => ({ ...defaultFilter(), focus: START, hops: 1 });

/**
 * The view lives in the URL, so a filtered graph can be shared or bookmarked. Only what differs from the opening
 * view is written, which keeps links short: #/graph?focus=madhavi&reading=said&epic=MAN
 */
function filterFromParams(params: URLSearchParams): GraphFilter {
  const f = startFilter();
  const get = (k: string) => params.get(k);
  if (params.has("focus")) f.focus = get("focus") ?? "";
  if (get("hops")) f.hops = Math.min(3, Math.max(1, Number(get("hops")) || 1));
  if (get("episode")) { f.episode = get("episode")!; if (!params.has("focus")) f.focus = ""; }
  if (get("epic") === "SIL" || get("epic") === "MAN") f.epic = get("epic") as GraphFilter["epic"];
  if (get("reading") === "said") f.reading = "said";
  if (get("viewer")) f.viewer = get("viewer")!;
  if (["event", "material", "belief", "cause"].includes(get("layer") ?? "")) f.layer = get("layer") as GraphFilter["layer"];
  if (get("classes")) f.classes = new Set(get("classes")!.split(",").filter((c) => CLASSES.includes(c)));
  if (get("bridges") === "1") f.bridgesOnly = true;
  if (get("pairs") === "1") f.suggestions = true;
  if (get("births") === "0") f.earlierBirths = false;
  return f;
}
function paramsFromFilter(f: GraphFilter, tick: number, last: number): string {
  const p = new URLSearchParams();
  const s = startFilter();
  if (f.focus !== s.focus) p.set("focus", f.focus);
  if (f.hops !== s.hops) p.set("hops", String(f.hops));
  if (f.episode !== "all") p.set("episode", f.episode);
  if (f.epic !== "both") p.set("epic", f.epic);
  if (f.reading !== "happened") p.set("reading", f.reading);
  if (f.viewer) p.set("viewer", f.viewer);
  if (f.layer !== "all") p.set("layer", f.layer);
  if (f.classes.size !== CLASSES.length) p.set("classes", [...f.classes].join(","));
  if (f.bridgesOnly) p.set("bridges", "1");
  if (f.suggestions) p.set("pairs", "1");
  if (!f.earlierBirths) p.set("births", "0");
  if (tick !== last) p.set("t", String(tick));
  return p.toString();
}

export function GraphPage({ params }: { params: URLSearchParams }) {
  const { corpus, lang } = useApp();
  const t = useT();
  const name = useName();
  const ticks = useMemo(() => [...new Set(corpus.records.map((r) => r.t))].sort((a, b) => a - b), [corpus]);
  const [filter, setFilter] = useState<GraphFilter>(() => filterFromParams(params));
  const [tick, setTick] = useState(() => { const t = Number(params.get("t")); return params.has("t") && t >= 0 && t < ticks.length ? t : ticks.length - 1; });
  // Write the view back to the address bar without a navigation, so the page doesn't reload or lose its layout.
  useEffect(() => {
    const q = paramsFromFilter(filter, tick, ticks.length - 1);
    const next = `#/graph${q ? `?${q}` : ""}`;
    if (location.hash !== next) history.replaceState(null, "", next);
  }, [filter, tick, ticks.length]);
  // On a phone the detail sheet would cover the graph, so it waits for a tap there.
  const narrow = () => window.innerWidth < 860;
  const [selected, setSelected] = useState<string | null>(narrow() ? null : params.get("focus"));
  const [rec, setRec] = useState<string | null>(null);
  const [panel, setPanel] = useState(true);
  const [view, setView] = useState<"graph" | "list">("graph");
  // The key can fold away, since next to the detail column the graph needs every pixel.
  const [keyOpen, setKeyOpen] = useState(true);
  useEffect(() => {
    const focus = params.get("focus");
    if (focus) { setFilter((f) => ({ ...f, focus })); if (!narrow()) setSelected(focus); }
  }, [params]);
  const set = (patch: Partial<GraphFilter>) => { setFilter((f) => ({ ...f, ...patch })); setRec(null); };
  const applied = useMemo(() => ({ ...filter, maxT: tick === ticks.length - 1 ? Infinity : ticks[tick] }), [filter, tick, ticks]);
  const data = useMemo(() => subgraph(corpus, applied), [corpus, applied]);
  const viewers = useMemo(() => [...new Set(corpus.records.filter((r) => r.kind === "believe").map((r) => r.roles.holder as string))], [corpus]);
  const atTick = corpus.records.filter((r) => r.t === ticks[tick])[0];
  const peopleList = useMemo(() => corpus.graph.nodes.filter((n) => n.cls !== "Other" && data.nodes.includes(n.id) || n.id === filter.focus).sort((a, b) => a[lang].localeCompare(b[lang])), [corpus, data, lang, filter.focus]);
  const allNodes = useMemo(() => corpus.graph.nodes.filter((n) => n.cls !== "Other").sort((a, b) => a[lang].localeCompare(b[lang])), [corpus, lang]);
  const selectedNode = selected ? corpus.nodeById.get(selected) : null;
  const relevant = selected ? corpus.records.filter((r) => data.edges.some((e) => e.rec === r.id) && recordMentions(r, selected)) : [];
  const isFiltered = filter.focus !== START || filter.hops !== 1 || filter.episode !== "all" || filter.epic !== "both" || filter.reading !== "happened" || filter.viewer || filter.bridgesOnly || filter.suggestions || filter.layer !== "all" || tick !== ticks.length - 1 || !filter.earlierBirths || filter.classes.size !== CLASSES.length;
  // How many filters differ from the opening view, so "3 filters on" can say it plainly.
  const filtersOn = [filter.focus !== START || filter.hops !== 1, filter.episode !== "all", filter.epic !== "both", filter.reading !== "happened", !!filter.viewer, filter.bridgesOnly, filter.suggestions, filter.layer !== "all", tick !== ticks.length - 1, !filter.earlierBirths, filter.classes.size !== CLASSES.length].filter(Boolean).length;
  const reset = () => { setFilter(startFilter()); setTick(ticks.length - 1); setSelected(null); setRec(null); go("/graph"); };
  // Hands over what's on screen with the verse references, so a filtered view can go into a spreadsheet or a paper.
  const exportCsv = () => {
    const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = data.edges.map((e) => { const r = corpus.byId.get(e.rec)!; return [name(e.s), name(e.t), e.kind, r.mood, r.voice.join(">"), r.lines.map((l) => l.id).join(" "), r.en].map((v) => quote(String(v))).join(","); });
    const url = URL.createObjectURL(new Blob([["from,to,relation,mood,voice,lines,record", ...rows].join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "manichchilambu-graph.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  const toggleClass = (c: string) => { const next = new Set(filter.classes); if (next.has(c)) next.delete(c); else next.add(c); set({ classes: next }); };

  return (
    <div className={`explore${panel ? "" : " explore--wide"}${selectedNode || rec ? " explore--detail" : ""}`}>
      <aside className="filters" aria-label={t("Filters", "வடிகட்டிகள்")}>
        <div className="filters__head"><h1>{t("The graph", "வரைபடம்")}</h1><button className="link" onClick={() => setPanel(!panel)} aria-expanded={panel}>{panel ? t("Hide", "மறை") : t("Filters", "வடிகட்டி")}</button></div>
        {panel && (
          <div className="filters__body">
            <p className="count" aria-live="polite"><span><b>{data.nodes.length}</b> {t(`of ${corpus.graph.nodes.length} shown`, `/ ${corpus.graph.nodes.length} காட்டப்படுகின்றன`)} · <b>{data.edges.length}</b> {t("links", "இணைப்புகள்")}</span>
              {isFiltered && <span className="filters-on">{t(`${filtersOn} ${filtersOn === 1 ? "filter" : "filters"} on`, `${filtersOn} வடிகட்டிகள்`)}<button onClick={reset}><RotateCcw size={12} aria-hidden="true" /> {t("Reset", "மீட்டமை")}</button></span>}</p>

            <div className="segmented" role="group" aria-label={t("View", "பார்வை")} style={{ marginBottom: 16 }}>
              <button aria-pressed={view === "graph"} onClick={() => setView("graph")}><Network size={15} aria-hidden="true" />{t("Graph", "வரைபடம்")}</button>
              <button aria-pressed={view === "list"} onClick={() => setView("list")}><List size={15} aria-hidden="true" />{t("List", "பட்டியல்")}</button>
            </div>

            <fieldset><legend>{t("Small graph around", "இதைச் சுற்றிய சிறு வரைபடம்")}</legend>
              <NodePicker nodes={allNodes} value={filter.focus} onPick={(id) => { set({ focus: id }); setSelected(id || null); }} empty={[t("Everyone", "அனைவரும்"), t("Everyone (the whole graph)", "அனைவரும் (முழு வரைபடம்)")]} label={t("Centre on someone or something", "மையமாக ஒருவரைத் தேர்ந்தெடு")} />
              {!filter.focus && <p className="fine" style={{ marginTop: 6 }}>{t("The whole graph is dense. Zoom in, or pick someone to see their part of it.", "முழு வரைபடம் அடர்த்தியானது. பெரிதாக்குங்கள், அல்லது ஒருவரைத் தேர்ந்தெடுங்கள்.")}</p>}
              {filter.focus && <div className="segmented" role="group" aria-label={t("How far out", "எவ்வளவு தூரம்")}>{[1, 2, 3].map((h) => <button key={h} aria-pressed={filter.hops === h} onClick={() => set({ hops: h })}>{h} {t(h === 1 ? "step" : "steps", "படி")}</button>)}</div>}
            </fieldset>

            <div className="filter-group">
              <h2><Layers size={16} aria-hidden="true" />{t("What to show", "எதைக் காட்டுவது")}</h2>
              <fieldset><legend>{t("Layer", "அடுக்கு")}</legend>
                <select value={filter.layer} onChange={(e) => set({ layer: e.target.value as GraphFilter["layer"] })} aria-label={t("Layer", "அடுக்கு")}>
                  {LAYERS.map(([k, en, ta]) => <option key={k} value={k}>{lang === "ta" ? ta : en}</option>)}
                </select>
                <p className="fine" style={{ marginTop: 6 }}>{(() => { const l = LAYERS.find((x) => x[0] === filter.layer)!; return lang === "ta" ? l[4] : l[3]; })()}</p>
              </fieldset>
              <fieldset><legend>{t("Kinds of thing", "வகைகள்")}</legend>
                <ul className="legend">{CLASSES.map((c) => (
                  <li key={c}><label className="check"><input type="checkbox" checked={filter.classes.has(c)} onChange={() => toggleClass(c)} /><EntityIcon cls={c} size={14} />{lang === "ta" ? CLASS_NAMES[c][1] : CLASS_NAMES[c][0]}</label></li>
                ))}</ul>
              </fieldset>
              <fieldset><legend>{t("Epic", "காப்பியம்")}</legend>
                <div className="segmented" role="group" aria-label={t("Epic", "காப்பியம்")}>{([["both", "Both", "இரண்டும்"], ["SIL", "Silappatikāram", "சிலம்பு"], ["MAN", "Maṇimēkalai", "மணிமேகலை"]] as const).map(([v, en, ta]) => <button key={v} aria-pressed={filter.epic === v} onClick={() => set({ epic: v })}>{lang === "ta" ? ta : en}</button>)}</div>
              </fieldset>
            </div>

            <div className="filter-group">
              <h2><Eye size={16} aria-hidden="true" />{t("Whose view", "யாருடைய கண்ணோட்டம்")}</h2>
              <fieldset><legend>{t("What counts", "எதைக் காட்டுவது")}</legend>
                <div className="segmented" role="group" aria-label={t("What counts", "எதைக் காட்டுவது")}>
                  <button aria-pressed={filter.reading === "happened"} onClick={() => set({ reading: "happened" })}>{t("What happened", "நிகழ்ந்தவை")}</button>
                  <button aria-pressed={filter.reading === "said"} onClick={() => set({ reading: "said" })}>{t("Also what was said", "கூற்றுகளும்")}</button>
                </div>
              </fieldset>
              <fieldset><legend>{t("See it through someone's eyes", "ஒருவர் கண்ணோட்டத்தில்")}</legend>
                <select value={filter.viewer} onChange={(e) => set({ viewer: e.target.value })} aria-label={t("Viewpoint", "கண்ணோட்டம்")}>
                  <option value="">{t("Nobody in particular", "யாருடையதும் அல்ல")}</option>{viewers.map((v) => <option key={v} value={v}>{name(v)}</option>)}
                </select>
                {filter.viewer && <p className="fine" style={{ marginTop: 6 }}>{t("Adds what they believe at this point in the story, true or not. Use the story slider to watch it change.", "கதையின் இந்த இடத்தில் அவர் நம்புவதைச் சேர்க்கிறது. கதை நகர்த்தியால் மாற்றத்தைப் பாருங்கள்.")}</p>}
              </fieldset>
            </div>

            <div className="filter-group">
              <h2><Clock size={16} aria-hidden="true" />{t("When", "எப்போது")}</h2>
              <fieldset><legend>{t("Episode", "நிகழ்ச்சி")}</legend>
                <select value={filter.episode} onChange={(e) => set({ episode: e.target.value })} aria-label={t("Episode", "நிகழ்ச்சி")}>
                  <option value="all">{t("All episodes", "அனைத்தும்")}</option>{EPISODES.map(([k, en, ta]) => <option key={k} value={k}>{lang === "ta" ? ta : en}</option>)}
                </select>
              </fieldset>
              <fieldset><legend>{t("Story so far", "இதுவரை கதை")}</legend>
                <Slider.Root className="slider" min={0} max={ticks.length - 1} step={1} value={[tick]} onValueChange={([v]) => setTick(v)}>
                  <Slider.Track className="slider__track"><Slider.Range className="slider__range" /></Slider.Track>
                  <Slider.Thumb className="slider__thumb" aria-label={t("Story time", "கதைக் காலம்")} />
                </Slider.Root>
                <p className="fine">{tick === ticks.length - 1 ? t("The whole story, in story order", "முழுக் கதையும், கதை வரிசையில்") : (lang === "ta" ? atTick?.ta : atTick?.en)}</p>
              </fieldset>
            </div>

            <details className="filter-group">
              <summary>{t("More options", "மேலும் தேர்வுகள்")}</summary>
              <label className="check"><input type="checkbox" checked={filter.bridgesOnly} onChange={(e) => set({ bridgesOnly: e.target.checked })} />{t("Only links touching someone in both", "இரண்டிலும் வருபவர் தொடர்பானவை மட்டும்")}</label>
              <label className="check"><input type="checkbox" checked={filter.earlierBirths} onChange={(e) => set({ earlierBirths: e.target.checked })} />{t("Include earlier births", "முற்பிறப்புகளையும் சேர்")}</label>
              <label className="check"><input type="checkbox" checked={filter.suggestions} onChange={(e) => set({ suggestions: e.target.checked })} />{t("Pairs that only appear together", "அருகருகே மட்டும் வரும் இணைகள்")}</label>
            </details>
            <button className="link" style={{ marginTop: 14 }} onClick={exportCsv}><Download size={15} aria-hidden="true" />{t("Download this view as CSV", "இந்தப் பார்வையை CSV ஆகப் பதிவிறக்கு")}</button>
          </div>
        )}
      </aside>

      <div className="stage">
        {data.nodes.length === 0 ? (
          <p className="empty" style={{ margin: 24 }}>{t("No links left with these filters. Turn a filter off, or reset.", "இந்த வடிகட்டிகளுடன் இணைப்புகள் இல்லை. ஒரு வடிகட்டியை நீக்குங்கள், அல்லது மீட்டமையுங்கள்.")} <button className="link" onClick={reset}>{t("Reset", "மீட்டமை")}</button></p>
        ) : view === "graph" ? (
          <><GraphCanvas data={data} selected={selected} selectedEdge={rec} edgeLabels={data.nodes.length <= 16} onNode={(id) => { setSelected(id); setRec(null); if (id) setKeyOpen(false); }} onEdge={data.nodes.length <= 60 || selected ? setRec : undefined} edgeOf={selected} ariaLabel={t(`Graph with ${data.nodes.length} nodes. The list view has the same content as text.`, `${data.nodes.length} முனைகள் உள்ள வரைபடம். பட்டியல் பார்வையில் இதே உள்ளடக்கம் உள்ளது.`)} />
          <button className="graph__key-toggle" onClick={() => setKeyOpen(!keyOpen)} aria-expanded={keyOpen}>{keyOpen ? t("Hide key", "குறிப்பை மறை") : t("Key", "குறிப்பு")}</button>
          {keyOpen && <div className="graph__legend" aria-hidden="true">
            {(CLASSES.filter((c) => filter.classes.has(c) && data.nodes.some((id) => corpus.nodeById.get(id)?.cls === c))).map((c) => <span key={c}><EntityIcon cls={c} size={12} />{lang === "ta" ? CLASS_NAMES[c][1] : CLASS_NAMES[c][0]}</span>)}
            <span><i className="ring" />{t("in both epics", "இரு காப்பியங்களிலும்")}</span>
            {/* All four line styles, always, so a dashed line never has to be guessed at. */}
            <span className="line-key line-key--done"><LineSample mood="asserted" />{t("told as fact", "நிகழ்ந்ததாக")}</span>
            <span className="line-key"><LineSample mood="claimed" />{t("said or claimed", "கூறப்பட்டது")}</span>
            <span className="line-key"><LineSample mood="command" />{t("wanted or ordered", "விரும்பியது / ஆணை")}</span>
            <span className="line-key"><LineSample mood="dreamed" />{t("imagined or believed", "கற்பனை / நம்பிக்கை")}</span>
            {filter.reading !== "said" && !filter.viewer && <span className="fine">{t("(dashed lines show with 'also what was said')", "(புள்ளிக்கோடுகள் 'கூற்றுகளும்' இயக்கினால்)")}</span>}
          </div>}</>
        ) : (
          <div className="list-view">
            <table><thead><tr><th>{t("Who", "யார்")}</th><th>{t("Links", "இணைப்புகள்")}</th><th>{t("Epics", "காப்பியம்")}</th></tr></thead>
              <tbody>{peopleList.map((n) => <tr key={n.id}><td><span className="entity-name"><EntityIcon cls={n.cls} id={n.id} kind={n.kind} size={14} /><button className="link" onClick={() => { setSelected(n.id); setView("graph"); }}>{n[lang]}</button>{n.epics.length > 1 && <i className="both-mark" title={t("in both epics", "இரு காப்பியங்களிலும்")} />}</span></td><td>{data.edges.filter((e) => e.s === n.id || e.t === n.id).length}</td><td>{n.epics.join(", ")}</td></tr>)}</tbody></table>
            <h2 className="sub">{t("Every link shown", "காட்டப்படும் எல்லா இணைப்புகளும்")} <span className="count-badge">{data.edges.length}</span></h2>
            <table><thead><tr><th>{t("From", "இருந்து")}</th><th>{t("Link", "இணைப்பு")}</th><th>{t("To", "வரை")}</th></tr></thead>
              <tbody>{data.edges.map((e, i) => <tr key={e.rec + i}><td>{name(e.s)}</td><td><button className="link" onClick={() => setRec(e.rec)}>{e.kind.replace(/_/g, " ")}</button> <MoodTag mood={e.mood} /></td><td>{name(e.t)}</td></tr>)}</tbody></table>
          </div>
        )}
      </div>

      {(selectedNode || rec) && (
        <aside className="detail" aria-label={t("Details", "விவரம்")}>
          <button className="detail__close" onClick={() => { setSelected(null); setRec(null); }} aria-label={t("Close", "மூடு")}><X size={18} aria-hidden="true" /></button>
          {rec && corpus.byId.get(rec) ? <><p className="eyebrow">{t("The link you picked, shown thick on the graph", "நீங்கள் தேர்ந்த இணைப்பு, வரைபடத்தில் தடிமனாக")}</p>{(() => { const e = data.edges.find((x) => x.rec === rec); return e ? <h2 style={{ marginBottom: 14 }}>{name(e.s)} — {name(e.t)}</h2> : null; })()}<RecordCard record={corpus.byId.get(rec)!} /></> : selectedNode && (
            <>
              <h2 className="entity-name"><EntityIcon cls={selectedNode.cls} id={selectedNode.id} kind={selectedNode.kind} />{selectedNode[lang]}</h2>
              <p className="detail__sub"><span lang={lang === "ta" ? "en" : "ta"}>{lang === "ta" ? selectedNode.en : selectedNode.ta}</span>{selectedNode.epics.map((ep) => <EpicMark key={ep} epic={ep} />)}{selectedNode.kind && <span className="tag">{t("a kind, not one individual", "ஒரு வகை, தனி ஒன்று அல்ல")}</span>}{selectedNode.mentions ? <span>{selectedNode.mentions} {t("lines name them", "வரிகளில் பெயர்")}</span> : null}</p>
              <div className="detail__links">
                <button className="chip" onClick={() => { set({ focus: selectedNode.id }); }}>{t("Small graph around them", "சிறு வரைபடம்")}</button>
                <a className="chip" href={`#/ask?q=${encodeURIComponent(lang === "ta" ? `${selectedNode.ta} யார்?` : `Who is ${selectedNode.en}?`)}`}>{t("Ask", "கேள்")}</a>
              </div>
              {relevant.length ? <RecordList ids={relevant.map((r) => r.id)} compact /> : <p className="fine">{t("No records for them under these filters.", "இந்த வடிகட்டிகளில் பதிவுகள் இல்லை.")}</p>}
            </>
          )}
        </aside>
      )}
    </div>
  );
}
