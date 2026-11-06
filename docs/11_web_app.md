# The web app

Everything's in `web/`. It's a static site, no server and no API keys, so it can live on GitHub Pages for free. To run it on your machine:

```bash
cd ~/Documents/Twin_Epics/web && npm install && npm run dev
```

If the graph data changes, regenerate what the site reads:

```bash
cd ~/Documents/Twin_Epics && .venv/bin/python scripts/build_web_data.py
```

## What's in it

| Page | What you can do |
|---|---|
| **Home** | Ask straight away, seven doorways, how it works in numbered steps, and the anklet story to drag through |
| **Ask** | Tamil, English or Thanglish. Answer, small graph, then the records and verses. Questions about makers and origins can get a clearly marked "not stated" |
| **Discover** | Unexpected paths, connect any two under rules you choose, links between the epics sorted by kind, the 143 shared line pairs |
| **Trace** | Fifteen trails (meal, anklets, bowl, gifts, pavilion, wreck, child, drum, Madurai by trade, the refused letter, Aputhiran, Kanchi, jewels) as diagrams, with what the text doesn't say beside each. Also whose hands an object was in, and who believed what |
| **Graph** | The full graph, with filters: layer, epic, episode, what counts, whose eyes, story so far, node types, small graph around anything, clusters, CSV download |
| **Songs** | All 64 cantos, arranged nine ways |
| **A song** | The reading page: blocks of verse, a marker for who's speaking where the records know, highlight a person, open the records on a line, its small graph, lines shared with the other epic |
| **Words** | Homonyms, six lexicons, and search over every line |
| **About** | How to read it, how far to trust it, credits |

Also: English and Tamil for the whole interface, ⌘K (Ctrl K off a Mac) search everywhere, light by default with a dark theme a click away, and a page that stays usable at phone width.

**The look.** Taken from the screenshots you sent, in spirit and not copied. From the first two: warm paper, white cards with hairline borders, copper accent, a heavy Didone serif (Playfair Display), Poppins, tracked capitals with arrows, and on the song page, verse in blocks with a small copper square between them. From the second two: numbered hexagons, pill buttons, the notched outlined fields and the rounded guidance panel. The two reference sites' content, logos and wording aren't used.

**After the first review (November 2026).** A reviewer went through the hosted site. What changed:

- The Ask graph now rebuilds for every question. It used to keep the previous question's graph until a reload.
- Answers come in four looks, each with a label and an icon: an answer, not stated, closest match, and no answer. A closest match is in plain type with a dashed border, so it can't pass for an answer. "The text gives 4 reasons" now sits above a group of exactly 4 records.
- Verse ids are underlined, and each record has a "Read in Silappatikāram, canto 16 →" link and a "Suggest a correction" link that opens an email with the record id and lines filled in. The address is set in one place, `web/src/lib/site.ts`.
- The top bar is Home, Ask, Trace, Songs, Explore (Discover, Graph, Words) and About. Tabs go two levels deep at most, and the third level became a picker. On phones, every strip that scrolls fades at its right edge. In Trace, a clicked step opens in the side column, or scrolls into view on a phone.
- The graph opens on a one-step graph around Kannagi, with the legend on the canvas and a search box for picking the centre. In a big graph only the links touching the selected node can be clicked, and a picked link is drawn thick with everything else dimmed.
- Link labels are one fixed set of seven, explained once in a key on Discover and About. Links that only suggest a connection are dashed amber, and blue is gone from the interface. "Crosses both epics" sits under the route, since it's about the whole path.
- Coverage is shown: one figure on the home page, and a bar on every song.
- There's one serif and one sans, regular weight, and no text under 13px.
- The reviewer saw cards fade in while scrolling. The site has no fade or scroll animation, and I couldn't reproduce blank space, so nothing changed there.
- The "Powered by Netlify" badge comes from Netlify's own script and isn't in this code. It's turned off in Netlify's project settings.

