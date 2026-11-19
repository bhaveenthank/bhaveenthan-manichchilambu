// Schemas for the JSON files scripts/build_web_data.py writes into web/public/data. The test in data.test.ts
// checks the real files against them on every `npm test` (and so in CI, before the site is built), so a pipeline
// mistake fails the build instead of showing readers a blank page. They're used only in tests, so the site
// doesn't carry zod.
import { z } from "zod";

const lineId = z.string().regex(/^(SIL|MAN)-\d{2}-\d{4}$/, "a line id like SIL-16-0145");
const pair = z.tuple([z.string(), z.string()]);
const mood = z.enum(["asserted", "negated", "claimed", "thought", "command", "conditional", "intended", "predicted", "wish", "metaphor", "address", "dreamed", "question"]);
const roleValue = z.union([z.string(), z.array(z.string()), z.object({ one_of: z.array(z.string()) })]);

export const recordSchema = z.object({
  id: z.string().min(1), ep: z.string(), kind: z.string().min(1), en: z.string().min(1), ta: z.string().min(1),
  roles: z.record(roleValue), voice: z.array(z.string()).min(1), mood, t: z.number(), birth: z.string(),
  epic: z.enum(["SIL", "MAN"]), layer: z.enum(["event", "material", "belief"]), quote: z.string().min(1),
  lines: z.array(z.object({ id: lineId, text: z.string().min(1) })).min(1),
  review: z.object({ status: z.enum(["draft", "reviewed", "disputed"]), by: z.string().optional(), on: z.string().optional(), note: z.string().optional() }),
}).passthrough();

export const graphSchema = z.object({
  nodes: z.array(z.object({ id: z.string().min(1), en: z.string().min(1), ta: z.string(), also: z.array(z.string()), cls: z.string(), epics: z.array(z.enum(["SIL", "MAN"])), mentions: z.number() }).passthrough()).min(1),
  edges: z.array(z.object({ s: z.string(), t: z.string(), kind: z.string(), rec: z.string(), mood, tm: z.number(), epic: z.string(), layer: z.string() }).passthrough()),
  suggested: z.array(z.object({ s: z.string(), t: z.string(), n: z.number() })),
});

export const cantoSchema = z.object({
  key: z.string().regex(/^(SIL|MAN)-\d{2}$/), epic: z.enum(["SIL", "MAN"]), n: z.number(), title: z.string().min(1), en: z.string(),
  lines: z.number().positive(), themes: z.array(z.string()), people: z.array(z.string()), records: z.array(z.string()),
  cited: z.number().nonnegative(), drafted: z.number().nonnegative(), reviewed: z.number().nonnegative().optional(),
}).passthrough();

export const cantoLinesSchema = z.array(z.object({ id: lineId, n: z.number(), text: z.string(), who: z.array(z.string()), rec: z.array(z.string()) }));

export const echoesSchema = z.object({
  lines: z.array(z.object({ a: lineId, b: lineId, score: z.number(), ta: z.string(), tb: z.string() })),
  cantos: z.array(z.object({ a: z.string(), b: z.string(), n: z.number() })),
});
export const timelinesSchema = z.object({ custody: z.record(z.array(z.object({ t: z.number(), holders: z.array(z.string()), rec: z.string().nullable() }))) });
export const gapsSchema = z.array(z.object({ id: z.string(), match: z.object({ subjects: z.array(z.string()), relation: z.string() }), q: pair, a: pair, tempting: pair, recs: z.array(z.string()) }));
export const tiesSchema = z.array(z.object({ id: z.string(), cls: z.enum(["identity", "continuation", "motif", "comparable"]), en: z.string(), ta: z.string(), text: pair, not_this: pair, recs: z.array(z.string()) }));
export const discoveriesSchema = z.array(z.object({
  a: z.string(), b: z.string(), score: z.number(), epics: z.array(z.string()), warrants: z.array(z.string()), kinds: z.array(z.string()),
  steps: z.array(z.object({ from: z.string(), to: z.string(), rec: z.string().nullable(), w: z.string(), via: z.string().nullable() })).min(1),
}).passthrough());
const lexEntry = z.object({ form: z.string(), line: lineId, text: z.string(), source: z.string() }).passthrough();
export const lexiconSchema = z.object({
  people: z.array(lexEntry), places: z.array(lexEntry), objects: z.array(lexEntry), foods: z.array(lexEntry), events: z.array(lexEntry), epithets: z.array(lexEntry),
  homonyms: z.array(z.object({ form: z.string(), senses: z.array(z.object({ line: lineId, en: z.string(), ta: z.string(), text: z.string() }).passthrough()) })),
});

export const searchSchema = z.array(z.tuple([lineId, z.string()])).length(10209);
export const retrievalSchema = z.object({
  notes: z.record(z.tuple([z.string(), z.string(), z.string(), z.array(z.string())])),
  drafts: z.array(z.tuple([lineId, z.string(), z.array(z.string()), z.string(), z.string(), z.array(lineId)])),
});
