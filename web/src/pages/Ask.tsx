import { ArrowRight, Download, Search, SearchCheck, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GraphCanvas } from "../components/GraphCanvas";
import { InspectContext } from "../components/inspectContext";
import { Inspector } from "../components/Inspector";
import { EntityIcon, LineSample, StatusBadge } from "../components/Marks";
import { RecordList } from "../components/RecordCard";
import { go, useApp, useT } from "../lib/app";
import { loadRetrieval } from "../lib/data";
import { answerQuestion, evidencePackage, type EvidenceClass, type HybridAnswer, type RetrievalData } from "../lib/hybrid";
import { ANSWER_ICON, FAMILY } from "../lib/icons";
import { recordsToSubgraph } from "../lib/model";
import { INTENT_LABEL } from "../lib/plan";

const EXAMPLES = [
  { group: ["Did it really happen?", "உண்மையில் நடந்ததா?"], items: ["Did Kovalan steal the queen's anklet?", "சங்கமன் உண்மையில் ஒற்றனா?", "Is the king a thief?"] },
  { group: ["Who and why", "யார், ஏன்"], items: ["கோவலனைக் கொன்றது யார்?", "Why did Kovalan die?", "udayakumaran ah yaar kondra"] },
  { group: ["Across the two epics", "இரு காப்பியங்களுக்கு இடையே"], items: ["மணிமேகலைக்கும் கண்ணகிக்கும் என்ன தொடர்பு?", "What connects the two epics?", "kovalan sangaman thodarbu"] },
  { group: ["Things and where they came from", "பொருளும் மூலமும்"], items: ["Who made Kannagi's anklet?", "கண்ணகி சமைத்த உணவு எங்கு விளைந்தது?", "Who built the gold pavilion?", "Is the drummer from Vachirakottam?"] },
  { group: ["Minds, things, births", "மனம், பொருள், பிறப்பு"], items: ["What did Kanchanan believe?", "amudhasurabhi yaar kitta irundhuchu", "கோவலனின் முற்பிறப்பு என்ன?"] },
  { group: ["Anything else in the text", "நூலில் உள்ள வேறு எதுவும்"], items: ["Where did Aputhiran leave the bowl?", "What was sold in the cloth street?", "நீலி தெருக்களில் என்ன செய்தாள்?", "What did Kannagi ask the Sun?"] },
];

type Kind = "answered" | "searched" | "not_stated" | "closest" | "none" | "ambiguous";
// Only a rule written for the question earns the green box. An answer the search found may be right or wrong,
// so it gets amber, like a near miss, and says how it was found.
const kindOf = (a: HybridAnswer): Kind => (a.type === "ambiguous" ? "ambiguous" : !a.found ? "none" : a.type === "not_stated" ? "not_stated" : a.type === "closest" ? "closest" : a.route === "hybrid" ? "searched" : "answered");

// A different mark, border and colour for each kind of reply, so a near miss never looks like an answer.
const KIND_LABEL: Record<Kind, [string, string]> = {
  answered: ["Answer, from the records", "பதிவுகளிலிருந்து விடை"],
  searched: ["Found by search: check the verses below", "தேடலில் கிடைத்தது: கீழுள்ள வரிகளைச் சரிபாருங்கள்"],
  not_stated: ["Not stated in the passages read", "படித்த பகுதிகளில் கூறப்படவில்லை"],
  closest: ["Closest match, not an answer", "நெருக்கமானது மட்டும், விடை அல்ல"],
  none: ["No answer in the graph", "வரைபடத்தில் விடை இல்லை"],
  ambiguous: ["Which one do you mean?", "யாரைக் கேட்கிறீர்கள்?"],
};
const CLASS_LABEL: Record<EvidenceClass, [string, string, string, string]> = {
  happened: ["Told as fact", "நிகழ்ந்ததாகக் கூறப்பட்டவை", "The poet or the text tells these as having happened.", "புலவர் அல்லது நூல் நிகழ்ந்ததாகக் கூறுபவை."],
  said: ["Said or claimed by someone", "ஒருவர் கூறியவை", "Someone in the story says these. Saying so doesn't make them true.", "கதையில் ஒருவர் கூறுபவை. கூறியதால் உண்மையாகாது."],
  wanted: ["Wanted, ordered or planned", "விரும்பியவை, ஆணையிட்டவை", "Orders, wishes and plans. They may never have been carried out.", "ஆணைகள், விருப்பங்கள், திட்டங்கள். நிறைவேறாமலும் இருக்கலாம்."],
  imagined: ["Imagined, dreamed or figurative", "கற்பனை, கனவு, உருவகம்", "Dreams, figures of speech and conditions, not events.", "கனவுகள், உருவகங்கள், நிபந்தனைகள்; நிகழ்வுகள் அல்ல."],
  belief: ["Believed by someone", "ஒருவர் நம்பியவை", "What a character believed at that point in the story, true or not.", "கதையின் அந்த இடத்தில் ஒருவர் நம்பியது, உண்மையோ இல்லையோ."],
};
type Mode = "read" | "investigate" | "research";
const savedMode = (): Mode => { try { const m = localStorage.getItem("askMode"); return m === "read" || m === "research" ? m : "investigate"; } catch { return "investigate"; } };

