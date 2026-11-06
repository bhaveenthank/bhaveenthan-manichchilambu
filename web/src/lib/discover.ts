// Guarded paths in the browser. Same rules and same costs as src/manichchilambu/discover.py, and a test keeps them matched.
// Each step knows what kind of link it is, and a path can't conclude more than its weakest step allows.
import { roleValues } from "./model";
import type { Corpus, LedgerRecord, PathStep } from "./types";

const SKIP = new Set(["poet", "unnamed", "knowledge", "birth", "risen_kovalan", "sword", "mantra", "unknown"]);

export interface SearchOptions { said?: boolean; weak?: boolean; places?: boolean; banned?: string[]; maxHops?: number }
interface Edge { to: string; rec: string | null; w: string }

export class GuardedGraph {
  adj = new Map<string, Edge[]>();
  constructor(private corpus: Corpus) {
    const add = (a: string, e: Edge) => { (this.adj.get(a) ?? this.adj.set(a, []).get(a)!).push(e); };
    for (const r of corpus.records) {
      const told = r.mood === "asserted";
      const people = Object.values(r.roles).flatMap(roleValues).filter((v) => !SKIP.has(v));
      const seen = new Set<string>();
      people.forEach((a, i) => people.slice(i + 1).forEach((b) => {
        if (a === b || seen.has(`${a}|${b}`)) return;
        seen.add(`${a}|${b}`);
        add(a, { to: b, rec: r.id, w: told ? "event" : "said" });
        add(b, { to: a, rec: r.id, w: told ? "event" : "said" });
      }));
    }
    for (const n of corpus.graph.nodes) {
      if (n.broader) { add(n.id, { to: n.broader, rec: null, w: "wider" }); add(n.broader, { to: n.id, rec: null, w: "wider" }); }
      if (n.gloss) { add(n.id, { to: n.gloss.of, rec: null, w: "gloss" }); add(n.gloss.of, { to: n.id, rec: null, w: "gloss" }); }
    }
  }

  degree(id: string) { return new Set((this.adj.get(id) ?? []).map((e) => e.to)).size; }

  through(id: string): "kind" | "place" | "same" {
    const n = this.corpus.nodeById.get(id);
    if (n?.kind) return "kind";
    return n?.cls === "Place" ? "place" : "same";
  }

  search(start: string, goal: string, o: SearchOptions = {}): { steps: PathStep[]; cost: number } | null {
    const limit = o.weak === false ? 0 : 1;
    const banned = new Set(o.banned ?? []);
    const maxHops = o.maxHops ?? 7;
    const best = new Map<string, number>();
    // A small array is plenty for graphs this size, and it keeps this file free of a heap.
    const open: { cost: number; node: string; weak: number; path: PathStep[] }[] = [{ cost: 0, node: start, weak: 0, path: [] }];
    while (open.length) {
      let at = 0;
      for (let i = 1; i < open.length; i++) if (open[i].cost < open[at].cost) at = i;
      const { cost, node, weak, path } = open.splice(at, 1)[0];
      if (node === goal && path.length) return { steps: path, cost };
      const key = `${node}|${weak}`;
      if ((best.get(key) ?? Infinity) <= cost || path.length >= maxHops) continue;
      best.set(key, cost);
      for (const e of this.adj.get(node) ?? []) {
        if (banned.has(e.to) || e.to === start || path.some((s) => s.to === e.to)) continue;
        if (e.w === "said" && !o.said) continue;
        const passing = node !== start ? this.through(node) : null;
        if (passing === "place" && o.places === false) continue;
        const arrivedByGloss = path.length > 0 && ["gloss", "wider"].includes(path[path.length - 1].w);
        const stepGloss = e.w === "gloss" || e.w === "wider";
        const entering = (passing === "kind" && !arrivedByGloss) || (stepGloss && passing !== "kind" && !arrivedByGloss);
        const spent = weak + (entering ? 1 : 0);
        if (spent > limit) continue;
        const price = e.to === goal ? 1 : 1 + Math.log1p(this.degree(e.to));
        open.push({ cost: cost + price, node: e.to, weak: spent, path: [...path, { from: node, to: e.to, rec: e.rec, w: e.w, via: passing }] });
      }
    }
    return null;
  }
}

/** Warrants a path leans on, for showing beside it. */
export function warrants(steps: PathStep[]) {
  const out = new Set<string>();
  for (const s of steps) { out.add(s.w); if (s.via) out.add(s.via); }
  return [...out];
}

