"""The claim checker in scripts/ask_llm.py, with no model: hand-written answers that break each rule."""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("ask_llm", ROOT / "scripts/ask_llm.py")
ask_llm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ask_llm)


def rec(eid, cls, en):
    return {"evidence_id": eid, "evidence_class": cls, "mood": "asserted" if cls == "happened" else "claimed", "voice_chain": ["poet"], "story_time": 16.1,
            "supported_proposition": {"en": en, "ta": ""}, "lines": [{"id": "SIL-16-0001", "text": "x"}], "caveat": None}


PACKAGE = {
    "question": "Did Kovalan steal the queen's anklet?",
    "records": [rec("a06", "said", "The goldsmith says Kovalan stole the queen's anklet."), rec("a22", "happened", "The king sees the gem and knows the accusation was false.")],
    "lines": [{"evidence_id": "SIL-16-0145", "text": "y", "gist": "the goldsmith speaks"}],
    "drafts": [],
}


def claims(*items):
    return {"answer_en": "", "answer_ta": "", "claims": [dict(text_en=t, stance=s, evidence=e) for t, s, e in items]}


def test_an_accusation_given_as_fact_is_dropped():
    kept, dropped = ask_llm.check(PACKAGE, claims(("Kovalan stole the queen's anklet.", "fact", ["a06"])))
    assert not kept and "given as fact" in dropped[0]["problems"][0]


def test_the_same_accusation_attributed_is_kept():
    kept, _ = ask_llm.check(PACKAGE, claims(("The goldsmith claims Kovalan stole it.", "said", ["a06"])))
    assert len(kept) == 1


def test_a_claim_that_hides_whose_it_is_is_dropped():
    _, dropped = ask_llm.check(PACKAGE, claims(("Kovalan stole it.", "said", ["a06"])))
    assert "doesn't say whose" in dropped[0]["problems"][0]


def test_a_fact_resting_on_a_fact_record_is_kept():
    kept, _ = ask_llm.check(PACKAGE, claims(("The king learns the accusation was false.", "fact", ["a22"])))
    assert len(kept) == 1


def test_made_up_evidence_is_dropped():
    _, dropped = ask_llm.check(PACKAGE, claims(("The queen forgave him.", "fact", ["zz9"])))
    assert "isn't in the package" in dropped[0]["problems"][0]


def test_a_line_alone_cannot_answer():
    _, dropped = ask_llm.check(PACKAGE, claims(("The goldsmith speaks.", "fact", ["SIL-16-0145"])))
    assert "may point but not answer" in dropped[0]["problems"][0]


def test_saying_what_is_unknown_needs_no_evidence():
    kept, _ = ask_llm.check(PACKAGE, claims(("The text never says who made the anklet.", "unknown", [])))
    assert len(kept) == 1


def test_the_prompt_carries_the_contract_and_the_evidence():
    p = ask_llm.writer_prompt(PACKAGE)
    assert "Never turn an accusation into an event" in p and "a06" in p and "Did Kovalan steal" in p
