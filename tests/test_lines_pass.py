"""Offline checks for the every-line pass: no line can fall between calls, and a skipped line shows up."""
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("tier2_lines", ROOT / "scripts/tier2_lines.py")
lines_pass = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lines_pass)


def test_every_line_is_a_target_exactly_once():
    jobs = lines_pass.windows(set(lines_pass.TEXT))
    seen = [lid for _, wanted in jobs for lid in wanted]
    assert len(seen) == len(set(seen)) == len(lines_pass.TEXT) == 10209


def test_targets_are_inside_their_window():
    for part, wanted in lines_pass.windows(set(lines_pass.TEXT)):
        assert wanted <= {l["id"] for l in part}


def test_a_skipped_line_is_reported():
    part, wanted = lines_pass.windows({"SIL-16-0026", "SIL-16-0027"})[0]
    answer = json.dumps([{"type": "line_note", "line": "SIL-16-0026", "what": "list", "categories": ["FOOD", "NOT_A_CATEGORY"], "sense": "literal", "gist": "fruit"}])
    notes, _, _, missed = lines_pass.check(answer, part, wanted, notes_only=True)
    assert missed == ["SIL-16-0027"]
    assert notes[0]["categories"] == ["FOOD"]


def test_a_note_for_a_context_line_is_refused():
    part, wanted = lines_pass.windows({"SIL-16-0027"})[0]
    answer = json.dumps([{"type": "line_note", "line": "SIL-16-0026", "what": "list", "categories": [], "sense": "literal", "gist": "x"}])
    notes, _, bad, missed = lines_pass.check(answer, part, wanted, notes_only=True)
    assert not notes and bad and missed == ["SIL-16-0027"]
