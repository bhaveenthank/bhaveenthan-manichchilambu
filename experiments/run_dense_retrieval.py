"""
Which retrievers find the right record? Each route on its own, then fused, on every benchmark question.

The Ask page's routes come from reports/retrieval_runs.json, which the web tests write (npm --prefix web test):
  rule   the hand-written rules        graph  records naming the question's people and things
  words  BM25 over the records          lines  BM25 over every line, mapped to the records citing them
  final  what the page shows (all routes fused with RRF, then the evidence checks)

Added here, so the paper can compare against the usual baselines:
  chars  character n-gram TF-IDF over each record's English and Tamil (catches spelling variants)
  dense  multilingual sentence embeddings, if sentence-transformers is installed (see below)

and the fusions: RRF of words + graph + lines, then that plus chars, then that plus dense.

Recall@5 is whether the expected record is in the first five; MRR is the mean of 1/rank (0 past rank 10).

Dense embeddings need a one-off install and model download, so they're off unless asked for:
  .venv/bin/pip install sentence-transformers
  .venv/bin/python experiments/run_dense_retrieval.py --dense intfloat/multilingual-e5-small
Other models worth trying: intfloat/multilingual-e5-base, BAAI/bge-m3. Whether any of them reads classical Tamil
well is exactly what this measures; a "multilingual" label doesn't promise it.
"""
import argparse
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RRF_K = 60


def rrf(*lists, weights=None):
    score = defaultdict(float)
    for j, ids in enumerate(lists):
        w = (weights or [1] * len(lists))[j]
        for k, i in enumerate(ids):
            score[i] += w / (RRF_K + k + 1)
    return [i for i, _ in sorted(score.items(), key=lambda x: -x[1])]


def metrics(runs, ranked):
    r5 = sum(1 for run, ids in zip(runs, ranked) if run["gold"] in ids[:5]) / len(runs)
    mrr = sum((1 / (ids.index(run["gold"]) + 1)) if run["gold"] in ids[:10] else 0 for run, ids in zip(runs, ranked)) / len(runs)
    return {"recall@5": round(r5, 3), "mrr@10": round(mrr, 3)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dense", default=None, help="a sentence-transformers model name, e.g. intfloat/multilingual-e5-small")
    args = ap.parse_args()
    runs = json.loads((ROOT / "reports/retrieval_runs.json").read_text(encoding="utf-8"))
    records = json.loads((ROOT / "web/public/data/records.json").read_text(encoding="utf-8"))
    ids = [r["id"] for r in records]
    texts = [f'{r["en"]} {r["ta"]} {r["kind"].replace("_", " ")}' for r in records]
    questions = [r["q"] for r in runs]

    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), sublinear_tf=True)
    doc_m = vec.fit_transform(texts)
    sims = cosine_similarity(vec.transform(questions), doc_m)
    chars = [[ids[i] for i in row.argsort()[::-1][:40]] for row in sims]

    dense = None
    if args.dense:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(args.dense)
        e5 = "e5" in args.dense.lower()
        d = model.encode([("passage: " if e5 else "") + t for t in texts], normalize_embeddings=True, show_progress_bar=True)
        q = model.encode([("query: " if e5 else "") + t for t in questions], normalize_embeddings=True)
        dense = [[ids[i] for i in (d @ qq).argsort()[::-1][:40]] for qq in q]

    systems = {
        "rule": [r["lists"]["rule"] for r in runs],
        "graph": [r["lists"]["graph"] for r in runs],
        "words (BM25)": [r["lists"]["words"] for r in runs],
        "lines (BM25 via verse)": [r["lists"]["lines"] for r in runs],
        "chars (n-gram TF-IDF)": chars,
        "RRF words+graph+lines": [rrf(r["lists"]["words"], r["lists"]["graph"], r["lists"]["lines"]) for r in runs],
        "RRF words+graph+lines+chars": [rrf(r["lists"]["words"], r["lists"]["graph"], r["lists"]["lines"], c) for r, c in zip(runs, chars)],
        "the Ask page (all routes + evidence checks)": [r["final"] for r in runs],
    }
    if dense:
        systems["dense"] = dense
        systems["RRF words+graph+lines+dense"] = [rrf(r["lists"]["words"], r["lists"]["graph"], r["lists"]["lines"], dn) for r, dn in zip(runs, dense)]
        systems["RRF words+graph+lines+chars+dense"] = [rrf(r["lists"]["words"], r["lists"]["graph"], r["lists"]["lines"], c, dn) for r, c, dn in zip(runs, chars, dense)]

    by_set = defaultdict(list)
    for i, r in enumerate(runs):
        by_set[r["set"]].append(i)
    out = {"questions": len(runs), "dense_model": args.dense, "systems": {}}
    for name, ranked in systems.items():
        row = {"all": metrics(runs, ranked)}
        for s, idx in by_set.items():
            row[s] = metrics([runs[i] for i in idx], [ranked[i] for i in idx])
        out["systems"][name] = row
    (ROOT / "reports/retrieval_eval.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    width = max(len(n) for n in systems)
    print(f"{'system'.ljust(width)}  recall@5  mrr@10   held-out recall@5   ({len(runs)} questions)")
    for name, row in out["systems"].items():
        held = row.get("open_2_heldout", {}).get("recall@5", "–")
        print(f"{name.ljust(width)}  {row['all']['recall@5']:<8}  {row['all']['mrr@10']:<7}  {held}")


if __name__ == "__main__":
    main()