/** What the path doesn't let you say. Mirrors WarrantGraph.limits. */
export function limits(corpus: Corpus, steps: PathStep[]) {
  const out: { en: string; ta: string }[] = [];
  const name = (id: string) => corpus.nodeById.get(id) ?? { en: id, ta: id };
  for (const s of steps) {
    if (s.via === "kind") out.push({ en: `Both records mention ${name(s.from).en} as a kind of thing. Nothing here shows the same ${name(s.from).en} in both, or that any moved between them.`, ta: `இரு பதிவுகளும் ${name(s.from).ta} என்ற வகையைக் குறிப்பிடுகின்றன. ஒரே பொருளோ இடமாற்றமோ இதனால் நிறுவப்படவில்லை.` });
    if (s.via === "place") out.push({ en: `Both things happen at ${name(s.from).en}. That doesn't mean anything here was made or grown there, or that the people met.`, ta: `இரண்டும் ${name(s.from).ta} இல் நிகழ்கின்றன. அங்கு விளைந்ததாகவோ, செய்யப்பட்டதாகவோ, அவர்கள் சந்தித்ததாகவோ பொருள் இல்லை.` });
  }
  const used = warrants(steps);
  if (used.includes("gloss")) out.push({ en: "One step rests on a commentator's reading of a word, not on the word itself.", ta: "ஒரு படி உரையாசிரியர் விளக்கத்தைச் சார்ந்தது; சொல்லையே அல்ல." });
  if (used.includes("wider")) out.push({ en: "One step goes through a wider category. A sandalwood log is a fragrant wood, but 'fragrant wood' in a verse needn't be sandalwood.", ta: "ஒரு படி பரந்த வகை வழியாகச் செல்கிறது. விரை மரம் என்பது சந்தனமாகத்தான் இருக்க வேண்டும் என்பதில்லை." });
  if (used.includes("said")) out.push({ en: "One step is only something a character said, and the graph doesn't count it as having happened.", ta: "ஒரு படி ஒரு பாத்திரத்தின் கூற்று மட்டுமே; நிகழ்ந்ததாகக் கொள்ளப்படவில்லை." });
  return out;
}

// The one set of words for links, used everywhere on the site. LinkKey explains them once.
export const WARRANT_NAMES: Record<string, [string, string]> = {
  event: ["told as fact", "நிகழ்ந்ததாக"], said: ["only said", "கூற்று மட்டும்"], same: ["same one", "அதே ஒன்று"],
  place: ["same place only", "ஒரே இடம் மட்டும்"], kind: ["same kind only", "ஒரே வகை மட்டும்"], wider: ["broader kind only", "பரந்த வகை மட்டும்"], gloss: ["commentary reading", "உரை விளக்கம்"],
};
export const WARRANT_HELP: Record<string, [string, string]> = {
  event: ["The poem tells it as having happened.", "நிகழ்ந்ததாக நூல் கூறுகிறது."],
  said: ["A character says it. It isn't counted as having happened.", "ஒரு பாத்திரம் கூறுகிறது; நிகழ்ந்ததாகக் கொள்ளப்படவில்லை."],
  same: ["The same person or thing, named differently.", "அதே நபர் அல்லது பொருள், வேறு பெயரில்."],
  place: ["Two things happen in one place. That alone joins nothing else.", "ஒரே இடத்தில் நிகழ்வன; அதற்கு மேல் தொடர்பு இல்லை."],
  kind: ["Two things of one kind, like two mangoes. Not the same mango.", "ஒரே வகைப் பொருள்கள்; ஒரே பொருள் அல்ல."],
  wider: ["Joined only through a broader kind, like 'fragrant wood'.", "பரந்த வகை வழியாக மட்டும்."],
  gloss: ["Rests on a commentator's reading, not the verse alone.", "உரையாசிரியர் விளக்கத்தைச் சார்ந்தது."],
};
// Strong links are plain. Anything that only suggests a link is marked as a caution.
export const CAUTION = new Set(["said", "place", "kind", "wider", "gloss"]);

export const stepRecords = (corpus: Corpus, steps: PathStep[]) => steps.map((s) => s.rec).filter((r): r is string => !!r && corpus.byId.has(r)).filter((r, i, all) => all.indexOf(r) === i);
export const recordEpic = (r: LedgerRecord) => r.epic;
