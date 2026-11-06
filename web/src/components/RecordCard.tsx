import { go, useApp, useT } from "../lib/app";
import { MOOD_LABEL } from "../lib/model";
import { cantoName, correctionLink } from "../lib/site";
import type { LedgerRecord } from "../lib/types";

export function Voice({ record }: { record: LedgerRecord }) {
  const { corpus, lang } = useApp();
  const t = useT();
  const steps = record.voice.map((v) => (v === "poet" ? t("the poet", "புலவர்") : corpus.nodeById.get(v)?.[lang] ?? v.replace(/_/g, " ")));
  return <span className="voice" title={t("Who tells us this, outermost first", "யார் வழியாக இது வருகிறது")}>{steps.join(" → ")}</span>;
}

export function MoodTag({ mood }: { mood: string }) {
  const { lang } = useApp();
  return <span className={`mood mood--${mood === "asserted" ? "done" : "said"}`}>{MOOD_LABEL[mood]?.[lang] ?? mood}</span>;
}

export function VerseLines({ lines }: { lines: LedgerRecord["lines"] }) {
  return (
    <blockquote className="verse" lang="ta">
      {lines.map((l) => (
        <a key={l.id} className="verse__line" href={`#/songs/${l.id.slice(0, 6)}?line=${l.id}`}><span className="verse__text">{l.text}</span><span className="verse__id">{l.id}</span></a>
      ))}
    </blockquote>
  );
}

/** A plain link into the reader, since the line ids alone don't look clickable. */
export function ReadLink({ line }: { line: string }) {
  const { lang } = useApp();
  const t = useT();
  return <a className="read-link" href={`#/songs/${line.slice(0, 6)}?line=${line}`}>{t(`Read in ${cantoName(line, "en")}`, `${cantoName(line, lang)} இல் படிக்க`)} →</a>;
}

export function RecordCard({ record, compact }: { record: LedgerRecord; compact?: boolean }) {
  const { lang } = useApp();
  const t = useT();
  const main = lang === "ta" ? record.ta : record.en;
  const other = lang === "ta" ? record.en : record.ta;
  const caveat = record.unresolved ?? record.inferred;
  return (
    <article className="record">
      <p className="record__text">{main}</p>
      {!compact && <p className="record__other" lang={lang === "ta" ? "en" : "ta"}>{other}</p>}
      <div className="record__meta"><MoodTag mood={record.mood} /><Voice record={record} />{record.birth !== "main" && <span className="tag">{t("earlier birth", "முற்பிறப்பு")}</span>}</div>
      <VerseLines lines={record.lines} />
      {caveat && <p className="record__caveat">{caveat}</p>}
      <div className="record__foot">
        {record.lines.length > 0 && <ReadLink line={record.lines[0].id} />}
        <a className="flag-link" href={correctionLink(`record ${record.id}`, record.lines.map((l) => l.id))}>{t("Suggest a correction", "திருத்தம் பரிந்துரை")}</a>
      </div>
    </article>
  );
}

export function RecordList({ ids, compact }: { ids: string[]; compact?: boolean }) {
  const { corpus } = useApp();
  return <div className="record-list">{ids.map((id) => corpus.byId.get(id)).filter(Boolean).map((r) => <RecordCard key={r!.id} record={r!} compact={compact} />)}</div>;
}

export const openEntity = (id: string) => go(`/graph?focus=${id}`);
