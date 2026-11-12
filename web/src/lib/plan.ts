// Reading a question before answering it: what language it's in, who and what it names, what kind of
// question it is, and what kind of evidence may answer it. The result is a typed plan, shown on the Ask page
// and stored with every evidence package, so any answer can be replayed and checked.
import { detectLang, findEntities, type AskLang } from "./ask";
import type { Corpus, GraphNode } from "./types";

export type Intent =
  | "who_is" | "fact" | "event" | "object_history" | "claim_check" | "viewpoint" | "causal"
  | "cross_epic" | "provenance" | "thematic" | "comparative" | "locate" | "open";

/** Which kinds of evidence a question may rest on. Drafts and machine notes are never allowed to answer, only to point. */
export interface SourcePolicy { records: boolean; drafts: "point_only" | "off"; notes: "point_only" | "off"; commentary: "attributed" | "off" }

export interface Grounded { id: string; surface: string; cls: string; confidence: "high" | "low" }
export interface Ambiguity { surface: string; options: string[]; resolvedTo?: string; why?: { en: string; ta: string } }

export interface QueryPlan {
  question: string;
  lang: AskLang;
  intent: Intent;
  entities: Grounded[];
  ambiguous: Ambiguity[];
  /** Asks what someone believed or said, not what happened. */
  viewpoint: string | null;
  /** Wants to compare what was told as fact with what was only claimed. */
  compareModes: boolean;
  epic: "SIL" | "MAN" | null;
  terms: string[];
  policy: SourcePolicy;
}

