import * as Slider from "@radix-ui/react-slider";
import { useEffect, useMemo, useRef, useState } from "react";
import { classColour, GraphCanvas } from "../components/GraphCanvas";
import { RecordCard, RecordList } from "../components/RecordCard";
import { go, useApp, useName, useT } from "../lib/app";
import { CLASSES, defaultFilter, recordMentions, subgraph, type GraphFilter } from "../lib/model";
import type { GraphNode } from "../lib/types";

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

/** Type a name, pick from what matches. A 260-item dropdown is no way to find one person. */
function NodePicker({ nodes, value, onPick }: { nodes: GraphNode[]; value: string; onPick: (id: string) => void }) {
  const { lang } = useApp();
  const t = useT();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const current = nodes.find((n) => n.id === value);
  const q = text.trim().toLowerCase();
  const hits = (q ? nodes.filter((n) => n.en.toLowerCase().includes(q) || n.ta.includes(text.trim()) || n.also.some((a) => a.toLowerCase().includes(q))) : nodes).slice(0, 40);
  const choose = (id: string) => { onPick(id); setText(""); setOpen(false); };
  return (
    <div className="combo" ref={box} onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <input value={open ? text : current?.[lang] ?? t("Everyone", "அனைவரும்")} onFocus={() => { setOpen(true); setText(""); setAt(0); }} onChange={(e) => { setText(e.target.value); setAt(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setAt((i) => Math.min(i + 1, hits.length)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setAt((i) => Math.max(i - 1, 0)); }
          if (e.key === "Enter") { e.preventDefault(); choose(at === 0 ? "" : hits[at - 1]?.id ?? ""); }
          if (e.key === "Escape") setOpen(false);
        }}
        role="combobox" aria-expanded={open} aria-controls="node-picker" aria-label={t("Centre on someone or something", "மையமாக ஒருவரைத் தேர்ந்தெடு")} placeholder={t("Type a name", "பெயரைத் தட்டச்சிடுக")} />
      {open && (
        <ul className="combo__list" id="node-picker" role="listbox">
          <li><button type="button" role="option" aria-selected={at === 0} onMouseDown={(e) => e.preventDefault()} onClick={() => choose("")}>{t("Everyone (the whole graph)", "அனைவரும் (முழு வரைபடம்)")}</button></li>
          {hits.map((n, i) => <li key={n.id}><button type="button" role="option" aria-selected={at === i + 1} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(n.id)}>{n[lang]} <span className="fine">{lang === "ta" ? n.en : n.ta}</span></button></li>)}
          {!hits.length && <li className="fine" style={{ padding: "6px 10px" }}>{t("No one by that name", "அப்பெயரில் யாரும் இல்லை")}</li>}
        </ul>
      )}
    </div>
  );
}

