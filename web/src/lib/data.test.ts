// The real data files, checked against their schemas and against each other. If the pipeline writes something
// the site can't read, this fails, and CI stops before the site is published.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import * as S from "./schemas";

const DIR = resolve(__dirname, "../../public/data");
const read = (name: string) => JSON.parse(readFileSync(resolve(DIR, name), "utf-8"));

/** Parse, and on failure say which file and which field, not just "invalid". */
function check<T extends z.ZodTypeAny>(schema: T, name: string): z.infer<T> {
  const got = schema.safeParse(read(name));
  if (!got.success) {
    const first = got.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`${name} doesn't match its schema: ${first}`);
  }
  return got.data;
}

describe("the data files the site reads", () => {
  const records = check(S.recordSchema.array().min(1), "records.json");
  const graph = check(S.graphSchema, "graph.json");
  const cantos = check(S.cantoSchema.array().length(64), "cantos.json");
  const search = check(S.searchSchema, "search.json");

  it("each match their schema", () => {
    check(S.echoesSchema, "echoes.json");
    check(S.timelinesSchema, "timelines.json");
    check(S.gapsSchema, "gaps.json");
    check(S.tiesSchema, "bridges.json");
    check(S.discoveriesSchema, "discover.json");
    check(S.lexiconSchema, "lexicon.json");
    check(S.retrievalSchema, "retrieval.json");
  });

  it("every canto's line file matches its schema", () => {
    const files = readdirSync(resolve(DIR, "cantos")).filter((f) => f.endsWith(".json"));
    expect(files.length).toBe(64);
    for (const f of files) check(S.cantoLinesSchema, `cantos/${f}`);
  });

  it("record ids are unique", () => {
    expect(new Set(records.map((r) => r.id)).size).toBe(records.length);
  });

  it("every line a record cites exists, with the same text", () => {
    const text = new Map(search);
    const bad = records.flatMap((r) => r.lines.filter((l) => text.get(l.id) !== l.text).map((l) => `${r.id}:${l.id}`));
    expect(bad).toEqual([]);
  });

  it("every edge points at a record and at two nodes that exist", () => {
    const recs = new Set(records.map((r) => r.id));
    const nodes = new Set(graph.nodes.map((n) => n.id));
    const bad = graph.edges.filter((e) => !recs.has(e.rec) || !nodes.has(e.s) || !nodes.has(e.t)).map((e) => `${e.rec}:${e.s}->${e.t}`);
    expect(bad).toEqual([]);
  });

  it("every record a canto lists exists, and coverage adds up", () => {
    const recs = new Set(records.map((r) => r.id));
    for (const c of cantos) {
      expect(c.records.filter((id) => !recs.has(id))).toEqual([]);
      expect(c.cited).toBeLessThanOrEqual(c.lines);
      expect(c.drafted).toBeGreaterThanOrEqual(c.cited);
    }
  });

  it("a reviewed or disputed record says who reviewed it", () => {
    expect(records.filter((r) => r.review.status !== "draft" && !r.review.by).map((r) => r.id)).toEqual([]);
  });
});

describe("the schemas catch real mistakes", () => {
  it("rejects a record with a bad line id or no review status", () => {
    const good = read("records.json")[0];
    expect(S.recordSchema.safeParse(good).success).toBe(true);
    expect(S.recordSchema.safeParse({ ...good, lines: [{ id: "SIL-16-145", text: "x" }] }).success).toBe(false);
    const { review: _dropped, ...noReview } = good;
    expect(S.recordSchema.safeParse(noReview).success).toBe(false);
  });
});
