"""
Pull statements for the Wikidata items I matched by hand from the search results, and save them.
Every fact comes out as scope=EXTERNAL. I then mark by hand whether a verse line backs it up.
"""
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "external" / "wikidata"
API = "https://www.wikidata.org/w/api.php"
HEADERS = {"User-Agent": "ManichchilambuResearch/0.1 (academic, local research script)"}
# Picked by reading the candidates. Left out on purpose: the Pandya king, because Wikidata has
# several Nedunjeliyans and nothing in the epic tells us which one, if any, this king is.
MATCHED = {"kannagi": "Q3115610", "kovalan": "Q6434829", "gajabahu": "Q5517531", "ilanko": "Q3032538",
           "epic_sil": "Q3115588", "epic_man": "Q1480970", "manimekalai_character": "Q60764140",
           "madurai": "Q228405", "kanchi": "Q212332", "puhar": "Q2135463"}


def get(params):
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(url, headers=HEADERS)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as err:
            if err.code != 429 or attempt == 3:
                raise
            time.sleep(int(err.headers.get("Retry-After", 60)) + 5)


def labels(ids):
    found = {}
    ids = sorted(ids)
    for i in range(0, len(ids), 40):
        data = get({"action": "wbgetentities", "ids": "|".join(ids[i:i + 40]), "props": "labels", "languages": "en"})
        for k, v in data["entities"].items():
            found[k] = v.get("labels", {}).get("en", {}).get("value", k)
        time.sleep(3)
    return found


def main():
    data = get({"action": "wbgetentities", "ids": "|".join(MATCHED.values()), "props": "claims|labels|sitelinks"})
    (OUT / "entities_raw.json").write_text(json.dumps(data, ensure_ascii=False))
    time.sleep(3)
    want, facts = set(), []
    for key, qid in MATCHED.items():
        ent = data["entities"][qid]
        for prop, claims in ent.get("claims", {}).items():
            for c in claims:
                val = c["mainsnak"].get("datavalue", {}).get("value")
                if isinstance(val, dict) and "id" in val:
                    facts.append({"entity": key, "qid": qid, "prop": prop, "value": val["id"]})
                    want |= {prop, val["id"]}
    names = labels(want)
    keep_out = {"instance of", "topic's main category", "Commons category", "country", "located in time zone", "described by source"}
    rows = [{**f, "prop_label": names.get(f["prop"], f["prop"]), "value_label": names.get(f["value"], f["value"]), "scope": "EXTERNAL", "text_support": None}
            for f in facts]
    rows = [r for r in rows if r["prop_label"] not in keep_out]
    (OUT / "facts.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    for k, qid in MATCHED.items():
        tamil = data["entities"][qid].get("sitelinks", {}).get("tawiki", {}).get("title")
        print(f"{k} {qid} ta:{tamil}")
    for r in rows:
        if r["entity"] in ("kannagi", "kovalan", "manimekalai_character", "gajabahu", "epic_sil", "epic_man", "ilanko"):
            print(f"  {r['entity']:22}{r['prop_label'][:28]:30}{r['value_label'][:40]}")


if __name__ == "__main__":
    main()
