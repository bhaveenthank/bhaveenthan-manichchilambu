import { useEffect, useMemo, useRef, useState } from "react";
import { GraphCanvas } from "../components/GraphCanvas";
import { RecordCard } from "../components/RecordCard";
import { useApp, useName, useT } from "../lib/app";
import { loadCanto } from "../lib/data";
import { recordsToSubgraph } from "../lib/model";
import type { CantoLine } from "../lib/types";
import { THEMES } from "./Songs";

interface MachineRow { kind: string; mood: string; voice: string[]; roles: Record<string, unknown>; lines: { id: string; text: string }[]; quote: string }

/** Split a canto into blocks where the recorded speaker changes, or every 16 lines. There's no stanza data, so that's a reading aid and no more. */
function toBlocks(rows: CantoLine[], speakerOf: (r: CantoLine) => string | null) {
  const blocks: { who: string | null; rows: CantoLine[] }[] = [];
  for (const row of rows) {
    const who = speakerOf(row);
    const last = blocks[blocks.length - 1];
    if (last && last.rows.length < 16 && (who === null || last.who === null || who === last.who)) { last.rows.push(row); last.who ??= who; }
    else blocks.push({ who, rows: [row] });
  }
  return blocks;
}

export function CantoPage({ cantoKey, line }: { cantoKey: string; line: string | null }) {
  const { corpus, lang } = useApp();
  const t = useT();
  const name = useName();
  const [rows, setRows] = useState<CantoLine[] | null>(null);
  const [openRec, setOpenRec] = useState<string | null>(null);
  const [person, setPerson] = useState("");
  const [machine, setMachine] = useState<MachineRow[]>([]);
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}data/machine/${cantoKey}.json`).then((r) => (r.ok ? r.json() : [])).then(setMachine).catch(() => setMachine([])); }, [cantoKey]);
  const canto = corpus.cantos.find((c) => c.key === cantoKey);
  const target = useRef<HTMLLIElement>(null);
  useEffect(() => { loadCanto(cantoKey).then(setRows).catch(() => setRows([])); }, [cantoKey]);
  useEffect(() => { if (rows && line) target.current?.scrollIntoView({ block: "center" }); }, [rows, line]);
  const small = useMemo(() => (canto?.records.length ? recordsToSubgraph(corpus, canto.records) : null), [canto, corpus]);
  const echoes = useMemo(() => corpus.echoes.lines.filter((e) => e.a.startsWith(cantoKey) || e.b.startsWith(cantoKey)), [corpus, cantoKey]);
  // Who's speaking in a block comes from the records on its lines: the last voice in the chain, unless it's the poet.
  const blocks = useMemo(() => toBlocks(rows ?? [], (row) => {
    for (const id of row.rec) { const v = corpus.byId.get(id)?.voice; const who = v?.[v.length - 1]; if (who && who !== "poet") return who; }
    return null;
  }), [rows, corpus]);
  if (!canto) return <p className="empty">{t("No such song.", "அப்படி ஒரு பாடல் இல்லை.")}</p>;
  const i = corpus.cantos.indexOf(canto);
  const prev = corpus.cantos[i - 1], next = corpus.cantos[i + 1];
  return (
    <article className="canto">
      <header className="canto__head">
        <a className="link" href="#/songs">← {t("All songs", "அனைத்துப் பாடல்கள்")}</a>
        <p className="eyebrow">{canto.epic === "SIL" ? t("Silappatikāram", "சிலப்பதிகாரம்") : t("Maṇimēkalai", "மணிமேகலை")} · {canto.key}</p>
        <h1 lang="ta">{canto.title}</h1>
        <p className="canto__en">{canto.en}</p>
        <div className="chips">
          {canto.themes.map((k) => <a key={k} className="chip" href="#/songs?by=theme">{THEMES[k]?.[lang === "ta" ? 1 : 0]}</a>)}
          <span className="tag">{canto.lines} {t("lines", "வரிகள்")}</span>
        </div>
      </header>
      <div className="canto__body">
        <div>
          {canto.people.length > 0 && (
            <div className="canto__who"><span className="fine">{t("Highlight", "சுட்டிக்காட்டு")}:</span>
              {canto.people.map((id) => <button key={id} className="chip" aria-pressed={person === id} onClick={() => setPerson(person === id ? "" : id)}>{name(id)}</button>)}
            </div>
          )}
          {!rows ? <p className="fine">{t("Loading...", "ஏற்றுகிறது...")}</p> : (
            <ol className="lyric">
              {blocks.map((b) => (
                <li key={b.rows[0].id} className="lyric__block">
                  <span>{b.who && <span className="lyric__who" title={name(b.who)} aria-label={t(`Spoken by ${name(b.who)}`, `கூறுபவர்: ${name(b.who)}`)}>{(corpus.nodeById.get(b.who)?.ta ?? "").slice(0, 1)}</span>}</span>
                  <ol className="lines" lang="ta">
                    {b.rows.map((r) => (
                      <li key={r.id} ref={r.id === line ? target : undefined} className={[r.id === line ? "line--target" : "", person && r.who.includes(person) ? "line--who" : "", r.rec.length ? "line--rec" : ""].join(" ")}>
                        <span className="line__text">{r.text}</span>
                        {r.rec.length > 0 ? <button className="line__rec" onClick={() => setOpenRec(openRec === r.id ? null : r.id)} aria-expanded={openRec === r.id} aria-label={t("Show what the graph records here", "இங்கு உள்ள பதிவுகளைக் காட்டு")}>{r.rec.length}</button> : <span />}
                        <span className={r.n % 5 === 0 ? "line__n line__n--mark" : "line__n"} aria-hidden="true">{r.n}</span>
                        {openRec === r.id && <div className="line__records" lang={lang}>{r.rec.map((id) => <RecordCard key={id} record={corpus.byId.get(id)!} compact />)}</div>}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          )}
          <nav className="canto__nav">
            {prev ? <a className="link" href={`#/songs/${prev.key}`}>← <span lang="ta">{prev.title}</span></a> : <span />}
            {next && <a className="link" href={`#/songs/${next.key}`}><span lang="ta">{next.title}</span> →</a>}
          </nav>
        </div>
        <aside className="canto__side">
          {small && small.nodes.length > 0 ? (
            <section><h2 className="sub">{t("This song's graph", "இப்பாடலின் வரைபடம்")}</h2><GraphCanvas data={small} compact edgeLabels={small.nodes.length <= 14} ariaLabel={t("Small graph of the records in this song", "இப்பாடலின் பதிவுகளின் சிறு வரைபடம்")} /><a className="link" href={`#/graph`}>{t("Open the full graph", "முழு வரைபடம்")} →</a></section>
          ) : <p className="fine">{t("The graph has no records from this song yet.", "இப்பாடலில் இருந்து வரைபடப் பதிவுகள் இன்னும் இல்லை.")}</p>}
          {machine.length > 0 && (
            <section>
              <h2 className="sub">{t("Machine-read drafts", "இயந்திரம் படித்த வரைவுகள்")} <span className="count-badge">{machine.length}</span></h2>
              <p className="fine">{t("A language model proposed these from this canto. The quoted words were checked against the lines, and nothing else was. They aren't in the graph and they aren't answers.", "மொழி மாதிரி முன்மொழிந்தவை. மேற்கோள் சொற்கள் மட்டுமே சரிபார்க்கப்பட்டன. இவை வரைபடத்தில் இல்லை.")}</p>
              <details className="machine"><summary>{t("Show them", "காட்டு")}</summary>
                {machine.map((m, i) => <article key={i} className="machine__row"><p><b>{m.kind?.replace(/_/g, " ")}</b> · {m.mood}{m.roles ? ` · ${Object.values(m.roles).flat().filter((v) => typeof v === "string").map((v) => name(v as string)).join(", ")}` : ""}</p><a className="lex__line" href={`#/songs/${cantoKey}?line=${m.lines[0].id}`}><span lang="ta">{m.quote}</span><span className="verse__id">{m.lines[0].id}</span></a></article>)}
              </details>
            </section>
          )}
          {echoes.length > 0 && (
            <section><h2 className="sub">{t("Shared with the other epic", "மற்றக் காப்பியத்துடன் பொதுவானவை")}</h2>
              <ul className="echo-list" lang="ta">{echoes.slice(0, 8).map((e) => {
                const mine = e.a.startsWith(cantoKey);
                const id = mine ? e.b : e.a, text = mine ? e.tb : e.ta;
                return <li key={e.a + e.b}><a href={`#/songs/${id.slice(0, 6)}?line=${id}`}>{text}<span className="verse__id">{id}</span></a></li>;
              })}</ul></section>
          )}
        </aside>
      </div>
    </article>
  );
}
