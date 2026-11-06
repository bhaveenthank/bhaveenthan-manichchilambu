// A measurement more than a test: it reports how the engine does on questions it wasn't built around.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { ask } from "./ask";
import { FRESH, FRESH_2, FRESH_3 } from "./ask.fresh";
import { assemble } from "./data";

const read = (name: string) => JSON.parse(readFileSync(resolve(__dirname, "../../public/data", name), "utf-8"));
const corpus = assemble({ graph: read("graph.json"), records: read("records.json"), cantos: read("cantos.json"), echoes: read("echoes.json"), timelines: read("timelines.json"), gaps: read("gaps.json"), ties: read("bridges.json"), discoveries: read("discover.json"), lexicon: read("lexicon.json") });

const measure = (set: [string, string | null][]) => {
  const rows = set.map(([q, want]) => {
    const a = ask(corpus, q);
    const lead = a.records.slice(0, 3);
    const verdict = want === null ? (a.found && a.type !== "closest" ? "wrongly answered" : a.found ? "offered closest" : "right") : !a.found ? "refused" : a.records.includes(want) ? (lead.includes(want) ? "right" : "buried") : "wrong";
    return { q, want, type: a.type, verdict, headline: a.headline.en.slice(0, 90) };
  });
  const tally: Record<string, number> = {};
  rows.forEach((r) => { tally[r.verdict] = (tally[r.verdict] ?? 0) + 1; });
  return { tally, rows };
};

it("records the score on fresh questions", () => {
  const out = { round1_after_fixes: measure(FRESH), round2_after_fixes: measure(FRESH_2), round3_unseen: measure(FRESH_3) };
  // The reports folder sits outside web/, and is only there on a full checkout.
  const target = resolve(__dirname, "../../../reports");
  if (existsSync(target)) writeFileSync(resolve(target, "ask_fresh.json"), JSON.stringify(out, null, 1));
  expect(out.round3_unseen.rows.length).toBe(FRESH_3.length);
});
