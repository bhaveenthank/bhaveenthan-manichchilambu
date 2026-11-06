"""
Checks data/seeds/catalogue.yaml against the text: every item's form must be in the line it cites,
every homonym sense must be in its line, and every `node` must exist. Exit code 1 on any failure.

Items marked status: title are allowed to miss the line, since their name is only in the canto title,
but then the title has to have it.
"""
import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from manichchilambu.text import lines, squash  # noqa: E402


def main():
    cat = yaml.safe_load((ROOT / "data/seeds/catalogue.yaml").read_text(encoding="utf-8"))
    rows = {l["id"]: l for l in lines()}
    nodes = {n["id"] for n in json.loads((ROOT / "web/public/data/graph.json").read_text(encoding="utf-8"))["nodes"]}
    known = {t["id"] for t in cat["taxonomy"]}
    bad = []
    ids = set()
    for item in cat["items"]:
        if item["id"] in ids:
            bad.append(f"{item['id']}: listed twice")
        ids.add(item["id"])
        if item["cat"] not in known:
            bad.append(f"{item['id']}: unknown category {item['cat']}")
        row = rows.get(item["line"])
        if not row:
            bad.append(f"{item['id']}: no line {item['line']}")
            continue
        where = squash(row["canto_title"] if item["status"] == "title" else row["text"])
        if not any(squash(f) in where for f in item["forms"]):
            bad.append(f"{item['id']}: none of {item['forms']} in {item['line']}")
        if item.get("node") and item["node"] not in nodes:
            bad.append(f"{item['id']}: node {item['node']} isn't in the graph")
    for h in cat["homonyms"]:
        for s in h["senses"]:
            row = rows.get(s["line"])
            if not row or squash(h["form"]) not in squash(row["text"]):
                bad.append(f"homonym {h['form']}: not in {s['line']}")
    for b in bad:
        print("FAIL", b)
    print(f"{len(cat['items'])} items, {len(cat['homonyms'])} homonyms, {len(bad)} problems")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
