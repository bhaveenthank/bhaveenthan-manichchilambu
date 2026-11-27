import type { RetrievalData } from "./hybrid";
import type { CantoLine, Corpus, NoveltyItem } from "./types";

// Files live next to the page, so this works on GitHub Pages under any repo name.
const url = (name: string) => `${import.meta.env.BASE_URL}data/${name}`;
const fetchJson = async <T>(name: string): Promise<T> => {
  const res = await fetch(url(name));
  if (!res.ok) throw new Error(`could not load ${name}`);
  return res.json();
};

export function assemble(parts: Omit<Corpus, "byId" | "nodeById">): Corpus {
  return { ...parts, byId: new Map(parts.records.map((r) => [r.id, r])), nodeById: new Map(parts.graph.nodes.map((n) => [n.id, n])) };
}

/** The three files nearly every page needs: who and what is in the graph, the records, and the songs. */
export async function loadCore() {
  const [graph, records, cantos] = await Promise.all([
    fetchJson<Corpus["graph"]>("graph.json"),
    fetchJson<Corpus["records"]>("records.json"),
    fetchJson<Corpus["cantos"]>("cantos.json"),
  ]);
  return { graph, records, cantos };
}
export type Extras = Pick<Corpus, "echoes" | "timelines" | "gaps" | "ties" | "discoveries" | "lexicon">;
/** The rest, fetched only when a page that uses them opens. About, Songs and the Graph page never wait for these. */
export const loadExtras = remembered(async (): Promise<Extras> => {
  const [echoes, timelines, gaps, ties, discoveries, lexicon] = await Promise.all([
    fetchJson<Corpus["echoes"]>("echoes.json"),
    fetchJson<Corpus["timelines"]>("timelines.json"),
    fetchJson<Corpus["gaps"]>("gaps.json"),
    fetchJson<Corpus["ties"]>("bridges.json"),
    fetchJson<Corpus["discoveries"]>("discover.json"),
    fetchJson<Corpus["lexicon"]>("lexicon.json"),
  ]);
  return { echoes, timelines, gaps, ties, discoveries, lexicon };
});
/** Placeholders until the extras arrive. Pages that read them wait for the real ones, so these are never shown. */
export const NO_EXTRAS: Extras = {
  echoes: { lines: [], cantos: [] },
  timelines: { custody: {} },
  gaps: [],
  ties: [],
  discoveries: [],
  lexicon: { people: [], places: [], objects: [], foods: [], events: [], epithets: [], homonyms: [] },
};

export async function loadCorpus(): Promise<Corpus> {
  const [core, extras] = await Promise.all([loadCore(), loadExtras()]);
  return assemble({ ...core, ...extras });
}

/**
 * Fetch once and share the promise, but forget a failure, so a network blip doesn't break a feature until reload.
 * The next call simply tries again.
 */
function remembered<T>(fetcher: () => Promise<T>): () => Promise<T> {
  let cached: Promise<T> | null = null;
  return () => {
    cached ??= fetcher().catch((err) => {
      cached = null;
      throw err;
    });
    return cached;
  };
}

const cantoCache = new Map<string, Promise<CantoLine[]>>();
export function loadCanto(key: string) {
  if (!cantoCache.has(key))
    cantoCache.set(
      key,
      fetchJson<CantoLine[]>(`cantos/${key}.json`).catch((err) => {
        cantoCache.delete(key);
        throw err;
      }),
    );
  return cantoCache.get(key)!;
}

/** The Novelty page's computed examples (scripts/build_novelty.py). */
export const loadNovelty = remembered(() => fetchJson<{ items: NoveltyItem[] }>("novelty.json"));

export const loadSearch = remembered(() => fetchJson<[string, string][]>("search.json"));

/** The extra indexes the Ask page searches: every line, the machine notes that gloss them, and the drafts. Loaded on first question. */
export const loadRetrieval = remembered(() =>
  Promise.all([loadSearch(), fetchJson<Omit<RetrievalData, "lines">>("retrieval.json")]).then(([lines, extra]) => ({ lines, ...extra })),
);
