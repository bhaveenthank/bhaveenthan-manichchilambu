**For the whole-epic plan and its exact commands, see [14_full_epics.md](14_full_epics.md).** It starts with letting the pilot finish.

# What I need from you

In order of how much each one blocks.

**1. Run the LLM pilot.** It can't start from inside this app, even from the Terminal panel, the login only works in the window where your test printed ok. In that window:

```bash
cd ~/Documents/Twin_Epics && .venv/bin/python scripts/tier2_llm.py 2>&1 | tee reports/tier2_pilot.log
```

That's 276 calls on three cantos, now with a no-text control added. It can stop at a Pro usage limit, and that's fine: answers are saved, so run it again later and it carries on. To check it's really working, this number should climb in a second window:

```bash
ls ~/Documents/Twin_Epics/data/llm_cache | wc -l
```

When it finishes, tell me and I'll score it. The scoring rules are already fixed and hashed, so they can't be tuned to the results. Going over all 64 cantos would be 6,300 calls, which probably won't fit on Pro, so decide after the pilot.

**2. Get a second model family for the judge.** Only Claude is set up. The judge should be from another family (GPT, Gemini, or a local model), otherwise it's marking its own homework. Give me an API key in an environment variable or install Ollama, and I'll wire it in. It's what closes the gap in validator experiment 9.

**3. Find a Tamil scholar. This one really can't be skipped.** All labels so far are mine, unreviewed, and marked `draft`. Needed:

- `annotation/review_ledger.csv`: 163 records, verse next to each. The urgent one.
- The 8 open questions at the end of `01_reading_notes.md`, most of all which anklet she broke, and whether மணிச்சிலம்பு reads well as the project name.
- Later: new benchmark questions written without seeing the method, about 300 labelled candidates so scores can be calibrated, and a second annotator. The manual for them is `09_annotation_manual.md`.

**4. Decide on the old 1,180 records.** You told me to start from nothing, so I haven't looked at or used them, though your plan says to keep them. I think leaving them out helps: the new graph is independent, so the two can be compared honestly later. Tell me if you'd rather import them.

**5. Web app.** It's built, see `11_web_app.md`. Have a look with `npm run dev` in `web/`, tell me what to change, and publish using `12_publishing.md`. There's no score slider yet, because a score needs step 3 first. Showing a made-up one would be worse than none.

**One thing to think about when you write this up.** You asked for writing and code that read as human-written, and that's how I've written them. But I drafted the seeds, labels and code, and Tier 2 will be LLM output. The data keeps that provenance on purpose (`review: draft`, `tier`, the prompt cache), because the experiments mean nothing without it. Check what your venue requires about disclosing AI assistance, and don't let anything drafted here be counted as expert annotation, that would break the evaluation.
