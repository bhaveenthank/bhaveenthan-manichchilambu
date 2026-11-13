"""
Review sheets for the machine drafts, one canto at a time, and reading the finished sheets back.

  .venv/bin/python scripts/draft_sheets.py SIL-20           write annotation/drafts/SIL-20.csv
  .venv/bin/python scripts/draft_sheets.py --all            every canto
  .venv/bin/python scripts/draft_sheets.py --ingest         read every sheet you've filled in

Each row is one draft: what it says, who tells it, in what mood, the Tamil lines, the quote the model gave, the
people's names matched to the graph (with how each was matched), and, once scripts/tier3_judge.py --source full
has run, the second model's verdict and the pile. Fast-pile rows come first.

Fill in `decision` with one of:
  accept   the draft says what the lines say, in the right mood, about the right people
  fix      nearly right; write what to change in `fix_note` (Claude turns these into hand records)
  reject   wrong, or not worth a record
and leave it empty to come back later. A sheet can be opened in Excel, Numbers or Google Sheets; keep it as CSV.

--ingest writes:
  data/candidates/reviewed.jsonl   accepted drafts, marked reviewed with who and when. The site counts their lines
                                   as checked by a reader, between the hand records and the unchecked drafts.
  reports/drafts_to_fix.json       the fix rows, for Claude to rewrite as hand records in the ledger
  reports/draft_review.json        how many of each, per canto, and the share of fast-pile drafts you accepted
                                   (the number that says whether the fast pile can be trusted)
"""
import argparse
import csv
import json
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from manichchilambu.text import line_text  # noqa: E402

TEXT = line_text()
SHEETS = ROOT / "annotation/drafts"
FIELDS = ["draft", "pile", "judge", "judge_reason", "kind", "roles", "voice", "mood", "lines", "tamil", "quote", "decision", "fix_note"]


def load_drafts():
    """Every draft with a stable id (its position in tier2_full.jsonl), plus the judge's verdict if there is one."""
    rows = [json.loads(raw) for raw in open(ROOT / "data/candidates/tier2_full.jsonl", encoding="utf-8")]
    key = lambda r: json.dumps([r.get("kind"), r.get("roles"), r.get("voice"), r.get("mood"), r["lines"], r.get("quote")], ensure_ascii=False, sort_keys=True)
    judged = ROOT / "data/candidates/tier3_full.jsonl"
    verdicts = {}
    if judged.exists():  # the judge writes in window order, so match by content, never by position
        for raw in open(judged, encoding="utf-8"):
            j = json.loads(raw)
            verdicts[key(j)] = (j.get("judge"), j.get("pile"))
    for i, r in enumerate(rows):
        r["draft"] = f"d{i:05d}"
        r["judge"], r["pile"] = verdicts.get(key(r), (None, None))
    return rows


def names(nmap, canto):
    def show(v):
        if not isinstance(v, str):
            return "/".join(show(x) for x in v) if isinstance(v, list) else str(v)
        got = nmap.get(f"{v}|{canto}") or {}
        if got.get("id") and got["id"] != v:
            return f"{v} → {got['id']} ({got['how']})"
        return v
    return show


def write(canto, rows, nmap):
    SHEETS.mkdir(parents=True, exist_ok=True)
    path = SHEETS / f"{canto}.csv"
    kept = {}
    if path.exists():  # never lose decisions already made
        for row in csv.DictReader(open(path, encoding="utf-8-sig")):
            if row.get("decision") or row.get("fix_note"):
                kept[row["draft"]] = (row.get("decision", ""), row.get("fix_note", ""))
    show = names(nmap, canto)
    order = {"fast": 0, "careful": 1, None: 2}
    rows = sorted(rows, key=lambda r: (order.get(r.get("pile")), r["lines"][0]))
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for r in rows:
            j = r.get("judge") or {}
            dec, note = kept.get(r["draft"], ("", ""))
            w.writerow({"draft": r["draft"], "pile": r.get("pile") or "not judged yet", "judge": j.get("verdict", ""), "judge_reason": j.get("reason", ""),
                        "kind": r.get("kind"), "roles": "; ".join(f"{k}={show(v)}" for k, v in (r.get("roles") or {}).items()),
                        "voice": " > ".join(r.get("voice") or []), "mood": r.get("mood"), "lines": " ".join(r["lines"]),
                        "tamil": " / ".join(TEXT.get(l, "") for l in r["lines"]), "quote": r.get("quote") or "", "decision": dec, "fix_note": note})
    return path, len(rows), len(kept)


