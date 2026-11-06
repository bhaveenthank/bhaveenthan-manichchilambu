import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ask } from "./ask";
import { assemble } from "./data";
import { GuardedGraph, limits, warrants } from "./discover";

const read = (name: string) => JSON.parse(readFileSync(resolve(__dirname, "../../public/data", name), "utf8"));
const corpus = assemble({ graph: read("graph.json"), records: read("records.json"), cantos: read("cantos.json"), echoes: read("echoes.json"), timelines: read("timelines.json"), gaps: read("gaps.json"), ties: read("bridges.json"), discoveries: read("discover.json"), lexicon: read("lexicon.json") });
const graph = new GuardedGraph(corpus);

describe("guarded paths", () => {
  it("costs the same as the Python version, so the site and the experiment agree", () => {
    const report = JSON.parse(readFileSync(resolve(__dirname, "../../../reports/discovery.json"), "utf8"));
    for (const row of report.expected) {
      const found = graph.search(row.pair[0], row.pair[1]);
      expect(found?.cost ?? null, row.pair.join(" to ")).toBeCloseTo(row.cost, 5);
    }
  });
  it("marks a shared fruit as a shared kind, and warns", () => {
    const found = graph.search("cowherd_women", "hill_people_25")!;
    expect(warrants(found.steps)).toContain("kind");
    expect(limits(corpus, found.steps).map((l) => l.en).join(" ")).toMatch(/moved between/);
  });
  it("refuses that path once weak links are off", () => {
    expect(graph.search("cowherd_women", "hill_people_25", { weak: false, places: false })?.steps.some((s) => s.via === "kind") ?? false).toBe(false);
  });
  it("won't walk through what was only said unless asked", () => {
    const found = graph.search("goldsmith", "pandya_king");
    expect(found?.steps.every((s) => s.w !== "said")).toBe(true);
  });
});

describe("questions about things", () => {
  const type = (q: string) => ask(corpus, q).type;
  it("won't name a maker the text doesn't give", () => {
    for (const q of ["Who made Kannagi's anklet?", "கண்ணகியின் சிலம்பைச் செய்தவர் யார்?", "kannagi silambu yaar senjathu", "Who made the Amudasurabhi?"]) expect(type(q), q).toBe("not_stated");
  });
  it("names the maker where the text does", () => {
    const a = ask(corpus, "Who made the debate hall?");
    expect(a.type).toBe("maker");
    expect(a.records).toContain("n33");
  });
  it("won't invent where food was grown, or a trade", () => {
    expect(type("Where was the rice in Kannagi's meal grown?")).toBe("not_stated");
    expect(type("Did the mango reach Kannagi's kitchen from the hill people?")).toBe("not_stated");
  });
  it("catches sandalwood and the drummer's home", () => {
    expect(type("Was there sandalwood in the goods given to Saduvan?")).toBe("not_stated");
    expect(type("Is the drummer from Vachirakottam?")).toBe("not_stated");
  });
  it("answers who supplied the meal", () => {
    const a = ask(corpus, "Who supplied the ingredients for Kannagi's meal?");
    expect(a.records).toContain("n02");
  });
  it("gives the attested words for Madurai", () => {
    const a = ask(corpus, "What expressions describe Madurai?");
    expect(a.type).toBe("epithets");
    expect(a.headline.en).toContain("கொடிமாடக்");
  });
  it("uses the coverage batch", () => {
    expect(type("Does Kavunti name Rama and Nala?")).not.toBe("none");
    expect(ask(corpus, "Who made the crystal room?").records).toContain("v077");
  });
  it("short food words don't fire inside other words", () => {
    expect(ask(corpus, "கண்ணகி யார்?").entities).toEqual(["kannagi"]);
  });
});
