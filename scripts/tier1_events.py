"""
Tier 1d: a rough inventory of events across all 10,209 lines, using Tamil verb stems.

This is a net, not a catch. It says "something of this class may happen on this line", so a person or
the LLM tier knows where to look. Simple events count too, otherwise the benchmark only ever sees the
dramatic ones. Stems are matched inside words, since verse glues everything together.
"""
import json
import random
import re
from collections import Counter
from pathlib import Path

from manichchilambu.ledger import load
from manichchilambu.text import lines, nfc

ROOT = Path(__file__).resolve().parent.parent
CUES = {
    "give": r"கொடுத்|கொடுப்|அளித்|ஈந்த|ஈத்த|தந்த|தந்தேன்|தந்தான்|தந்தாள்",
    "take_receive": r"கொண்ட[னான்]|கொண்டாள்|பெற்றன|பெற்றாள்|பெற்றான்|வாங்கி",
    "speak": r"என்றான்|என்றாள்|என்றனன்|என்றனள்|உரைத்|உரைப்போ|கூறின|கூறும்|எனக்கூ|செப்பு",
    "move": r"சென்றா|சென்றன|போயின|புக்கா|புக்கன|புகுந்த|அடைந்த|வந்தா|வந்தன|எழுந்தா|எழுந்தன",
    "kill_harm": r"கொன்ற|கொல்வ|கொலை|எறிந்த|துணிய|வெட்டி|அறுத்த",
    "see": r"கண்டா|கண்டன|கண்டேன|நோக்கி",
    "feed": r"ஊட்டி|ஊண்|உண்பி|பசி தீர்|பசி களை|அமுதம்",
    "worship": r"வணங்கி|தொழுத|தொழுத|ஏத்தி|பரவி",
    "die": r"இறந்த|வீழ்ந்தன|மாண்ட|துஞ்சி|உயிர்பதிப்",
    "dream_curse": r"கனவ|கனா|சாபம்|சபித்",
}


def main():
    rows = lines()
    compiled = {k: re.compile(nfc(v)) for k, v in CUES.items()}
    inventory = []
    for row in rows:
        for cls, pat in compiled.items():
            if pat.search(row["text"].replace(" ", "")):
                inventory.append({"line": row["id"], "class": cls, "text": row["text"], "tier": 1})
    out = ROOT / "data" / "candidates"
    out.mkdir(exist_ok=True)
    with open(out / "tier1_events.jsonl", "w", encoding="utf-8") as f:
        for item in inventory:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    per_epic = Counter((i["line"][:3], i["class"]) for i in inventory)
    flagged = {i["line"] for i in inventory}
    print(f"{len(inventory)} candidates on {len(flagged)} of {len(rows)} lines")
    for cls in CUES:
        print(f"  {cls:14} SIL {per_epic[('SIL', cls)]:5}  MAN {per_epic[('MAN', cls)]:5}")
    # Recall: of the lines the ledger cites for things that really happen, how many does the net touch?
    told = [r for r in load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml") if r["mood"] == "asserted" and r["kind"] != "believe"]
    hit = sum(any(l in flagged for l in r["lines"]) for r in told)
    print(f"recall on {len(told)} told-straight ledger records: {hit / len(told):.2f}")
    # A fixed sample to read by hand, see docs for what I found.
    sample = random.Random(23).sample(inventory, 40)
    (ROOT / "reports" / "tier1_events_sample.json").write_text(json.dumps(sample, ensure_ascii=False, indent=0), encoding="utf-8")
    summary = {"candidates": len(inventory), "lines_flagged": len(flagged), "lines": len(rows), "recall": round(hit / len(told), 2),
               "per_class": {f"{e}/{c}": n for (e, c), n in per_epic.items()}}
    (ROOT / "reports" / "tier1_events.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    for item in sample:
        print(item["class"][:10].ljust(11), item["line"], item["text"][:56])


if __name__ == "__main__":
    main()
