// Full-text search over all 10,209 lines, using MiniSearch (lucaong/minisearch, MIT).
// Tamil words glue suffixes on and editors split them differently, so plain whole-word search misses most of what
// you'd want. Prefix search on the first letters of each word plus a little fuzziness gets most of them back.
import MiniSearch from "minisearch";
import { loadSearch } from "./data";

export interface VerseHit { id: string; text: string; score: number }
const nfc = (s: string) => s.normalize("NFC");
// Pulli at the end stops கோவலன் from being a prefix of கோவலனை, so it's dropped from both sides.
const stem = (w: string) => w.replace(/்$/, "");
// For the query only: drop the last vowel sign too, so சிலம்பு also finds சிலம்பின் and சிலம்பை.
export const queryStem = (w: string) => { const s = nfc(w).replace(/[ா-்]$/u, ""); return s.length >= 3 ? s : stem(nfc(w)); };

let index: Promise<MiniSearch<{ id: string; text: string }>> | null = null;
export function verseIndex() {
  index ??= loadSearch().then((rows) => {
    const engine = new MiniSearch<{ id: string; text: string }>({
      fields: ["text"], storeFields: ["text"],
      tokenize: (s) => nfc(s).split(/[\s,.;:!?'"“”‘’()\-–—]+/).filter(Boolean),
      processTerm: (t) => stem(t),
    });
    engine.addAll(rows.map(([id, text]) => ({ id, text })));
    return engine;
  });
  return index;
}

export async function searchVerses(query: string, epic: "both" | "SIL" | "MAN", limit = 80): Promise<VerseHit[]> {
  const engine = await verseIndex();
  const hits = engine.search(nfc(query), { prefix: true, processTerm: queryStem, fuzzy: (term) => (term.length > 6 ? 0.12 : false), combineWith: "AND", filter: (r) => epic === "both" || String(r.id).startsWith(epic) });
  return hits.slice(0, limit).map((h) => ({ id: String(h.id), text: h.text as string, score: h.score }));
}
