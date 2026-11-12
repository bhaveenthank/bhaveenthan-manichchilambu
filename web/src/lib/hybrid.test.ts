// The hybrid layer: the safety rules it must keep, and how it scores against the rules alone on questions
// neither was written around. The scores go to reports/ask_hybrid.json.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ask } from "./ask";
import { FRESH, FRESH_2, FRESH_3 } from "./ask.fresh";
import { OPEN, OPEN_2 } from "./ask.open";
import { assemble } from "./data";
import { answerQuestion, evidenceClass, evidencePackage, stem, type RetrievalData } from "./hybrid";
import { planQuery } from "./plan";

const read = (name: string) => JSON.parse(readFileSync(resolve(__dirname, "../../public/data", name), "utf-8"));
const corpus = assemble({ graph: read("graph.json"), records: read("records.json"), cantos: read("cantos.json"), echoes: read("echoes.json"), timelines: read("timelines.json"), gaps: read("gaps.json"), ties: read("bridges.json"), discoveries: read("discover.json"), lexicon: read("lexicon.json") });
const extra = read("retrieval.json");
const data: RetrievalData = { lines: read("search.json"), notes: extra.notes, drafts: extra.drafts };

describe("the rules it must keep", () => {
  it("never states a claim as fact", () => {
    const a = answerQuestion(corpus, "What were people gossiping about Dharmadattan and Visakai?", data);
    expect(a.records[0]).toBe("n85");
    expect(corpus.byId.get("n85")!.mood).toBe("claimed");
    expect(a.headline.en).toMatch(/not told as fact/);
  });
  it("keeps a rule's answer when the rule fits the question", () => {
    const a = answerQuestion(corpus, "Who killed Kovalan?", data);
    expect(a.route).toBe("rule");
    expect(a.type).toBe(ask(corpus, "Who killed Kovalan?").type);
  });
  it("overrides a rule that fired on a keyword and missed the question", () => {
    const a = answerQuestion(corpus, "Where did Kovalan wait inside the city?", data);
    expect(a.route).toBe("hybrid");
    expect(a.records.slice(0, 5)).toContain("s05");
  });
  it("doesn't answer what the text never says", () => {
    const a = answerQuestion(corpus, "What did Kovalan eat for breakfast in Puhar?", data);
    expect(a.type === "hybrid" || a.type === "kill").toBe(false);
  });
  it("asks which one when a name points at two people", () => {
    const plan = planQuery(corpus, "What did Kausikan do?");
    expect(plan.ambiguous.some((x) => x.options.includes("kosikan") && x.options.includes("kausikan_campai"))).toBe(true);
    expect(answerQuestion(corpus, "What did Kausikan do?", data).type).toBe("ambiguous");
  });
  it("settles the same name from context", () => {
    const plan = planQuery(corpus, "What did Kausikan do in Silappathikaram?");
    expect(plan.ambiguous.find((x) => x.surface === "kausikan")?.resolvedTo).toBe("kosikan");
  });
  it("reaches Tamil verse from an English question through line notes", () => {
    const a = answerQuestion(corpus, "praise of the city of Puhar", data);
    expect(a.lines.length).toBeGreaterThan(0);
    expect(a.lines.some((l) => l.text.includes("புகார்"))).toBe(true);
  });
  it("sorts evidence by what kind of statement it is", () => {
    expect(evidenceClass(corpus.byId.get("n85")!)).toBe("said");
    expect(evidenceClass(corpus.byId.get("a21")!)).toBe("happened");
  });
  it("stems Tamil endings together", () => {
    expect(stem("சிலம்பை")).toBe(stem("சிலம்பில்"));
    expect(stem("struck")).toBe("strike");
  });
  it("packs every piece of evidence with its source status", () => {
    const p = evidencePackage(corpus, answerQuestion(corpus, "Who struck Kovalan?", data));
    expect(p.records.length).toBeGreaterThan(0);
    expect(p.records[0].source_status).toMatch(/hand record/);
    expect(p.records[0].lines.length).toBeGreaterThan(0);
  });
});

// Right means the expected record is among the first five shown; for a question the graph can't answer,
// right means it didn't present anything as an answer.
const score = (set: [string, string | null][], run: (q: string) => { found: boolean; type: string; records: string[] }) => {
  const rows = set.map(([q, want]) => {
    const a = run(q);
    const ok = want === null ? !(a.found && !["closest", "ambiguous"].includes(a.type)) : a.records.slice(0, 5).includes(want);
    return { q, want, type: a.type, ok, top: a.records.slice(0, 5) };
  });
  return { right: rows.filter((r) => r.ok).length, of: rows.length, rows };
};

it("records rules-only against hybrid on every question set", () => {
  const sets = { open: OPEN, open_2_heldout: OPEN_2, fresh_1: FRESH, fresh_2: FRESH_2, fresh_3: FRESH_3 };
  const out: Record<string, unknown> = {};
  for (const [name, set] of Object.entries(sets)) {
    out[name] = { rules_only: score(set, (q) => ask(corpus, q)), hybrid: score(set, (q) => answerQuestion(corpus, q, data)) };
  }
  const target = resolve(__dirname, "../../../reports");
  if (existsSync(target)) {
    writeFileSync(resolve(target, "ask_hybrid.json"), JSON.stringify(out, null, 1));
    // The evidence packages scripts/ask_llm.py writes its answers from, one per open and held-out question.
    const packages = [...OPEN, ...OPEN_2].map(([q]) => evidencePackage(corpus, answerQuestion(corpus, q, data)));
    writeFileSync(resolve(target, "evidence_packages.json"), JSON.stringify(packages, null, 1));
    // Every route's own ranking per question, so experiments/run_dense_retrieval.py can add dense embeddings and refuse them.
    const runs = Object.entries(sets).flatMap(([set, qs]) => qs.filter(([, want]) => want !== null).map(([q, want]) => {
      const a = answerQuestion(corpus, q, data);
      const route = (name: "rule" | "graph" | "words" | "lines") => Object.entries(a.ranks).filter(([, r]) => r[name]).sort((x, y) => x[1][name]! - y[1][name]!).map(([id]) => id);
      return { set, q, gold: want, lists: { rule: route("rule"), graph: route("graph"), words: route("words"), lines: route("lines") }, final: a.records, kind: a.type };
    }));
    writeFileSync(resolve(target, "retrieval_runs.json"), JSON.stringify(runs, null, 1));
  }
  const open = out.open as { rules_only: { right: number }; hybrid: { right: number } };
  expect(open.hybrid.right).toBeGreaterThanOrEqual(open.rules_only.right);
}, 60_000); // runs every question set twice and writes the reports
