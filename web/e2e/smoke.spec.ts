import { expect, test, type Page } from "@playwright/test";

// Every page opens without an error and shows its heading. The graph page then redraws after a filter change
// without the mouse moving, the bug the first review found: the labels stayed on the old graph until a zoom.

const errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
});
test.afterEach(() => expect(errors, "no errors in the page").toEqual([]));

const PAGES: [string, RegExp][] = [
  ["#/", /Maṇichchilambu|graph rests on/i],
  ["#/ask?q=Who%20killed%20Kovalan%3F", /drunk man killed Kovalan/i],
  ["#/trace", /trail/i],
  ["#/songs", /songs/i],
  ["#/songs/SIL-20", /SIL-20/],
  ["#/discover", /Connect any two/i],
  ["#/graph", /The graph/i],
  ["#/words", /words|names/i],
  ["#/about", /About this project/i],
  ["#/record/a15", /How to cite it/i],
  ["#/novelty", /What someone believes is not what happened/i],
  ["#/graph?focus=manimekalai&checked=1", /The graph/i],
];

for (const [path, expected] of PAGES) {
  test(`opens ${path}`, async ({ page }) => {
    await page.goto(`/${path}`);
    await expect(page.locator("main")).toContainText(expected, { timeout: 15_000 });
  });
}

/** How many label pixels the overlay canvas has, as a cheap fingerprint of what's drawn. */
const inked = (page: Page) => page.locator("canvas.graph__labels").evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
  return n;
});

test("the graph redraws after a filter, without moving the mouse", async ({ page }) => {
  await page.goto("/#/graph");
  await expect(page.getByRole("button", { name: "2 steps" })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800);
  const before = await inked(page);
  expect(before).toBeGreaterThan(0);
  await page.getByRole("button", { name: "2 steps" }).click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(800);
  const after = await inked(page);
  // Two steps out shows many more nodes, so the overlay must have changed, and grown.
  expect(after).toBeGreaterThan(before);
  await expect(page).toHaveURL(/hops=2/);
});
