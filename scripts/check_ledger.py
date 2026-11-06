"""
Check the hand ledger against the actual text.

Rule: every cited line must exist, and the `check` phrase must really appear in
the cited lines (spaces ignored, because editors split Tamil words differently).
Anything that fails here is a wrong citation, however good the story sounds.
"""
import sys
from pathlib import Path

import yaml

from manichchilambu.text import line_text, squash

ROOT = Path(__file__).resolve().parent.parent
TEXT = line_text()


def main(paths):
    bad = total = 0
    for p in paths:
        for rec in yaml.safe_load(Path(p).read_text(encoding="utf-8")):
            total += 1
            missing = [l for l in rec["lines"] if l not in TEXT]
            if missing:
                print(f"{rec['id']}: no such line {missing}")
                bad += 1
                continue
            joined = squash("".join(TEXT[l] for l in rec["lines"]))
            if squash(rec["check"]) not in joined:
                print(f"{rec['id']}: phrase not found: {rec['check']}")
                print("    " + " / ".join(TEXT[l] for l in rec["lines"]))
                bad += 1
    print(f"{total} records checked, {bad} bad")
    return bad


if __name__ == "__main__":
    sys.exit(1 if main(sys.argv[1:] or [str(ROOT / "data/seeds/ledger.yaml")]) else 0)