**Libraries added.** All checked for licence at install: [MiniSearch](https://github.com/lucaong/minisearch) (MIT) for line search, [React Flow](https://github.com/xyflow/xyflow) (MIT) with [dagre](https://github.com/dagrejs/dagre) (MIT) for the trail diagrams, [graphology-communities-louvain](https://github.com/graphology/graphology) (MIT) for clusters. React Flow is the heaviest, so it only loads on the Trace page. Fonts are OFL.

**Colours.** Seven node classes in a fixed order. The palette validator passes in light. In dark it flags one thing, pink sitting slightly above its lightness band, which I left because darkening it failed the colour-blind check instead. Every node gets a label, so colour isn't the only signal.

**Big graphs and labels.** Labels are drawn on our own canvas layer. Sigma's built-in text uses a glyph atlas that I didn't trust with Tamil letter shaping, so the browser shapes them instead. Each label tries four positions and won't overlap another, the biggest nodes go first, and the rest appear as you zoom or select. Unconnected pieces get packed around the main cluster so it isn't shrunk to fit them.

## The question box: what it can and can't do

No language model runs here. A GitHub Pages site can't hold an API key safely, and a model could invent things. It uses fixed rules that recognise names and question types, then answers from the records.

So it can't make up a fact, but **it can misunderstand a question, and it won't get everything right.** I measured it on questions it wasn't built around, each set written before seeing how it did, and I kept each first-run score:

| Set | Right on first run | Notes |
|---|---|---|
| The 70 built alongside the rules | all pass | These don't tell you much, they shaped the rules |
| Fresh, round 1 | 22 of 34 (65%) | Then fixed what it showed |
| Fresh, round 2 | 14 of 25 (56%) | Then added the closest-record fallback |
| Fresh, round 3 | **13 of 20 (65%)** | Last round, the fairest number |

The misses are of two kinds: refusing a fair question, and leading with the wrong record ("Who fainted when the anklet broke?" answers about the breaking). The verse and the record are still real, but a wrong lead sentence is wrong. All the sets are one person's questions, and all of them are in `web/src/lib/ask.fresh.ts`. Raw scores are in `reports/ask_fresh*.json`.

It also can only answer from 163 records. Most things in the epics aren't recorded yet, however well the question is understood.

If you want better understanding of free-form questions, the honest upgrade is a small serverless function holding a model key, used only to work out what's being asked, with answers still coming from the records. That needs a key and a paid host, so I haven't added it.

## What I took from the repos you listed

I checked licences, because some of your list isn't plain open source.

| Repo | Decision | Why |
|---|---|---|
| shadcn/ui | Took the foundation, Radix primitives | Solid accessibility, and this site's look shouldn't be shadcn's default |
| cmdk | Used | The ⌘K palette |
| Sigma.js + graphology | Used | MIT, WebGL, made for this |
| Magic UI, Motion Primitives, Cult UI | Not used | Marketing-page effects. They'd fight a site for reading Tamil verse |
| Motion | Tried, removed | Page transitions left pages blank in testing |
| React Bits, Animate UI | **Left out** | MIT + Commons Clause, so not plain open source |
| UI UX Pro Max, Taste Skill, Impeccable, 21st MCP | Not installed | They're aids for an AI coder. 21st also needs an API key. Their advice boils down to: pick a real direction, avoid templates, render and look. That's what I did |

The direction is palm leaf and lamp oil, serif Tamil for verse, and no gradients or glowing cards. The colours passed a colour-blindness check on both themes. Rings mark who's in both epics, so that isn't carried by colour alone.

I couldn't read your ChatGPT link (it needs a login), and your Thiruppugazh site only showed its title to my tools, so nothing here is copied from it. It'd be worth you checking the two side by side.

## Known limits

- Tested in the app's browser at desktop and phone sizes, not on real phones or in Safari or Firefox.
- Keyboard users can't pick graph nodes directly. The filters, list view and ⌘K cover the same content.
- The Thanglish spellings are the ones I could think of, plus fuzzy matching.
- Song themes and places are my draft. Metres only exist where this edition labels them, which is mostly the first book.
- The main script is about 840 kB (234 kB gzipped). Fine for now, could be split later.
- **Project Madurai's terms** ask that their header page be kept intact when distributing a file. `data/raw/` keeps the files as they were, and the About page credits everyone named in them, but the site itself shows the text reformatted. Before going public, email them to check they're happy. It's a courtesy that's easy to do and awkward to skip.
