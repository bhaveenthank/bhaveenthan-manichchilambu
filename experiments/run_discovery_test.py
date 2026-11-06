"""
Does guarding the paths help, or is it just more machinery?

Compared against a plain breadth-first search over the same records, with no warrants and no hub cost.
  1. tempting : pairs where a bare path invites a false reading. Does the guarded path carry the right warning?
  2. making   : false "X made Y" claims, and true ones. Only an explicit make record may licence one.
  3. expected : links I listed by hand, from reading. Are they found? How big are the hubs used on the way?
  4. depth    : the three depth measures, on what's recorded so far.
The test sets are mine, written with the method in mind, so this is a regression check and not a blind score.
"Surprise" isn't tested at all here: that needs readers to rate paths.
"""
import json
from collections import deque, defaultdict
from pathlib import Path

import yaml

from manichchilambu.discover import WarrantGraph, things, _vals
from manichchilambu.ledger import load

ROOT = Path(__file__).resolve().parent.parent
RECORDS = load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml", "ledger_material.yaml", "ledger_coverage.yaml")
THINGS = things()
NAMES = {**yaml.safe_load((ROOT / "data/web/names.yaml").read_text(encoding="utf-8")), **THINGS}
PLACES = {"puhar", "madurai", "vanci", "kanchi", "manipallavam", "gomukhi", "nagapuram", "singapuram", "palace_gate", "prison_site", "kannagi_temple", "temple_lodging", "flower_grove", "crystal_room", "seat_of_buddha"}
CLS = {**{p: "Place" for p in PLACES}, **{k: v["cls"] for k, v in THINGS.items()}}

# pair, the warrant that must show up, and the false reading it guards against
TEMPTING = [
    ("cowherd_women", "hill_people_25", "kind", "the same fruit passed between them"),
    ("kannagi", "cenkuttuvan", None, "skip"),
    ("hill_people_25", "saduvan", "wider", "the wrecked goods included sandalwood"),
    ("magadha_king", "magadha_workers", "place", "the king's gift was made by these workers"),
    ("avanti_king", "avanti_smiths", "place", "Avanti smiths made the arched gate"),
    ("skilled_woman_16", "hill_people_25", "kind", "the mat-maker knew the hill people"),
    ("cowherd_women", "jackfruit", "gloss", "the verse names jackfruit in the meal"),
    ("madhavi", "goldsmith", "same", "the goldsmith made Madhavi's jewels"),  # the honest link is just Kovalan, not the jewels
    ("madhavi", "yavana_carpenters", "kind", "Yavanas made her ornaments"),
]
TEMPTING = [t for t in TEMPTING if t[2]]
FALSE_MAKES = [("goldsmith", "ank_k1"), ("goldsmith", "ank_q"), ("goldsmith", "royal_ornaments"), ("goldsmiths_100", "ank_k1"), ("cowherd_women", "meal_16"), ("kannagi", "palm_mat"), ("magadha_king", "debate_hall"),
               ("avanti_king", "arched_gate"), ("magadha_workers", "debate_hall"), ("naga_chief", "fragrant_wood"), ("chintadevi", "amudasurabhi"), ("drummer_man01", "festival_drum")]
TRUE_MAKES = [("mayan", "debate_hall"), ("mayan", "arched_gate"), ("mayan", "victory_canopy"), ("skilled_woman_16", "palm_mat"), ("magadha_workers", "gold_pavilion"), ("yavana_carpenters", "gold_pavilion")]
EXPECTED = [("kovalan", "manimekalai"), ("cowherd_women", "hill_people_25"), ("hill_people_25", "saduvan"), ("magadha_king", "magadha_workers"), ("blanket_merchant", "puhar"), ("aticari", "aputhiran"),
            ("kannagi", "manimekalai"), ("pilivalai", "manimekhala_deity"), ("chintadevi", "kayasandikai"), ("skilled_woman_16", "kovalan"), ("kosikan", "kannagi"), ("cowherd_women", "madhavi"), ("drummer_man01", "kovalan"), ("visakai", "manimekalai"), ("mayan", "tamil_workers")]