def ingest(rows):
    by_id = {r["draft"]: r for r in rows}
    accepted, fixes, stats = [], [], defaultdict(Counter)
    fast_seen = fast_ok = 0
    for path in sorted(SHEETS.glob("*.csv")):
        canto = path.stem
        for row in csv.DictReader(open(path, encoding="utf-8-sig")):
            dec = (row.get("decision") or "").strip().lower()
            if not dec:
                stats[canto]["open"] += 1
                continue
            if dec not in ("accept", "fix", "reject"):
                stats[canto]["unreadable"] += 1
                continue
            stats[canto][dec] += 1
            d = by_id.get(row["draft"])
            if d and d.get("pile") == "fast":
                fast_seen += 1
                fast_ok += dec == "accept"
            if dec == "accept" and d:
                accepted.append({**{k: d[k] for k in ("kind", "roles", "voice", "mood", "lines", "quote")}, "draft": d["draft"], "status": "reviewed",
                                 "reviewed_on": time.strftime("%Y-%m-%d"), "pile": d.get("pile")})
            elif dec == "fix" and d:
                fixes.append({"draft": d["draft"], "canto": canto, "fix_note": row.get("fix_note", ""), **{k: d[k] for k in ("kind", "roles", "voice", "mood", "lines", "quote")}})
    with open(ROOT / "data/candidates/reviewed.jsonl", "w", encoding="utf-8") as f:
        for a in accepted:
            f.write(json.dumps(a, ensure_ascii=False) + "\n")
    (ROOT / "reports/drafts_to_fix.json").write_text(json.dumps(fixes, ensure_ascii=False, indent=1), encoding="utf-8")
    total = Counter()
    for c in stats.values():
        total.update(c)
    summary = {"accepted": total["accept"], "to_fix": total["fix"], "rejected": total["reject"], "still_open": total["open"], "unreadable": total["unreadable"],
               "fast_pile_reviewed": fast_seen, "fast_pile_accepted_share": round(fast_ok / fast_seen, 3) if fast_seen else None,
               "lines_now_reviewed": len({l for a in accepted for l in a["lines"]}), "per_canto": {k: dict(v) for k, v in sorted(stats.items())}}
    (ROOT / "reports/draft_review.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in summary.items() if k != "per_canto"}, indent=1))
    print("Now rebuild the site: .venv/bin/python scripts/build_web_data.py")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("canto", nargs="*", help="e.g. SIL-20 MAN-03")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--ingest", action="store_true")
    args = ap.parse_args()
    rows = load_drafts()
    if args.ingest:
        ingest(rows)
        return
    nmap_path = ROOT / "data/candidates/name_map.json"
    nmap = json.loads(nmap_path.read_text(encoding="utf-8")) if nmap_path.exists() else {}
    by_canto = defaultdict(list)
    for r in rows:
        by_canto[r["lines"][0][:6]].append(r)
    for canto in (sorted(by_canto) if args.all else args.canto):
        if canto not in by_canto:
            print(f"{canto}: no drafts")
            continue
        path, n, kept = write(canto, by_canto[canto], nmap)
        print(f"{path.relative_to(ROOT)}: {n} drafts" + (f", kept {kept} decisions already made" if kept else ""))


if __name__ == "__main__":
    main()
