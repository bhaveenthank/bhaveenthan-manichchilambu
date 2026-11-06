import { useEffect, useMemo, useState } from "react";
import { GraphCanvas } from "../components/GraphCanvas";
import { ReadLink, RecordList } from "../components/RecordCard";
import { go, useApp, useT } from "../lib/app";
import { ask, verseMatches, type Answer } from "../lib/ask";
import { loadSearch } from "../lib/data";
import { recordsToSubgraph } from "../lib/model";

const EXAMPLES = [
  { group: ["Did it really happen?", "உண்மையில் நடந்ததா?"], items: ["Did Kovalan steal the queen's anklet?", "சங்கமன் உண்மையில் ஒற்றனா?", "Is the king a thief?"] },
  { group: ["Who and why", "யார், ஏன்"], items: ["கோவலனைக் கொன்றது யார்?", "Why did Kovalan die?", "udayakumaran ah yaar kondra"] },
  { group: ["Across the two epics", "இரு காப்பியங்களுக்கு இடையே"], items: ["மணிமேகலைக்கும் கண்ணகிக்கும் என்ன தொடர்பு?", "What connects the two epics?", "kovalan sangaman thodarbu"] },
  { group: ["Things and where they came from", "பொருளும் மூலமும்"], items: ["Who made Kannagi's anklet?", "கண்ணகி சமைத்த உணவு எங்கு விளைந்தது?", "Who built the gold pavilion?", "Is the drummer from Vachirakottam?"] },
  { group: ["Minds, things, births", "மனம், பொருள், பிறப்பு"], items: ["What did Kanchanan believe?", "amudhasurabhi yaar kitta irundhuchu", "கோவலனின் முற்பிறப்பு என்ன?"] },
];

type Kind = "answered" | "not_stated" | "closest" | "none";
const kindOf = (a: Answer): Kind => (!a.found ? "none" : a.type === "not_stated" ? "not_stated" : a.type === "closest" ? "closest" : "answered");

// A different mark for each kind of reply, so a near miss never looks like an answer.
const ICONS: Record<Kind, string> = {
  answered: "M4 10.5l4 4 8-9",
  not_stated: "M10 3a7 7 0 100 14 7 7 0 000-14zM6.5 10h7",
  closest: "M3 10h3m2.5 0h3m2.5 0h3",
  none: "M5 5l10 10M15 5L5 15",
};
const KIND_LABEL: Record<Kind, [string, string]> = {
  answered: ["Answer, from the records", "பதிவுகளிலிருந்து விடை"],
  not_stated: ["Not stated in the passages read", "படித்த பகுதிகளில் கூறப்படவில்லை"],
  closest: ["Closest match, not an answer", "நெருக்கமானது மட்டும், விடை அல்ல"],
  none: ["No answer in the graph", "வரைபடத்தில் விடை இல்லை"],
};

