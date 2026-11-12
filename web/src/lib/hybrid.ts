// Hybrid retrieval for the Ask page, built around the ledger rather than replacing it.
//
//  1. plan the question (plan.ts): language, names, kind of question, allowed evidence
//  2. retrieve from four places, each giving its own ranking of hand records:
//       rule    the hand-written rules in ask.ts, when they fit the question
//       graph   records that name the people and things the question names
//       words   BM25 over each record's English and Tamil text, its kind and the names in it
//       lines   BM25 over all 10,209 lines (Tamil text plus the machine note's English gist), mapped back to
//               the records that cite them
//  3. fuse the rankings with reciprocal rank fusion
//  4. sort what came back by evidence class (told as fact, only said, wanted, imagined or believed) and only
//     let a record told as fact answer as fact. Lines and drafts never answer, they only point.
//
// The names the graph knows in both languages carry an English question into the Tamil verse and back,
// so cross-language retrieval comes from the knowledge graph, not from a translation model.
import { ask, type Answer, type Bilingual } from "./ask";
import { familyOf, type Family } from "./icons";
import { MOOD_LABEL, recordMentions, roleValues } from "./model";
import { planQuery, type QueryPlan } from "./plan";
import type { Corpus, LedgerRecord } from "./types";

export interface RetrievalData {
  lines: [string, string][];
  notes: Record<string, [string, string, string, string[]]>;
  drafts: [string, string, string[], string, string, string[]][];
}
export interface LineHit { id: string; text: string; gist: string | null; score: number }
export interface DraftHit { line: string; kind: string; people: string[]; mood: string; quote: string; lines: string[]; score: number }
export type EvidenceClass = Family | "belief";
export interface HybridAnswer extends Answer {
  plan: QueryPlan;
  route: "rule" | "hybrid";
  classes: { cls: EvidenceClass; records: string[] }[];
  lines: LineHit[];
  drafts: DraftHit[];
  /** Where each record came from and how it scored, for the Research view and the evaluation. */
  ranks: Record<string, { rule?: number; graph?: number; words?: number; lines?: number; fused: number; coverage: number }>;
}

// ---- normalising words ----

const nfc = (s: string) => s.normalize("NFC");
const TAMIL = /[஀-௿]/;
const IRREGULAR: Record<string, string> = {
  struck: "strike", strikes: "strike", took: "take", taken: "take", made: "make", sang: "sing", sung: "sing", built: "build", went: "go", gone: "go",
  gave: "give", given: "give", ate: "eat", eaten: "eat", hid: "hide", hidden: "hide", said: "say", says: "say", told: "tell", saw: "see", seen: "see", came: "come",
  left: "leave", found: "find", brought: "bring", fought: "fight", flew: "fly", wept: "weep", sat: "sit", knew: "know", known: "know", fell: "fall", broke: "break",
  broken: "break", spoke: "speak", stole: "steal", stolen: "steal", killed: "kill", died: "die", dead: "die", death: "die", thought: "think", held: "hold", kept: "keep",
  bought: "buy", sold: "sell", met: "meet", ran: "run", became: "become", children: "child", women: "woman", men: "man", feet: "foot", wives: "wife", lives: "life",
  hungry: "hunger", hurt: "hurt", consoled: "console", gossiping: "gossip", sacrificed: "sacrifice", travellers: "travel", abandoned: "abandon", carried: "carry",
};
// Thanglish content words, glossed into English so they meet the records' English text.
const THANGLISH: Record<string, string> = {
  kanavu: "dream", kanavil: "dream", pasi: "hunger", olinjaa: "hide", olinjan: "hide", kettaan: "ask", kettaal: "ask", kuduthaan: "give", kuduthaal: "give", kuduthathu: "give",
  sonnaan: "say", sonnaal: "say", sonnaala: "say", varuven: "come", vandhaan: "come", ponaan: "go", ponaal: "go", kondraan: "kill", kondra: "kill", udaithaan: "break",
  udaithathu: "break", thirudinaan: "steal", thirudu: "steal", saapadu: "food", unavu: "food", kovil: "temple", koyil: "temple", nagaram: "city", ooru: "town", raja: "king",
  rani: "queen", arasi: "queen", mannan: "king", arasan: "king", magal: "daughter", magan: "son", manaivi: "wife", kanavan: "husband", appa: "father", amma: "mother",
  theeravillai: "end", theerndhadhu: "end", azhudhaal: "weep", sabam: "curse", vazhakku: "case", silambu: "anklet", muthu: "pearl", maani: "gem", kappal: "ship",
  kadal: "sea", thee: "fire", eriththaal: "burn", erithaal: "burn", letter: "letter", kaditham: "letter", vittaan: "leave", vittaal: "leave", eduthaan: "take",
};
const STOP = new Set(("who whom whose what which where when why how is was are were did do does doing done a an the of to in on at by for from with and or about tell me us please it its his her their they he she this that there have has had can could would will be been so really actually into onto then than " +
  "yaar yar yaru yaaru enna en epdi eppadi ah da di la le ku kku oda nu kitta than thaan yen een ethukku enga " +
  // the epics' own names say where to look, not what to find
  "people someone anyone thing things happen happened " +
  "silappathikaram silappatikaram silapathikaram cilappatikaram manimekalai's epic epics poem poems seyyum seydhan panna pannan aachu").split(" "));
