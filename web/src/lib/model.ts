// The ledger's rules, in the browser. Same logic as src/manichchilambu/ledger.py: only a told-straight record
// can change the world, and everything else stays something somebody said.
import type { Corpus, GraphEdge, LedgerRecord, RoleValue } from "./types";

export const roleValues = (v: RoleValue | undefined): string[] => (v === undefined ? [] : typeof v === "string" ? [v] : Array.isArray(v) ? v : v.one_of);
export const happened = (r: LedgerRecord) => r.mood === "asserted";

export function recordMentions(r: LedgerRecord, id: string) {
  return Object.values(r.roles).some((v) => roleValues(v).includes(id));
}

const CHANGE = /([+-])(\w+)\(([^)]*)\)/;
export function holdersAt(corpus: Corpus, obj: string, t: number): string[] {
  const now = new Set<string>();
  for (const r of [...corpus.records].sort((a, b) => a.t - b.t)) {
    if (r.t > t || !happened(r)) continue;
    for (const c of r.does ?? []) {
      const m = CHANGE.exec(c);
      if (!m || m[2] !== "holds") continue;
      const [who, what] = m[3].split(",").map((x) => x.trim());
      if (what !== obj) continue;
      m[1] === "+" ? now.add(who) : now.delete(who);
    }
  }
  return [...now];
}

export function beliefAt(corpus: Corpus, holder: string, content: string, t: number): "accept" | "reject" | null {
  let stance: "accept" | "reject" | null = null;
  for (const r of [...corpus.records].sort((a, b) => a.t - b.t)) {
    if (r.kind === "believe" && r.content === content && r.t <= t && roleValues(r.roles.holder).includes(holder)) stance = r.stance ?? null;
  }
  return stance;
}

/** What this person has in their head at time t: claims they've accepted and not yet dropped. */
export function acceptedClaims(corpus: Corpus, viewer: string, t: number): Set<string> {
  const out = new Set<string>();
  for (const r of corpus.records) {
    if (r.kind === "believe" && r.content && roleValues(r.roles.holder).includes(viewer) && beliefAt(corpus, viewer, r.content, t) === "accept") out.add(r.content);
  }
  return out;
}

export interface GraphFilter {
  epic: "both" | "SIL" | "MAN";
  reading: "happened" | "said";
  episode: string;
  maxT: number;
  viewer: string;
  classes: Set<string>;
  focus: string;
  hops: number;
  bridgesOnly: boolean;
  suggestions: boolean;
  earlierBirths: boolean;
  layer: "all" | "event" | "material" | "belief" | "cause";
}

export const CLASSES = ["Person", "Deity", "Place", "Object", "Group", "Food", "Material"];

export function defaultFilter(): GraphFilter {
  return { epic: "both", reading: "happened", episode: "all", maxT: Infinity, viewer: "", classes: new Set(CLASSES), focus: "", hops: 2, bridgesOnly: false, suggestions: false, earlierBirths: true, layer: "all" };
}

export function edgeVisible(corpus: Corpus, e: GraphEdge, f: GraphFilter, accepted: Set<string>) {
  const r = corpus.byId.get(e.rec)!;
  if (f.epic !== "both" && e.epic !== f.epic) return false;
  if (f.episode !== "all" && e.ep !== f.episode) return false;
  if (f.layer === "cause" ? !e.cause : f.layer !== "all" && e.layer !== f.layer) return false;
  if (e.tm > f.maxT) return false;
  if (!f.earlierBirths && e.birth !== "main") return false;
  if (f.reading === "happened" && !happened(r) && !accepted.has(r.id)) return false;
  return true;
}

export interface Subgraph { nodes: string[]; edges: GraphEdge[]; suggested: { s: string; t: string; n: number }[] }

