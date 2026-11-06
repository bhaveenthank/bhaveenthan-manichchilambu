"""Offline checks for the LLM tier: no model needed. Parser, example pool and scorer."""
import importlib.util
from pathlib import Path

from manichchilambu.ledger import load

ROOT = Path(__file__).resolve().parent.parent


def _load(rel, name):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


tier2 = _load("scripts/tier2_llm.py", "tier2_llm")
scorer = _load("experiments/run_tier2_eval.py", "run_tier2_eval")
PART = next(p for p in tier2.windows() if p[0]["id"].startswith("SIL-16") and any(l["id"] == "SIL-16-0145" for l in p))
GOOD = '[{"kind":"accuse","roles":{"agent":"goldsmith"},"voice":["poet"],"mood":"asserted","lines":["SIL-16-0145"],"quote":"கோயிற் சிலம்பு"}]'


def test_good_citation_is_kept_even_with_chatter_around_it():
    assert len(tier2.parse_answer("Sure! Here it is:\n" + GOOD, PART)[0]) == 1


def test_made_up_quote_is_dropped():
    bad = GOOD.replace("கோயிற் சிலம்பு", "இல்லாத சொல்")
    assert tier2.parse_answer(bad, PART)[0] == []


def test_line_outside_the_window_is_dropped():
    assert tier2.parse_answer(GOOD.replace("SIL-16-0145", "SIL-99-0001"), PART)[0] == []


def test_non_json_is_dropped():
    assert tier2.parse_answer("sorry, no", PART)[0] == []


def test_prompts_have_the_right_parts():
    assert "Known ids" in tier2.prompt_for(PART, "few") and "Worked examples" in tier2.prompt_for(PART, "few")
    masked = tier2.prompt_for(PART, "masked").split("Verse:")[-1]
    assert "NAME" in masked and "கோவலன்" not in masked


def test_examples_never_leak_from_test_cantos():
    shown = tier2.examples(PART, 40)
    assert shown and not any(c in shown for c in tier2.TEST_CANTOS)


def test_scorer_catches_a_false_fact():
    gold = [r for r in load("ledger.yaml") if r["id"] in ("a08", "a09")]
    fake = [{"mode": "zero", "sample": 0, "kind": "steal", "mood": "asserted", "lines": ["SIL-16-0145"], "roles": {"agent": "kovalan"}},
            {"mode": "few", "sample": 0, "kind": "steal", "mood": "claimed", "lines": ["SIL-16-0145"], "roles": {"agent": "kovalan"}}]
    result = scorer.evaluate(fake, gold)
    assert result["zero"]["traps_fallen"] == 1 and result["few"]["traps_fallen"] == 0


def test_usage_limit_stops_without_retrying(monkeypatch, tmp_path):
    import subprocess
    import pytest
    from manichchilambu import llm
    calls = []

    def limited(*args, **kwargs):
        calls.append(args)
        return subprocess.CompletedProcess(args, 1, "You've hit your limit · resets 10:50am", "")

    monkeypatch.setattr(llm, "CACHE", tmp_path)
    monkeypatch.setattr(llm.subprocess, "run", limited)
    with pytest.raises(RuntimeError, match="usage limit"):
        llm.ask("a prompt")
    assert len(calls) == 1 and not list(tmp_path.iterdir())


def test_dropped_connection_waits_and_recovers(monkeypatch, tmp_path):
    import subprocess
    from manichchilambu import llm
    replies = iter([subprocess.CompletedProcess([], 1, "API Error: Unable to connect to API (FailedToOpenSocket)", ""),
                    subprocess.CompletedProcess([], 1, "API Error: Unable to connect to API (FailedToOpenSocket)", ""),
                    subprocess.CompletedProcess([], 0, "an answer", "")])
    monkeypatch.setattr(llm, "CACHE", tmp_path)
    monkeypatch.setattr(llm, "OFFLINE_WAIT", 0)
    monkeypatch.setattr(llm.subprocess, "run", lambda *a, **k: next(replies))
    assert llm.ask("a prompt") == "an answer"


def test_network_that_stays_down_still_stops(monkeypatch, tmp_path):
    import subprocess
    import pytest
    from manichchilambu import llm
    calls = []

    def down(*a, **k):
        calls.append(1)
        return subprocess.CompletedProcess([], 1, "API Error: Unable to connect to API (FailedToOpenSocket)", "")

    monkeypatch.setattr(llm, "CACHE", tmp_path)
    monkeypatch.setattr(llm, "OFFLINE_WAIT", 0)
    monkeypatch.setattr(llm, "OFFLINE_TRIES", 2)
    monkeypatch.setattr(llm.time, "sleep", lambda s: None)
    monkeypatch.setattr(llm.subprocess, "run", down)
    with pytest.raises(RuntimeError, match="llm call failed"):
        llm.ask("a prompt")
    assert len(calls) == 5  # two waits, then the normal three tries



stage = _load("experiments/run_tier2_stage.py", "run_tier2_stage")
STAGE_GOLD = [{"lines": ["SIL-14-0066"], "roles": {"agent": "kovalan"}, "mood": "asserted"}, {"lines": ["SIL-14-0100"], "roles": {"agent": "kavunti"}, "mood": "claimed"}]


def test_stage_needs_the_same_line_and_a_shared_person():
    near_miss = [{"lines": ["SIL-14-0067"], "roles": {"agent": "kovalan"}, "mood": "asserted", "mode": "few"}]
    assert stage.recall(near_miss, STAGE_GOLD) == 0
    assert stage.recall([{**near_miss[0], "lines": ["SIL-14-0066"]}], STAGE_GOLD) == 0.5


def test_stage_says_no_go_when_notext_does_just_as_well():
    same = [{"lines": g["lines"], "roles": g["roles"], "mood": g["mood"]} for g in STAGE_GOLD]
    cands = [{**c, "mode": "few"} for c in same] + [{**c, "mode": "notext"} for c in same]
    report = stage.evaluate(cands, STAGE_GOLD)
    assert report["few_recall"] == 1 and report["verdict"] == "NO-GO" and not report["checks"]["beats_notext_by_0.10"]