// Words that answer each other: "husband" is answered by a record saying "wife", "die" by one saying "killed".
const RELATED: string[][] = [
  ["husband", "wife", "marry", "kanavan", "manaivi", "கணவன்", "மனைவி", "மணந்தான்"],
  ["father", "mother", "parent", "son", "daughter", "child", "தந்தை", "தாய்", "மகள்", "மகன்", "குழந்தை", "பெற்றோர்"],
  ["die", "kill", "slay", "murder", "pyre", "burn herself", "இறந்தாள்", "கொன்றான்"],
  ["hunger", "hungry", "starve", "famine", "food"], ["hide", "conceal", "secret"], ["build", "make", "craft", "construct"], ["burn", "fire", "flame"],
  ["steal", "thief", "theft", "rob"], ["accuse", "blame", "charge"], ["curse", "sabam"], ["king", "monarch", "ruler"], ["queen", "consort"],
];
// Stemmed on first use: the stemmer needs the suffix lists below.
let relatedStems: string[][] | null = null;
const related = (w: string) => {
  relatedStems ??= RELATED.map((g) => g.flatMap((x) => tokens(x)));
  return [w, ...(relatedStems.find((g) => g.includes(w)) ?? [])];
};
const TA_STOP = new Set(["யார்", "என்ன", "ஏன்", "எப்படி", "எங்கே", "எது", "எந்த", "எவ்வாறு", "அவன்", "அவள்", "தன்", "என்று", "சிலப்பதிகாரத்தில்", "சிலப்பதிகாரம்", "காப்பியம்", "காப்பியத்தில்"]);
// Tamil case and plural endings, longest first, so சிலம்பை, சிலம்பில், சிலம்புகள் all come down to சிலம்ப்.
// Tamil endings are vowel signs on the last consonant (சிலம்பை is சிலம்ப + ை), so that's how they're written here.
const TA_SUFFIXES = [
  // verb endings, so எரித்தாள் and எரிக்கிறாள் both come down to எரி
  "க்கிறார்கள்", "க்கிறாள்", "க்கிறான்", "க்கிறது", "கிறாள்", "கிறான்", "கிறது", "த்தார்கள்", "த்தாள்", "த்தான்", "த்தது", "த்தார்", "ந்தாள்", "ந்தான்", "ந்தது", "ந்தார்",
  "ினாள்", "ினான்", "ினது", "ினார்", "ப்பாள்", "ப்பான்", "வாள்", "வான்", "டாள்", "டான்",
  // case and plural endings
  "களுக்கு", "த்தில்", "த்தின்", "த்தை", "களில்", "களை", "கள்", "ுக்கு", "க்கு", "யில்", "வில்", "னில்", "யின்", "வின்", "ில்", "ின்", "ுடன்", "ோடு", "ால்", "யை", "வை", "ை",
].map(nfc);

