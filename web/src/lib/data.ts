import type { CantoLine, Corpus } from "./types";

// Files live next to the page, so this works on GitHub Pages under any repo name.
const url = (name: string) => `${import.meta.env.BASE_URL}data/${name}`;
const fetchJson = async <T,>(name: string): Promise<T> => {
  const res = await fetch(url(name));
  if (!res.ok) throw new Error(`could not load ${name}`);
  return res.json();
};

export function assemble(parts: Omit<Corpus, "byId" | "nodeById">): Corpus {
  return { ...parts, byId: new Map(parts.records.map((r) => [r.id, r])), nodeById: new Map(parts.graph.nodes.map((n) => [n.id, n])) };
}

export async function loadCorpus(): Promise<Corpus> {
  const [graph, records, cantos, echoes, timelines, gaps, ties, discoveries, lexicon] = await Promise.all([
    fetchJson<Corpus["graph"]>("graph.json"), fetchJson<Corpus["records"]>("records.json"), fetchJson<Corpus["cantos"]>("cantos.json"),
    fetchJson<Corpus["echoes"]>("echoes.json"), fetchJson<Corpus["timelines"]>("timelines.json"),
    fetchJson<Corpus["gaps"]>("gaps.json"), fetchJson<Corpus["ties"]>("bridges.json"), fetchJson<Corpus["discoveries"]>("discover.json"), fetchJson<Corpus["lexicon"]>("lexicon.json"),
  ]);
  return assemble({ graph, records, cantos, echoes, timelines, gaps, ties, discoveries, lexicon });
}

const cantoCache = new Map<string, Promise<CantoLine[]>>();
export function loadCanto(key: string) {
  if (!cantoCache.has(key)) cantoCache.set(key, fetchJson<CantoLine[]>(`cantos/${key}.json`));
  return cantoCache.get(key)!;
}

let searchCache: Promise<[string, string][]> | null = null;
export function loadSearch() {
  searchCache ??= fetchJson<[string, string][]>("search.json");
  return searchCache;
}
