# Two decisions for the reviewer

Everything else in the November review has been done. These two are choices, not fixes, so they're set out here with a recommendation each. Nothing changes until we agree.

## 1. Licence

At the moment the repository is public with no licence, so nobody may legally reuse any of it. The project has three kinds of material, and they need different terms.

| Material | Where it is | Options | Recommended |
|---|---|---|---|
| Code: the pipeline, the method, the web app | `src/`, `scripts/`, `experiments/`, `web/src/` | MIT (short, permissive); Apache-2.0 (permissive, with a patent grant); GPL-3.0 (changes must stay open) | **MIT** |
| Data made in this project: records, glosses, entities, line notes, the graph | `data/seeds/`, `data/graph/`, `web/public/data/` | CC BY 4.0 (reuse with credit); CC BY-SA 4.0 (reuse with credit, and share alike); CC BY-NC 4.0 (no commercial use) | **CC BY 4.0** |
| The Tamil text of the epics | `data/raw/`, and the line text in the data | Not ours to license. It stays under Project Madurai's terms, with their header kept | Keep as is, and say so |

**Why these:**
- **MIT** is the usual choice for research code. It asks only for credit.
- **CC BY 4.0** is what most digital-humanities datasets use. It lets other scholars build on the records as long as they cite the project.
- **Two points to settle:** whether the unchecked machine drafts and line notes should go under the same data licence, or be marked separately as machine output; and whether a BY-SA licence is wanted, so that improvements to the records stay open.

**Ready to add once agreed:** `docs/licence/LICENSE` (MIT) and `docs/licence/LICENSE-DATA.md` (the CC BY 4.0 notice and the Project Madurai exception). Adding them means moving both files to the repository's top folder, plus one line in the README.

## 2. Romanisation

Names and titles are spelled in more than one system today:

- **Titles** use diacritics: Silappatikāram, Maṇimēkalai.
- **Most names** use popular spellings: Kovalan, Kannagi, Madhavi.
- **Some names** follow the Tamil Lexicon's c for ச: Cenkuttuvan, not Senguttuvan.
- **Sometimes one title is spelled two ways:** Maṇimēkalai and Manimekalai both appear.

| Option | Example names | Example titles | For | Against |
|---|---|---|---|---|
| A. Scholarly everywhere (ISO 15919, as in the Tamil Lexicon) | Kōvalaṉ, Kaṇṇaki, Mātavi, Ceṅkuṭṭuvaṉ | Cilappatikāram, Maṇimēkalai | Exact and reversible. The standard in Tamil studies | Harder for general readers to read and type. Search already copes, through aliases |
| B. Popular everywhere, no diacritics | Kovalan, Kannagi, Madhavi, Senguttuvan | Silappathikaram, Manimekalai | Easy to read and type, and matches most English writing on the epics | Loses the long vowels and the retroflex consonants |
| C. Popular in the text, with the scholarly form shown once for each person or title (on its page, in the glossary and in the citation) | Kovalan (Kōvalaṉ) | Silappatikaram (Cilappatikāram) | Readable, and still exact where it matters. One rule, applied the same way everywhere | Two forms to keep in step. The build can generate the scholarly form from the Tamil, so this is automatic |

**Recommended: C.** Tamil script stays primary in every place it appears now. The choice only concerns the roman letters.

Whichever is chosen, it will be applied in one pass:
- every entity name and title in `data/seeds/entities.yaml` and the site
- a check in the build that flags any name written outside the policy
