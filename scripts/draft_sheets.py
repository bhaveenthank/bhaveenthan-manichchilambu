"""
Review sheets for the machine drafts, one canto at a time, and reading the finished sheets back.

  .venv/bin/python scripts/draft_sheets.py SIL-20           write annotation/drafts/SIL-20.csv
  .venv/bin/python scripts/draft_sheets.py --all            every canto
  .venv/bin/python scripts/draft_sheets.py --sample 200     write annotation/drafts/SAMPLE.csv: random drafts to estimate accuracy
  .venv/bin/python scripts/draft_sheets.py --ingest         read every sheet you've filled in
  .venv/bin/python scripts/draft_sheets.py --ingest --promote-fast
                                                            also accept the whole fast pile, if the sample backs it

The quick route: you don't have to read all 7,177 drafts. Mark the random sample (half fast pile, half careful
pile, with the judge's verdict hidden so it can't sway you). Its accept rate, with a 95% interval, says how far
each pile can be trusted. If the lower end of the fast pile's interval is at least 85% (--min to change it),
--promote-fast accepts every fast-pile draft you haven't rejected, marked "sample-verified" with the estimate,
so the site and the paper can say exactly how they were checked. The careful pile stays as drafts, except the
cantos you review in full.

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


def write(canto, rows, nmap, blind=False, keep_order=False):
    SHEETS.mkdir(parents=True, exist_ok=True)
    path = SHEETS / f"{canto}.csv"
    kept = {}
    if path.exists():  # never lose decisions already made
        for row in csv.DictReader(open(path, encoding="utf-8-sig")):
            if row.get("decision") or row.get("fix_note"):
                kept[row["draft"]] = (row.get("decision", ""), row.get("fix_note", ""))
    order = {"fast": 0, "careful": 1, None: 2}
    if not keep_order:
        rows = sorted(rows, key=lambda r: (order.get(r.get("pile")), r["lines"][0]))
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for r in rows:
            show = names(nmap, r["lines"][0][:6])
            j = {} if blind else (r.get("judge") or {})
            dec, note = kept.get(r["draft"], ("", ""))
            w.writerow({"draft": r["draft"], "pile": "hidden" if blind else (r.get("pile") or "not judged yet"), "judge": j.get("verdict", ""), "judge_reason": j.get("reason", ""),
                        "kind": r.get("kind"), "roles": "; ".join(f"{k}={show(v)}" for k, v in (r.get("roles") or {}).items()),
                        "voice": " > ".join(r.get("voice") or []), "mood": r.get("mood"), "lines": " ".join(r["lines"]),
                        "tamil": " / ".join(TEXT.get(l, "") for l in r["lines"]), "quote": r.get("quote") or "", "decision": dec, "fix_note": note})
    return path, len(rows), len(kept)


def wilson(k, n, z=1.96):
    """95% interval for an accept rate from k of n, sound even for small samples."""
    if not n:
        return None
    p = k / n
    centre, half = (p + z * z / (2 * n)) / (1 + z * z / n), z * ((p * (1 - p) / n + z * z / (4 * n * n)) ** 0.5) / (1 + z * z / n)
    return [round(centre - half, 3), round(centre + half, 3)]


def make_sample(rows, n, nmap):
    import random
    rng = random.Random(20261113)
    fast = [r for r in rows if r.get("pile") == "fast"]
    careful = [r for r in rows if r.get("pile") == "careful"]
    if not fast and not careful:
        print("The judge hasn't run yet, so this is a plain random sample. Run scripts/tier3_judge.py --source full first for the piles.")
        pick = rng.sample(rows, min(n, len(rows)))
    else:
        pick = rng.sample(fast, min(n // 2, len(fast))) + rng.sample(careful, min(n - n // 2, len(careful)))
        rng.shuffle(pick)
    path, k, kept = write("SAMPLE", pick, nmap, blind=True, keep_order=True)
    print(f"{path.relative_to(ROOT)}: {k} drafts, judge verdicts hidden" + (f", kept {kept} decisions already made" if kept else ""))


def ingest(rows, promote=False, minimum=0.85):
    by_id = {r["draft"]: r for r in rows}
    accepted, fixes, stats = [], [], defaultdict(Counter)
    fast_seen = fast_ok = 0
    sample = defaultdict(Counter)
    decided = set()
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
            decided.add(row["draft"])
            if canto == "SAMPLE" and d:
                sample[d.get("pile") or "not judged"][dec] += 1
            if d and d.get("pile") == "fast":
                fast_seen += 1
                fast_ok += dec == "accept"
            if dec == "accept" and d:
                accepted.append({**{k: d[k] for k in ("kind", "roles", "voice", "mood", "lines", "quote")}, "draft": d["draft"], "status": "reviewed",
                                 "reviewed_on": time.strftime("%Y-%m-%d"), "pile": d.get("pile")})
            elif dec == "fix" and d:
                fixes.append({"draft": d["draft"], "canto": canto, "fix_note": row.get("fix_note", ""), **{k: d[k] for k in ("kind", "roles", "voice", "mood", "lines", "quote")}})
    estimate = {pile: {"marked": sum(c.values()), "accepted": c["accept"], "accept_rate": round(c["accept"] / sum(c.values()), 3),
                       "interval_95": wilson(c["accept"], sum(c.values()))} for pile, c in sample.items()}
    promoted = 0
    if promote:
        fast = estimate.get("fast")
        if not fast or fast["marked"] < 50:
            print("Not promoting: mark at least 50 fast-pile drafts in SAMPLE.csv first.")
        elif fast["interval_95"][0] < minimum:
            print(f"Not promoting: the fast pile's accept rate could be as low as {fast['interval_95'][0]:.0%}, under {minimum:.0%}. Review it canto by canto instead.")
        else:
            seen = {a["draft"] for a in accepted}
            for d in rows:
                if d.get("pile") == "fast" and d["draft"] not in decided and d["draft"] not in seen:
                    accepted.append({**{k: d[k] for k in ("kind", "roles", "voice", "mood", "lines", "quote")}, "draft": d["draft"], "status": "sample-verified",
                                     "estimate": fast, "reviewed_on": time.strftime("%Y-%m-%d"), "pile": "fast"})
                    promoted += 1
    with open(ROOT / "data/candidates/reviewed.jsonl", "w", encoding="utf-8") as f:
        for a in accepted:
            f.write(json.dumps(a, ensure_ascii=False) + "\n")
    (ROOT / "reports/drafts_to_fix.json").write_text(json.dumps(fixes, ensure_ascii=False, indent=1), encoding="utf-8")
    total = Counter()
    for c in stats.values():
        total.update(c)
    summary = {"accepted": total["accept"], "to_fix": total["fix"], "rejected": total["reject"], "still_open": total["open"], "unreadable": total["unreadable"],
               "fast_pile_reviewed": fast_seen, "fast_pile_accepted_share": round(fast_ok / fast_seen, 3) if fast_seen else None,
               "sample_estimate": estimate, "promoted_fast_pile": promoted,
               "lines_now_reviewed": len({l for a in accepted for l in a["lines"]}), "per_canto": {k: dict(v) for k, v in sorted(stats.items())}}
    (ROOT / "reports/draft_review.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in summary.items() if k != "per_canto"}, indent=1))
    print("Now rebuild the site: .venv/bin/python scripts/build_web_data.py")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("canto", nargs="*", help="e.g. SIL-20 MAN-03")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--ingest", action="store_true")
    ap.add_argument("--sample", type=int, default=0, help="write a blind random sample of this many drafts")
    ap.add_argument("--promote-fast", action="store_true", help="with --ingest: accept the fast pile if the sample backs it")
    ap.add_argument("--min", type=float, default=0.85, help="lowest acceptable accept rate for --promote-fast (lower end of the 95%% interval)")
    args = ap.parse_args()
    rows = load_drafts()
    if args.ingest:
        ingest(rows, args.promote_fast, args.min)
        return
    nmap_path = ROOT / "data/candidates/name_map.json"
    nmap = json.loads(nmap_path.read_text(encoding="utf-8")) if nmap_path.exists() else {}
    if args.sample:
        make_sample(rows, args.sample, nmap)
        return
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
