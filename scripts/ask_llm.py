"""
Written answers from an evidence package, with every claim checked against it.

The Ask page answers with templates and never runs a language model. This script is the optional step after it:
it takes the evidence package the page builds (Research view, "Download the evidence package"), or the packages
the tests write for the benchmark questions, and asks a model to write the answer under a fixed contract.

Three stages, kept apart so an error can be traced to one of them:
  1. writer   : the model writes the answer, in English and Tamil, as a list of claims, each citing evidence ids
                and saying whether the claim is a fact, something said, wanted, imagined or believed, or unknown.
  2. checker  : no model. Every claim is checked against the package by rule:
                  - each cited id must be in the package
                  - a claim given as fact must rest on at least one record told as fact
                  - a claim about what someone said, ordered, dreamed or believed must say whose it is
                  - lines and drafts may point, but a claim resting only on them is not an answer
                Claims that fail are dropped from the answer and listed with the reason.
  3. auditor  : optional (--audit). A second call reads each surviving claim beside the propositions it cites and
                says whether they support it, partly support it, contradict it, or are not enough. Advisory only:
                a model checking a model is not a scholar.

Run from your own terminal, since `claude -p` only works there:
  .venv/bin/python scripts/ask_llm.py evidence.json            one package downloaded from the site
  .venv/bin/python scripts/ask_llm.py --batch                  every benchmark question (reports/evidence_packages.json)
  .venv/bin/python scripts/ask_llm.py --batch --audit          the same, with the auditor
  .venv/bin/python scripts/ask_llm.py evidence.json --dry-run  print the writer's prompt and stop

Answers are cached like every other model call, so a rerun costs nothing.
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

CONTRACT = """You answer questions about two Tamil epics, Silappatikaram and Manimekalai, using ONLY the evidence below.

The evidence comes in three kinds:
- records: hand-made statements, each with an evidence_class. "happened" means the text tells it as fact.
  "said" means a character says it, "wanted" means an order, wish or plan, "imagined" means a dream, figure of
  speech or condition, "belief" means a character believes it. The voice_chain says whose words they are.
- lines: verse lines found by search. Their English gist is an unchecked machine note. They may point, never answer.
- drafts: unchecked machine records. They may point, never answer.

Rules:
1. Every claim cites evidence ids from the lists below. Never cite anything else.
2. A claim may be given as fact (stance "fact") only if it rests on a record whose evidence_class is "happened".
3. A claim from a "said", "wanted", "imagined" or "belief" record keeps that stance, and its wording says whose it is
   ("the goldsmith claims...", "the king believes...", "in her dream..."). Never turn an accusation into an event.
4. Keep story time: if the evidence says when, say when.
5. Do not invent people, places, objects, causes or links. Similarity between two passages is not influence.
6. If the evidence does not settle the question, say what is not established, as a claim with stance "unknown".
7. Answer the question first, briefly, then explain.

Reply with JSON only, in this shape:
{"answer_en": "...", "answer_ta": "...",
 "claims": [{"text_en": "...", "text_ta": "...", "stance": "fact|said|wanted|imagined|belief|unknown", "evidence": ["id", ...]}]}