export function stem(word: string): string {
  let w = nfc(word).toLowerCase().replace(/'s$|’s$/, "");
  if (TAMIL.test(w)) {
    for (const s of TA_SUFFIXES) if (w.length > s.length + 2 && w.endsWith(s)) { w = w.slice(0, -s.length); break; }
    // Drop a trailing vowel sign or pulli (கனவு, கனவில் → கனவ), unless that would leave too little to mean anything.
    const bare = w.replace(/[்ுைாிீூெேொோௌ]+$/u, "");
    return [...bare].length >= 3 ? bare : w;
  }
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (THANGLISH[w]) return THANGLISH[w];
  for (const [end, keep] of [["ies", "y"], ["ing", ""], ["ed", ""], ["es", ""], ["s", ""], ["ly", ""]] as const) {
    if (w.endsWith(end) && w.length - end.length >= 3) {
      w = w.slice(0, -end.length) + keep;
      // "stopped" → "stopp" → "stop", but "killed" keeps its double l
      if ((end === "ing" || end === "ed") && /([bdgmnprt])\1$/.test(w)) w = w.slice(0, -1);
      break;
    }
  }
  return w;
}

export function tokens(text: string): string[] {
  return nfc(text).toLowerCase().replace(/[_?!.,;:'"“”‘’()\-–—/]/g, " ").split(/\s+/)
    // செய் ("do") in a question is like "did" in English: it asks, it isn't asked about.
    .filter((w) => w.length >= 2 && !STOP.has(w) && !TA_STOP.has(w) && !/^செய்[^ய]/.test(w) && !/^pann/.test(w))
    .map(stem).filter((w) => w.length >= 2);
}

// ---- BM25, with Tamil query words matching as prefixes because Tamil glues its endings on ----

class Bm25 {
  private tf: Map<string, number>[] = [];
  private len: number[] = [];
  private vocab = new Map<string, number>(); // term → document frequency
  private avg = 1;
  constructor(docs: string[][]) {
    docs.forEach((d) => {
      const m = new Map<string, number>();
      d.forEach((w) => m.set(w, (m.get(w) ?? 0) + 1));
      this.tf.push(m);
      this.len.push(d.length);
      m.forEach((_, w) => this.vocab.set(w, (this.vocab.get(w) ?? 0) + 1));
    });
    this.avg = this.len.reduce((a, b) => a + b, 0) / Math.max(1, docs.length);
  }
  /** The document words a query word stands for: itself, or for Tamil every word it begins. */
  expand(q: string): string[] {
    if (!TAMIL.test(q)) return this.vocab.has(q) ? [q] : [];
    if ([...q].length < 3) return this.vocab.has(q) ? [q] : [];
    return [...this.vocab.keys()].filter((w) => w.startsWith(q));
  }
  /** Each query word carries a weight, so the question's own words count for more than the names added to it. */
  search(query: [string, number][], limit = 50): [number, number][] {
    const n = this.tf.length, k1 = 1.2, b = 0.75;
    const scores = new Map<number, number>();
    const weights = new Map<string, number>();
    query.forEach(([q, w]) => weights.set(q, Math.max(w, weights.get(q) ?? 0)));
    for (const [q, weight] of weights) {
      const forms = this.expand(q);
      if (!forms.length) continue;
      const hit: number[] = [];
      this.tf.forEach((m, i) => { if (forms.some((f) => m.has(f))) hit.push(i); });
      const idf = Math.log(1 + (n - hit.length + 0.5) / (hit.length + 0.5));
      for (const i of hit) {
        const f = forms.reduce((s, w) => s + (this.tf[i].get(w) ?? 0), 0);
        scores.set(i, (scores.get(i) ?? 0) + weight * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * this.len[i]) / this.avg))));
      }
    }
    return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  }
  has(doc: number, q: string) { return this.expand(q).some((f) => this.tf[doc].has(f)); }
}

// ---- the indexes, built once per corpus ----

interface Index { records: LedgerRecord[]; rec: Bm25; lines: Bm25; drafts: Bm25; data: RetrievalData; citedBy: Map<string, string[]> }
const built = new WeakMap<Corpus, Map<RetrievalData | null, Index>>();

function names(c: Corpus, id: string) {
  const n = c.nodeById.get(id);
  return n ? [n.en, n.ta, ...n.also].join(" ") : id.replace(/_/g, " ");
}
function recordText(c: Corpus, r: LedgerRecord) {
  const people = Object.values(r.roles).flatMap(roleValues).map((id) => names(c, id)).join(" ");
  return `${r.en} ${r.ta} ${r.kind.replace(/_/g, " ")} ${people} ${r.voice.filter((v) => v !== "poet").map((v) => names(c, v)).join(" ")}`;
}

