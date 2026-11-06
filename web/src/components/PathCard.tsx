import { GitCompare } from "lucide-react";
import { CautionIcon } from "../lib/icons";
import { useState } from "react";
import { RecordList } from "./RecordCard";
import { useApp, useName, useT } from "../lib/app";
import { CAUTION, limits, stepRecords, WARRANT_NAMES } from "../lib/discover";
import type { PathStep } from "../lib/types";

/** One path: who it joins, the route with what kind of link each step is, and what it doesn't entitle you to say. */
export function PathCard({ steps, startOpen }: { steps: PathStep[]; startOpen?: boolean }) {
  const { corpus, lang } = useApp();
  const t = useT();
  const name = useName();
  const [open, setOpen] = useState(!!startOpen);
  const first = steps[0].from, last = steps[steps.length - 1].to;
  const no = [...new Map(limits(corpus, steps).map((l) => [l.en, l])).values()];
  const recs = stepRecords(corpus, steps);
  const epics = new Set(recs.map((r) => corpus.byId.get(r)!.epic));
  return (
    <article className="path">
      <button className="path__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <p className="path__ends" lang={lang}>{name(first)} ↔ {name(last)}</p>
        <p className="path__route">
          <span>{name(first)}</span>
          {steps.map((s, i) => {
            const w = s.via && s.via !== "same" ? s.via : s.w;
            return (
              <span key={i} style={{ display: "contents" }}>
                <i className={CAUTION.has(w) ? "caution" : ""}>{CAUTION.has(w) && <CautionIcon size={12} aria-hidden="true" />}{WARRANT_NAMES[w]?.[lang === "ta" ? 1 : 0] ?? w}</i>
                <span>{name(s.to)}</span>
              </span>
            );
          })}
        </p>
        {/* About the whole path, not one of its links, so it sits apart from them. */}
        {epics.size > 1 && <p className="path__whole"><GitCompare size={14} aria-hidden="true" />{t("This path crosses both epics", "இப்பாதை இரு காப்பியங்களையும் கடக்கிறது")}</p>}
      </button>
      {open && (
        <div className="path__body">
          {no.length > 0 && <ul className="limits">{no.map((l) => <li key={l.en}>{lang === "ta" ? l.ta : l.en}</li>)}</ul>}
          <RecordList ids={recs} compact />
        </div>
      )}
    </article>
  );
}
