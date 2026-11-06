"""The rules the whole method rests on. If one of these fails, every result in docs/ is suspect."""
from manichchilambu.compose import composed, expand, statements
from manichchilambu.ledger import Ledger, load, story
from manichchilambu.representations import LedgerRep
from manichchilambu.standards import Standards

RECORDS = load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml")
L = Ledger(RECORDS)


def test_a_claim_never_changes_the_world():
    # The goldsmith says Kovalan took the queen's anklet. The fold must still say the goldsmith has it.
    assert L.holder("ank_q", 16.5) == {"goldsmith"}


def test_a_lie_is_kept_as_something_said():
    assert L.find("steal", {"agent": "kovalan", "theme": "ank_q"}) and not L.find("steal", {"agent": "kovalan", "theme": "ank_q"}, policy=story)


def test_belief_changes_over_time():
    assert [L.belief("pandya_king", "a09", t) for t in (10, 16.5, 20.75)] == [None, "accept", "reject"]


def test_two_men_same_moment_different_heads():
    ids = {r["id"] for r in L.view("kanchanan", 20.4)}
    assert "b09" in ids and "b09" not in {r["id"] for r in L.view("udayakumaran", 20.4)}


def test_a_dream_changes_nothing():
    assert not L.find("slander", {"target": "kannagi"}, policy=story)


def test_rising_does_not_undo_death():
    assert L.find("rise", {"agent": "kovalan"}, policy=story) and not L.alive("kovalan", 19.6)


def test_composer_keeps_every_mood_that_matters():
    for full, kept in zip(sorted(RECORDS, key=lambda r: r["id"]), sorted(composed(RECORDS), key=lambda r: r["id"])):
        back = expand(kept)
        assert back["mood"] == full["mood"] and back["voice"] == full["voice"] and back["life"] == full["life"]


def test_composer_stores_less():
    assert sum(map(statements, composed(RECORDS))) < sum(map(statements, RECORDS))


def test_ledger_compiles_to_standards_without_losing_the_lie():
    rep = Standards(RECORDS)
    assert rep.happened("steal", {"agent": "goldsmith", "theme": "ank_q"}) and not rep.happened("steal", {"agent": "kovalan", "theme": "ank_q"})
    assert LedgerRep(RECORDS).holder("ank_q", 16.5) == rep.holder("ank_q", 16.5)