def plain_path(g, a, b):
    """Breadth-first search over every record, said or done, with no costs and no warrants."""
    seen = {a: None}
    queue = deque([a])
    while queue:
        cur = queue.popleft()
        if cur == b:
            out = []
            while seen[cur] is not None:
                out.append(cur)
                cur = seen[cur]
            return out[::-1]
        for nxt, _ in sorted(g.adj[cur], key=lambda x: x[0]):
            if nxt not in seen:
                seen[nxt] = cur
                queue.append(nxt)
    return None


def depth_measures(g):
    # Temporal: longest route through stated causes and hand-offs. A DAG, so longest path is easy here (it's NP-hard in general).
    after = defaultdict(list)
    for r in RECORDS:
        for why in r.get("because", []):
            if why["of"] in g.records:
                after[why["of"]].append(r["id"])
    memo = {}
    def longest(n):
        if n not in memo:
            memo[n] = 1 + max((longest(m) for m in after[n]), default=0)
        return memo[n]
    causal = max(longest(r["id"]) for r in RECORDS)
    # Story order inside one episode: succession, not causation. Told-straight records, without retellings.
    by_ep = defaultdict(list)
    for r in RECORDS:
        if r["mood"] == "asserted" and "retells" not in r:
            by_ep[r["ep"]].append(r["t"])
    order = {ep: len(set(ts)) for ep, ts in by_ep.items()}
    return {"causal_longest_records": causal, "story_order_stages_by_episode": dict(sorted(order.items(), key=lambda x: -x[1])[:6])}


def main():
    g = WarrantGraph(RECORDS, CLS, THINGS, NAMES)
    tempting = []
    for a, b, need, reading in TEMPTING:
        path, _ = g.search(a, b)
        got = g.warrants(path) if path else set()
        tempting.append({"pair": [a, b], "false_reading": reading, "plain_path": plain_path(g, a, b), "guarded": [s["to"] for s in path] if path else None, "warrants": sorted(got), "flagged": need in got})
    wrongly = [p for p in FALSE_MAKES if g.licences_making(*p)]
    missed = [p for p in TRUE_MAKES if not g.licences_making(*p)]
    found, plain_degree, guarded_degree, hops = [], [], [], []
    for a, b in EXPECTED:
        path, cost = g.search(a, b, allow_said=False)
        plain = plain_path(g, a, b)
        found.append({"pair": [a, b], "found": bool(path), "cost": round(cost, 6) if path else None, "via": [s["to"] for s in path] if path else None, "warrants": sorted(g.warrants(path)) if path else None})
        if path and plain:
            guarded_degree += [g.degree(s["to"]) for s in path[:-1]]
            plain_degree += [g.degree(n) for n in plain[:-1]]
            hops.append(len(path))
    report = {
        "tempting": tempting, "tempting_flagged": f"{sum(t['flagged'] for t in tempting)}/{len(tempting)}",
        "false_makes_licensed": wrongly, "true_makes_missed": missed, "make_tests": [len(FALSE_MAKES), len(TRUE_MAKES)],
        "expected": found, "expected_found": f"{sum(f['found'] for f in found)}/{len(found)}",
        "mean_connector_degree": {"guarded": round(sum(guarded_degree) / max(len(guarded_degree), 1), 1), "plain": round(sum(plain_degree) / max(len(plain_degree), 1), 1)},
        "depth": depth_measures(g),
    }
    (ROOT / "reports/discovery.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print({k: report[k] for k in ("tempting_flagged", "false_makes_licensed", "true_makes_missed", "expected_found", "mean_connector_degree", "depth")})
    for t in tempting:
        print(" ", "ok " if t["flagged"] else "MISS", t["pair"], t["guarded"], t["warrants"])
    for f in found:
        if not f["found"]:
            print("  not found", f["pair"])
    return report


if __name__ == "__main__":
    main()
