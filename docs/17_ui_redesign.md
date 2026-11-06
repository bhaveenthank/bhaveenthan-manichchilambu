# The interface redesign (November 2026)

The redesign follows the brief in `16_ui_redesign_prompt.md` and the design package in `design_handoff_manichchilambu_redesign/`. That package isn't in git, and neither is the backup in `web_before_redesign/`.

Every feature is still there, and nothing in `web/src/lib/` (except a new `lib/icons.ts`) or `web/public/data/` changed. All 82 tests pass and `npm run build` is clean.

## What changed, page by page

**Header.**
- The wordmark is Maṇichchilambu in Source Serif 4, with மணிச்சிலம்பு beside it.
- The nav is in sentence case, not tracked capitals. A copper rule under the current page shows where you are.
- The Explore menu keeps its portal and `position: fixed`. Each item now has an icon and a one-line note.
- The search button has an icon and the ⌘K or Ctrl K hint.
- The language switch is a two-part EN | த toggle, so you can see which one is on. Before, a single button showed the language you'd switch to.
- The theme button uses the Lucide `contrast` icon.
- Arrow keys, Home and End move between tabs in every tab strip. This is set once in `App.tsx`.

**Search palette.** It has a search icon and an Esc hint. Every person, place or thing shows its class icon, its name, and its name in the other language. The anklets get the custom anklet icon.

**Home.** In order:
- the headline, the lead paragraph and the question box with sample questions
- "Start here": four cards for asking a question, following the anklet, reading canto 20, and who's in both epics
- "What the king believes" (the slider) next to the coverage panel
- "More to explore": paths, the graph, words, about
- "How does Maṇichchilambu work?" as numbered steps

The 7% coverage figure is now a 20px bar with three keyed parts: hand records, drafts only, and not read yet. The drafts part is hatched, so it doesn't rely on colour.

**Ask.** The four answer kinds look different in border, background, icon and label:

| Kind | Look |
|---|---|
| Answered | solid green border, check icon |
| Not stated | grey border, question icon |
| Closest | dashed amber border, search-off icon |
| None | faint border, slashed circle |

"Closest match" never looks like an answer. The evidence groups come next, then the verses, then the answer graph, which is still keyed on the question.

**Record cards.** A row of tags at the top:
- the mood tag: a line sample in the mood family's dash, the family icon, and the `MOOD_LABEL` wording, which is unchanged
- the epic mark
- "hand record" with a check (a draft gets a dashed "unchecked draft" badge instead)

Then the sentence, the other language, who it comes through, and the verse in Noto Serif Tamil at 19px. Each verse line leads with its line id. The caveat sits in an amber box with a warning icon. The footer keeps "Read in …" and "Suggest a correction", both now with icons.

The badge says "hand record", not "checked record": no scholar has checked these yet, and the badge mustn't suggest one has.

**Songs.** The nine groupings, the epic filter and title filter, and the coverage bars all stay. The key uses the same solid and hatched swatches as the home page.

**Song page.**
- A breadcrumb, the epic mark, and the Tamil title in Noto Serif Tamil at 40px.
- A skeleton while the verse loads.
- The draft count has a dashed badge, and every draft row is dashed with its "unchecked draft" badge and mood tag.

**Graph.**
- **Top of the panel:** "X of 273 shown · N links", then "N filters on · Reset" whenever a filter differs from the opening view, then the Graph | List switch.
- **Filter groups:** What to show (layer, kinds of thing with icons, epic), Whose view (what counts, whose eyes), and When (episode, story slider).
- **More options** (folded): links touching someone in both, earlier births, pairs that only appear together, and cluster colouring.
- **List view:** it gains a second table of every link shown (from, link with its mood tag, to). Clicking a link opens it in the detail panel.
- **Detail panel:** the entity icon, the epic marks, and a note when the node is a kind rather than one individual.
- **Empty state:** "No links left with these filters. Turn a filter off, or reset."

