import { CautionIcon } from "../lib/icons";
import { useApp, useT } from "../lib/app";
import { CAUTION, WARRANT_HELP, WARRANT_NAMES } from "../lib/discover";

/** The one place the link words are explained. Dashed amber marks a link that only suggests a connection. */
export function LinkKey() {
  const { lang } = useApp();
  const t = useT();
  const i = lang === "ta" ? 1 : 0;
  return (
    <section className="link-key" aria-label={t("What the link labels mean", "இணைப்புக் குறிகளின் பொருள்")}>
      <h3>{t("What the link labels mean", "இணைப்புக் குறிகளின் பொருள்")}</h3>
      <dl>
        {Object.keys(WARRANT_NAMES).map((k) => (
          <div key={k} style={{ display: "contents" }}>
            <dt><i className={CAUTION.has(k) ? "caution" : ""}>{CAUTION.has(k) && <CautionIcon size={12} aria-hidden="true" />}{WARRANT_NAMES[k][i]}</i></dt>
            <dd>{WARRANT_HELP[k][i]}</dd>
          </div>
        ))}
      </dl>
      <p className="fine" style={{ marginTop: 10 }}>{t("A dashed amber border with a warning sign means caution: the link suggests a connection and doesn't prove one. A solid border is a strong link. A path is never stronger than its weakest step.", "எச்சரிக்கைக் குறியுடன் புள்ளிக்கோட்டு மஞ்சள் எல்லை: தொடர்பைச் சுட்டுகிறது, நிரூபிக்கவில்லை. முழுக் கோடு வலுவான இணைப்பு. பாதை அதன் பலவீனமான படியை விட வலுவானது அல்ல.")}</p>
    </section>
  );
}
