// The question box. Tamil, English or Thanglish in, an answer out, only ever from ledger records.
// No language model runs here: if the records don't hold the answer, it says so instead of guessing.
import { findPath, happened, recordMentions, roleValues } from "./model";
import type { Corpus, GraphNode, LedgerRecord } from "./types";

export type AskLang = "ta" | "en" | "thanglish";
export interface Bilingual { en: string; ta: string }
export interface Answer {
  type: string;            // which rule answered, handy for testing
  lang: AskLang;
  found: boolean;          // false means the graph doesn't hold an answer
  headline: Bilingual;
  records: string[];       // the records behind it, in the order worth reading
  focus: string[];         // entities to centre the small graph on
  entities: string[];      // what we understood the question to be about
  note?: Bilingual;
  groups?: { label: Bilingual; records: string[] }[]; // the same records, sorted into what each one is doing for the answer
}

const TAMIL = /[஀-௿]/;
const THANGLISH_WORDS = /\b(yaar|yar|enna|yen|een|epdi|eppadi|kitta|kooda|solla|sonna|sonnathu|kondra|konna|kondrathu|irundhu|iruku|irukku|kaiyil|thodarbu|uravu|manaivi|kanavan|magal|magan|appa|amma|thanthai|unmaiya|unmai|nijama|enna|pathi|ethukku|thirudu|thirudina|thirudinana|nambi|nambina|panna|pannan|sabam)\b/;