**Discover, Trace, Words, About.**
- Same layouts, with the new type, colours and cards.
- "Who's in both" chips carry entity icons.
- Caution link labels carry a warning icon as well as the dashed amber border.
- "This path crosses both epics" has its own icon.

## Fonts

| Use | Font | Why |
|---|---|---|
| Headings, reading text | Source Serif 4 (400, 600) | Open licence, made for screens, full IAST set |
| Interface | Source Sans 3 (400, 600) | Pairs with Source Serif, clear at small sizes, full IAST set |
| Tamil verse and Tamil headings | Noto Serif Tamil (400, 600) | The most complete Tamil serif, with correct conjuncts and vowel signs |
| Tamil interface | Noto Sans Tamil (400, 600) | Stroke and x-height close to Source Sans |

**What was removed:** Playfair Display and Poppins. Poppins is missing some of the diacritics this project needs, which forced a fallback font in names like Maṇimēkalai.

**How they're loaded:** all four are bundled from npm (`@fontsource/*`), with only the weights used. No CDN, so the built site works offline.

**Glyph check:** run in the browser on கொ கோ கௌ க்ஷ ஸ்ரீ ழ், on புறஞ்சிறைப் பொழிலும் பிறங்குநீர்ப் பண்ணையும், and on ṇ ā ī ū ē ō ḷ ṟ ṉ ṭ ḻ ṅ ñ ś ṣ. All rendered in the intended font.

**Tamil setting:**
- Tamil is set about 7% larger than the English beside it: verse 19px, a record sentence 18px against 16px.
- Line height is 1.85 for verse and 1.65 for the interface.
- No letter-spacing, italics or capitals are ever applied to Tamil. Every Tamil run carries `lang="ta"`.

**Type scale:** 13, 16, 19, 23, 28, 33 and 40 px (a ratio of 1.2).

## The icon map

Everything is in `web/src/lib/icons.ts`. The badges and tags are in `web/src/components/Marks.tsx`. Icons come from Lucide (`lucide-react`), with one exception: the anklet icon is drawn by hand on the same 24px grid and 2px stroke.

| Class | Icon | Shape on the graph | Light | Dark |
|---|---|---|---|---|
| Person | user | circle | #1F6F8B | #6FB7D3 |
| Group | users | square | #4E7D2E | #9CC67A |
| Deity | sun | hexagon | #957000 | #E0BC4A |
| Place | map-pin | triangle | #6E4C96 | #B79BDB |
| Object | box, or the anklet for anklet nodes | diamond | #A3395A | #E58AA6 |
| Material | gem | pentagon | #5D6A73 | #A9B4BC |
| Food | wheat | downward triangle | #8A5A2B | #D3A273 |
| Other | dot | small circle | #7A756D | #A39D93 |

- **Deity:** the sun is a plain disc, not a sectarian symbol. The epics are Jain and Buddhist works with Hindu gods in them.
- **Kinds of thing** (60 nodes marked `kind`): drawn outlined and dashed, while individuals are filled. So "a jewel" and "this jewel" look different.
- **Nodes in both epics:** a dark ring on the graph, and a ring mark in lists.

**Mood families.** The wording is still `MOOD_LABEL`.

| Family | Moods | Line | Icon |
|---|---|---|---|
| Happened | asserted | solid | circle-check |
| Said or claimed | claimed, predicted, address, question, negated | dashes 6 4 | message-square-quote |
| Wanted or ordered | command, intended, wish | dash-dot 9 3 2 3 | target |
| Imagined or believed | metaphor, dreamed, conditional, thought | dots 1 4 | cloud |

**Link terms.**
- "told as fact" and "same one" get a solid border.
- The five cautions get a dashed amber border and the `triangle-alert` icon.

**Answer kinds** use circle-check, circle-help, search-x and circle-slash.

**Epic marks.** Silappatikāram is #8E2F3C (dark #E3909B) and Maṇimēkalai is #2D5A66 (dark #8EC3CF). Both always appear with their name.