export function buildIndex(c: Corpus, data: RetrievalData | null): Index {
  const byData = built.get(c) ?? new Map();
  built.set(c, byData);
  if (byData.has(data)) return byData.get(data)!;
  const d = data ?? { lines: [], notes: {}, drafts: [] };
  const citedBy = new Map<string, string[]>();
  c.records.forEach((r) => r.lines.forEach((l) => citedBy.set(l.id, [...(citedBy.get(l.id) ?? []), r.id])));
  const idx: Index = {
    records: c.records,
    rec: new Bm25(c.records.map((r) => tokens(recordText(c, r)))),
    lines: new Bm25(d.lines.map(([id, text]) => tokens(`${text} ${d.notes[id]?.[0] ?? ""} ${(d.notes[id]?.[3] ?? []).join(" ")}`))),
    drafts: new Bm25(d.drafts.map(([, kind, people, , quote]) => tokens(`${kind.replace(/_/g, " ")} ${people.map((p) => names(c, p)).join(" ")} ${quote}`))),
    data: d,
    citedBy,
  };
  byData.set(data, idx);
  return idx;
}

// ---- answering ----

const RRF_K = 60;
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function evidenceClass(r: LedgerRecord): EvidenceClass {
  if (r.kind === "believe" || r.layer === "belief" && r.mood !== "asserted" && r.mood !== "claimed") return "belief";
  return familyOf(r.mood);
}

/** The question's own content words, minus the names it was grounded on, glossed and stemmed. */
function contentTerms(c: Corpus, plan: QueryPlan): string[] {
  const nameWords = plan.entities.flatMap((e) => tokens(names(c, e.id)));
  // A name spelt another way ("amudhasurabi") is still the name, not something being asked about.
  const isName = (w: string) => nameWords.some((n) => n === w || (TAMIL.test(w) ? n.startsWith(w) || w.startsWith(n) : w.length >= 6 && editDistance(n, w) <= 2));
  return [...new Set(tokens(plan.question))].filter((w) => !isName(w));
}
function editDistance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