"""

AUDIT = """For each claim below, read the evidence it cites and label it:
"supports" (the evidence states it), "partial" (states part of it, or needs an inference the claim doesn't flag),
"contradicts", or "insufficient". Judge only from the evidence shown. Reply with JSON only:
{"labels": [{"claim": 0, "label": "...", "why": "a few words"}]}
"""

# Words that say whose a claim is. English and Tamil, since the writer answers in both.
ATTRIBUTION = re.compile(r"\b(says?|said|claims?|claimed|accus\w*|alleg\w*|believ\w*|thinks?|thought|suspect\w*|orders?|ordered|commands?|wish\w*|curs\w*|plans?|intends?|dream\w*|foretell\w*|foretold|predict\w*|asks?|asked|according to|in (his|her|their) (view|words|dream))\b"
                         r"|கூறு|கூறி|என்று|நம்பு|நம்பி|கனவ|ஆணை|விரும்ப|சாப|குற்றம்|எண்ணி|கேட்", re.I)


def trim(package):
    """What the writer sees: the plan's question and each piece of evidence with the fields that bear on it."""
    recs = [{"id": r["evidence_id"], "evidence_class": r["evidence_class"], "mood": r["mood"], "voice_chain": r["voice_chain"],
             "story_time": r["story_time"], "en": r["supported_proposition"]["en"], "ta": r["supported_proposition"]["ta"],
             "lines": [f'{l["id"]}: {l["text"]}' for l in r["lines"]], "caveat": r.get("caveat")} for r in package["records"]]
    lines = [{"id": l["evidence_id"], "text": l["text"], "gist": l.get("gist")} for l in package.get("lines", [])]
    drafts = [{"id": d["evidence_id"], "relation": d["relation"], "mood": d["mood"], "quote": d["quote"], "lines": d["lines"]} for d in package.get("drafts", [])]
    return {"question": package["question"], "records": recs, "lines": lines, "drafts": drafts}


def writer_prompt(package):
    return CONTRACT + "\nQuestion: " + package["question"] + "\n\nEvidence:\n" + json.dumps(trim(package), ensure_ascii=False, indent=1)


def parse_json(text):
    match = re.search(r"\{.*\}", text, re.S)
    try:
        return json.loads(match.group(0)) if match else None
    except json.JSONDecodeError:
        return None


def check(package, written):
    """The rule-based checker. Returns (kept, dropped), each claim with the reasons it passed or failed."""
    classes = {r["evidence_id"]: r["evidence_class"] for r in package["records"]}
    pointers = {l["evidence_id"] for l in package.get("lines", [])} | {d["evidence_id"] for d in package.get("drafts", [])}
    kept, dropped = [], []
    for i, c in enumerate((written or {}).get("claims", [])):
        cited = c.get("evidence") or []
        stance = c.get("stance", "")
        text = f'{c.get("text_en", "")} {c.get("text_ta", "")}'
        problems = []
        unknown_ids = [e for e in cited if e not in classes and e not in pointers]
        if unknown_ids:
            problems.append(f"cites evidence that isn't in the package: {', '.join(unknown_ids)}")
        recs = [e for e in cited if e in classes]
        if stance == "unknown":
            pass  # saying what isn't established needs no support, only honesty
        elif not cited:
            problems.append("no evidence cited")
        elif not recs:
            problems.append("rests only on lines or drafts, which may point but not answer")
        elif stance == "fact" and not any(classes[e] == "happened" for e in recs):
            problems.append("given as fact, but every record it cites is only " + ", ".join(sorted({classes[e] for e in recs})))
        elif stance in ("said", "wanted", "imagined", "belief") and not ATTRIBUTION.search(text):
            problems.append(f"a {stance} claim that doesn't say whose it is")
        elif stance not in ("fact", "said", "wanted", "imagined", "belief"):
            problems.append(f"unknown stance '{stance}'")
        (dropped if problems else kept).append({"index": i, **c, "problems": problems})
    return kept, dropped


def audit(package, kept, model):
    from manichchilambu.llm import ask
    props = {r["evidence_id"]: r["supported_proposition"]["en"] for r in package["records"]}
    shown = [{"claim": k["index"], "text": k.get("text_en"), "evidence": {e: props.get(e, "(a line or draft)") for e in k.get("evidence", [])}} for k in kept if k.get("stance") != "unknown"]
    if not shown:
        return []
    out = parse_json(ask(AUDIT + "\n" + json.dumps(shown, ensure_ascii=False, indent=1), model=model, sample=0))
    return (out or {}).get("labels", [])


def run_one(package, model, do_audit):
    from manichchilambu.llm import ask
    raw = ask(writer_prompt(package), model=model, sample=0)
    written = parse_json(raw)
    kept, dropped = check(package, written)
    labels = audit(package, kept, model) if do_audit else []
    return {"question": package["question"], "answer_kind_on_site": package.get("answer_kind"), "written": written, "kept": kept, "dropped": dropped,
            "audit": labels, "parsed": written is not None}


def markdown(result):
    out = [f"# {result['question']}", ""]
    w = result["written"] or {}
    out += [w.get("answer_en", "(no answer parsed)"), "", w.get("answer_ta", ""), "", "## Claims that passed the checks", ""]
    out += [f"- [{k['stance']}] {k.get('text_en')} ({', '.join(k.get('evidence', []))})" for k in result["kept"]] or ["- none"]
    out += ["", "## Claims dropped", ""]
    out += [f"- {d.get('text_en')}: {'; '.join(d['problems'])}" for d in result["dropped"]] or ["- none"]
    if result["audit"]:
        out += ["", "## Auditor (a second model call, advisory)", ""] + [f"- claim {a.get('claim')}: {a.get('label')} ({a.get('why', '')})" for a in result["audit"]]
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("package", nargs="?", help="an evidence package downloaded from the Ask page")
    ap.add_argument("--batch", action="store_true", help="every benchmark question, from reports/evidence_packages.json")
    ap.add_argument("--audit", action="store_true", help="add the second-call auditor")
    ap.add_argument("--model", default="claude-sonnet-5-5")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if args.batch:
        packages = json.loads((ROOT / "reports/evidence_packages.json").read_text(encoding="utf-8"))
    elif args.package:
        packages = [json.loads(Path(args.package).read_text(encoding="utf-8"))]
    else:
        sys.exit("give a package file, or --batch")
    if args.dry_run:
        print(writer_prompt(packages[0]))
        return
    out_dir = ROOT / "reports/llm_answers"
    out_dir.mkdir(exist_ok=True)
    results = []
    try:
        for i, p in enumerate(packages):
            r = run_one(p, args.model, args.audit)
            results.append(r)
            slug = re.sub(r"\W+", "_", p["question"].lower())[:50].strip("_") or f"q{i}"
            (out_dir / f"{i:02d}_{slug}.md").write_text(markdown(r), encoding="utf-8")
            print(f"{i + 1}/{len(packages)} kept {len(r['kept'])} dropped {len(r['dropped'])}", flush=True)
    except RuntimeError as stop:
        print(f"stopped after {len(results)} of {len(packages)}: {stop}\nSaved answers are kept. Run the same command again.")
    reasons = {}
    for r in results:
        for d in r["dropped"]:
            for pr in d["problems"]:
                key = pr.split(":")[0].split(",")[0]
                reasons[key] = reasons.get(key, 0) + 1
    summary = {"answers": len(results), "parsed": sum(r["parsed"] for r in results), "claims": sum(len(r["kept"]) + len(r["dropped"]) for r in results),
               "kept": sum(len(r["kept"]) for r in results), "dropped": sum(len(r["dropped"]) for r in results), "dropped_by_reason": reasons,
               "audit_labels": {lab: sum(1 for r in results for a in r["audit"] if a.get("label") == lab) for lab in ("supports", "partial", "contradicts", "insufficient")}}
    (ROOT / "reports/llm_answers_summary.json").write_text(json.dumps({"summary": summary, "results": results}, ensure_ascii=False, indent=1), encoding="utf-8")
    print("done", summary)


if __name__ == "__main__":
    main()
