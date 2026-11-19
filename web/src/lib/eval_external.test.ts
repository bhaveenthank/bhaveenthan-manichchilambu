// Questions from outside readers (evaluation/questions.csv), answered by the Ask page's own code, written to a
// sheet they can mark. Skipped when there's no questions file, so `npm test` is unaffected.
//   npx --prefix web vitest run src/lib/eval_external.test.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assemble } from "./data";
import { answerQuestion, evidencePackage, type RetrievalData } from "./hybrid";

const ROOT = resolve(__dirname, "../../..");
const QUESTIONS = resolve(ROOT, "evaluation/questions.csv");

/** A small CSV reader: quoted fields, commas and newlines inside quotes, doubled quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

const cell = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;

describe.skipIf(!existsSync(QUESTIONS))("questions from outside readers", () => {
  it("answers every question and writes a marking sheet", () => {
    const read = (name: string) => JSON.parse(readFileSync(resolve(ROOT, "web/public/data", name), "utf-8"));
    const corpus = assemble({
      graph: read("graph.json"),
      records: read("records.json"),
      cantos: read("cantos.json"),
      echoes: read("echoes.json"),
      timelines: read("timelines.json"),
      gaps: read("gaps.json"),
      ties: read("bridges.json"),
      discoveries: read("discover.json"),
      lexicon: read("lexicon.json"),
    });
    const extra = read("retrieval.json");
    const data: RetrievalData = { lines: read("search.json"), notes: extra.notes, drafts: extra.drafts };
    const [head, ...rows] = parseCsv(readFileSync(QUESTIONS, "utf-8"));
    const col = (name: string) => head.findIndex((h) => h.trim().toLowerCase() === name);
    const [qi, ai, gi] = [col("question"), col("asker"), col("good_answer")];
    expect(qi).toBeGreaterThanOrEqual(0);
    const out = [
      [
        "n",
        "asker",
        "question",
        "read_as",
        "answer_kind",
        "answer_en",
        "answer_ta",
        "evidence",
        "verses_found",
        "good_answer_from_asker",
        "mark (correct/partly/wrong)",
        "claim_as_fact? (yes/no)",
        "comment",
      ]
        .map(cell)
        .join(","),
    ];
    const packages: unknown[] = [];
    rows
      .filter((r) => (r[qi] ?? "").trim())
      .forEach((r, n) => {
        const q = r[qi].trim();
        const a = answerQuestion(corpus, q, data);
        const evidence = a.records
          .slice(0, 4)
          .map((id) => {
            const rec = corpus.byId.get(id);
            return rec ? `${id} [${rec.mood}] ${rec.en}` : id;
          })
          .join("\n");
        const verses = a.lines
          .slice(0, 3)
          .map((l) => `${l.id} ${l.text}`)
          .join("\n");
        out.push(
          [
            n + 1,
            ai >= 0 ? r[ai] : "",
            q,
            a.plan.intent,
            a.found ? a.type : `${a.type} (no answer)`,
            a.headline.en,
            a.headline.ta,
            evidence,
            verses,
            gi >= 0 ? r[gi] : "",
            "",
            "",
            "",
          ]
            .map(cell)
            .join(","),
        );
        packages.push({ n: n + 1, asker: ai >= 0 ? r[ai] : "", ...evidencePackage(corpus, a) });
      });
    writeFileSync(resolve(ROOT, "evaluation/answers_to_mark.csv"), "﻿" + out.join("\n") + "\n", "utf-8");
    writeFileSync(resolve(ROOT, "evaluation/evidence_packages.json"), JSON.stringify(packages, null, 1), "utf-8");
    expect(out.length).toBe(packages.length + 1);
  });
});

describe("the CSV reader", () => {
  it("handles quotes, commas and Tamil", () => {
    expect(parseCsv('a,b\n"x, y","கோவலன் ""said"""\n')).toEqual([
      ["a", "b"],
      ["x, y", 'கோவலன் "said"'],
    ]);
  });
});