export function answerQuestion(c: Corpus, question: string, data: RetrievalData | null): HybridAnswer {
  const plan = planQuery(c, question);
  const idx = buildIndex(c, data);
  const content = contentTerms(c, plan);
  const ents = plan.entities.filter((e) => e.confidence === "high" || !plan.ambiguous.length).map((e) => e.id);
  // The query the indexes see: the question's own words at full weight, plus every name of everyone it names,
  // in both languages, at a lower weight. The names carry English into Tamil; the words say what's being asked.
  const own = tokens(question);
  const query: [string, number][] = [
    ...own.map((w): [string, number] => [w, content.includes(w) ? 2 : 1]),
    ...content.flatMap((w) => related(w).filter((x) => x !== w).map((x): [string, number] => [x, 0.8])),
    ...ents.flatMap((id) => tokens(names(c, id)).map((w): [string, number] => [w, 0.4])),
  ];

  const coverage = (i: number) => (content.length ? content.filter((w) => related(w).some((x) => idx.rec.has(i, x))).length / content.length : 1);
  const lists: Record<string, string[]> = {};

  // Words: BM25 over the records themselves.
  lists.words = idx.rec.search(query, 40).map(([i]) => c.records[i].id);
  // Graph: records naming the question's people and things, most names first, then the lines they matched.
  if (ents.length) {
    const scored = c.records.map((r, i) => ({ r, i, n: ents.filter((id) => recordMentions(r, id)).length })).filter((x) => x.n > 0);
    const wordRank = new Map(lists.words.map((id, k) => [id, k]));
    scored.sort((a, b) => b.n - a.n || (wordRank.get(a.r.id) ?? 999) - (wordRank.get(b.r.id) ?? 999));
    lists.graph = scored.slice(0, 40).map((x) => x.r.id);
  }
  // Lines: search every line, then credit the records that cite the lines found.
  const lineHits = idx.lines.search(query, 60);
  const viaLines: string[] = [];
  lineHits.forEach(([i]) => (idx.citedBy.get(idx.data.lines[i][0]) ?? []).forEach((id) => { if (!viaLines.includes(id)) viaLines.push(id); }));
  if (viaLines.length) lists.lines = viaLines;
  // Rule: the hand-written rules, trusted only when their answer is about what the question asks.
  const rule = ask(c, question);
  // "about" is the rules' profile of a name. It answers a bare name well and anything more specific badly.
  const generic = ["closest", "none"].includes(rule.type) || (rule.type === "about" && content.length > 0);
  const recIndex = new Map(c.records.map((r, i) => [r.id, i]));
  const ruleCov = rule.records.length ? Math.max(...rule.records.map((id) => coverage(recIndex.get(id)!))) : 0;
  const bestOther = lists.words.length ? Math.max(...lists.words.slice(0, 5).map((id) => coverage(recIndex.get(id)!))) : 0;
  const trustRule = rule.found && !generic && rule.records.length > 0 && (content.length === 0 || ruleCov >= 0.34 || ruleCov >= bestOther);
  if (rule.records.length && !generic) lists.rule = rule.records;

  // Reciprocal rank fusion. A rule that fits the question counts double; one that doesn't still gets a say.
  const weight: Record<string, number> = { rule: trustRule ? 2 : 0.5, graph: 1, words: 1, lines: 0.8 };
  const fused = new Map<string, number>();
  const ranks: HybridAnswer["ranks"] = {};
  for (const [name, ids] of Object.entries(lists)) {
    ids.forEach((id, k) => {
      fused.set(id, (fused.get(id) ?? 0) + weight[name] / (RRF_K + k + 1));
      ranks[id] ??= { fused: 0, coverage: coverage(recIndex.get(id)!) };
      (ranks[id] as Record<string, number>)[name] = k + 1;
    });
  }
  // A record that shares none of the question's own words, and names none of its people, is noise however it ranked.
  const order = [...fused.entries()]
    .filter(([id]) => ranks[id].coverage > 0 || ents.some((e) => recordMentions(c.byId.get(id)!, e)))
    // Agreement between routes decides the order, scaled by how much of the question a record actually covers.
    .sort((a, b) => b[1] * (0.5 + ranks[b[0]].coverage) - a[1] * (0.5 + ranks[a[0]].coverage))
    .map(([id]) => id);
  order.forEach((id) => { ranks[id].fused = Math.round((fused.get(id) ?? 0) * 10000) / 10000; });

  const lines: LineHit[] = lineHits.slice(0, 8).map(([i, s]) => ({ id: idx.data.lines[i][0], text: idx.data.lines[i][1], gist: idx.data.notes[idx.data.lines[i][0]]?.[0] ?? null, score: Math.round(s * 100) / 100 }));
  const drafts: DraftHit[] = idx.drafts.search(query, 6).map(([i, s]) => { const [line, kind, people, mood, quote, ls] = idx.data.drafts[i]; return { line, kind, people, mood, quote, lines: ls, score: Math.round(s * 100) / 100 }; });

  const top = order.slice(0, 10);
  const classes = (["happened", "said", "wanted", "imagined", "belief"] as EvidenceClass[])
    .map((cls) => ({ cls, records: top.filter((id) => evidenceClass(c.byId.get(id)!) === cls) }))
    .filter((g) => g.records.length);
  const base = { plan, classes, lines, drafts, ranks };

  // Unresolved names: ask rather than guess.
  const open = plan.ambiguous.filter((a) => !a.resolvedTo);
  if (open.length) {
    const opts = open[0].options.map((id) => c.nodeById.get(id)!);
    return {
      ...base, route: "hybrid", type: "ambiguous", lang: plan.lang, found: false, records: [], classes: [], focus: open[0].options, entities: ents,
      headline: { en: `“${open[0].surface}” could be ${opts.map((n) => n.en).join(" or ")}. Which one do you mean?`, ta: `“${open[0].surface}” என்பது ${opts.map((n) => n.ta).join(" அல்லது ")} ஆக இருக்கலாம். யாரைக் கேட்கிறீர்கள்?` },
    };
  }

  if (trustRule) {
    // The rule's answer stands, and the other routes add what else the text has on it.
    const rest = top.filter((id) => !rule.records.includes(id));
    return { ...rule, ...base, route: "rule", records: [...rule.records, ...rest].slice(0, 12) };
  }
  const best = top[0] ? c.byId.get(top[0])! : null;
  const bestCov = best ? ranks[best.id].coverage : 0;
  // One shared word out of two isn't an answer: the moon question shares "moon" with a line and nothing else.
  const strong = best && (bestCov >= 0.66 || (content.length >= 4 && bestCov >= 0.5) || (content.length === 0 && ents.length > 0 && ents.every((e) => recordMentions(best, e))));
  if (best && strong) {
    const cls = evidenceClass(best);
    const label = MOOD_LABEL[best.mood];
    const headline: Bilingual = cls === "happened"
      ? { en: best.en, ta: best.ta }
      : { en: `${capital(label.en)}, not told as fact: ${best.en}`, ta: `${label.ta}, நிகழ்ந்ததாக அல்ல: ${best.ta}` };
    return {
      ...base, route: "hybrid", type: "hybrid", lang: plan.lang, found: true, headline, records: top, focus: ents.length ? ents : Object.values(best.roles).flatMap(roleValues).slice(0, 3), entities: ents,
      note: { en: "Found by searching the records, not by a rule written for this kind of question. Read the verses below before relying on it.", ta: "இவ்வகைக் கேள்விக்கான விதியால் அல்ல, பதிவுகளைத் தேடிக் கண்டது. நம்புவதற்கு முன் கீழே உள்ள வரிகளைப் படியுங்கள்." },
    };
  }
  if (best || lines.length) {
    const marked = best && evidenceClass(best) !== "happened" ? { en: `(${MOOD_LABEL[best.mood].en}, not told as fact) `, ta: `(${MOOD_LABEL[best.mood].ta}, நிகழ்ந்ததாக அல்ல) ` } : { en: "", ta: "" };
    const headline: Bilingual = best
      ? { en: `No record answers this directly. The closest thing the graph records: ${marked.en}${best.en}`, ta: `இதற்கு நேரடியாக விடை தரும் பதிவு இல்லை. வரைபடத்தில் மிக நெருக்கமானது: ${marked.ta}${best.ta}` }
      : { en: "No record answers this. The lines below share words with the question, found through unchecked machine notes.", ta: "இதற்கு விடை தரும் பதிவு இல்லை. கீழே உள்ள வரிகள் கேள்வியுடன் சொற்களைப் பகிர்கின்றன (சரிபார்க்காத இயந்திரக் குறிப்புகள் வழியாக)." };
    return { ...base, route: "hybrid", type: "closest", lang: plan.lang, found: true, headline, records: top.slice(0, 4), focus: ents, entities: ents };
  }
  return { ...rule, ...base, route: "hybrid", records: [] };
}

