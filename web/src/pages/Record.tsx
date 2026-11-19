import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { RecordCard, RecordList } from "../components/RecordCard";
import { useApp, useT } from "../lib/app";
import { cantoName } from "../lib/site";
import type { LedgerRecord } from "../lib/types";

const SITE_TITLE = "Maṇichchilambu: a knowledge graph of Silappatikāram and Maṇimēkalai";
const AUTHOR = "Bhaveenthan";
const YEAR = new Date().getFullYear(); // the year the page was opened, for the citation

/** "SIL-16-0216–0217", or "SIL-16-0216, SIL-17-0003" when the lines are in different places. */
export function lineRange(r: LedgerRecord) {
  const ids = r.lines.map((l) => l.id);
  if (!ids.length) return "";
  const sameCanto = ids.every((id) => id.slice(0, 6) === ids[0].slice(0, 6));
  return ids.length === 1 ? ids[0] : sameCanto ? `${ids[0]}–${ids[ids.length - 1].slice(7)}` : ids.join(", ");
}

/** The record's own address, so a reviewer can write "record a15" and anyone can open it. */
export const permalink = (id: string) => `${location.origin}${location.pathname}#/record/${id}`;

export function citation(r: LedgerRecord, year: number) {
  const status =
    r.review?.status === "reviewed"
      ? `reviewed by ${r.review.by ?? "a scholar"}`
      : r.review?.status === "disputed"
        ? "disputed"
        : "not yet reviewed";
  return {
    plain: `Maṇichchilambu, record ${r.id}: “${r.en}” ${cantoName(r.lines[0]?.id ?? "", "en")}, ${lineRange(r)} (${r.mood}; ${status}). In ${AUTHOR}, ${SITE_TITLE}, ${year}. ${permalink(r.id)}`,
    bibtex: `@misc{manichchilambu_${r.id},\n  author = {${AUTHOR}},\n  title = {{Ma\\d{n}ichchilambu} record ${r.id}},\n  howpublished = {\\url{${permalink(r.id)}}},\n  year = {${year}},\n  note = {Lines ${lineRange(r)}; ${r.mood}; ${status}}\n}`,
  };
}

function CopyBox({ text, label }: { text: string; label: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      /* the text is on screen to copy by hand */
    }
  };
  return (
    <div className="cite">
      <p className="group-label">
        <b>{label}</b>
        <button className="link" onClick={copy}>
          {done ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {done ? t("Copied", "நகலெடுக்கப்பட்டது") : t("Copy", "நகலெடு")}
        </button>
      </p>
      <pre>{text}</pre>
    </div>
  );
}

export function RecordPage({ id }: { id: string }) {
  const { corpus, lang } = useApp();
  const t = useT();
  const r = corpus.byId.get(id);
  if (!r)
    return (
      <p>
        {t(`There's no record called “${id}”.`, `“${id}” என்ற பதிவு இல்லை.`)}{" "}
        <a href="#/ask">{t("Ask a question instead", "கேள்வி கேளுங்கள்")}</a>
      </p>
    );
  const cite = citation(r, YEAR);
  // Records on the same lines, or retelling this one, so a reviewer sees its neighbours.
  const near = corpus.records
    .filter((x) => x.id !== r.id && (x.lines.some((l) => r.lines.some((m) => m.id === l.id)) || x.retells === r.id || r.retells === x.id))
    .map((x) => x.id);
  return (
    <div className="prose">
      <header className="section-head">
        <p className="eyebrow">
          {t("Record", "பதிவு")} <span className="mono">{r.id}</span>
        </p>
        <h1>{lang === "ta" ? r.ta : r.en}</h1>
      </header>
      <RecordCard record={r} />
      <h2>{t("How to cite it", "மேற்கோள் காட்டும் முறை")}</h2>
      <p className="fine">
        {t(
          `In a review or a paper, “record ${r.id}” is enough to find it again. The link always opens the latest reading, and the badge says whether a scholar has checked it.`,
          `மதிப்பாய்விலோ கட்டுரையிலோ “பதிவு ${r.id}” என்று குறிப்பிட்டால் போதும். இணைப்பு எப்போதும் சமீபத்திய வாசிப்பைத் திறக்கும்.`,
        )}
      </p>
      <CopyBox label={t("Link", "இணைப்பு")} text={permalink(r.id)} />
      <CopyBox label={t("Citation", "மேற்கோள்")} text={cite.plain} />
      <CopyBox label="BibTeX" text={cite.bibtex} />
      {near.length > 0 && (
        <>
          <h2>{t("Records on the same lines", "அதே வரிகளில் உள்ள பதிவுகள்")}</h2>
          <RecordList ids={near} compact />
        </>
      )}
    </div>
  );
}
