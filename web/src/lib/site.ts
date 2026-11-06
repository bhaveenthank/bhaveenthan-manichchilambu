// Who to write to about the site. Change it here and every "Suggest a correction" link follows.
export const CONTACT_EMAIL = "e22051@eng.pdn.ac.lk";

/** A ready-to-send email about one record, so a reader only has to say what's wrong. */
export function correctionLink(about: string, lines: string[]) {
  const subject = `Maṇichchilambu correction: ${about}`;
  const body = `Record or page: ${about}\nLines: ${lines.join(", ")}\nPage: ${location.href}\n\nWhat looks wrong, and how you'd read it:\n\n`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** "SIL-16-0212" to "Silappatikāram, canto 16". */
export function cantoName(lineId: string, lang: "en" | "ta") {
  const n = Number(lineId.slice(4, 6));
  const sil = lineId.startsWith("SIL");
  if (lang === "ta") return `${sil ? "சிலப்பதிகாரம்" : "மணிமேகலை"}, ${n ? `காதை ${n}` : "பதிகம்"}`;
  return `${sil ? "Silappatikāram" : "Maṇimēkalai"}, ${n ? `canto ${n}` : "prologue"}`;
}

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
