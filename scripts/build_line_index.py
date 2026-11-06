"""
One row for every line of both epics, so nothing can quietly go unread.

For each of the 10,209 lines it records:
  graph    : hand records that cite it (these are in the graph)
  drafts   : how many unchecked machine drafts cite it
  notes    : line notes from the every-line pass, once that has run (scripts/tier2_lines.py)
  names    : known people, places and things named in it, from entities.yaml
  catalogue: catalogue items whose form appears in it. A string match, not a checked reading.
  status   : in_graph, drafted, noted, or unread

Writes data/lines/line_index.jsonl and reports/line_audit.json.
"""
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from manichchilambu.ledger import load  # noqa: E402
from manichchilambu.text import lines, mentions, squash  # noqa: E402

LEDGERS = ("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml", "ledger_material.yaml", "ledger_coverage.yaml")
# Short forms match inside unrelated words, so they only count where the catalogue says they were checked.
SHORT = 3


def catalogue_hits(rows, items):
    hits = defaultdict(list)
    for item in items:
        forms = [squash(f) for f in item["forms"]]
        if item["status"] == "title":
            continue
        for row in rows:
            text = squash(row["text"])
            if any(f in text for f in forms if len(f) > SHORT) or row["id"] == item["line"]:
                hits[row["id"]].append(item["id"])
    return hits


def main():
    rows = lines()
    cat = yaml.safe_load((ROOT / "data/seeds/catalogue.yaml").read_text(encoding="utf-8"))
    cat_of = {i["id"]: i["cat"] for i in cat["items"]}
    graph = defaultdict(list)
    for r in load(*LEDGERS):
        for l in r["lines"]:
            graph[l].append(r["id"])
    drafts = Counter()
    full = ROOT / "data/candidates/tier2_full.jsonl"
    if full.exists():
        for raw in open(full, encoding="utf-8"):
            for l in set(json.loads(raw)["lines"]):
                drafts[l] += 1
    notes = defaultdict(list)
    # The unread pass and the all-lines pass, whichever have finished.
    for name in ("tier2_lines.jsonl", "tier2_lines_all.jsonl"):
        noted = ROOT / "data/candidates" / name
        if not noted.exists():
            continue
        for raw in open(noted, encoding="utf-8"):
            n = json.loads(raw)
            if n.get("type") == "line_note":
                notes[n["line"]].append(n)
    names = mentions()
    hits = catalogue_hits(rows, cat["items"])

    out_dir = ROOT / "data/lines"
    out_dir.mkdir(exist_ok=True)
    status = Counter()
    unread = defaultdict(list)
    by_cat = Counter()
    with open(out_dir / "line_index.jsonl", "w", encoding="utf-8") as f:
        for row in rows:
            lid = row["id"]
            s = "in_graph" if graph[lid] else "drafted" if drafts[lid] else "noted" if notes[lid] else "unread"
            status[s] += 1
            if s == "unread":
                unread[lid[:6]].append(lid)
            for c in {cat_of[i] for i in hits[lid]}:
                by_cat[c] += 1
            f.write(json.dumps({"id": lid, "status": s, "graph": graph[lid], "drafts": drafts[lid],
                                "notes": [{k: n[k] for k in ("what", "categories", "sense") if k in n} for n in notes[lid]],
                                "names": names.get(lid, []), "catalogue": hits[lid]}, ensure_ascii=False) + "\n")
    report = {"lines": len(rows), "status": dict(status),
              "unread_by_canto": {k: len(v) for k, v in sorted(unread.items())},
              "unread": {k: v for k, v in sorted(unread.items())},
              "lines_with_catalogue_hits_by_category": dict(by_cat.most_common())}
    (ROOT / "reports/line_audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("lines", "status", "unread_by_canto")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
