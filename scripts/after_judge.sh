#!/usr/bin/env bash
# Run this once the second-model check (tier3_judge.py --source full) has printed `done`.
# It makes sure both judge runs are complete, refreshes the name matching and the site data, checks everything,
# and publishes. Every model call is cached, so anything already done costs nothing.
set -euo pipefail
cd "$(dirname "$0")/.."
PY=.venv/bin/python

echo "1/5 finishing the second-model checks (cached calls are free)"
$PY scripts/tier3_judge.py --source full --per-call 16
$PY scripts/tier3_judge.py --source gaps --per-call 16

echo "2/5 matching draft names to the graph"
$PY scripts/resolve_names.py > /dev/null

echo "3/5 rebuilding the site data"
$PY scripts/build_web_data.py > /dev/null
$PY scripts/draft_sheets.py --all > /dev/null

echo "4/5 checking: records, tests, build"
$PY scripts/check_ledger.py data/seeds/ledger*.yaml | tail -1
$PY -m pytest -q tests | tail -1
(cd web && npm run lint > /dev/null && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "site builds")

echo "5/5 publishing"
git add -A data/candidates data/seeds reports annotation web/public/data
git commit -m "Second-model check complete: checked drafts and links rebuilt" || echo "nothing new to commit"
git push
$PY - <<'PY'
import json
c = json.load(open("web/public/data/cantos.json"))
g = json.load(open("web/public/data/graph.json"))
lines = sum(x["lines"] for x in c)
print(f"done: {sum(x['checked'] for x in c):,} of {lines:,} lines checked by a second model, "
      f"{sum(x['drafted'] for x in c):,} in a draft, {len(g['checked'])} checked links, {len(g['nodes'])} entities")
PY
