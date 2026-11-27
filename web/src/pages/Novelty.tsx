import {
  ArrowRight,
  Eye,
  HandHelping,
  HelpCircle,
  Layers,
  Link2,
  MessagesSquare,
  MessageSquareText,
  Repeat,
  Route,
  Shapes,
  ShieldCheck,
  Split,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LineSample } from "../components/Marks";
import { RecordList } from "../components/RecordCard";
import { useApp, useName, useT } from "../lib/app";
import { loadNovelty } from "../lib/data";
import type { NoveltyItem } from "../lib/types";

const ICONS: Record<string, LucideIcon> = {
  eye: Eye,
  messages: MessagesSquare,
  layers: Layers,
  route: Route,
  repeat: Repeat,
  split: Split,
  help: HelpCircle,
  shapes: Shapes,
  hand: HandHelping,
  link: Link2,
  chat: MessageSquareText,
  shield: ShieldCheck,
};
const REPRESENTATION: Record<string, [string, string]> = {
  flat_all: ["Plain triples, everything extracted", "எல்லாம் பிரித்த மும்மைகள்"],
  flat_clean: ["Plain triples, claims removed by hand", "கூற்றுகள் நீக்கிய மும்மைகள்"],
  nary: ["Event nodes (n-ary)", "நிகழ்வு முனைகள்"],
  qualified: ["Qualified statements", "தகுதிக் கூற்றுகள்"],
  contexts: ["Named contexts", "பெயரிட்ட சூழல்கள்"],
  standards: ["CIDOC CRM + CRMinf + PROV-O", "CIDOC CRM + CRMinf + PROV-O"],
  ledger: ["This ledger", "இப்பதிவேடு"],
};
const FAMILY_LABEL: Record<string, [string, string, string]> = {
  happened: ["told as fact", "நிகழ்ந்ததாக", "asserted"],
  said: ["said or claimed", "கூறப்பட்டது", "claimed"],
  wanted: ["wanted or ordered", "விரும்பியது / ஆணை", "command"],
  imagined: ["imagined or believed", "கற்பனை / நம்பிக்கை", "dreamed"],
};
const WARRANT: Record<string, [string, string]> = {
  event: ["an event", "நிகழ்வு"],
  same: ["the same person or thing", "அதே நபர் / பொருள்"],
  place: ["the same place (caution)", "அதே இடம் (எச்சரிக்கை)"],
  kind: ["the same kind of thing (caution)", "ஒரே வகை (எச்சரிக்கை)"],
  wider: ["a broader kind (caution)", "பரந்த வகை (எச்சரிக்கை)"],
  gloss: ["a commentator's reading (caution)", "உரையாசிரியர் வாசிப்பு (எச்சரிக்கை)"],
};

