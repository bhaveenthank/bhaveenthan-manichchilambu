// Questions a person might really type, in all three languages. Each states the record the answer must rest on.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ask, detectLang, findEntities } from "./ask";
import { assemble } from "./data";
import type { Corpus } from "./types";

const read = (name: string) => JSON.parse(readFileSync(resolve(__dirname, "../../public/data", name), "utf-8"));
const corpus: Corpus = assemble({ graph: read("graph.json"), records: read("records.json"), cantos: read("cantos.json"), echoes: read("echoes.json"), timelines: read("timelines.json"), gaps: read("gaps.json"), ties: read("bridges.json"), discoveries: read("discover.json"), lexicon: read("lexicon.json") });

// [question, type of answer, record that must be first or present, text that must be in the English headline]
const CASES: [string, string, string, string?][] = [
  // the killing
  ["Who killed Kovalan?", "kill", "a15", "drunk man"],
  ["கோவலனைக் கொன்றது யார்?", "kill", "a15"],
  ["kovalan ah yaar kondra?", "kill", "a15"],
  ["koovalanai yaar konnathu", "kill", "a15"],
  ["Why did Kovalan die?", "why_death", "k_karma_kov"],
  ["கோவலன் ஏன் இறந்தான்?", "why_death", "k_karma_kov"],
  ["Who killed Udayakumaran?", "kill", "b13", "Kanchanan"],
  ["உதயகுமரனைக் கொன்றது யார்", "kill", "b13"],
  ["Who killed Sangaman?", "kill", "d04", "doesn't name"],
  // false facts must stay false
  ["Did Kovalan steal the queen's anklet?", "not_fact", "a09", "No"],
  ["கோவலன் அரசியின் சிலம்பைத் திருடினானா?", "not_fact", "a09"],
  ["kovalan thirudinana?", "not_fact", "a09"],
  ["Did the goldsmith steal the queen's anklet?", "yes", "a06b", "Yes"],
  ["Is the king a thief?", "not_fact", "a23", "No"],
  ["Was Sangaman really a spy?", "not_fact", "d03", "No"],
  ["Was Madhavi's mind on someone else?", "not_fact", "x20", "No"],
  // accusation and belief
  ["Who accused Kovalan?", "accuse", "a08", "goldsmith"],
  ["கோவலன் மீது யார் குற்றம் சாட்டினார்?", "accuse", "a08"],
  ["kovalan mela yaar kutram sonna", "accuse", "a08"],
  ["What did the king believe?", "belief", "a10"],
  ["அரசன் என்ன நம்பினான்?", "belief", "a10"],
  ["What did Kanchanan believe?", "belief", "b10"],
  ["kanchanan enna nambinan", "belief", "b10"],
  // objects
  ["Who had the queen's anklet?", "holder", "a27", "goldsmith"],
  ["Who held the bowl?", "holder", "c01", "Gomukhi"],
  ["அமுதசுரபி யாரிடம் இருந்தது?", "holder", "c01"],
  ["amudhasurabhi yaar kitta irundhuchu", "holder", "c01"],
  ["What happened to Madhavi's garland?", "holder", "l01"],
  // identity and births
  ["Who disguised as Kayasandikai?", "disguise", "b05", "Manimekalai"],
  ["காயசண்டிகை வடிவம் கொண்டது யார்?", "disguise", "b05"],
  ["Who was Kovalan in his past life?", "birth", "d01", "Bharatan"],
  ["கோவலனின் முற்பிறப்பு என்ன?", "birth", "d01"],
  ["udayakumaran murpirappu", "birth", "b04", "Rahulan"],
  ["Who was Manimekalai in an earlier birth?", "birth", "f01", "Lakshmi"],
  // family
  ["Who is Manimekalai's father?", "family", "m05", "father"],
  ["மணிமேகலையின் தந்தை யார்?", "family", "m05"],
  ["manimegalai appa yaar", "family", "m05"],
  ["Who is Kannagi's husband?", "family", "m01", "wife"],
  // across the two epics
  ["How is Manimekalai connected to Kannagi?", "path", "m08"],
  ["மணிமேகலைக்கும் கண்ணகிக்கும் என்ன தொடர்பு?", "path", "m08"],
  ["kovalan sangaman thodarbu", "path", "d01"],
  ["How is Neeli related to Kovalan?", "path", "d06"],
  ["What connects the two epics?", "bridges", "m05"],
  ["இரண்டு காப்பியங்களை எது இணைக்கிறது?", "bridges", "m05"],
  ["Which events are retold?", "retold", "d02"],
  // who says so
  ["Who says Sangaman is a spy?", "who_told", "d03", "Madurapati"],
  // other verbs
  ["Did Kannagi break the anklet?", "yes", "a20", "Yes"],
  ["Did Neeli curse anyone?", "yes", "d06", "Yes"],
  ["Did Kannagi burn Madurai?", "yes", "x61"],
  // tell me about
  ["Who is Kavunti?", "about", "x10"],
  ["கவுந்தி யார்?", "about", "x10"],
  ["Tell me about Gajabahu", "about", "m10", "Silappatikāram"],
];

describe("answers come from the right record", () => {
  it.each(CASES)("%s", (question, type, record, text) => {
    const a = ask(corpus, question);
    expect(a.type).toBe(type);
    expect(a.records).toContain(record);
    if (text) expect(a.headline.en).toContain(text);
    a.records.forEach((r) => expect(corpus.byId.has(r)).toBe(true));
  });
});

describe("it refuses instead of guessing", () => {
  it.each(["What is the capital of France?", "How do I cook rice?", "What is 2 plus 2?", "இன்று வானிலை என்ன?"])("%s", (q) => {
    const a = ask(corpus, q);
    expect(a.found).toBe(false);
    expect(a.records).toEqual([]);
  });
  it("doesn't invent a killer when there's no killing", () => {
    expect(ask(corpus, "Who killed Madhavi?").type).not.toBe("kill");
  });
  it("doesn't say Madhavi gave Kovalan the garland", () => {
    expect(ask(corpus, "Did Madhavi give Kovalan the garland?").headline.en).toContain("hunchbacked");
  });
});

describe("understanding names and language", () => {
  it.each([["kannaki", "kannagi"], ["கண்ணகியின்", "kannagi"], ["கோவலனை", "kovalan"], ["manimegalai", "manimekalai"], ["பாத்திரத்தை", "amudasurabhi"], ["udhayakumaran", "udayakumaran"], ["senguttuvan", "cenkuttuvan"], ["mathari", "matari"]])("%s means %s", (word, id) => {
    expect(findEntities(corpus, word)).toContain(id);
  });
  it("keeps the girl and the goddess apart", () => {
    expect(findEntities(corpus, "goddess Manimekala")).toEqual(["manimekhala_deity"]);
    expect(findEntities(corpus, "Manimekalai")).toEqual(["manimekalai"]);
  });
  it("prefers the longer name", () => {
    expect(findEntities(corpus, "the queen's anklet")).toEqual(["ank_q"]);
  });
  it("detects the language", () => {
    expect(detectLang("கண்ணகி யார்")).toBe("ta");
    expect(detectLang("kannagi yaar")).toBe("thanglish");
    expect(detectLang("Who is Kannagi")).toBe("en");
  });
});
