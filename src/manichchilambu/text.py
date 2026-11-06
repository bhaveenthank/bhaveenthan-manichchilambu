"""Shared helpers for reading the corpus, so every script loads and normalises text the same way."""
import json
import unicodedata
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]


def nfc(s):
    return unicodedata.normalize("NFC", s)


def squash(s):
    """Drop spaces. Editors split Tamil words differently, so comparisons must not depend on it."""
    return nfc(s).replace(" ", "")


def lines():
    with open(ROOT / "data/corpus/lines.jsonl", encoding="utf-8") as f:
        return [json.loads(row) for row in f]


def line_text():
    return {row["id"]: row["text"] for row in lines()}


def entities():
    return yaml.safe_load((ROOT / "data/seeds/entities.yaml").read_text(encoding="utf-8"))


def mentions():
    return json.loads((ROOT / "data/corpus/mentions.json").read_text(encoding="utf-8"))
