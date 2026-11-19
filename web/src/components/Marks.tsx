import { BadgeCheck, CircleDashed, TriangleAlert } from "lucide-react";
import { useApp, useT } from "../lib/app";
import { classStyle, dashArray, FAMILY, familyOf, isAnklet } from "../lib/icons";
import { MOOD_LABEL } from "../lib/model";
import type { Review } from "../lib/types";

/** Drawn on the same 24px grid and 2px stroke as the Lucide set, which has no anklet. */
export function AnkletIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="9" rx="8.5" ry="4.5" /><path d="M5.5 12.5 7 16M12 13.5V17M18.5 12.5 17 16" />
      <circle cx="7.3" cy="18" r="1.7" /><circle cx="12" cy="19" r="1.7" /><circle cx="16.7" cy="18" r="1.7" />
    </svg>
  );
}

/** A class badge: icon in the class colour, outlined and dashed for a kind ("a jewel") rather than an individual. */
export function EntityIcon({ cls, id, kind, size = 16 }: { cls: string; id?: string; kind?: boolean; size?: number }) {
  const { dark } = useApp();
  const s = classStyle(cls);
  const colour = s[dark ? "dark" : "light"];
  const Icon = s.icon;
  return (
    <span className={kind ? "entity-icon entity-icon--kind" : "entity-icon"} style={{ color: colour, borderColor: colour }} aria-hidden="true">
      {id && isAnklet(id) ? <AnkletIcon size={size} /> : <Icon size={size} strokeWidth={2} />}
    </span>
  );
}

/** A short line sample in the mood family's dash, the same pattern the edges use. */
export function LineSample({ mood }: { mood: string }) {
  return <svg className="line-sample" width="28" height="8" aria-hidden="true"><line x1="2" y1="4" x2="26" y2="4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={dashArray(familyOf(mood))} /></svg>;
}

export function MoodTag({ mood }: { mood: string }) {
  const { lang } = useApp();
  const family = familyOf(mood);
  const Icon = FAMILY[family].icon;
  return <span className={`mood mood--${family}`}><LineSample mood={mood} /><Icon size={14} aria-hidden="true" />{MOOD_LABEL[mood]?.[lang] ?? mood}</span>;
}

export function EpicMark({ epic }: { epic: string }) {
  const t = useT();
  return <span className={`epic epic--${epic.toLowerCase()}`}>{epic === "MAN" ? t("Maṇimēkalai", "மணிமேகலை") : t("Silappatikāram", "சிலப்பதிகாரம்")}</span>;
}

/**
 * Checked records and unchecked machine drafts must never look alike. A hand record also says whether a scholar has
 * checked it: not yet, checked (with who and when), or disputed (with the reviewer's note).
 */
export function StatusBadge({ draft, review }: { draft?: boolean; review?: Review }) {
  const t = useT();
  if (draft) return <span className="status status--draft"><CircleDashed size={13} aria-hidden="true" />{t("unchecked draft", "சரிபார்க்காத வரைவு")}</span>;
  if (review?.status === "reviewed") {
    const who = [review.by, review.on].filter(Boolean).join(", ");
    return <span className="status status--reviewed" title={review.note || undefined}><BadgeCheck size={13} aria-hidden="true" />{t(`reviewed${who ? ` by ${who}` : ""}`, `சரிபார்த்தவர்: ${who || "அறிஞர்"}`)}</span>;
  }
  if (review?.status === "disputed") {
    return <span className="status status--disputed" title={review.note || undefined}><TriangleAlert size={13} aria-hidden="true" />{t(`disputed${review.by ? ` by ${review.by}` : ""}`, `மறுப்பு: ${review.by ?? "அறிஞர்"}`)}</span>;
  }
  return <span className="status status--record" title={t("Made by hand and checked against the verse by a script. No scholar has reviewed it yet.", "கையால் செய்து நிரலால் வரியுடன் சரிபார்க்கப்பட்டது. அறிஞர் இன்னும் பார்க்கவில்லை.")}><BadgeCheck size={13} aria-hidden="true" />{t("hand record · not yet reviewed", "கைப்பதிவு · இன்னும் சரிபார்க்கவில்லை")}</span>;
}