**On the graph canvas:**
- Sigma still handles layout, zoom and clicks. The class shapes, rings and the copper halo on a picked node are drawn on the label canvas above it.
- Links that aren't told as fact get their family's dash on that canvas.
- A picked link is still thick copper, and the rest dim.

## Colours

| Token | Before (light) | After (light) | After (dark) |
|---|---|---|---|
| --bg | #F6F5F3 | #F6F5F3 | #181715 |
| --surface | #FFFFFF | #FCFBF9 | #211F1C |
| --ink | #2B2A28 | #1E1C19 | #EEEAE3 |
| --ink-soft | #55534E | #45413B | #CFC8BD |
| --ink-faint | #6F6B64 | #5C5851 | #ABA499 |
| --copper / accent | #BC8246 / #8F5E2A | #93481A | #E39A62 |
| --caution | #9A5B00 | #7A5100 | #E8C06A |
| --line-strong | #CFCAC1 | #857E72 | #7D766B |
| --focus | (used link colour) | #1D5FBF | #7FB0FF |

New tokens: --ok, --caution-line, --caution-tint, --copper-tint, --sil and --man.

**Contrast, worked out with the WCAG formula.** The first number in each pair is against --bg, the second against --surface.

| Text | Light | Dark |
|---|---|---|
| ink | 15.6 / 16.4 | 14.9 / 13.7 |
| ink-soft | 9.3 / 9.8 | 10.8 / 9.9 |
| ink-faint | 6.5 / 6.8 (was 4.9) | 7.3 / 6.7 |
| copper | 6.1 / 6.4 | 7.7 / 7.1 |
| caution | 6.4 / 6.8 | 10.4 / 9.5 |

- Every text pair passes 4.5:1. The tinted pairs pass too: caution on its tint is 6.2 and 8.3, green on its tint 5.8 and 7.7, copper on its tint 5.3 and 5.9.
- Every class colour passes 3:1 for graphics in both themes, the lowest being 4.2.
- --line-strong, used for control borders, is 3.7 to 4.0. Before, it was about 1.5.

## Which guideline each change follows

**WCAG 2.2 AA:**
- 1.4.1, colour isn't the only signal: shapes on the graph, dashes for moods, hatching for drafts, dashed borders for cautions, and labels on everything.
- 1.4.3, contrast: the table above.
- 2.4.7 and 2.4.11, focus is visible and not hidden: a 2px blue outline with a 2px offset on every control.
- 2.5.8, target size: controls are at least 24px, and most are 32 to 48.
- 2.3.3, motion: `prefers-reduced-motion` turns off every transition and animation.

**Nielsen's heuristics:**
- *Visibility of system status:* the filters-on count, the loading skeletons, the splash bar.
- *Recognition rather than recall:* icons always come with words.
- *Consistency:* one set of tokens and one icon set.

**Shneiderman, "overview first, zoom and filter, then details on demand":** the graph's count and view switch come first, then the grouped filters, then the detail panel.

**Bertin's visual variables:** shape and hue for class, line style for certainty, kept independent of each other.

**GOV.UK and Carbon patterns:**
- plain sentence-case labels
- reading width capped at about 64 characters
- tables for the list view
- the tab strip pattern, with arrow keys as in WAI-ARIA

## Packages

- **Added:** `lucide-react`, `@fontsource/source-serif-4`, `@fontsource/source-sans-3`.
- **Removed:** `@fontsource/playfair-display`, `@fontsource/poppins`.
- **Deleted file:** `components/Hex.tsx`, which nothing used once the home steps became a numbered list.

## Not done, or left alone on purpose

- **No before-and-after screenshots** in `docs/img/redesign/`. I checked each page in the browser at 375 and 1280px, in light and dark, and in English and Tamil, but didn't save the images.
- **The phone layout has not been tried on a real device.** In the browser at 375px no page scrolls sideways, the filter panel sits under the graph as a sheet, and the detail panel slides up from the bottom.
- **The Trace flow diagrams** (React Flow) only got the new colours and borders, not a new layout.
- **The design package's in-prototype "Design note" page** wasn't added as a route. This document takes its place.
