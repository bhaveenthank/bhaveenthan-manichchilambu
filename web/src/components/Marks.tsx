import { BadgeCheck, CircleDashed } from "lucide-react";
import { useApp, useT } from "../lib/app";
import { classStyle, dashArray, FAMILY, familyOf, isAnklet } from "../lib/icons";
import { MOOD_LABEL } from "../lib/model";

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
  return <svg className="line-sample" width="22" height="8" aria-hidden="true"><line x1="2" y1="4" x2="20" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray={dashArray(familyOf(mood))} /></svg>;
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

/** Checked records and unchecked machine drafts must never look alike. */
export function StatusBadge({ draft }: { draft?: boolean }) {
  const t = useT();
  return draft
    ? <span className="status status--draft"><CircleDashed size={13} aria-hidden="true" />{t("unchecked draft", "சரிபார்க்காத வரைவு")}</span>
    : <span className="status status--record"><BadgeCheck size={13} aria-hidden="true" />{t("hand record", "கைப்பதிவு")}</span>;
}