export function NoveltyPage() {
  const { lang } = useApp();
  const t = useT();
  const [items, setItems] = useState<NoveltyItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    loadNovelty()
      .then((d) => setItems(d.items))
      .catch(() => setFailed(true));
  }, []);
  const i = lang === "ta" ? 1 : 0;
  return (
    <div className="novelty">
      <header className="section-head">
        <h1>{t("What this graph does that others don't", "மற்ற வரைபடங்கள் செய்யாதவை")}</h1>
        <p>
          {t(
            "Two epics full of lies, oaths, dreams, curses, rebirths and retellings break the usual idea of a knowledge graph, where every edge is simply true. These are the problems that came up while building this one, and how each was solved. Every figure below is computed from the current data when the site is built, not written by hand.",
            "பொய், சபதம், கனவு, சாபம், மறுபிறவி, மறுகூற்று நிறைந்த இரு காப்பியங்கள், ஒவ்வொரு விளிம்பும் உண்மை என்ற வழக்கமான அறிவு வரைபடக் கருத்தை உடைக்கின்றன. இதைக் கட்டும்போது எழுந்த சிக்கல்களும், ஒவ்வொன்றும் தீர்க்கப்பட்ட விதமும் இவை. கீழுள்ள ஒவ்வொரு எண்ணும் தளம் கட்டப்படும்போது தரவிலிருந்து கணக்கிடப்படுகிறது.",
          )}
        </p>
      </header>
      {failed && (
        <p>
          {t("The examples didn't load. ", "எடுத்துக்காட்டுகள் ஏறவில்லை. ")}
          <button
            className="link"
            onClick={() => {
              setFailed(false);
              loadNovelty()
                .then((d) => setItems(d.items))
                .catch(() => setFailed(true));
            }}
          >
            {t("Try again", "மீண்டும் முயல்க")}
          </button>
        </p>
      )}
      {!items && !failed && (
        <div className="skeleton" aria-busy="true">
          <i />
          <i />
          <i />
        </div>
      )}
      {items && (
        <>
          <nav className="novelty__toc" aria-label={t("Contents", "உள்ளடக்கம்")}>
            {items.map((it, n) => {
              const Icon = ICONS[it.icon] ?? Layers;
              return (
                <a
                  key={it.id}
                  href={`#/novelty`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`n-${it.id}`)?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span className="novelty__n">{n + 1}</span>
                  <Icon size={15} aria-hidden="true" />
                  {it.title[i]}
                </a>
              );
            })}
          </nav>
          {items.map((it, n) => (
            <Item key={it.id} item={it} n={n + 1} />
          ))}
          <section className="panel novelty__limits">
            <h2>{t("What these results don't show", "இவை காட்டாதவை")}</h2>
            <ul>
              <li>
                {t(
                  "The hand records are a pilot, and no scholar has checked them yet. The figures describe the method on these records, not the whole of either epic.",
                  "கைப்பதிவுகள் முன்னோட்டம்; அறிஞர் இன்னும் சரிபார்க்கவில்லை. எண்கள் இப்பதிவுகளில் முறையை விவரிக்கின்றன.",
                )}
              </li>
              <li>
                {t(
                  "Some ideas here have roots elsewhere: the fold comes from the event calculus, voice chains from FactBank, contexts from McCarthy. What's new is putting them together for literary voice, mood, viewpoint, rebirth and story time, and keeping them through paths and answers.",
                  "சில கருத்துகளுக்கு வேர்கள் வேறிடத்தில் உண்டு; புதியது அவற்றை இலக்கியக் குரல், தன்மை, கண்ணோட்டம், மறுபிறவி, கதைக் காலத்துக்காக இணைத்து, பாதைகளிலும் விடைகளிலும் காப்பதே.",
                )}
              </li>
              <li>
                {t(
                  "A full CIDOC CRM + CRMinf + PROV-O model answers the representation test as well as the ledger does. The difference is size and effort: the ledger needs fewer statements and no hand-written queries.",
                  "முழு CIDOC CRM மாதிரியும் அதே அளவு சரியாக விடையளிக்கிறது; வேறுபாடு அளவும் முயற்சியும்.",
                )}
              </li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Item({ item: it, n }: { item: NoveltyItem; n: number }) {
  const { lang, corpus } = useApp();
  const t = useT();
  const name = useName();
  const i = lang === "ta" ? 1 : 0;
  const Icon = ICONS[it.icon] ?? Layers;
  const value = typeof it.figure.value === "number" ? it.figure.value.toLocaleString() : it.figure.value;
  return (
    <section className="novelty__item panel" id={`n-${it.id}`} aria-labelledby={`n-${it.id}-h`}>
      <header className="novelty__head">
        <span className="novelty__icon">
          <Icon size={20} aria-hidden="true" />
        </span>
        <h2 id={`n-${it.id}-h`}>
          <span className="novelty__n">{n}</span>
          {it.title[i]}
        </h2>
      </header>
      <div className="novelty__figure">
        <b>{value}</b>
        <span>{it.figure.label[i]}</span>
      </div>
      <div className="novelty__grid">
        <div className="novelty__cell novelty__cell--problem">
          <h3>{t("In an ordinary knowledge graph", "சாதாரண அறிவு வரைபடத்தில்")}</h3>
          <p>{it.problem[i]}</p>
        </div>
        <div className="novelty__cell novelty__cell--answer">
          <h3>{t("Here", "இங்கே")}</h3>
          <p>{it.answer[i]}</p>
        </div>
        <div className="novelty__cell">
          <h3>{t("How it works", "எப்படி இயங்குகிறது")}</h3>
          <p>{it.how[i]}</p>
        </div>
      </div>

      {it.beliefs && (
        <>
          <h3 className="sub">
            {t("Every recorded belief, replayed through story time", "பதிவான ஒவ்வொரு நம்பிக்கையும், கதைக் காலத்தில்")}
          </h3>
          <div className="table-wrap">
            <table className="novelty__table">
              <thead>
                <tr>
                  <th>{t("Who", "யார்")}</th>
                  <th>{t("Believes", "நம்புவது")}</th>
                  <th>{t("Stance", "நிலை")}</th>
                  <th>{t("Story time", "கதைக் காலம்")}</th>
                  <th>{t("What the text tells", "நூல் கூறுவது")}</th>
                </tr>
              </thead>
              <tbody>
                {it.beliefs.map((b) => (
                  <tr key={b.record}>
                    <td>{name(b.holder)}</td>
                    <td>
                      <a href={`#/record/${b.claim}`}>{b.claim}</a> <span className="fine">({b.claim_mood})</span>
                    </td>
                    <td>{b.stance === "accept" ? t("accepts", "ஏற்கிறார்") : t("gives it up", "கைவிடுகிறார்")}</td>
                    <td className="mono">{b.t}</td>
                    <td>
                      {b.object ? (
                        t(
                          `${name(b.object)}: with ${b.in_the_text?.map(name).join(", ") || "nobody"}. In their view: ${b.in_their_view?.map(name).join(" and ")}`,
                          `${name(b.object)}: ${b.in_the_text?.map(name).join(", ")} இடம். அவர் பார்வையில்: ${b.in_their_view?.map(name).join(", ")}`,
                        )
                      ) : (
                        <span>{corpus.byId.get(b.claim)?.[lang] ?? b.claim}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {it.naive_only?.length ? (
            <p className="fine">
              {t(
                "Replaying every record as if all were true adds one false fact to the world: ",
                "எல்லாப் பதிவுகளையும் உண்மையாக ஓட்டினால் உலகில் ஒரு பொய் உண்மை சேரும்: ",
              )}
              <code>{it.naive_only.join(", ")}</code>
              {t(", the goldsmith's lie. The ledger never adds it.", ", பொற்கொல்லனின் பொய். பதிவேடு அதைச் சேர்ப்பதில்லை.")}
            </p>
          ) : null}
        </>
      )}
      {it.representations && (
        <>
          <h3 className="sub">
            {t(
              "The same held-out questions, answered from each way of storing the story",
              "ஒரே மறைத்த கேள்விகள், கதையைச் சேமிக்கும் ஒவ்வொரு முறையிலும்",
            )}
          </h3>
          <div className="table-wrap">
            <table className="novelty__table">
              <thead>
                <tr>
                  <th>{t("Representation", "முறை")}</th>
                  <th>{t("Right", "சரி")}</th>
                  <th>{t("Claims given as fact", "உண்மையாகக் கூறிய கூற்றுகள்")}</th>
                  <th>{t("Statements", "கூற்றுகள்")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(it.representations).map(([k, v]) => (
                  <tr key={k} className={k === "ledger" ? "novelty__row--ours" : ""}>
                    <td>{REPRESENTATION[k]?.[i] ?? k}</td>
                    <td>{Math.round(v.accuracy * 100)}%</td>
                    <td>{Math.round(v.claims_as_fact * 100)}%</td>
                    <td>{v.statements.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {it.depth && (
        <Bars
          data={Object.fromEntries(
            Object.entries(it.depth).map(([k, v]) => [
              t(k === "1" ? "the poet alone" : `${k} voices deep`, k === "1" ? "புலவர் மட்டும்" : `${k} குரல் ஆழம்`),
              v,
            ]),
          )}
        />
      )}
      {it.families && (
        <ul className="novelty__families">
          {Object.entries(FAMILY_LABEL).map(([k, [en, ta, mood]]) => (
            <li key={k}>
              <LineSample mood={mood} />
              <b>{(it.families![k] ?? 0).toLocaleString()}</b> {lang === "ta" ? ta : en}
            </li>
          ))}
        </ul>
      )}
      {it.mutations && (
        <p className="fine">
          {t(
            `Mutation test: ${it.mutations.caught} of ${it.mutations.mutations} kinds of damage caught, ${it.mutations.false_alarms} false alarms. Still missed: ${it.mutations.missed.map((m) => m.replace(/_/g, " ")).join(", ")}, which need a reader or the judge.`,
            `${it.mutations.mutations} சேத வகைகளில் ${it.mutations.caught} பிடிபட்டன; தவறான எச்சரிக்கை ${it.mutations.false_alarms}.`,
          )}
        </p>
      )}
      {it.warrants && (
        <Bars
          data={Object.fromEntries(Object.entries(it.warrants).map(([k, v]) => [WARRANT[k]?.[i] ?? k, v]))}
          caption={t("Steps in the discovered paths, by warrant", "கண்ட பாதைகளின் படிகள், உத்தரவாதப்படி")}
        />
      )}
      {it.tempting?.length ? (
        <>
          <h3 className="sub">{t("Tempting connections the guards flag", "காவல் எச்சரிக்கும் கவர்ச்சியான இணைப்புகள்")}</h3>
          <ul className="novelty__list">
            {it.tempting.map((x) => (
              <li key={x.pair.join()}>
                <b>{x.pair.map(name).join(" ↔ ")}</b>: {t("a plain search would suggest ", "சாதாரணத் தேடல் கூறும்: ")}“{x.false_reading}”.{" "}
                {x.flagged
                  ? t("Flagged: it rests on ", "எச்சரிக்கை: இது சார்ந்திருப்பது ") +
                    x.warrants
                      .filter((w) => w !== "event")
                      .map((w) => WARRANT[w]?.[i] ?? w)
                      .join(", ")
                  : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {it.lives && (
        <Bars
          data={Object.fromEntries(
            Object.entries(it.lives).map(([k, v]) => [
              k === "main"
                ? t("this life", "இப்பிறவி")
                : k.replace("prev_", t("earlier birth: ", "முற்பிறவி: ")).replace("other_births", t("other births", "பிற பிறவிகள்")),
              v,
            ]),
          )}
        />
      )}
      {it.gaps && (
        <ul className="novelty__list">
          {it.gaps.map((g) => (
            <li key={g.q[0]}>
              <b>{g.q[i]}</b> {g.a[i]}{" "}
              <span className="gap__no">
                {t("Tempting and wrong: ", "தவறான ஊகம்: ")}
                <s>{g.tempting[i]}</s>
              </span>
            </li>
          ))}
        </ul>
      )}
      {it.figurative?.length ? (
        <>
          <p className="fine">
            {t(`${it.kinds} nodes are kinds, not individuals. Lines by sense: `, `${it.kinds} முனைகள் வகைகள். வரிகள் பொருள்வகைப்படி: `)}
            {Object.entries(it.senses ?? {})
              .map(([k, v]) => `${k} ${v.toLocaleString()}`)
              .join(" · ")}
          </p>
          <ul className="novelty__list">
            {it.figurative.map((f) => (
              <li key={f.line}>
                <a className="verse__id" href={`#/songs/${f.line.slice(0, 6)}?line=${f.line}`}>
                  {f.line}
                </a>{" "}
                {f.gist}{" "}
                <span className="fine">
                  {t("(figurative: no jewel is added to the world)", "(உருவகம்: அணி எதுவும் சேர்க்கப்படுவதில்லை)")}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {it.pairs && (
        <ul className="novelty__list" lang="ta">
          {it.pairs.map((p) => (
            <li key={p.a + p.b}>
              <a className="verse__id" href={`#/songs/${p.a.slice(0, 6)}?line=${p.a}`}>
                {p.a}
              </a>{" "}
              {p.ta}
              <br />
              <a className="verse__id" href={`#/songs/${p.b.slice(0, 6)}?line=${p.b}`}>
                {p.b}
              </a>{" "}
              {p.tb}
            </li>
          ))}
        </ul>
      )}
      {it.tiers && <Tiers tiers={it.tiers} />}
      {it.records?.length ? (
        <details className="novelty__records">
          <summary>
            {t("The records behind this", "இதன் பின்னுள்ள பதிவுகள்")} ({it.records.length})
          </summary>
          <RecordList ids={it.records} compact />
        </details>
      ) : null}
      {it.link && (
        <a className="link novelty__see" href={it.link}>
          {t("See it working", "இயங்குவதைப் பாருங்கள்")}
          <ArrowRight size={15} aria-hidden="true" />
        </a>
      )}
    </section>
  );
}

function Bars({ data, caption }: { data: Record<string, number>; caption?: string }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <figure className="novelty__bars">
      {caption && <figcaption className="fine">{caption}</figcaption>}
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="novelty__bar">
          <span>{k}</span>
          <i style={{ width: `${Math.max(2, (v / max) * 100)}%` }} />
          <b>{v.toLocaleString()}</b>
        </div>
      ))}
    </figure>
  );
}

function Tiers({ tiers }: { tiers: NonNullable<NoveltyItem["tiers"]> }) {
  const t = useT();
  const pct = (x: number) => `${Math.round((x / tiers.lines) * 100)}%`;
  const rows: [string, number, string][] = [
    [t("cited by hand records", "கைப்பதிவுகள் சுட்டுபவை"), tiers.hand, "hand"],
    [
      t("checked by a second model, or by a reader", "இரண்டாம் மாதிரி அல்லது வாசகர் சரிபார்த்தவை"),
      Math.max(tiers.checked, tiers.reviewed),
      "checked",
    ],
    [t("in a machine draft", "இயந்திர வரைவில்"), tiers.drafted, "drafted"],
    [t("read and given a note", "படித்துக் குறிக்கப்பட்டவை"), tiers.noted, "noted"],
  ];
  return (
    <div className="novelty__tiers">
      {rows.map(([label, v, cls]) => (
        <div key={cls} className={`novelty__tier novelty__tier--${cls}`}>
          <span>{label}</span>
          <i style={{ width: pct(v) }} />
          <b>
            {v.toLocaleString()} · {pct(v)}
          </b>
        </div>
      ))}
    </div>
  );
}