export function subgraph(corpus: Corpus, f: GraphFilter): Subgraph {
  const accepted = f.viewer ? acceptedClaims(corpus, f.viewer, f.maxT) : new Set<string>();
  const classOf = (id: string) => corpus.nodeById.get(id)?.cls ?? "Other";
  const kept = (id: string) => classOf(id) === "Other" || f.classes.has(classOf(id));
  let edges = corpus.graph.edges.filter((e) => edgeVisible(corpus, e, f, accepted) && kept(e.s) && kept(e.t));
  if (f.bridgesOnly) {
    const both = (id: string) => (corpus.nodeById.get(id)?.epics.length ?? 0) > 1;
    edges = edges.filter((e) => both(e.s) || both(e.t));
  }
  if (f.focus) {
    let frontier = new Set([f.focus]);
    const seen = new Set(frontier);
    for (let i = 0; i < f.hops; i++) {
      const next = new Set<string>();
      for (const e of edges) {
        if (frontier.has(e.s) && !seen.has(e.t)) next.add(e.t);
        if (frontier.has(e.t) && !seen.has(e.s)) next.add(e.s);
      }
      next.forEach((n) => seen.add(n));
      frontier = next;
    }
    edges = edges.filter((e) => seen.has(e.s) && seen.has(e.t));
  }
  const nodes = new Set<string>(f.focus ? [f.focus] : []);
  edges.forEach((e) => { nodes.add(e.s); nodes.add(e.t); });
  const suggested = f.suggestions ? corpus.graph.suggested.filter((s) => kept(s.s) && kept(s.t) && (!f.focus || (nodes.has(s.s) && nodes.has(s.t)))) : [];
  suggested.forEach((s) => { nodes.add(s.s); nodes.add(s.t); });
  return { nodes: [...nodes], edges, suggested };
}

export function recordsToSubgraph(corpus: Corpus, ids: string[], extraNodes: string[] = []): Subgraph {
  const want = new Set(ids);
  const edges = corpus.graph.edges.filter((e) => want.has(e.rec));
  const nodes = new Set(extraNodes);
  edges.forEach((e) => { nodes.add(e.s); nodes.add(e.t); });
  return { nodes: [...nodes], edges, suggested: [] };
}

/** Shortest chain between two things, each step a verse-backed record. Breadth-first over the visible edges. */
export function findPath(corpus: Corpus, from: string, to: string, onlyHappened = true): GraphEdge[] | null {
  const adj = new Map<string, { to: string; e: GraphEdge }[]>();
  for (const e of corpus.graph.edges) {
    if (onlyHappened && e.mood !== "asserted") continue;
    (adj.get(e.s) ?? adj.set(e.s, []).get(e.s)!).push({ to: e.t, e });
    (adj.get(e.t) ?? adj.set(e.t, []).get(e.t)!).push({ to: e.s, e });
  }
  const prev = new Map<string, { from: string; e: GraphEdge }>();
  const queue = [from];
  const seen = new Set(queue);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) {
      const out: GraphEdge[] = [];
      let at = to;
      while (at !== from) { const p = prev.get(at)!; out.unshift(p.e); at = p.from; }
      return out;
    }
    for (const { to: nxt, e } of adj.get(cur) ?? []) {
      if (!seen.has(nxt)) { seen.add(nxt); prev.set(nxt, { from: cur, e }); queue.push(nxt); }
    }
  }
  return null;
}

export const MOOD_LABEL: Record<string, { en: string; ta: string }> = {
  asserted: { en: "told as fact", ta: "நிகழ்ந்ததாக" }, claimed: { en: "only claimed", ta: "கூற்று மட்டுமே" },
  thought: { en: "a thought", ta: "மனத்தில் எண்ணியது" }, command: { en: "an order or request", ta: "ஆணை / வேண்டுகோள்" },
  conditional: { en: "conditional", ta: "நிபந்தனைக்கு உட்பட்டது" }, intended: { en: "a plan", ta: "திட்டம்" },
  predicted: { en: "foretold", ta: "முன்னுரைக்கப்பட்டது" }, wish: { en: "a wish or curse", ta: "விருப்பம் / சாபம்" },
  metaphor: { en: "a figure of speech", ta: "உருவகம்" }, address: { en: "a way of addressing", ta: "விளிப்பு" },
  dreamed: { en: "in a dream", ta: "கனவில்" }, question: { en: "asked, not stated", ta: "கேள்வி மட்டுமே" }, negated: { en: "denied", ta: "மறுக்கப்பட்டது" },
};
