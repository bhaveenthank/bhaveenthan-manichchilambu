"""Checks on the material and coverage batches: citations hold, every canto is reachable, references resolve."""
import csv
from pathlib import Path

import yaml

from manichchilambu.ledger import load
from manichchilambu.text import line_text, squash

ROOT = Path(__file__).resolve().parent.parent
SEEDS = ROOT / "data" / "seeds"
TEXT = line_text()
ALL = load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml", "ledger_material.yaml", "ledger_coverage.yaml")
IDS = {r["id"] for r in ALL}


def _yaml(name):
    return yaml.safe_load((SEEDS / name).read_text(encoding="utf-8"))


def test_every_canto_has_a_record():
    keys = {f"{r['epic']}-{int(r['canto']):02d}" for r in csv.DictReader(open(ROOT / "data/corpus/cantos.csv", encoding="utf-8"))}
    covered = {l[:6] for r in ALL for l in r["lines"]}
    assert not keys - covered


def test_ids_are_unique():
    assert len(IDS) == len(ALL)


def test_batches_stay_out_of_the_scored_experiments():
    scored = load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml")
    assert len(scored) == 163


def test_lexicon_forms_are_in_their_lines():
    for shelf, rows in _yaml("lexicon.yaml").items():
        for row in rows:
            for sense in row["senses"] if shelf == "homonyms" else [row]:
                assert squash(sense.get("as", row["form"])) in squash(TEXT[sense["line"]]), (row["form"], sense["line"])


def test_links_and_gaps_point_at_real_records():
    for tie in _yaml("bridges.yaml"):
        assert "not_this" in tie and set(tie["recs"]) <= IDS, tie["id"]
    for gap in _yaml("gaps.yaml"):
        assert set(gap["recs"]) <= IDS, gap["id"]


def test_making_needs_an_agent_and_a_thing():
    for r in ALL:
        if r["kind"] == "make":
            assert r["roles"].get("agent") and r["roles"].get("theme"), r["id"]