const nfc = (s: string) => s.normalize("NFC");
const clean = (s: string) => nfc(s).toLowerCase().replace(/[?!.,;:'"“”‘’()\-–—]/g, " ").replace(/\s+/g, " ").trim();

// Cue words for each kind of question, in English, Tamil and Thanglish. The first match in this order wins.
const CUES: [Intent, RegExp][] = [
  ["claim_check", /\b(really|actually|truly|did .* (really|actually)|is it true|was .* guilty|innocent|unmaiya|nijama|lie|lied|false|falsely)\b|உண்மையில்|உண்மையா|பொய்/],
  ["viewpoint", /\b(believe|believed|thought|think|suspect|suspected|convinced|nambi|nambina|ninaithaan|ninaicha)\b|நம்ப|எண்ணி|நினைத்/],
  ["causal", /\b(why|because|cause|caused|led to|reason|ethukku|yen|een)\b|ஏன்|காரணம்|எதனால்/],
  ["object_history", /\b(who (had|held|has|kept|took|carried)|passed|hands?|custody|where is the|kitta irundhuchu)\b|யாரிடம்|கையில்/],
  ["cross_epic", /\b(both epics|both poems|in both|between the (two )?epics|rendilum|irandilum)\b|இரு காப்பிய|இரண்டிலும்/],
  ["comparative", /\b(compare|comparison|difference|differ|similar|versus|vs)\b|ஒப்பிடு|வேறுபாடு/],
  ["provenance", /\b(made|maker|built|crafted|grown|from where|come from|came from|origin|supplied|enga irundhu)\b|செய்தவர்|செய்யப்பட்ட|உருவாக்கிய|விளைந்|எங்கிருந்து/],
  ["thematic", /\b(theme|themes|portray|portrayed|represent|represented|describe|described|depict|motif|compassion|renunciation|karma|justice|chastity)\b|அறம்|ஊழ்|கற்பு|துறவு/],
  ["locate", /\b(which line|which canto|where in the|find the line|verse where|occurrence|occurrences)\b|எந்த வரி|எந்தக் காதை/],
  ["who_is", /^(who is|who was|who are|what is|tell me about)\b|^\S+ (yaar|yaaru|yar)$|யார்\??$/],
  ["event", /\b(what happened|what did|what does|how did|what was done|enna pannan|enna aachu)\b|என்ன ஆனது|என்ன செய்த|எப்படி/],
];

const EPIC_CUES: ["SIL" | "MAN", RegExp][] = [
  ["SIL", /\b(silappathikaram|silappatikaram|silapathikaram|cilappatikaram|silambu epic)\b|சிலப்பதிகார/],
  ["MAN", /\b(manimekalai epic|manimegalai epic|in manimekalai|in manimegalai)\b|மணிமேகலையில்|மணிமேகலைக் காப்பிய/],
];

const STOP = new Set(("who whom whose what which where when why how is was are were did do does doing done a an the of to in on at by for from with and or about tell me us please it its his her their they he she this that there have has had can could would will be been so really actually " +
  "yaar yar yaru yaaru enna en epdi eppadi ah da di la le ku kku oda nu kitta than thaan").split(" "));

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

/**
 * Names that point at more than one person or thing: two men called Kausikan, சாலி the woman and சாலி the rice.
 * Context settles it when it can (the epic named, or someone else in the question who belongs to only one epic).
 * Otherwise both are offered rather than one picked silently.
 */
export function findAmbiguities(corpus: Corpus, question: string, found: string[], epic: "SIL" | "MAN" | null): Ambiguity[] {
  const words = clean(question).split(" ").filter((w) => w.length >= 4 && !STOP.has(w));
  const out: Ambiguity[] = [];
  const others = found.map((id) => corpus.nodeById.get(id)).filter(Boolean) as GraphNode[];
  for (const w of words) {
    // How strongly each node's names match this word: 3 a whole name or alias, 2 the first word of a longer
    // name ("Kausikan of Campai"), 1 one letter off. "Kovalan's mother" is about Kovalan, not a rival to him.
    const strength = new Map<string, number>();
    for (const n of corpus.graph.nodes) {
      // Only proper names can clash: "the goldsmith" and "a woman" are descriptions, not names.
      if (n.kind || !["Person", "Deity", "Place"].includes(n.cls) || !/^[A-Z]/.test(n.en)) continue;
      for (const form of [n.en.replace(/^the /i, ""), n.ta, ...n.also].map(clean).filter(Boolean)) {
        const parts = form.split(" ");
        if (parts[1] === "s") continue;
        const st = form === w ? 3 : parts[0] === w && parts.length > 1 ? 2 : parts.length === 1 && w.length >= 6 && editDistance(form, w, 1) <= 1 ? 1 : 0;
        if (st > (strength.get(n.id) ?? 0)) strength.set(n.id, st);
      }
    }
    if (strength.size < 2) continue;
    const best = Math.max(...strength.values());
    const options = [...strength.keys()].sort((a, b) => strength.get(b)! - strength.get(a)!);
    // One whole-name match beats namesakes found by a first word or a typo: Kovalan is Kovalan.
    if (best === 3 && [...strength.values()].filter((v) => v === 3).length === 1) continue;
    const byEpic = epic ? options.filter((id) => corpus.nodeById.get(id)!.epics.includes(epic)) : options;
    const byCompany = others.length ? byEpic.filter((id) => others.some((o) => o.id !== id && !options.includes(o.id) && o.epics.some((e) => corpus.nodeById.get(id)!.epics.includes(e)))) : [];
    const left = byCompany.length === 1 ? byCompany : byEpic;
    if (left.length === 1) out.push({ surface: w, options, resolvedTo: left[0], why: epic ? { en: "settled by the epic named in the question", ta: "கேள்வியில் உள்ள காப்பியத்தால் தீர்ந்தது" } : { en: "settled by who else the question names", ta: "கேள்வியில் உள்ள மற்றவரால் தீர்ந்தது" } });
    else out.push({ surface: w, options });
  }
  return out;
}

export function planQuery(corpus: Corpus, question: string): QueryPlan {
  const q = clean(question);
  const lang = detectLang(question);
  const epic = EPIC_CUES.find(([, re]) => re.test(q))?.[0] ?? null;
  const found = findEntities(corpus, question);
  const ambiguous = findAmbiguities(corpus, question, found, epic);
  // An unresolved ambiguity means the matcher's pick is only a guess, so it's marked low.
  const unsure = new Set(ambiguous.filter((a) => !a.resolvedTo).flatMap((a) => a.options));
  const entities: Grounded[] = found.map((id) => ({ id, surface: corpus.nodeById.get(id)?.en ?? id, cls: corpus.nodeById.get(id)?.cls ?? "Other", confidence: unsure.has(id) ? "low" : "high" }));
  for (const a of ambiguous) if (a.resolvedTo) for (let i = entities.length - 1; i >= 0; i--) if (a.options.includes(entities[i].id) && entities[i].id !== a.resolvedTo) entities.splice(i, 1);
  for (const a of ambiguous) if (a.resolvedTo && !entities.some((e) => e.id === a.resolvedTo)) entities.push({ id: a.resolvedTo, surface: a.surface, cls: corpus.nodeById.get(a.resolvedTo)?.cls ?? "Other", confidence: "high" });
  const intent: Intent = CUES.find(([, re]) => re.test(q))?.[0] ?? (entities.length && q.split(" ").length <= 3 ? "who_is" : "open");
  const viewpoint = intent === "viewpoint" ? entities.find((e) => e.cls === "Person" || e.cls === "Group")?.id ?? null : null;
  const terms = q.split(" ").filter((w) => w.length >= 3 && !STOP.has(w));
  return {
    question, lang, intent, entities, ambiguous, viewpoint, epic, terms,
    compareModes: intent === "claim_check" || intent === "viewpoint",
    policy: { records: true, drafts: "point_only", notes: "point_only", commentary: "attributed" },
  };
}

export const INTENT_LABEL: Record<Intent, [string, string]> = {
  who_is: ["Who or what someone is", "யார் / எது"],
  fact: ["A fact", "ஒரு செய்தி"],
  event: ["What happened", "என்ன நடந்தது"],
  object_history: ["Whose hands something passed through", "எது யாரிடம் இருந்தது"],
  claim_check: ["Did it happen, or was it only said?", "நடந்ததா, சொல்லப்பட்டதா?"],
  viewpoint: ["What someone believed", "ஒருவர் நம்பியது"],
  causal: ["Why something happened", "ஏன் நடந்தது"],
  cross_epic: ["Across the two epics", "இரு காப்பியங்களுக்கு இடையே"],
  provenance: ["Where something came from, who made it", "மூலம், செய்தவர்"],
  thematic: ["A theme", "ஒரு கருப்பொருள்"],
  comparative: ["A comparison", "ஒப்பீடு"],
  locate: ["Where the text says it", "நூலில் எங்கே"],
  open: ["An open question", "திறந்த கேள்வி"],
};