const nfc = (s: string) => s.normalize("NFC");
const clean = (s: string) => nfc(s).toLowerCase().replace(/[?!.,;:'"“”‘’()\-–—]/g, " ").replace(/\s+/g, " ").trim();

export function detectLang(q: string): AskLang {
  if (TAMIL.test(q)) return "ta";
  return THANGLISH_WORDS.test(clean(q)) ? "thanglish" : "en";
}

function editDistance(a: string, b: string, limit: number) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** கோவலன் becomes கோவலனை, பாத்திரம் becomes பாத்திரத்தை. Match the part that stays put. */
function tamilStem(name: string) {
  let s = nfc(name);
  if (s.endsWith("ம்")) s = s.slice(0, -2);
  else if (s.endsWith("்") || s.endsWith("ு")) s = s.slice(0, -1); // சிலம்பு, சிலம்பை, சிலம்பில்
  return s;
}

// Words that happen to look like a short alias. Fuzzy matching must never turn these into a person.
const NEVER_FUZZY = new Set(["who", "why", "what", "when", "where", "which", "whom", "with", "did", "does", "the", "was", "were", "and", "from", "kannu", "killed", "kill", "stole", "steal", "accused", "accuse", "believe", "thought", "father", "mother", "wife", "husband", "daughter", "really", "connected", "related", "between", "anklet", "story", "disguise", "disguised", "enna", "epics", "both", "birth", "curse", "cursed", "unmaiya", "manaivi", "kanavan", "appa", "amma", "magal", "magan", "yaar", "thanthai", "palace", "history", "people", "appear", "manimekalai's"]);

interface Hit { id: string; start: number; len: number; exact: boolean }

export function findEntities(corpus: Corpus, question: string): string[] {
  const q = clean(question);
  const words = q.split(" ");
  const hits: Hit[] = [];
  for (const node of corpus.graph.nodes) {
    const forms = [node.en.replace(/^the /i, ""), node.ta, ...node.also].map(clean).filter(Boolean);
    for (const form of forms) {
      // Food and material words are short and turn up inside other words (கள், மா, gold). They need a whole-word match.
      if (node.kind && form.length < 6) {
        const at = words.indexOf(form);
        if (at >= 0) hits.push({ id: node.id, start: words.slice(0, at).join(" ").length + (at ? 1 : 0), len: form.length, exact: true });
        continue;
      }
      if (TAMIL.test(form)) {
        const at = q.indexOf(tamilStem(form));
        if (at >= 0) hits.push({ id: node.id, start: at, len: form.length, exact: true });
        continue;
      }
      const parts = form.split(" ");
      for (let i = 0; i + parts.length <= words.length; i++) {
        const chunk = words.slice(i, i + parts.length);
        const offset = q.split(" ").slice(0, i).join(" ").length + (i ? 1 : 0);
        const same = chunk.every((w, k) => (k === parts.length - 1 ? w.startsWith(parts[k]) && parts[k].length >= 3 || w === parts[k] : w === parts[k]));
        if (same) { hits.push({ id: node.id, start: offset, len: form.length, exact: true }); continue; }
        if (parts.length === 1 && form.length >= 5 && !NEVER_FUZZY.has(chunk[0]) && chunk[0].length >= 5) {
          const limit = form.length >= 8 ? 2 : 1;
          if (editDistance(chunk[0].slice(0, form.length + 1), form, limit) <= limit) hits.push({ id: node.id, start: offset, len: form.length, exact: false });
        }
      }
    }
  }
  // Longest, exact matches take the text first. "queen's anklet" beats "queen" and "anklet".
  hits.sort((a, b) => Number(b.exact) - Number(a.exact) || b.len - a.len || a.start - b.start);
  const taken: [number, number][] = [];
  const found: { id: string; start: number }[] = [];
  for (const h of hits) {
    if (taken.some(([s, e]) => h.start < e && s < h.start + h.len)) continue;
    taken.push([h.start, h.start + h.len]);
    if (!found.some((f) => f.id === h.id)) found.push({ id: h.id, start: h.start });
  }
  return found.sort((a, b) => a.start - b.start).map((f) => f.id);
}

const has = (q: string, re: RegExp) => re.test(q);
const INTENT = {
  path: /\b(connect|connected|connection|relation|relationship|related|link|linked)\b|தொடர்பு|உறவு|சம்பந்த|\b(thodarbu|uravu|sambandham)\b/,
  bridges: /(both epics|two epics|across the epics|between the epics|இரு காப்பிய|இரண்டு காப்பிய|\b(irandu|rendu) (kappiyam|kaappiyam))/,
  retold: /\b(retold|retell|retells|told again|retelling)\b|மறுகூற்று|மீண்டும் கூற/,
  belief: /\b(believe|believed|believes|belief|thought|think|thinks|nambi|nambina|nambinan|nambinar|ninaithan|ninachan)\b|நம்ப|நம்பி|எண்ணி|நினைத்/,
  disguise: /\b(disguise|disguised|disguises|form of|appeared as|maruvedam|vadivam|uruvam)\b|மாறுவேட|வடிவ|உருவ/,
  birth: /\b(earlier birth|past birth|past life|previous birth|previous life|earlier life|reborn|rebirth|reincarnat\w*|murpirappu|poorva jenmam|munjenmam)\b|முற்பிறப்|முன்பிறப்|முந்தை|மறுபிறப்|மறுபிறவி/,
  family: /\b(father|mother|parent|parents|wife|husband|son|daughter|married|spouse|appa|amma|thanthai|thaai|manaivi|kanavan|magal|magan)\b|தந்தை|தாய்|அப்பா|அம்மா|மனைவி|கணவன்|கணவர்|மகள்|மகன்/,
  who_told: /\b(who says|who said|who told|who tells|yaar sonna|yar sonna|yaar sonnathu|who claims)\b|யார் சொன்ன|யார் கூறி|யார் கூறு/,
  holder: /\b(who had|who has|who held|who holds|who carried|who owned|where is|where was|history of|what happened to|yaar kitta|yar kitta|kaiyil|whose hands|path of)\b|யாரிடம்|யார் கையில்|வைத்திருந்த|எங்கே|வரலாறு/,
  accuse: /\b(accuse|accused|accuses|accusation|blame|blamed|kutram|kuttram|pazhi|kutram sonna)\b|குற்றம்|குற்றஞ்|பழி/,
  why: /\b(why|reason|reasons|cause|caused|because|yen|een|ethukku|karanam)\b|ஏன்|காரண/,
  kill: /\b(kill|killed|kills|killer|murder|murdered|struck|strike|stabbed|cut down|death|died|die|dies|kondra|kondran|kondrathu|konna|konnathu|kollappat\w*|sethan|maranam|irandhan|irappu|vettina\w*)\b|கொன்ற|கொன்றான்|கொலை|கொல்ல|இறந்த|இறப்|மரண|வெட்டி/,
  inside: /\b(inside|contents|contain|contains|filled|ulla|ulle)\b|உள்ளே|உள்ளது என்ன|என்ன இருந்த|பரல்/,
  really: /\b(really|actually|truly|true|truth|fact|unmaiya|unmai|nijama|nijam)\b|உண்மை|நிஜ|^(did|was|is|were) /,
  whoIs: /\b(who is|who was|who are|tell me about|about|yaar|yar)\b|யார்|பற்றி/,
};

// Verbs people ask about, and the ledger kinds they point to.
const VERBS: { re: RegExp; kinds: string[] }[] = [
  { re: /\b(steal|stole|stolen|theft|thief|thirudu|thirudina\w*|thirudan|kalavu)\b|திருட|கள்வ|களவு/, kinds: ["steal"] },
  { re: /\b(spy|otran|otrana)\b|ஒற்றன்/, kinds: ["spy"] },
  { re: /\b(gave|give|given|koduthal|koduthan|koduthaal|kodutha|kuduthaa|kuduthan)\b|கொடுத்|அளித்/, kinds: ["give", "offer"] },
  { re: /\b(take|took|taken|eduthan|eduthaan)\b|எடுத்/, kinds: ["take"] },
  { re: /\b(buy|bought|sold|sell|vaanginan|vangina)\b|வாங்கி|விற்/, kinds: ["buy", "trade"] },
  { re: /\b(curse|cursed|sabam|saabam)\b|சாப/, kinds: ["curse"] },
  { re: /\b(burn|burned|burnt|fire|erithal|eritha\w*)\b|எரி|தீ வை/, kinds: ["burn", "destroy", "throw_breast"] },
  { re: /\b(broke|break|broken|udai\w*)\b|உடைத்|உடைப்/, kinds: ["break"] },
  { re: /\b(spare|spared|sparing|vittu)\b|விட்டுவி|தப்பி/, kinds: ["spare"] },
  { re: /\b(get|got|getting|received|receive|obtain\w*|kidaichu\w*|kidaithathu)\b|கிடைத்|பெற்றாள்/, kinds: ["receive", "give"] },
  { re: /\b(feed|fed|feeding|unavu)\b|உணவளி|உணவு|ஊட்டி/, kinds: ["feed"] },
  { re: /\b(dream|dreamt|dreamed|kanavu)\b|கனவு|கனா/, kinds: ["travel", "slander", "harmed", "plead", "sceptre_falls"] },
  { re: /\b(innocent|guilty|kutram illa)\b|குற்றமற்ற/, kinds: ["innocent", "blameless"] },
  { re: /\b(lover|love)\b|காதலன்/, kinds: ["lover_of"] },
  { re: /\b(worship|worshipped|vanangi\w*)\b|வணங்கி|வழிபட/, kinds: ["worship", "take_as_deity"] },
  { re: /\b(rise|rose|risen|ezhunthan)\b|எழுந்/, kinds: ["rise"] },
  { re: /\b(mind on|mind was|sang)\b/, kinds: ["mind_elsewhere"] },
  { re: /\b(lie|lied|lying|poi)\b|பொய்/, kinds: ["is_vidyadhara", "steal", "spy"] },
  { re: /\b(behead\w*)\b|மடையன்/, kinds: ["kill"] },
  { re: /\b(temple|kovil|statue|image|silai)\b|கோயில்|சிலை|படிம/, kinds: ["found_temple", "install", "worship"] },
  { re: /\b(fetch|stone|himalaya|kal)\b|இமய/, kinds: ["fetch_stone", "stone_on_heads", "install"] },
  { re: /\b(convert|prison|charity|sirai)\b|சிறை|அறக்கோட்ட/, kinds: ["convert", "feed"] },
];

const nameOf = (c: Corpus, id: string): Bilingual => ({ en: c.nodeById.get(id)?.en ?? id.replace(/_/g, " "), ta: c.nodeById.get(id)?.ta ?? id });
const list = (items: string[], and: string) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`);
const names = (c: Corpus, ids: string[]): Bilingual => ({ en: list(ids.map((i) => nameOf(c, i).en), "and"), ta: list(ids.map((i) => nameOf(c, i).ta), "மற்றும்") });
const teller = (c: Corpus, r: LedgerRecord): Bilingual => {
  const who = r.voice.filter((v) => v !== "poet");
  return who.length ? names(c, [who[who.length - 1]]) : { en: "the poet", ta: "புலவர்" };
};
const reasonRecords = (c: Corpus, r: LedgerRecord) => (r.because ?? []).map((b) => c.byId.get(b.of)).filter((x): x is LedgerRecord => Boolean(x));
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

function result(lang: AskLang, type: string, entities: string[], headline: Bilingual, records: string[], focus: string[] = entities, note?: Bilingual): Answer {
  return { type, lang, found: true, headline, records: uniq(records), focus: uniq(focus), entities, note };
}

function noAnswer(lang: AskLang, entities: string[], headline: Bilingual): Answer {
  return { type: "none", lang, found: false, headline, records: [], focus: entities, entities };
}

function answerKill(c: Corpus, lang: AskLang, ents: string[], askWhy: boolean): Answer | null {
  const dying = ["kill", "die", "enter_fire", "fast_to_death", "swallowed"];
  // "Why did the king kill Kovalan": the person killed is who it's about, not the king who later dies.
  const killed = ents.find((id) => c.records.some((r) => r.kind === "kill" && happened(r) && roleValues(r.roles.patient).includes(id)));
  const person = (ents.length > 1 ? killed : undefined) ?? ents.find((id) => c.records.some((r) => dying.includes(r.kind) && happened(r) && roleValues(r.roles.patient ?? r.roles.agent).includes(id)));
  if (!person) return null;
  const deaths = c.records.filter((r) => ["kill", "die", "enter_fire", "fast_to_death", "swallowed"].includes(r.kind) && happened(r) && roleValues(r.roles.patient ?? r.roles.agent).includes(person));
  const d = deaths.find((r) => r.kind === "kill") ?? deaths[0];
  const killer = roleValues(d.roles.agent).filter((x) => x !== person);
  const who = names(c, [person]);
  const reasons = reasonRecords(c, d);
  const order = c.records.filter((r) => r.kind === "kill" && r.mood !== "asserted" && roleValues(r.roles.patient).includes(person));
  const headline: Bilingual = d.kind === "kill" && killer.length
    ? { en: `${names(c, killer).en} killed ${who.en}.`, ta: `${who.ta}னைக் கொன்றது ${names(c, killer).ta}.`.replace("ன்னை", "னை").replace("னனை", "னை") }
    : d.kind === "kill"
      ? { en: `${who.en} is killed, but the line doesn't name the killer.`, ta: `${who.ta} கொல்லப்படுகிறார்; கொன்றவர் பெயர் நூலில் இல்லை.` }
      : { en: d.en, ta: d.ta };
  const note: Bilingual | undefined = reasons.length
    ? { en: `The text gives ${reasons.length} reason${reasons.length > 1 ? "s" : ""} for this, listed below, and doesn't reduce them to one.`, ta: `இதற்கு நூல் ${reasons.length} காரணங்களைத் தருகிறது; அவை கீழே உள்ளன.` }
    : undefined;
  // For "why", lead with the reasons. For "who", lead with the deed.
  const recs = askWhy ? [...reasons.map((r) => r.id), d.id, ...order.map((r) => r.id)] : [d.id, ...order.map((r) => r.id), ...reasons.map((r) => r.id)];
  const chain = reasons.flatMap((r) => reasonRecords(c, r).map((x) => x.id));
  const out = result(lang, askWhy ? "why_death" : "kill", ents, headline, [...recs, ...chain], [person, ...killer], note);
  // So "4 reasons" can be counted on the page: the deed, the orders, the reasons, then what lies behind those reasons.
  const deed = { label: { en: "The deed", ta: "நிகழ்வு" }, records: [d.id] };
  const orders = { label: { en: "Orders that weren't the deed itself", ta: "ஆணைகள் (செயல் அல்ல)" }, records: order.map((r) => r.id) };
  const why = { label: { en: `The ${reasons.length} reason${reasons.length > 1 ? "s" : ""} the text gives`, ta: `நூல் தரும் ${reasons.length} காரணங்கள்` }, records: reasons.map((r) => r.id) };
  const behind = { label: { en: "What lies behind those reasons", ta: "அக்காரணங்களுக்குப் பின்னால்" }, records: uniq(chain).filter((id) => !out.records.slice(0, recs.length).includes(id)) };
  out.groups = (askWhy ? [why, deed, orders, behind] : [deed, orders, why, behind]).filter((g) => g.records.length);
  return out;
}

function answerAccuse(c: Corpus, lang: AskLang, ents: string[]): Answer | null {
  const hits = c.records.filter((r) => r.kind === "accuse" && ents.some((id) => recordMentions(r, id)));
  if (!hits.length) return null;
  const r = hits[0];
  const by = roleValues(r.roles.agent), target = roleValues(r.roles.target);
  const claim = r.carries ? c.byId.get(r.carries) : undefined;
  return result(lang, "accuse", ents,
    { en: `${names(c, by).en} accused ${names(c, target).en}. The accusation was false.`, ta: `${names(c, target).ta} மீது ${names(c, by).ta} குற்றம் சாட்டினான். அது பொய்க் குற்றச்சாட்டு.` },
    [...hits.map((x) => x.id), ...(claim ? [claim.id] : []), ...c.records.filter((x) => claim && x.contradicts === claim.id).map((x) => x.id)], [...by, ...target]);
}

function answerBelief(c: Corpus, lang: AskLang, ents: string[]): Answer | null {
  const holder = ents.find((id) => c.records.some((r) => r.kind === "believe" && roleValues(r.roles.holder).includes(id)));
  if (!holder) return null;
  const beliefs = c.records.filter((r) => r.kind === "believe" && roleValues(r.roles.holder).includes(holder)).sort((a, b) => a.t - b.t);
  const contents = uniq(beliefs.map((b) => b.content!)).map((id) => c.byId.get(id)!);
  const lead = contents[0];
  const dropped = beliefs.some((b) => b.stance === "reject");
  const who = nameOf(c, holder);
  return result(lang, "belief", ents,
    { en: `${who.en} believed: ${lead.en.replace(/^Claim: /, "")}${dropped ? " Later, that belief changed." : ""}`, ta: `${who.ta} நம்பியது: ${lead.ta.replace(/^கூற்று: /, "")}${dropped ? " பின்னர் அந்த நம்பிக்கை மாறியது." : ""}` },
    [...beliefs.map((b) => b.id), ...contents.map((x) => x.id)], [holder, ...contents.flatMap((x) => Object.values(x.roles).flatMap(roleValues))]);
}

function answerHolder(c: Corpus, lang: AskLang, ents: string[]): Answer | null {
  const things = ents.flatMap((id) => (id === "ank_pair" ? ["ank_k1", "ank_k2", "ank_q"] : [id])).filter((id) => c.timelines.custody[id]);
  if (!things.length) return null;
  const parts = things.map((id) => {
    const steps = c.timelines.custody[id].filter((s) => s.holders.length);
    return { id, steps };
  });
  const sentence = (lng: "en" | "ta") => parts.map(({ id, steps }) => `${nameOf(c, id)[lng]}: ${steps.map((s) => s.holders.map((h) => nameOf(c, h)[lng]).join(" / ")).join(" → ")}`).join(". ");
  const recs = parts.flatMap(({ steps }) => steps.map((s) => s.rec).filter((r): r is string => Boolean(r)));
  const open = c.records.filter((r) => r.kind === "break" && things.some((t) => recordMentions(r, t))).map((r) => r.id);
  return result(lang, "holder", ents, { en: `${sentence("en")}.`, ta: `${sentence("ta")}.` }, [...recs, ...open], [...things, ...parts.flatMap((p) => p.steps.flatMap((s) => s.holders))]);
}

function answerDisguise(c: Corpus, lang: AskLang, ents: string[]): Answer | null {
  const hits = c.records.filter((r) => r.kind === "disguise" && happened(r) && (!ents.length || ents.some((id) => recordMentions(r, id))));
  if (!hits.length) return null;
  const lines = hits.map((r) => ({ who: nameOf(c, roleValues(r.roles.agent)[0]), form: nameOf(c, roleValues(r.roles.form)[0]) }));
  const ids = hits.map((r) => r.id);
  const beliefs = c.records.filter((r) => ["b07", "b09", "b15"].includes(r.id) && hits.some((h) => h.id === "b05")).map((r) => r.id);
  return result(lang, "disguise", ents,
    { en: lines.map((l) => `${l.who.en} took the form of ${l.form.en}`).join("; ") + ". That changes how she looks, not who she is.", ta: lines.map((l) => `${l.who.ta} ${l.form.ta} வடிவம் கொண்டாள்`).join("; ") + ". இது தோற்றத்தை மட்டுமே மாற்றுகிறது; ஆள் மாறவில்லை." },
    [...ids, ...beliefs], [...ents, ...hits.flatMap((r) => Object.values(r.roles).flatMap(roleValues))]);
}

function answerBirth(c: Corpus, lang: AskLang, ents: string[]): Answer | null {
  const hits = c.records.filter((r) => r.kind === "same_person" && (!ents.length || ents.some((id) => recordMentions(r, id))));
  if (!hits.length) return null;
  const pairs = uniq(hits.map((r) => `${roleValues(r.roles.later)[0]}|${roleValues(r.roles.earlier)[0]}`)).map((s) => s.split("|"));
  const related = c.records.filter((r) => r.birth !== "main" && pairs.some(([, e]) => recordMentions(r, e))).map((r) => r.id);
  return result(lang, "birth", ents,
    { en: pairs.map(([l, e]) => `${nameOf(c, l).en} was ${nameOf(c, e).en} in an earlier birth`).join("; ") + ", according to what the text's speakers say.", ta: pairs.map(([l, e]) => `முற்பிறப்பில் ${nameOf(c, l).ta} ${nameOf(c, e).ta} ஆக இருந்தார்`).join("; ") + " என்று நூலில் கூறப்படுகிறது." },
    [...hits.map((r) => r.id), ...related], pairs.flat());
}

function answerFamily(c: Corpus, lang: AskLang, ents: string[]): Answer | null {
  if (!ents.length) return null;
  const id = ents[0];
  const hits = c.records.filter((r) => ["child_of", "spouse"].includes(r.kind) && recordMentions(r, id));
  if (!hits.length) return null;
  const main = hits.filter((r) => happened(r) && r.birth === "main");
  const other = hits.filter((r) => !main.includes(r));
  const facts = (lng: "en" | "ta") => main.map((r) => r[lng]).join(" ");
  return result(lang, "family", ents, { en: facts("en") || hits[0].en, ta: facts("ta") || hits[0].ta },
    [...main, ...other].map((r) => r.id), [id, ...hits.flatMap((r) => Object.values(r.roles).flatMap(roleValues))],
    other.length ? { en: "Some of these belong to other births, or are only ways of addressing someone. Each one says which.", ta: "இவற்றில் சில வேறு பிறப்புகளைச் சேர்ந்தவை, அல்லது விளிப்பு மட்டுமே." } : undefined);
}

function answerPath(c: Corpus, lang: AskLang, ents: string[]): Answer | null {
  if (ents.length < 2) return null;
  const [a, b] = ents;
  const chain = findPath(c, a, b, true);
  const loose = findPath(c, a, b, false);
  if (!chain) {
    if (loose) {
      return result(lang, "path_said_only", ents,
        { en: `${nameOf(c, a).en} and ${nameOf(c, b).en} connect only through things that were said or wished, not through anything told as having happened.`, ta: `${nameOf(c, a).ta}, ${nameOf(c, b).ta} இருவரும் கூற்றுகள் வழியாக மட்டுமே தொடர்புபடுகின்றனர்.` },
        loose.map((e) => e.rec), uniq(loose.flatMap((e) => [e.s, e.t])));
    }
    return noAnswer(lang, ents, { en: `The graph doesn't connect ${nameOf(c, a).en} and ${nameOf(c, b).en} yet. It only covers some episodes, so this doesn't mean the epics don't.`, ta: `${nameOf(c, a).ta}, ${nameOf(c, b).ta} இடையே வரைபடத்தில் இப்போது தொடர்பு இல்லை. இது சில நிகழ்ச்சிகளை மட்டுமே உள்ளடக்குகிறது.` });
  }
  const steps = uniq(chain.flatMap((e) => [e.s, e.t]));
  const epics = uniq(chain.map((e) => e.epic));
  const crossing = epics.length > 1;
  return result(lang, "path", ents,
    { en: `${nameOf(c, a).en} and ${nameOf(c, b).en} connect in ${chain.length} step${chain.length > 1 ? "s" : ""}${crossing ? ", crossing both epics" : ""}. Each step is below, with its verse.`, ta: `${nameOf(c, a).ta}, ${nameOf(c, b).ta} இருவரும் ${chain.length} படிகளில் தொடர்புபடுகின்றனர்${crossing ? "; இரு காப்பியங்களையும் கடந்து" : ""}. ஒவ்வொரு படியும் பாடல் வரியுடன் கீழே உள்ளது.` },
    chain.map((e) => e.rec), steps);
}

function answerBridges(c: Corpus, lang: AskLang): Answer {
  const bridges = ["m05", "m04", "m13", "m07", "m08", "x60", "x61", "r01", "r03", "r04", "x72"].filter((id) => c.byId.has(id));
  return result(lang, "bridges", [],
    { en: "The epics are tied by family, by retelling and by worship. Maṇimēkalai is the daughter of Kovalan and Mādhavi, Kannagi speaks to her as a goddess in Vanci, and the story of Bharatan's false accusation is told in both.", ta: "குடும்பம், மறுகூற்று, வழிபாடு ஆகியவற்றால் இரு காப்பியங்களும் இணைகின்றன. மணிமேகலை கோவலன், மாதவி ஆகியோரின் மகள்; வஞ்சியில் கண்ணகி தெய்வமாக அவளிடம் பேசுகிறாள்; பரதனின் பொய்க் குற்றச்சாட்டுக் கதை இரண்டிலும் உள்ளது." },
    bridges, ["manimekalai", "kovalan", "madhavi", "kannagi", "bharatan", "sangaman"]);
}

function answerRetold(c: Corpus, lang: AskLang, ents: string[]): Answer | null {
  const hits = c.records.filter((r) => r.retells && (!ents.length || ents.some((id) => recordMentions(r, id))));
  if (!hits.length) return null;
  const pairs = hits.flatMap((r) => [r.retells!, r.id]);
  return result(lang, "retold", ents, { en: `The graph links ${hits.length} retelling${hits.length > 1 ? "s" : ""}. Each pair below is one event told twice, and the two tellings may differ.`, ta: `வரைபடத்தில் ${hits.length} மறுகூற்றுகள் உள்ளன. ஒரே நிகழ்ச்சி இருமுறை கூறப்படுகிறது; கூற்றுகள் வேறுபடலாம்.` }, pairs, ents);
}

function matchingVerb(c: Corpus, q: string, ents: string[]) {
  // "the anklet" with no owner could mean either of Kannagi's, so accept either one.
  const mentions = (r: LedgerRecord, id: string) => recordMentions(r, id) || (id === "ank_pair" && (recordMentions(r, "ank_k1") || recordMentions(r, "ank_k2")));
  for (const v of VERBS) {
    if (!has(q, v.re)) continue;
    const pool = c.records.filter((r) => v.kinds.includes(r.kind));
    const strict = pool.filter((r) => ents.every((id) => mentions(r, id)));
    if (strict.length) return strict;
    const loose = pool.filter((r) => ents.some((id) => mentions(r, id)));
    if (loose.length) return loose;
    if (!ents.length && pool.length) return pool;
  }
  return null;
}

function answerVerb(c: Corpus, lang: AskLang, ents: string[], q: string): Answer | null {
  const hits = matchingVerb(c, q, ents);
  if (!hits) return null;
  // Prefer a record about exactly what was asked. The agent asked about comes first.
  const lead = ents[0];
  const aboutLead = hits.filter((r) => !lead || roleValues(r.roles.agent).includes(lead) || roleValues(r.roles.theme).includes(lead));
  const pool = aboutLead.length ? aboutLead : hits;
  const done = pool.filter(happened);
  const related = (r: LedgerRecord) => [
    ...c.records.filter((x) => x.contradicts === r.id || x.conflicts === r.id).map((x) => x.id),
    ...c.records.filter((x) => x.kind === "believe" && x.content === r.id).map((x) => x.id),
  ];
  if (done.length) {
    const others = hits.filter((r) => !done.includes(r));
    return result(lang, "yes", ents, { en: `Yes. ${done[0].en}`, ta: `ஆம். ${done[0].ta}` }, [...done.map((r) => r.id), ...others.map((r) => r.id)],
      [...ents, ...done.flatMap((r) => Object.values(r.roles).flatMap(roleValues))]);
  }
  const r = pool[0];
  const by = teller(c, r);
  // Many glosses already say who claims it. Only name the teller when the sentence hasn't.
  const says = (text: string, who: string) => (text.includes(who.replace(/^the /, "")) ? "" : ` ${who}`);
  const tailEn = says(r.en, by.en) && ` It comes from ${by.en}.`;
  const tailTa = says(r.ta, by.ta) && ` இது ${by.ta} கூற்று.`;
  return result(lang, "not_fact", ents,
    { en: `No, the text doesn't tell this as having happened. ${r.en}${tailEn}`, ta: `இல்லை; இது நிகழ்ந்ததாக நூல் கூறவில்லை. ${r.ta}${tailTa}` },
    [r.id, ...related(r), ...pool.slice(1).map((x) => x.id)], [...ents, ...Object.values(r.roles).flatMap(roleValues)]);
}

function answerInside(c: Corpus, lang: AskLang, ents: string[]): Answer | null {
  const hits = c.records.filter((r) => r.kind === "contains");
  if (!hits.length) return null;
  const queen = ents.includes("ank_q") || ents.includes("pandya_queen");
  const lead = hits.filter((r) => (queen ? roleValues(r.roles.theme).includes("ank_q") : roleValues(r.roles.theme).includes("ank_pair")));
  return result(lang, "inside", ents, { en: lead[0].en, ta: lead[0].ta }, [...lead, ...hits.filter((r) => !lead.includes(r))].map((r) => r.id).concat("a20", "a21"), hits.flatMap((r) => Object.values(r.roles).flatMap(roleValues)));
}

function answerWhyDisguise(c: Corpus, lang: AskLang, ents: string[]): Answer | null {
  const motive = c.records.filter((r) => (r.kind === "motive" || (r.kind === "disguise" && r.mood === "command")) && ents.some((id) => recordMentions(r, id)));
  if (!motive.length) return null;
  return result(lang, "why_disguise", ents, { en: motive[0].en, ta: motive[0].ta }, motive.map((r) => r.id).concat("b05", "x51"), ents);
}

function answerWhoTold(c: Corpus, lang: AskLang, ents: string[], q: string): Answer | null {
  const hits = matchingVerb(c, q, ents) ?? c.records.filter((r) => r.voice.length > 1 && ents.every((id) => recordMentions(r, id)));
  if (!hits.length) return null;
  const chain = (r: LedgerRecord, lng: "en" | "ta") => r.voice.map((v) => (v === "poet" ? (lng === "en" ? "the poet" : "புலவர்") : nameOf(c, v)[lng])).join(" → ");
  const shown = hits.slice(0, 4);
  return result(lang, "who_told", ents, { en: `It reaches us through: ${shown.map((r) => chain(r, "en")).join("; ")}.`, ta: `இது வந்தடையும் வழி: ${shown.map((r) => chain(r, "ta")).join("; ")}.` }, shown.map((r) => r.id), [...ents, ...shown.flatMap((r) => r.voice.filter((v) => c.nodeById.has(v) && v !== "poet"))]);
}

function about(c: Corpus, lang: AskLang, ents: string[]): Answer | null {
  if (!ents.length) return null;
  const id = ents[0];
  const node: GraphNode | undefined = c.nodeById.get(id);
  if (!node) return null;
  // The later batches add many small events, so the records that carry the plot still go first.
  const minor = (r: LedgerRecord) => Number(/^[nv]\d/.test(r.id));
  const mine = c.records.filter((r) => recordMentions(r, id)).sort((a, b) => Number(happened(b)) - Number(happened(a)) || minor(a) - minor(b) || a.t - b.t);
  const epicEn = node.epics.map((e) => (e === "SIL" ? "Silappatikāram" : "Maṇimēkalai")).join(" and ");
  const epicTa = node.epics.map((e) => (e === "SIL" ? "சிலப்பதிகாரம்" : "மணிமேகலை")).join(", ");
  // Lead with what defines them in this life. Other births and doings come after.
  const defining = ["inexhaustible", "same_person", "child_of", "spouse", "rules"];
  const kin = mine.filter((r) => defining.includes(r.kind) && happened(r) && r.birth === "main").sort((a, b) => defining.indexOf(a.kind) - defining.indexOf(b.kind));
  const lead = kin[0] ?? mine[0];
  if (!lead) {
    return result(lang, "about_thin", ents, { en: `${node.en} appears in ${epicEn}, named on ${node.mentions} lines, but the graph has no events for them yet.`, ta: `${node.ta} ${epicTa} நூலில் ${node.mentions} வரிகளில் வருகிறார்; ஆனால் வரைபடத்தில் இன்னும் நிகழ்ச்சிகள் இல்லை.` }, [], ents);
  }
  return result(lang, "about", ents, { en: `${node.en} appears in ${epicEn}. ${lead.en}`, ta: `${node.ta}: ${epicTa}. ${lead.ta}` }, uniq([...kin, ...mine]).slice(0, 8).map((r) => r.id), ents);
}

// Small words that don't change what's being asked. Anything else left over means the question is about something we don't hold.
const FILLER = new Set("who whom whose what which where when why how is was are were did do does doing done a an the of to in on at by for from with and or about tell me us please it its his her their they he she this that there have has had can could would will be been so yaar yar yaru yaaru enna en epdi eppadi seyyum seydhan senjan panna pannan ah da di la le ku kku oda"
  .split(" "));

function offTopic(c: Corpus, question: string, ents: string[]) {
  if (TAMIL.test(question)) return false; // Tamil endings make this count unreliable, and Tamil questions get verse matches anyway
  const nameWords = new Set(ents.flatMap((id) => { const n = c.nodeById.get(id); return n ? [n.en, ...n.also].flatMap((x) => clean(x).split(" ")) : []; }));
  const rest = clean(question).split(" ").filter((w) => !FILLER.has(w) && ![...nameWords].some((n) => n && (w.startsWith(n) || n.startsWith(w) || editDistance(w, n, 2) <= 2)));
  return rest.length >= 1;
}

const stemWord = (w: string) => (TAMIL.test(w) ? tamilStem(w).slice(0, 6) : w.replace(/(ing|ed|es|s)$/, "").slice(0, 6));

/**
 * When no rule fits, find the records whose own wording is closest and show those, plainly labelled.
 * It asserts nothing of its own: the reader sees the records and their moods and verses.
 */
function closest(c: Corpus, lang: AskLang, question: string, ents: string[]): Answer | null {
  const words = clean(question).split(" ").filter((w) => !FILLER.has(w) && w.length >= 3).map(stemWord);
  const nameWords = new Set(ents.flatMap((id) => { const n = c.nodeById.get(id); return n ? [n.en, n.ta, ...n.also].flatMap((x) => clean(x).split(" ").map(stemWord)) : []; }));
  const content = words.filter((w) => !nameWords.has(w));
  if (!content.length) return null; // nothing but names: "about" already had its chance
  const scored = c.records.map((r) => {
    const text = clean(`${r.en} ${r.ta} ${r.kind.replace(/_/g, " ")}`);
    const overlap = content.filter((w) => text.includes(w)).length;
    const people = ents.filter((id) => recordMentions(r, id)).length;
    return { r, overlap, score: overlap * 2 + people };
  }).filter((x) => (ents.length ? x.overlap > 0 && x.score >= 3 : x.overlap >= 2)) // no names at all: one shared word is just a coincidence.sort((a, b) => b.score - a.score || Number(happened(b.r)) - Number(happened(a.r)));
  if (!scored.length) return null;
  const top = scored.slice(0, 4).map((x) => x.r);
  return result(lang, "closest", ents, { en: `No rule fits this question exactly. The closest thing the graph records: ${top[0].en}`, ta: `இந்தக் கேள்விக்கு நேரடி விதி இல்லை. வரைபடத்தில் மிக நெருக்கமானது: ${top[0].ta}` }, top.map((r) => r.id), [...ents, ...top.flatMap((r) => Object.values(r.roles).flatMap(roleValues))], { en: "This is a match on wording, not a checked answer. Read the records below for yourself.", ta: "இது சொல் ஒப்புமை மட்டுமே; சரிபார்த்த விடை அல்ல. கீழே உள்ள பதிவுகளைப் பாருங்கள்." });
}

// ---- provenance: who made it, where it came from, and what the text never says
const MAKER = /\b(made|make|maker|makes|built|build|crafted|manufactured|senja|senjathu|senjaar|seithathu|seithar|senjavan|kattinathu)\b|செய்த|கட்டிய|உருவாக்கிய/;
const ORIGIN = /\bis (the |a )?[a-z ]+ from\b|\b(grown|grow|grew|origin|produced|cultivated|from where|come from|came from|comes from|belong|belongs|enga irundhu|engirundhu|vilainjathu)\b|விளைந்|எங்கிருந்து|எங்கு விளை|சேர்ந்தவ/;
const NAME_Q = /\b(name of|what is the name|what's the name|whats the name|peyar|per enna|name enna)\b|பெயர் என்ன|பெயர் யாது/;
const TRANSFER = /\b(reach|reached|moved|same (mango|fruit|plantain)|travel|travelled|went to)\b|வந்தனவா|சென்றனவா/;
const KIND_Q = /\b(sandalwood|sandal|santhanam|sandhanam)\b|சந்தனம்/;
const SHARED = /\b(both|shared|common|same fruit|same food|both lists|in common|rendilum|irandilum)\b|இரண்டிலும்|பொதுவான/;
const SUPPLY = /\b(supplied|supply|gave.*(rice|food|fruit|vessels|ingredients)|provided|ingredients|kuduthathu)\b|கொடுத்தவர்|தந்தவர்|கொடுத்தது யார்|பொருள்கள் என்ன/;
const MADURAI_WORDS = /\b(describe|described|description|adjective|adjectives|called|epithet|epithets|expressions?|vivarippu)\b|விவரி|அடைமொழி|வருணனை/;

function gapAnswer(c: Corpus, lang: AskLang, ents: string[], relation: string): Answer | null {
  const gap = c.gaps.find((g) => g.match.relation === relation && ents.some((e) => g.match.subjects.includes(e))) ?? null;
  if (!gap) return null;
  return result(lang, "not_stated", ents, { en: gap.a[0], ta: gap.a[1] }, gap.recs, ents, { en: `Tempting and wrong: "${gap.tempting[0]}"`, ta: `தவறான ஊகம்: "${gap.tempting[1]}"` });
}

function answerMaterial(c: Corpus, lang: AskLang, q: string, ents: string[]): Answer | null {
  if (MADURAI_WORDS.test(q) && ents.includes("madurai")) {
    const forms = c.lexicon.epithets.filter((e) => e.entity === "madurai");
    const ids = forms.map((e) => (e.meaning ? `${e.form}: ${e.meaning}` : e.form));
    return result(lang, "epithets", ents, { en: `The text calls it: ${ids.join("; ")}.`, ta: `நூல் கூறும் தொடர்கள்: ${forms.map((e) => e.form).join("; ")}.` }, [], ents, { en: "Attested wording with line references on the Words page. These are translations, and none of it is stored as 'Madurai is beautiful'.", ta: "வரி எண்களைச் 'சொற்கள்' பக்கத்தில் காணலாம்." });
  }
  if (KIND_Q.test(q) && (ents.includes("saduvan") || ents.includes("wreck_goods") || ents.includes("naga_chief") || ents.includes("fragrant_wood"))) return gapAnswer(c, lang, ["fragrant_wood"], "kind");
  if (TRANSFER.test(q)) { const hit = gapAnswer(c, lang, ents, "transfer"); if (hit) return hit; }
  if (SHARED.test(q) && ents.some((e) => c.nodeById.get(e)?.kind) || /\b(hill|mountain|tribute)\b.*\b(meal|kannagi)\b|\b(meal|kannagi)\b.*\b(hill|mountain|tribute)\b/.test(q) && SHARED.test(q)) {
    const tie = c.ties.find((t) => t.id === "b_produce")!;
    return result(lang, "shared_kind", ents, { en: tie.text[0], ta: tie.text[1] }, tie.recs, ents, { en: tie.not_this[0], ta: tie.not_this[1] });
  }
  if (NAME_Q.test(q)) { const hit = gapAnswer(c, lang, ents, "name"); if (hit) return hit; }
  if (MAKER.test(q)) {
    const made = c.records.filter((r) => ["make", "build_together"].includes(r.kind) && happened(r) && ents.some((e) => roleValues(r.roles.theme).includes(e)));
    // The goldsmith with no object named still means the anklet, since that's the false reading to catch.
    if (made.length) return result(lang, "maker", ents, { en: made.map((r) => r.en).join(" "), ta: made.map((r) => r.ta).join(" ") }, made.map((r) => r.id), [...ents, ...made.flatMap((r) => roleValues(r.roles.agent))]);
    const hit = gapAnswer(c, lang, ents, "maker") ?? gapAnswer(c, lang, ents, "maker_person");
    if (hit) return hit;
    if (ents.some((e) => c.nodeById.get(e)?.cls === "Object" || c.nodeById.get(e)?.kind)) return noAnswer(lang, ents, { en: "No maker is recorded for that. It may be in a passage nobody has encoded yet, so this isn't a claim that the poem doesn't say.", ta: "செய்தவர் பதிவில் இல்லை. இன்னும் பதியப்படாத பகுதியில் இருக்கலாம்." });
  }
  if (ORIGIN.test(q)) { const hit = gapAnswer(c, lang, ents, "origin"); if (hit) return hit; }
  if (SUPPLY.test(q) && ents.some((e) => ["kannagi", "meal_16", "kovalan", "sali_rice", "mango", "plantain", "dairy", "cowherd_women"].includes(e))) {
    const ids = ["n01", "n02", "n04", "n05", "n07"];
    const rec = c.byId.get("n02")!;
    return result(lang, "supply", ents, { en: rec.en, ta: rec.ta }, ids, ["cowherd_women", "kannagi"]);
  }
  return null;
}

export function ask(c: Corpus, question: string): Answer {
  const lang = detectLang(question);
  const q = clean(question);
  const ents = findEntities(c, question);
  const route = (): Answer | null => {
    const material = answerMaterial(c, lang, q, ents);
    if (material) return material;
    if (has(q, INTENT.bridges)) return answerBridges(c, lang);
    if (has(q, INTENT.retold)) return answerRetold(c, lang, ents);
    if (has(q, INTENT.who_told)) return answerWhoTold(c, lang, ents, q);
    if (has(q, INTENT.path) && ents.length >= 2) return answerPath(c, lang, ents);
    if (has(q, INTENT.birth)) return answerBirth(c, lang, ents);
    if (has(q, INTENT.family)) return answerFamily(c, lang, ents);
    if (has(q, INTENT.belief)) return answerBelief(c, lang, ents);
    if (has(q, INTENT.disguise)) return (has(q, INTENT.why) ? answerWhyDisguise(c, lang, ents) : null) ?? answerDisguise(c, lang, ents);
    if (has(q, INTENT.inside)) return answerInside(c, lang, ents);
    if (has(q, INTENT.holder)) return answerHolder(c, lang, ents);
    // "Why was Kovalan killed" and "Did Kovalan steal it" both need to win over plain "who is".
    if (has(q, INTENT.accuse) && !has(q, INTENT.why)) return answerAccuse(c, lang, ents);
    if (has(q, INTENT.really) && matchingVerb(c, q, ents)?.some((r) => r.kind !== "kill")) return answerVerb(c, lang, ents, q);
    if (has(q, INTENT.kill)) return answerKill(c, lang, ents, has(q, INTENT.why)) ?? answerVerb(c, lang, ents, q);
    if (has(q, INTENT.why)) {
      const hits = matchingVerb(c, q, ents)?.filter((r) => r.because?.length);
      if (hits?.length) {
        const reasons = hits.flatMap((r) => reasonRecords(c, r));
        const out = result(lang, "why", ents, { en: reasons.map((r) => r.en).join(" "), ta: reasons.map((r) => r.ta).join(" ") }, [...reasons.map((r) => r.id), ...hits.map((r) => r.id)], ents);
        out.groups = [{ label: { en: "The reasons the text gives", ta: "நூல் தரும் காரணங்கள்" }, records: uniq(reasons.map((r) => r.id)) }, { label: { en: "What they explain", ta: "அவை விளக்குவது" }, records: uniq(hits.map((r) => r.id)) }];
        return out;
      }
      const verbless = answerKill(c, lang, ents, true);
      if (verbless) return verbless;
    }
    const verb = answerVerb(c, lang, ents, q);
    if (verb) return verb;
    if (offTopic(c, question, ents)) return null;
    if (ents.length >= 2 && !has(q, INTENT.whoIs)) return answerPath(c, lang, ents);
    if (ents.length) return about(c, lang, ents);
    return null;
  };
  return route() ?? closest(c, lang, question, ents) ?? (ents.length
    ? noAnswer(lang, ents, { en: `The graph knows about ${names(c, ents).en}, but can't answer that question about them.`, ta: `${names(c, ents).ta} பற்றி வரைபடத்தில் உள்ளது; ஆனால் இந்தக் கேள்விக்கு விடை இல்லை.` })
    : noAnswer(lang, ents, { en: "The graph can't answer that. Try naming someone from the epics, or see the verse matches below.", ta: "இதற்கு வரைபடத்தில் விடை இல்லை. காப்பியத்தில் வரும் ஒருவரைக் குறிப்பிட்டுக் கேளுங்கள், அல்லது கீழே உள்ள வரிகளைப் பாருங்கள்." }));
}

/** Plain text search over all 10,209 lines, for when the graph has nothing. Latin input can't match Tamil script, so it only runs on Tamil. */
export function verseMatches(rows: [string, string][], question: string, limit = 12) {
  const words = clean(question).split(" ").filter((w) => TAMIL.test(w) && w.length >= 3).map(tamilStem);
  if (!words.length) return [];
  return rows.filter(([, text]) => words.some((w) => nfc(text).replace(/\s/g, "").includes(w))).slice(0, limit);
}