// Rules build some answers from node names, which can start in lower case ("a drunk man").
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const LEADS = [
  { en: "No rule fits this question exactly. The closest thing the graph records:", ta: "இந்தக் கேள்விக்கு நேரடி விதி இல்லை. வரைபடத்தில் மிக நெருக்கமானது:" },
  { en: "No record answers this directly. The closest thing the graph records:", ta: "இதற்கு நேரடியாக விடை தரும் பதிவு இல்லை. வரைபடத்தில் மிக நெருக்கமானது:" },
];

export function AskPage({ question }: { question: string }) {
  const { corpus, lang } = useApp();
  const t = useT();
  const [text, setText] = useState(question);
  const [data, setData] = useState<RetrievalData | null>(null);
  const [failed, setFailed] = useState(false);
  const [mode, setModeState] = useState<Mode>(savedMode);
  const [inspect, setInspect] = useState<{ line: string; gist?: string | null } | null>(null);
  const setMode = (m: Mode) => { setModeState(m); try { localStorage.setItem("askMode", m); } catch { /* it just won't be remembered */ } };
  useEffect(() => setText(question), [question]);
  useEffect(() => { setInspect(null); }, [question]);
  // The hand records answer at once; every line and the drafts follow when their file arrives.
  useEffect(() => { if (question) loadRetrieval().then(setData).catch(() => setFailed(true)); }, [question]);
  const answer = useMemo(() => (question ? answerQuestion(corpus, question, data) : null), [corpus, question, data]);
  const small = useMemo(() => (answer?.records.length ? recordsToSubgraph(corpus, answer.records.slice(0, 8), answer.focus.filter((id) => corpus.nodeById.has(id))) : null), [answer, corpus]);
  const openLine = useCallback((line: string) => setInspect({ line, gist: data?.notes[line]?.[0] ?? null }), [data]);
  // Tamil question, Tamil first. Anything else, English first. Both are always shown.
  const taFirst = answer ? answer.lang === "ta" : lang === "ta";
  const kind = answer ? kindOf(answer) : "none";
  const show = (side: "en" | "ta") => {
    if (!answer) return "";
    let body = answer.headline[side];
    if (kind === "closest") for (const l of LEADS) body = body.replace(l[side], "").trim();
    return side === "en" ? capital(body) : body;
  };
  const shown = mode === "read" ? 3 : 12;
  const inGroups = new Set(answer?.groups?.flatMap((g) => g.records) ?? []);
  const download = () => {
    if (!answer) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(evidencePackage(corpus, answer), null, 1)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = "manichchilambu-evidence.json"; a.click();
    URL.revokeObjectURL(url);
  };
  const KindIcon = kind === "ambiguous" ? Users : kind === "searched" ? SearchCheck : ANSWER_ICON[kind];

  return (
    <InspectContext.Provider value={openLine}>
      <div className={inspect ? "ask ask--inspecting" : "ask"}>
        <header className="section-head">
          <h1>{t("Ask the epics", "காப்பியங்களிடம் கேளுங்கள்")}</h1>
          <p>{t("Tamil, English or Thanglish, about anything in the two epics. Answers come only from the graph's records, each with its verse. What someone only said, ordered or dreamed is kept apart from what the text tells as fact. If the graph doesn't know, it says so.", "இரு காப்பியங்களில் உள்ள எதைப் பற்றியும் தமிழ், ஆங்கிலம் அல்லது தங்கிலீஷில் கேளுங்கள். விடைகள் வரைபடப் பதிவுகளிலிருந்து மட்டுமே; ஒவ்வொன்றுக்கும் பாடல் வரி உண்டு. ஒருவர் கூறியது, ஆணையிட்டது, கனவு கண்டது நிகழ்ந்ததிலிருந்து தனியாக வைக்கப்படும். தெரியாவிட்டால் தெரியாது என்றே கூறும்.")}</p>
        </header>
        <form className="ask-box" onSubmit={(e) => { e.preventDefault(); if (text.trim()) go(`/ask?q=${encodeURIComponent(text)}`); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Who killed Kovalan? · கோவலனைக் கொன்றது யார்? · kovalan ah yaar kondra?", "கோவலனைக் கொன்றது யார்? · Who killed Kovalan?")} aria-label={t("Your question", "உங்கள் கேள்வி")} />
          <button type="submit"><Search size={16} aria-hidden="true" />{t("Ask", "கேள்")}</button>
        </form>

        {answer && (
          <>
            <div className="ask-bar">
              {/* How the question was read, so a misreading shows before the answer does. */}
              <p className="plan" aria-label={t("How the question was read", "கேள்வி புரிந்துகொள்ளப்பட்ட விதம்")}>
                <span className="plan__label">{t("Read as", "புரிந்தது")}</span>
                <span className="tag">{lang === "ta" ? INTENT_LABEL[answer.plan.intent][1] : INTENT_LABEL[answer.plan.intent][0]}</span>
                {answer.plan.entities.map((e) => <span key={e.id} className="tag" title={e.confidence === "low" ? t("A guess: the name fits more than one", "ஊகம்: பெயர் பலருக்குப் பொருந்தும்") : undefined}><EntityIcon cls={e.cls} id={e.id} size={12} />{corpus.nodeById.get(e.id)?.[lang] ?? e.id}{e.confidence === "low" ? " ?" : ""}</span>)}
                {answer.plan.epic && <span className="tag">{answer.plan.epic === "SIL" ? t("in Silappatikāram", "சிலப்பதிகாரத்தில்") : t("in Maṇimēkalai", "மணிமேகலையில்")}</span>}
                <span className="plan__route">{answer.route === "rule" ? t("answered by a rule written for this kind of question, checked against a search", "இவ்வகைக் கேள்விக்கான விதி விடை தந்தது; தேடலுடன் சரிபார்க்கப்பட்டது") : t("found by searching the records, the graph and every line", "பதிவுகள், வரைபடம், எல்லா வரிகளையும் தேடிக் கண்டது")}</span>
              </p>
              <div className="segmented ask-modes" role="group" aria-label={t("How much to show", "எவ்வளவு காட்டுவது")}>
                {([["read", "Read", "படிக்க"], ["investigate", "Investigate", "ஆராய"], ["research", "Research", "ஆய்வு"]] as const).map(([m, en, ta]) => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{lang === "ta" ? ta : en}</button>)}
              </div>
            </div>

            <section className="answer" aria-live="polite">
              <div className={`answer__head${kind === "answered" ? "" : kind === "not_stated" || kind === "ambiguous" ? " answer__head--gap" : kind === "closest" ? " answer__head--closest" : kind === "searched" ? " answer__head--searched" : " answer__head--none"}`}>
                <p className="answer__kind"><KindIcon size={20} aria-hidden="true" />{lang === "ta" ? KIND_LABEL[kind][1] : KIND_LABEL[kind][0]}</p>
                {kind === "closest" && <p className="answer__note">{t("No rule or record fits this question exactly. This shares words with it, and may not answer it at all.", "இக்கேள்விக்குச் சரியாகப் பொருந்தும் விதியோ பதிவோ இல்லை. இது சில சொற்களைப் பகிர்கிறது; விடையாக இல்லாமலும் இருக்கலாம்.")}</p>}
                <p className="answer__main" lang={taFirst ? "ta" : "en"}>{show(taFirst ? "ta" : "en")}</p>
                <p className="answer__second" lang={taFirst ? "en" : "ta"}>{show(taFirst ? "en" : "ta")}</p>
                {kind === "ambiguous" && (
                  <div className="chips">{answer.plan.ambiguous.filter((a) => !a.resolvedTo).flatMap((a) => a.options.map((id) => {
                    const n = corpus.nodeById.get(id)!;
                    return <button key={id} className="chip" onClick={() => go(`/ask?q=${encodeURIComponent(question.replace(new RegExp(a.surface, "i"), n.en.replace(/^the /i, "")))}`)}><EntityIcon cls={n.cls} id={n.id} size={13} />{n[lang]} <span className="fine">{n.epics.join(" + ")}</span></button>;
                  }))}</div>
                )}
                {answer.plan.ambiguous.filter((a) => a.resolvedTo).map((a) => <p key={a.surface} className="answer__note">{t(`“${a.surface}” fits more than one person; taken as ${corpus.nodeById.get(a.resolvedTo!)?.en}, ${a.why?.en}.`, `“${a.surface}” பலருக்குப் பொருந்தும்; ${corpus.nodeById.get(a.resolvedTo!)?.ta} எனக் கொள்ளப்பட்டது (${a.why?.ta}).`)}</p>)}
                {answer.note && kind !== "closest" && <p className="answer__note">{lang === "ta" ? answer.note.ta : answer.note.en}</p>}
              </div>

              {small && small.nodes.length > 0 && (
                <div className="answer__graph answer__graph--top"><h2 className="sub">{t("The answer as a graph", "விடை வரைபடமாக")}</h2>
                  {/* Keyed by the question so a new question always gets a freshly built graph. */}
                  <GraphCanvas key={question} data={small} compact edgeLabels ariaLabel={t("Small graph of the people and things in this answer", "இந்த விடையில் உள்ளவர்களின் சிறு வரைபடம்")} />
                  <a className="link" href={`#/graph?focus=${answer.focus[0] ?? answer.entities[0] ?? ""}`}>{t("Open in the full graph", "முழு வரைபடத்தில் திறக்க")}<ArrowRight size={15} aria-hidden="true" /></a>
                </div>
              )}
              {answer.records.length > 0 && <h2 className="sub">{kind === "closest" ? t("Records that share words with the question", "கேள்வியுடன் சொற்களைப் பகிரும் பதிவுகள்") : t("Where this comes from", "இது எங்கிருந்து வருகிறது")} <span className="count-badge">{Math.min(answer.records.length, shown)}</span></h2>}
              {answer.groups?.length ? (
                <>
                  {answer.groups.map((g) => <div key={g.label.en}><p className="group-label"><b>{lang === "ta" ? g.label.ta : g.label.en}</b>{g.records.length}</p><RecordList ids={mode === "read" ? g.records.slice(0, 2) : g.records} /></div>)}
                  {mode !== "read" && <EvidenceByClass answer={{ ...answer, classes: answer.classes.map((c) => ({ ...c, records: c.records.filter((id) => !inGroups.has(id)) })).filter((c) => c.records.length) }} heading={t("Also in the records", "பதிவுகளில் மேலும்")} />}
                </>
              ) : mode === "read" ? <RecordList ids={answer.records.slice(0, shown)} /> : <EvidenceByClass answer={answer} />}

              {mode !== "read" && (
                <section className="ask-lines">
                  <h2 className="sub">{t("Verses with these words", "இந்தச் சொற்கள் உள்ள வரிகள்")} {data && <span className="count-badge">{answer.lines.length}</span>}</h2>
                  {!data && !failed && <div className="skeleton" aria-busy="true" aria-label={t("Searching every line", "எல்லா வரிகளிலும் தேடுகிறது")}><i /><i /><i /></div>}
                  {failed && <p className="fine">{t("The line index didn't load, so only the hand records were searched.", "வரி அட்டவணை ஏறவில்லை; கைப்பதிவுகள் மட்டுமே தேடப்பட்டன.")}</p>}
                  {data && answer.lines.length === 0 && <p className="fine">{t("No line shares enough words with the question.", "கேள்வியுடன் போதுமான சொற்களைப் பகிரும் வரி இல்லை.")}</p>}
                  {answer.lines.length > 0 && (
                    <>
                      <p className="fine">{t("Found by searching all 10,209 lines. The English beside each is a machine note, unchecked: it's how an English question reaches the Tamil, and it can be wrong.", "10,209 வரிகளிலும் தேடிக் கண்டவை. ஒவ்வொன்றின் அருகிலுள்ள ஆங்கிலம் சரிபார்க்காத இயந்திரக் குறிப்பு.")}</p>
                      <ul className="line-hits">
                        {answer.lines.map((l) => (
                          <li key={l.id}>
                            <button className="verse__id line-hits__id" onClick={() => setInspect({ line: l.id, gist: l.gist })} aria-label={t(`Open ${l.id} in its place`, `${l.id} ஐ அதன் இடத்தில் திற`)}>{l.id}</button>
                            <span lang="ta" className="line-hits__text">{l.text}</span>
                            {l.gist && <span className="line-hits__gist">{l.gist}</span>}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>
              )}

              {mode !== "read" && answer.drafts.length > 0 && (
                <section className="ask-drafts">
                  <h2 className="sub">{t("Unchecked machine drafts that may bear on it", "தொடர்புடையதாக இருக்கக்கூடிய சரிபார்க்காத வரைவுகள்")} <span className="count-badge count-badge--draft">{answer.drafts.length}</span></h2>
                  <p className="fine">{t("A language model proposed these. They may point you to a passage, but they never answer.", "மொழி மாதிரி முன்மொழிந்தவை. ஒரு பகுதியைச் சுட்டலாம், விடையாகாது.")}</p>
                  {answer.drafts.map((d, i) => (
                    <article key={i} className="machine__row">
                      <div className="record__tags"><StatusBadge draft /><span className="tag">{d.kind.replace(/_/g, " ")}</span>{d.people.slice(0, 4).map((p) => <span key={p} className="fine">{corpus.nodeById.get(p)?.[lang] ?? p.replace(/_/g, " ")}</span>)}</div>
                      <p lang="ta">{d.quote} <button className="verse__id line-hits__id" onClick={() => setInspect({ line: d.line, gist: data?.notes[d.line]?.[0] })}>{d.line}</button></p>
                    </article>
                  ))}
                </section>
              )}


              <FollowUps answer={answer} />

              {mode === "research" && (
                <section className="research">
                  <h2 className="sub">{t("Query plan", "கேள்வித் திட்டம்")}</h2>
                  <pre className="research__plan">{JSON.stringify({ intent: answer.plan.intent, lang: answer.plan.lang, entities: answer.plan.entities, ambiguous: answer.plan.ambiguous, viewpoint: answer.plan.viewpoint, compare_modes: answer.plan.compareModes, epic: answer.plan.epic, policy: answer.plan.policy, route: answer.route }, null, 1)}</pre>
                  <h2 className="sub">{t("How each record was found", "ஒவ்வொரு பதிவும் கண்டறியப்பட்ட விதம்")}</h2>
                  <p className="fine">{t("Rank in each route (rule, graph, words, lines), the fused score (reciprocal rank fusion, k = 60), and how much of the question the record covers.", "ஒவ்வொரு வழியிலும் தரம், இணைந்த மதிப்பு, கேள்வியை எவ்வளவு உள்ளடக்குகிறது.")}</p>
                  <table className="research__ranks"><thead><tr><th>{t("Record", "பதிவு")}</th><th>{t("Class", "வகை")}</th><th>rule</th><th>graph</th><th>words</th><th>lines</th><th>{t("fused", "இணைந்த")}</th><th>{t("covers", "உள்ளடக்கம்")}</th></tr></thead>
                    <tbody>{answer.records.slice(0, 12).map((id) => { const r = answer.ranks[id]; const rec = corpus.byId.get(id); return <tr key={id}><td className="mono">{id}</td><td>{rec ? <LineSample mood={rec.mood} /> : null} {rec?.mood}</td><td>{r?.rule ?? "–"}</td><td>{r?.graph ?? "–"}</td><td>{r?.words ?? "–"}</td><td>{r?.lines ?? "–"}</td><td>{r?.fused ?? "–"}</td><td>{r ? `${Math.round(r.coverage * 100)}%` : "–"}</td></tr>; })}</tbody></table>
                  <button className="link" style={{ marginTop: 12 }} onClick={download}><Download size={15} aria-hidden="true" />{t("Download the evidence package (JSON)", "சான்றுத் தொகுப்பைப் பதிவிறக்கு (JSON)")}</button>
                  <p className="fine">{t("The package holds the plan and every piece of evidence with its voice, mood, story time and source status. scripts/ask_llm.py turns it into a written answer and checks each claim against it.", "திட்டமும் ஒவ்வொரு சான்றும் அதன் குரல், தன்மை, கதைக் காலம், மூல நிலையுடன். scripts/ask_llm.py இதிலிருந்து விடை எழுதி ஒவ்வொரு கூற்றையும் சரிபார்க்கும்.")}</p>
                </section>
              )}
            </section>
          </>
        )}

        {!answer && (
          <div className="examples">
            {EXAMPLES.map((g) => (
              <div key={g.group[0]}><h2 className="sub">{lang === "ta" ? g.group[1] : g.group[0]}</h2>
                {g.items.map((q) => <button key={q} className="example" onClick={() => go(`/ask?q=${encodeURIComponent(q)}`)}>{q}</button>)}</div>
            ))}
          </div>
        )}
        <p className="fine">{t(`The graph holds ${corpus.records.length} hand records so far, a pilot and not the whole of either epic. Questions it can't answer from them still reach every line, but a line found by search is a pointer, not an answer.`, `வரைபடத்தில் இப்போது ${corpus.records.length} கைப்பதிவுகள் மட்டுமே. அவற்றில் விடை இல்லாத கேள்விகளும் எல்லா வரிகளையும் தேடும்; தேடிக் கண்ட வரி சுட்டுதல் மட்டுமே, விடை அல்ல.`)}</p>
      </div>
      {inspect && <Inspector line={inspect.line} gist={inspect.gist} onClose={() => setInspect(null)} />}
    </InspectContext.Provider>
  );
}

/** The records sorted by what kind of statement each one is, so a claim never sits among the facts. */
function EvidenceByClass({ answer, heading }: { answer: HybridAnswer; heading?: string }) {
  const { lang } = useApp();
  if (!answer.classes.length) return null;
  return (
    <div className="evidence-classes">
      {heading && <h2 className="sub">{heading}</h2>}
      {answer.classes.map((c) => {
        const fam = c.cls === "belief" ? FAMILY.imagined : FAMILY[c.cls];
        const Icon = fam.icon;
        const [en, ta, noteEn, noteTa] = CLASS_LABEL[c.cls];
        return (
          <div key={c.cls} className={`evidence-class evidence-class--${c.cls}`}>
            <p className="group-label"><Icon size={16} aria-hidden="true" /><b>{lang === "ta" ? ta : en}</b>{c.records.length}<span className="fine">{lang === "ta" ? noteTa : noteEn}</span></p>
            <RecordList ids={c.records} />
          </div>
        );
      })}
    </div>
  );
}

/** Questions that follow from this one, built from who and what it was about. */
function FollowUps({ answer }: { answer: HybridAnswer }) {
  const { corpus, lang } = useApp();
  const t = useT();
  const ideas: string[] = [];
  for (const e of answer.plan.entities.slice(0, 2)) {
    const n = corpus.nodeById.get(e.id);
    if (!n) continue;
    if (n.cls === "Person" || n.cls === "Deity") {
      if (answer.plan.intent !== "who_is") ideas.push(lang === "ta" ? `${n.ta} யார்?` : `Who is ${n.en}?`);
      if (corpus.records.some((r) => r.kind === "believe" && JSON.stringify(r.roles).includes(`"${n.id}"`))) ideas.push(lang === "ta" ? `${n.ta} என்ன நம்பினார்?` : `What did ${n.en} believe?`);
      if (n.epics.length > 1) ideas.push(lang === "ta" ? `${n.ta} இரு காப்பியங்களிலும் எப்படி வருகிறார்?` : `How does ${n.en} appear in both epics?`);
    } else if (n.cls === "Object") ideas.push(lang === "ta" ? `${n.ta} யாரிடம் இருந்தது?` : `Who held ${n.en}?`);
    else if (n.cls === "Food" || n.cls === "Material") ideas.push(lang === "ta" ? `${n.ta} எங்கிருந்து வந்தது?` : `Where did ${n.en} come from?`);
  }
  const unique = [...new Set(ideas)].filter((q) => q.toLowerCase() !== answer.plan.question.toLowerCase()).slice(0, 4);
  if (!unique.length) return null;
  return (
    <section className="follow-ups">
      <h2 className="sub">{t("You could ask next", "அடுத்துக் கேட்கலாம்")}</h2>
      <div className="chips">{unique.map((q) => <button key={q} className="chip" onClick={() => go(`/ask?q=${encodeURIComponent(q)}`)}>{q}</button>)}</div>
    </section>
  );
}
