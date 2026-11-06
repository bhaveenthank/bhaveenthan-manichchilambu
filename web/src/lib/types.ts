// Shapes of the JSON files that scripts/build_web_data.py writes.
export type Mood = "asserted" | "negated" | "claimed" | "thought" | "command" | "conditional" | "intended" | "predicted" | "wish" | "metaphor" | "address" | "dreamed" | "question";
export type RoleValue = string | string[] | { one_of: string[] };

export interface VerseLine { id: string; text: string }
export interface Reason { of: string; rel: string; voice?: string[] }

export interface LedgerRecord {
  id: string; ep: string; kind: string; en: string; ta: string;
  roles: Record<string, RoleValue>;
  voice: string[]; mood: Mood; t: number; birth: string; epic: "SIL" | "MAN";
  lines: VerseLine[]; quote: string; layer: "event" | "material" | "belief";
  does?: string[]; because?: Reason[]; carries?: string; content?: string; stance?: "accept" | "reject";
  contradicts?: string; conflicts?: string; retells?: string;
  condition?: string; inferred?: string; unresolved?: string; note?: string; purpose?: string; after_death?: boolean;
}

export interface GraphNode { id: string; en: string; ta: string; also: string[]; cls: string; epics: string[]; mentions: number; first: string | null; unnamed?: boolean; kind?: boolean; broader?: string; gloss?: { of: string; by: string; note: string } }
export interface GraphEdge { s: string; t: string; kind: string; role: string; rec: string; mood: Mood; tm: number; birth: string; ep: string; epic: string; layer: string; cause: boolean }
export interface GraphData { nodes: GraphNode[]; edges: GraphEdge[]; suggested: { s: string; t: string; n: number }[] }

export interface Canto {
  key: string; epic: "SIL" | "MAN"; n: number; title: string; en: string; lines: number; form: string; metres: string[];
  setting: string[]; themes: string[]; kandam: string; people: string[]; events: Record<string, number>; records: string[]; echo: number; length: string;
  cited: number;   // lines the graph's records cite
  drafted: number; // lines cited by those or by the unchecked machine drafts
}
export interface CantoLine { id: string; n: number; text: string; who: string[]; rec: string[] }
export interface Echoes {
  lines: { a: string; b: string; score: number; ta: string; tb: string }[];
  cantos: { a: string; b: string; n: number }[];
}
export interface Timelines { custody: Record<string, { t: number; holders: string[]; rec: string | null }[]> }


export type Pair = [string, string];
export interface Gap { id: string; match: { subjects: string[]; relation: string }; q: Pair; a: Pair; tempting: Pair; recs: string[] }
export interface Tie { id: string; cls: "identity" | "continuation" | "motif" | "comparable"; en: string; ta: string; text: Pair; not_this: Pair; recs: string[] }
export interface PathStep { from: string; to: string; rec: string | null; w: string; via: string | null }
export interface Discovery { a: string; b: string; score: number; epics: string[]; warrants: string[]; kinds: string[]; steps: PathStep[]; no: { en: string; ta: string }[] }
export interface LexEntry { form: string; entity?: string; line: string; text: string; source: string; note?: string; meaning?: string }
export interface Sense { entity?: string; line: string; as?: string; en: string; ta: string; text: string }
export interface Lexicon { people: LexEntry[]; places: LexEntry[]; objects: LexEntry[]; foods: LexEntry[]; events: LexEntry[]; epithets: LexEntry[]; homonyms: { form: string; senses: Sense[] }[] }

export interface Corpus {
  graph: GraphData; records: LedgerRecord[]; cantos: Canto[]; echoes: Echoes; timelines: Timelines;
  gaps: Gap[]; ties: Tie[]; discoveries: Discovery[]; lexicon: Lexicon;
  byId: Map<string, LedgerRecord>; nodeById: Map<string, GraphNode>;
}
export type Lang = "en" | "ta";
