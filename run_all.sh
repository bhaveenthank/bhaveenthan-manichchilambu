#!/bin/bash
# Rebuilds everything that doesn't need a model or the network, in order. Takes a few minutes.
set -e
# Python shuffles set order between runs, which changes how ties come out. Pin it so reruns match exactly.
export PYTHONHASHSEED=0
cd "$(dirname "$0")"
PY=.venv/bin/python
$PY scripts/parse_corpus.py
$PY scripts/check_ledger.py data/seeds/ledger.yaml data/seeds/ledger_heldout.yaml data/seeds/ledger_ext.yaml data/seeds/ledger_material.yaml data/seeds/ledger_coverage.yaml
$PY scripts/tier1_mentions.py
$PY scripts/tier1_events.py
$PY scripts/tier1_cooccur.py
$PY scripts/tier1_patterns.py
$PY scripts/formula_finder.py
$PY experiments/run_pattern_eval.py
$PY experiments/run_representation_test.py
$PY experiments/run_ablation.py
$PY experiments/run_composer_test.py
$PY experiments/run_detector_test.py
$PY experiments/run_mutations.py
$PY experiments/run_ontology_check.py
$PY experiments/run_paths_and_echoes.py
$PY experiments/run_discovery_test.py
$PY -m pytest -q tests
$PY scripts/check_catalogue.py
$PY scripts/export_graph.py
$PY scripts/make_review_sheet.py
$PY scripts/build_web_data.py
$PY scripts/build_line_index.py
npm --prefix web test