export function GraphPage({ params }: { params: URLSearchParams }) {
  const { corpus, lang, dark } = useApp();
  const t = useT();
  const name = useName();
  const [clusters, setClusters] = useState(false);
  const ticks = useMemo(() => [...new Set(corpus.records.map((r) => r.t))].sort((a, b) => a - b), [corpus]);
  const [filter, setFilter] = useState<GraphFilter>(() => ({ ...startFilter(), ...(params.get("focus") ? { focus: params.get("focus")!, hops: 2 } : {}), ...(params.get("episode") ? { episode: params.get("episode")!, focus: "" } : {}) }));
  const [tick, setTick] = useState(ticks.length - 1);
  // On a phone the detail sheet would cover the graph, so it waits for a tap there.
  const narrow = () => window.innerWidth < 860;
  const [selected, setSelected] = useState<string | null>(narrow() ? null : params.get("focus"));
  const [rec, setRec] = useState<string | null>(null);
  const [panel, setPanel] = useState(true);
  const [view, setView] = useState<"graph" | "list">("graph");
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
  const toggleClass = (c: string) => { const next = new Set(filter.classes); next.has(c) ? next.delete(c) : next.add(c); set({ classes: next }); };

  return (
    <div className={panel ? "explore" : "explore explore--wide"}>
      <aside className="filters" aria-label={t("Filters", "வடிகட்டிகள்")}>
        <div className="filters__head"><h1>{t("The graph", "வரைபடம்")}</h1><button className="link" onClick={() => setPanel(!panel)} aria-expanded={panel}>{panel ? t("Hide", "மறை") : t("Filters", "வடிகட்டி")}</button></div>
        {panel && (
          <div className="filters__body">
            <p className="count"><span><b>{data.nodes.length}</b> {t(`of ${corpus.graph.nodes.length} shown`, `/ ${corpus.graph.nodes.length} காட்டப்படுகின்றன`)} · <b>{data.edges.length}</b> {t("links", "இணைப்புகள்")}</span>{isFiltered && <button className="link" onClick={reset}>{t("Reset", "மீட்டமை")}</button>}</p>

            <fieldset><legend>{t("Layer", "அடுக்கு")}</legend>
              <select value={filter.layer} onChange={(e) => set({ layer: e.target.value as GraphFilter["layer"] })} aria-label={t("Layer", "அடுக்கு")}>
                {LAYERS.map(([k, en, ta]) => <option key={k} value={k}>{lang === "ta" ? ta : en}</option>)}
              </select>
              <p className="fine" style={{ marginTop: 6 }}>{(() => { const l = LAYERS.find((x) => x[0] === filter.layer)!; return lang === "ta" ? l[4] : l[3]; })()}</p>
            </fieldset>

            <fieldset><legend>{t("Small graph around", "இதைச் சுற்றிய சிறு வரைபடம்")}</legend>
              <NodePicker nodes={allNodes} value={filter.focus} onPick={(id) => { set({ focus: id }); setSelected(id || null); }} />
              {!filter.focus && <p className="fine" style={{ marginTop: 6 }}>{t("The whole graph is dense. Zoom in, or pick someone to see their part of it.", "முழு வரைபடம் அடர்த்தியானது. பெரிதாக்குங்கள், அல்லது ஒருவரைத் தேர்ந்தெடுங்கள்.")}</p>}
              {filter.focus && <div className="segmented" role="group" aria-label={t("How far out", "எவ்வளவு தூரம்")}>{[1, 2, 3].map((h) => <button key={h} aria-pressed={filter.hops === h} onClick={() => set({ hops: h })}>{h} {t(h === 1 ? "step" : "steps", "படி")}</button>)}</div>}
            </fieldset>

            <fieldset><legend>{t("Episode", "நிகழ்ச்சி")}</legend>
              <select value={filter.episode} onChange={(e) => set({ episode: e.target.value })} aria-label={t("Episode", "நிகழ்ச்சி")}>
                <option value="all">{t("All episodes", "அனைத்தும்")}</option>{EPISODES.map(([k, en, ta]) => <option key={k} value={k}>{lang === "ta" ? ta : en}</option>)}
              </select>
            </fieldset>

            <fieldset><legend>{t("Epic", "காப்பியம்")}</legend>
              <div className="segmented" role="group">{([["both", "Both", "இரண்டும்"], ["SIL", "Silappatikāram", "சிலம்பு"], ["MAN", "Maṇimēkalai", "மணிமேகலை"]] as const).map(([v, en, ta]) => <button key={v} aria-pressed={filter.epic === v} onClick={() => set({ epic: v })}>{lang === "ta" ? ta : en}</button>)}</div>
              <label className="check"><input type="checkbox" checked={filter.bridgesOnly} onChange={(e) => set({ bridgesOnly: e.target.checked })} />{t("Only links touching someone in both", "இரண்டிலும் வருபவர் தொடர்பானவை மட்டும்")}</label>
            </fieldset>

            <fieldset><legend>{t("What counts", "எதைக் காட்டுவது")}</legend>
              <div className="segmented" role="group">
                <button aria-pressed={filter.reading === "happened"} onClick={() => set({ reading: "happened" })}>{t("What happened", "நிகழ்ந்தவை")}</button>
                <button aria-pressed={filter.reading === "said"} onClick={() => set({ reading: "said" })}>{t("Also what was said", "கூற்றுகளும்")}</button>
              </div>
              <label className="check"><input type="checkbox" checked={filter.earlierBirths} onChange={(e) => set({ earlierBirths: e.target.checked })} />{t("Include earlier births", "முற்பிறப்புகளையும் சேர்")}</label>
              <label className="check"><input type="checkbox" checked={filter.suggestions} onChange={(e) => set({ suggestions: e.target.checked })} />{t("Pairs that only appear together", "அருகருகே மட்டும் வரும் இணைகள்")}</label>
            </fieldset>

            <fieldset><legend>{t("See it through someone's eyes", "ஒருவர் கண்ணோட்டத்தில்")}</legend>
              <select value={filter.viewer} onChange={(e) => set({ viewer: e.target.value })} aria-label={t("Viewpoint", "கண்ணோட்டம்")}>
                <option value="">{t("Nobody in particular", "யாருடையதும் அல்ல")}</option>{viewers.map((v) => <option key={v} value={v}>{name(v)}</option>)}
              </select>
              {filter.viewer && <p className="fine">{t("Adds what they believe at this point in the story, true or not. Use the story slider to watch it change.", "கதையின் இந்த இடத்தில் அவர் நம்புவதைச் சேர்க்கிறது. கதை நகர்த்தியால் மாற்றத்தைப் பாருங்கள்.")}</p>}
            </fieldset>

            <fieldset><legend>{t("Story so far", "இதுவரை கதை")}</legend>
              <Slider.Root className="slider" min={0} max={ticks.length - 1} step={1} value={[tick]} onValueChange={([v]) => setTick(v)}>
                <Slider.Track className="slider__track"><Slider.Range className="slider__range" /></Slider.Track>
                <Slider.Thumb className="slider__thumb" aria-label={t("Story time", "கதைக் காலம்")} />
              </Slider.Root>
              <p className="fine">{tick === ticks.length - 1 ? t("The whole story, in story order", "முழுக் கதையும், கதை வரிசையில்") : (lang === "ta" ? atTick?.ta : atTick?.en)}</p>
            </fieldset>

            <fieldset><legend>{t("Show", "காட்டு")}</legend>
              <ul className="legend">{CLASSES.map((c) => (
                <li key={c}><label className="check"><input type="checkbox" checked={filter.classes.has(c)} onChange={() => toggleClass(c)} /><span className="swatch" style={{ background: classColour(c, dark) }} />{lang === "ta" ? CLASS_NAMES[c][1] : CLASS_NAMES[c][0]}</label></li>
              ))}</ul>
              <label className="check" style={{ marginBottom: 8 }}><input type="checkbox" checked={clusters} onChange={(e) => setClusters(e.target.checked)} />{t("Colour by clusters it finds itself", "தானே கண்ட கொத்துகளால் நிறம்")}</label>
            </fieldset>

            <div className="segmented" role="group" aria-label={t("View", "பார்வை")}>
              <button aria-pressed={view === "graph"} onClick={() => setView("graph")}>{t("Graph", "வரைபடம்")}</button>
              <button aria-pressed={view === "list"} onClick={() => setView("list")}>{t("List", "பட்டியல்")}</button>
            </div>
            <button className="link" style={{ marginTop: 14 }} onClick={exportCsv}>{t("Download this view as CSV", "இந்தப் பார்வையை CSV ஆகப் பதிவிறக்கு")}</button>
          </div>
        )}
      </aside>

      <div className="stage">
        {data.nodes.length === 0 ? (
          <p className="empty">{t("Nothing fits these filters.", "இந்த வடிகட்டிகளுக்குப் பொருந்துவது இல்லை.")} <button className="link" onClick={reset}>{t("Reset", "மீட்டமை")}</button></p>
        ) : view === "graph" ? (
          <><GraphCanvas data={data} clusters={clusters} selected={selected} selectedEdge={rec} edgeLabels={data.nodes.length <= 16} onNode={(id) => { setSelected(id); setRec(null); }} onEdge={data.nodes.length <= 60 || selected ? setRec : undefined} edgeOf={selected} ariaLabel={t(`Graph with ${data.nodes.length} nodes. The list view has the same content as text.`, `${data.nodes.length} முனைகள் உள்ள வரைபடம். பட்டியல் பார்வையில் இதே உள்ளடக்கம் உள்ளது.`)} />
          <div className="graph__legend" aria-hidden="true">
            {(clusters ? [] : CLASSES.filter((c) => filter.classes.has(c) && data.nodes.some((id) => corpus.nodeById.get(id)?.cls === c))).map((c) => <span key={c}><i className="swatch" style={{ background: classColour(c, dark) }} />{lang === "ta" ? CLASS_NAMES[c][1] : CLASS_NAMES[c][0]}</span>)}
            <span><i className="ring" />{t("in both epics", "இரு காப்பியங்களிலும்")}</span>
            <span><i className="dash dash--done" />{t("told as fact", "நிகழ்ந்ததாக")}</span>
            {filter.reading === "said" && <span><i className="dash dash--said" />{t("only said", "கூற்று மட்டும்")}</span>}
          </div></>
        ) : (
          <div className="list-view">
            <table><thead><tr><th>{t("Who", "யார்")}</th><th>{t("Links", "இணைப்புகள்")}</th><th>{t("Epics", "காப்பியம்")}</th></tr></thead>
              <tbody>{peopleList.map((n) => <tr key={n.id}><td><button className="link" onClick={() => { setSelected(n.id); setView("graph"); }}>{n[lang]}</button></td><td>{data.edges.filter((e) => e.s === n.id || e.t === n.id).length}</td><td>{n.epics.join(", ")}</td></tr>)}</tbody></table>
          </div>
        )}
      </div>

      {(selectedNode || rec) && (
        <aside className="detail" aria-label={t("Details", "விவரம்")}>
          <button className="detail__close" onClick={() => { setSelected(null); setRec(null); }} aria-label={t("Close", "மூடு")}>×</button>
          {rec && corpus.byId.get(rec) ? <><p className="eyebrow">{t("The link you picked, shown thick on the graph", "நீங்கள் தேர்ந்த இணைப்பு, வரைபடத்தில் தடிமனாக")}</p>{(() => { const e = data.edges.find((x) => x.rec === rec); return e ? <h2 style={{ marginBottom: 14 }}>{name(e.s)} — {name(e.t)}</h2> : null; })()}<RecordCard record={corpus.byId.get(rec)!} /></> : selectedNode && (
            <>
              <h2>{selectedNode[lang]}</h2>
              <p className="detail__sub">{lang === "ta" ? selectedNode.en : selectedNode.ta} · {selectedNode.epics.join(" + ")}{selectedNode.mentions ? ` · ${selectedNode.mentions} ${t("lines name them", "வரிகளில் பெயர்")}` : ""}</p>
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