/** Everything needed to check an answer, in one JSON object: the plan, then each piece of evidence with its source status. */
export function evidencePackage(c: Corpus, a: HybridAnswer) {
  const record = (id: string) => {
    const r = c.byId.get(id)!;
    return {
      evidence_id: r.id, source_status: "hand record (quotes checked by script, no scholar review yet)", epic: r.epic, canto: r.lines[0]?.id.slice(0, 6),
      lines: r.lines, voice_chain: r.voice, mood: r.mood, evidence_class: evidenceClass(r), story_time: r.t, relation: r.kind, roles: r.roles,
      supported_proposition: { en: r.en, ta: r.ta }, caveat: r.unresolved ?? r.inferred ?? null, ranks: a.ranks[id] ?? null,
    };
  };
  return {
    question: a.plan.question, plan: a.plan, route: a.route, answer_kind: a.type, headline: a.headline,
    records: a.records.map(record),
    lines: a.lines.map((l) => ({ evidence_id: l.id, source_status: "verse line; the English gist is an unchecked machine note", text: l.text, gist: l.gist })),
    drafts: a.drafts.map((d, i) => ({ evidence_id: `draft:${d.line}:${i}`, source_status: "unchecked machine draft, may point but may not answer", relation: d.kind, people: d.people, mood: d.mood, quote: d.quote, lines: d.lines })),
    rules: ["Only records told as fact may be stated as fact.", "A claim, order, dream or belief stays attributed to whoever holds it.", "Lines and drafts may point to evidence but never answer on their own."],
  };
}
