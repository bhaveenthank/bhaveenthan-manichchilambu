import { ArrowRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp, useT } from "../lib/app";
import { loadCanto } from "../lib/data";
import { cantoName } from "../lib/site";
import type { CantoLine } from "../lib/types";
import { RecordCard } from "./RecordCard";

const AROUND = 3;

/** One line in its place: the lines either side, the hand records that cite it, and the machine note on it. */
export function Inspector({ line, gist, onClose }: { line: string; gist?: string | null; onClose: () => void }) {
  const { corpus, lang } = useApp();
  const t = useT();
  const [rows, setRows] = useState<CantoLine[] | null>(null);
  useEffect(() => {
    setRows(null);
    loadCanto(line.slice(0, 6))
      .then(setRows)
      .catch(() => setRows([]));
  }, [line]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const at = rows?.findIndex((r) => r.id === line) ?? -1;
  const near = rows && at >= 0 ? rows.slice(Math.max(0, at - AROUND), at + AROUND + 1) : [];
  const recs = rows && at >= 0 ? rows[at].rec : [];
  return (
    <aside className="inspector" aria-label={t("The line in its place", "வரி அதன் இடத்தில்")}>
      <div className="inspector__head">
        <p className="eyebrow" style={{ margin: 0 }}>
          {cantoName(line, lang)} · <span className="mono">{line}</span>
        </p>
        <button className="detail__close" style={{ position: "static" }} onClick={onClose} aria-label={t("Close", "மூடு")}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {!rows ? (
        <div className="skeleton" aria-busy="true">
          <i />
          <i />
          <i />
        </div>
      ) : (
        <ol className="inspector__lines" lang="ta">
          {near.map((r) => (
            <li key={r.id} className={r.id === line ? "is-target" : ""}>
              <span className="mono">{r.n}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ol>
      )}
      {gist && (
        <p className="inspector__gist">
          <b>{t("Machine note", "இயந்திரக் குறிப்பு")}</b> {gist} <span className="fine">({t("unchecked", "சரிபார்க்கவில்லை")})</span>
        </p>
      )}
      <h3 className="sub" style={{ marginTop: 16 }}>
        {t("Hand records citing this line", "இவ்வரியைச் சுட்டும் கைப்பதிவுகள்")} <span className="count-badge">{recs.length}</span>
      </h3>
      {recs.length ? (
        <div className="record-list">
          {recs
            .map((id) => corpus.byId.get(id))
            .filter(Boolean)
            .map((r) => (
              <RecordCard key={r!.id} record={r!} compact />
            ))}
        </div>
      ) : (
        <p className="fine">
          {t("None yet. The graph doesn't rest on this line.", "இன்னும் இல்லை. வரைபடம் இவ்வரியைச் சார்ந்திருக்கவில்லை.")}
        </p>
      )}
      <a className="read-link" href={`#/songs/${line.slice(0, 6)}?line=${line}`}>
        {t("Open the whole song here", "முழுப் பாடலையும் இங்கு திற")}
        <ArrowRight size={15} aria-hidden="true" />
      </a>
    </aside>
  );
}
