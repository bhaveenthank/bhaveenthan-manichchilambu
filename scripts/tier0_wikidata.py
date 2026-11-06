"""
Tier 0, external half: look up our entities on Wikidata and save the raw responses.

These are only proposals. A Wikidata fact never counts as evidence from the text. It gets
written out with scope=EXTERNAL and stays that way unless a verse line backs it up.
"""
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "external" / "wikidata"
API = "https://www.wikidata.org/w/api.php"
HEADERS = {"User-Agent": "ManichchilambuResearch/0.1 (academic, local research script)"}

# English search terms. I keep these by hand because the seed labels have notes in brackets.
TERMS = {
    "kannagi": "Kannagi", "kovalan": "Kovalan", "madhavi": "Madhavi (Silappatikaram)", "manimekalai": "Manimekalai",
    "pandya_king": "Nedunjeliyan I", "cenkuttuvan": "Cheran Senguttuvan", "gajabahu": "Gajabahu I",
    "ilanko": "Ilango Adigal", "cattan": "Sithalai Sathanar", "puhar": "Poompuhar", "madurai": "Madurai",
    "vanci": "Vanchi", "kanchi": "Kanchipuram", "manipallavam": "Manipallavam", "epic_sil": "Silappatikaram",
    "epic_man": "Manimekalai epic", "aputhiran": "Aputhiran",
}


def get(params):
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(url, headers=HEADERS)
    # Wikidata rate-limits politely. If it says slow down, we wait as long as it asks.
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as err:
            if err.code != 429 or attempt == 3:
                raise
            time.sleep(int(err.headers.get("Retry-After", 60)) + 5)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    table = {}
    for key, term in TERMS.items():
        hits = get({"action": "wbsearchentities", "search": term, "language": "en", "limit": 5})
        (OUT / f"search_{key}.json").write_text(json.dumps(hits, ensure_ascii=False, indent=1), encoding="utf-8")
        table[key] = [{"qid": h["id"], "label": h.get("label"), "desc": h.get("description")} for h in hits.get("search", [])]
        time.sleep(4)
    (OUT / "candidates.json").write_text(json.dumps(table, ensure_ascii=False, indent=1), encoding="utf-8")
    for key, hits in table.items():
        print(key, "|", "; ".join(f"{h['qid']} {h['label']} ({h['desc']})" for h in hits[:3])[:170])


if __name__ == "__main__":
    main()