// Rules build some answers from node names, which can start in lower case ("a drunk man").
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function AskPage({ question }: { question: string }) {
  const { corpus, lang } = useApp();
  const t = useT();
  const [text, setText] = useState(question);
  const [verses, setVerses] = useState<[string, string][]>([]);
  useEffect(() => setText(question), [question]);
  const answer = useMemo(() => (question ? ask(corpus, question) : null), [corpus, question]);
  useEffect(() => {
    setVerses([]);
    if (answer && !answer.records.length) loadSearch().then((rows) => setVerses(verseMatches(rows, question)));
  }, [answer, question]);
  const small = useMemo(() => (answer?.records.length ? recordsToSubgraph(corpus, answer.records, answer.focus.filter((id) => corpus.nodeById.has(id))) : null), [answer, corpus]);
  // Tamil question, Tamil first. Anything else, English first. Both are always shown.
  const taFirst = answer ? answer.lang === "ta" : lang === "ta";
  const kind = answer ? kindOf(answer) : "none";
  const closestLead = { en: "No rule fits this question exactly. The closest thing the graph records:", ta: "இந்தக் கேள்விக்கு நேரடி விதி இல்லை. வரைபடத்தில் மிக நெருக்கமானது:" };
  const show = (side: "en" | "ta") => {
    if (!answer) return "";
    const raw = answer.headline[side];
    const body = kind === "closest" ? raw.replace(closestLead[side], "").trim() : raw;
    return side === "en" ? capital(body) : body;
  };
  return (
    <div className="ask">
      <header className="section-head">
        <h1>{t("Ask the epics", "காப்பியங்களிடம் கேளுங்கள்")}</h1>
        <p>{t("Tamil, English or Thanglish. Answers come only from the graph's records, each with its verse. If the graph doesn't know, it says so.", "தமிழ், ஆங்கிலம் அல்லது தங்கிலீஷ். விடைகள் வரைபடப் பதிவுகளிலிருந்து மட்டுமே வரும்; ஒவ்வொன்றுக்கும் பாடல் வரி உண்டு. தெரியாவிட்டால் தெரியாது என்றே கூறும்.")}</p>
      </header>
      <form className="ask-box" onSubmit={(e) => { e.preventDefault(); if (text.trim()) go(`/ask?q=${encodeURIComponent(text)}`); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Who killed Kovalan? · கோவலனைக் கொன்றது யார்? · kovalan ah yaar kondra?", "கோவலனைக் கொன்றது யார்? · Who killed Kovalan?")} aria-label={t("Your question", "உங்கள் கேள்வி")} />
        <button type="submit">{t("Ask", "கேள்")}</button>
      </form>
      {answer && (
        <section className="answer" aria-live="polite">
          <div className={`answer__head${kind === "answered" ? "" : kind === "not_stated" ? " answer__head--gap" : kind === "closest" ? " answer__head--closest" : " answer__head--none"}`}>
            <p className="answer__kind"><svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d={ICONS[kind]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>{lang === "ta" ? KIND_LABEL[kind][1] : KIND_LABEL[kind][0]}</p>
            {kind === "closest" && <p className="answer__note" style={{ marginTop: 0, marginBottom: 8 }}>{t("No rule fits this question. This record shares words with it, and may not answer it at all.", "இக்கேள்விக்கு விதி இல்லை. இப்பதிவு சில சொற்களைப் பகிர்கிறது; விடையாக இல்லாமலும் இருக்கலாம்.")}</p>}
            <p className="answer__main" lang={taFirst ? "ta" : "en"}>{show(taFirst ? "ta" : "en")}</p>
            <p className="answer__second" lang={taFirst ? "en" : "ta"}>{show(taFirst ? "en" : "ta")}</p>
            {answer.note && kind !== "closest" && <p className="answer__note">{lang === "ta" ? answer.note.ta : answer.note.en}</p>}
          </div>
          {small && small.nodes.length > 0 && (
            <div className="answer__graph">
              {/* Keyed by the question so a new question always gets a freshly built graph. */}
              <GraphCanvas key={question} data={small} compact edgeLabels ariaLabel={t("Small graph of the people and things in this answer", "இந்த விடையில் உள்ளவர்களின் சிறு வரைபடம்")} />
              <a className="link" href={`#/graph?focus=${answer.focus[0] ?? answer.entities[0] ?? ""}`}>{t("Open in the full graph", "முழு வரைபடத்தில் திறக்க")} →</a>
            </div>
          )}
          {answer.records.length > 0 && <h2 className="sub">{kind === "closest" ? t("Records that share words with the question", "கேள்வியுடன் சொற்களைப் பகிரும் பதிவுகள்") : t("Where this comes from", "இது எங்கிருந்து வருகிறது")} <span className="count-badge">{answer.records.length}</span></h2>}
          {answer.groups?.length
            ? answer.groups.map((g) => <div key={g.label.en}><p className="group-label"><b>{lang === "ta" ? g.label.ta : g.label.en}</b>{g.records.length}</p><RecordList ids={g.records} /></div>)
            : answer.records.length > 0 && <RecordList ids={answer.records} />}
          {verses.length > 0 && (
            <><h2 className="sub">{t("Verses with these words", "இந்தச் சொற்கள் உள்ள வரிகள்")}</h2>
              <blockquote className="verse" lang="ta">{verses.map(([id, line]) => <a key={id} className="verse__line" href={`#/songs/${id.slice(0, 6)}?line=${id}`}><span className="verse__text">{line}</span><span className="verse__id">{id}</span></a>)}</blockquote>
              <ReadLink line={verses[0][0]} /></>
          )}
        </section>
      )}
      {!answer && (
        <div className="examples">
          {EXAMPLES.map((g) => (
            <div key={g.group[0]}><h2 className="sub">{lang === "ta" ? g.group[1] : g.group[0]}</h2>
              {g.items.map((q) => <button key={q} className="example" onClick={() => go(`/ask?q=${encodeURIComponent(q)}`)}>{q}</button>)}</div>
          ))}
        </div>
      )}
      <p className="fine">{t(`The graph holds ${corpus.records.length} records so far, a pilot and not the whole of either epic, so plenty of fair questions won't have an answer yet.`, `வரைபடத்தில் இப்போது ${corpus.records.length} பதிவுகள் மட்டுமே உள்ளன; பல நியாயமான கேள்விகளுக்கு இன்னும் விடை இருக்காது.`)}</p>
    </div>
  );
}
