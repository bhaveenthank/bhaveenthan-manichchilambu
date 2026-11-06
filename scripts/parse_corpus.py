"""
Turn the four Project Madurai HTML files into one clean table of verse lines.

Output: data/corpus/lines.jsonl, one JSON object per line of verse, plus
data/corpus/cantos.csv with a per-canto summary and the numbering check.

The important thing here is the line id, e.g. SIL-16-0107 or MAN-20-0045.
Every fact in the graph will point back at these ids, so they have to be stable
and they have to match what the editions print. The editions print a number
every 5 or 10 lines, so we count lines ourselves and compare against those.
"""
import csv
import hashlib
import html
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "corpus"

# Canto tables. I list titles by hand because the heading markup differs from
# file to file (canto 9 of Manimekalai has no number at all). Each title has to
# be found in order, after the previous one, otherwise we stop loudly.
SIL_FILES = [
    ("pmuni0046.html", "புகார்", [
        (0, "பதிகம்"), (1, "மங்கல வாழ்த்துப் பாடல்"), (2, "மனையறம்படுத்த காதை"),
        (3, "அரங்கேற்று காதை"), (4, "அந்திமாலைச் சிறப்புசெய் காதை"),
        (5, "இந்திர விழவு ஊர் எடுத்த காதை"), (6, "கடலாடு காதை"), (7, "கானல் வரி"),
        (8, "வேனில் காதை"), (9, "கனாத்திறம் உரைத்த காதை"), (10, "நாடுகாண் காதை"),
    ]),
    ("pmuni0111_01.html", "மதுரை", [
        (11, "காடுகாண் காதை"), (12, "வேட்டுவ வரி"), (13, "புறஞ்சேரியிறுத்த காதை"),
        (14, "ஊர்காண் காதை"), (15, "அடைக்கலக் காதை"), (16, "கொலைக்களக் காதை"),
        (17, "ஆய்ச்சியர் குரவை"), (18, "துன்ப மாலை"), (19, "ஊர்சூழ் வரி"),
        (20, "வழக்குரை காதை"), (21, "வஞ்சின மாலை"), (22, "அழற்படு காதை"),
        (23, "கட்டுரை காதை"),
    ]),
    ("pmuni0111_02.html", "வஞ்சி", [
        (24, "குன்றக் குரவை"), (25, "காட்சிக் காதை"), (26, "கால்கோட் காதை"),
        (27, "நீர்ப்படைக் காதை"), (28, "நடுகற் காதை"), (29, "வாழ்த்துக் காதை"),
        (30, "வரந்தரு காதை"), (31, "கட்டுரை"), (32, "நூற் கட்டுரை"),
    ]),
]
MAN_TITLES = [
    (1, "விழாவறை காதை"), (2, "ஊரலர் உரைத்த காதை"), (3, "மலர்வனம் புக்க காதை"),
    (4, "பளிக்கறை புக்ககாதை"), (5, "மணிமேகலா தெய்வம் வந்து தோன்றிய காதை"),
    (6, "சக்கரவாளக் கோட்டம் உரைத்த காதை"), (7, "துயிலெழுப்பிய காதை"),
    (8, "மணிபல்லவத்துத் துயருற்ற காதை"), (9, "பீடிகை கண்டு பிறப்புணர்ந்த காதை"),
    (10, "மந்திரம் கொடுத்த காதை"), (11, "பாத்திரம் பெற்ற காதை"),
    (12, "அறவணர்த் தொழுத கதை"), (13, "ஆபுத்திரன் திறம் அறிவித்த காதை"),
    (14, "பாத்திர மரபு கூறிய காதை"), (15, "பாத்திரம் கொண்டு பிச்சை புக்க காதை"),
    (16, "ஆதிரை பிச்சையிட்ட காதை"), (17, "உலக அறவி புக்க காதை"),
    (18, "உதயகுமரன் அம்பலம் புக்க காதை"), (19, "சிறைக்கோட்டம் அறக்கோட்டம் ஆக்கிய காதை"),
    (20, "உதயகுமரனைக் காஞ்சனன் வாளால் எறிந்த காதை"), (21, "கந்திற்பாவை வருவது உரைத்த காதை"),
    (22, "சிறை செய் காதை"), (23, "சிறை விடு காதை"), (24, "ஆபுத்திரன் நாடு அடைந்த காதை"),
    (25, "ஆபுத்திரனோடு மணிபல்லவம் அடைந்த காதை"), (26, "வஞ்சி மாநகர் புக்க காதை"),
    (27, "சமயக் கணக்கர் தம் திறம் கேட்ட காதை"), (28, "கச்சி மாநகர் புக்க காதை"),
    (29, "தவத்திறம் பூண்டு தருமம் கேட்ட காதை"), (30, "பவத்திறம் அறுகெனப் பாவை நோற்ற காதை"),
]
# Manimekalai's patikam has no heading of its own, it starts right after the
# main title in the blue h2 block. Treat that as the start of canto 0.
MAN_FILE = ("pmuni0141.html", "", [(0, "மணிமேகலை")] + MAN_TITLES)

TAMIL = re.compile(r"[஀-௿]")
TAG = re.compile(r"<[^>]+>")


def find_sections(text, titles):
    """Find where each canto starts. A real heading has an <h2>/<h3> tag just before it."""
    spots = []
    # Two files carry a table of contents that repeats every title. Skip past it.
    toc = text.find("உள்ளுரை")
    pos = toc + len("உள்ளுரை") if toc >= 0 else 0
    for canto, title in titles:
        plain = unicodedata.normalize("NFC", TAG.sub(" ", title).strip())
        pattern = r"\s+".join(map(re.escape, plain.split()))
        found = None
        for m in re.finditer(pattern, text[pos:]):
            before = text[max(pos, pos + m.start() - 80):pos + m.start()]
            if re.search(r"<h[23]", before, re.I):
                found = (pos + m.start(), pos + m.end())
                break
        if found is None:
            raise SystemExit(f"could not find canto heading: {title}")
        spots.append((canto, plain, found[0], found[1]))
        pos = found[1]
    return spots


def clean_line(raw):
    """Strip markup and return (text, printed_number or None)."""
    marker = None
    m = re.search(r"<td[^>]*valign=bottom[^>]*>\s*(?:\d\d-)?0*(\d+)", raw, re.I)
    if m:
        marker = int(m.group(1))
    s = TAG.sub(" ", raw)
    s = html.unescape(s).replace("\xa0", " ")
    # Puhar kandam prints the number at the end of the line with nbsp padding.
    if marker is None:
        m = re.search(r"\s{3,}(\d{1,3})\s*$", s)
        if m:
            marker = int(m.group(1))
            s = s[:m.start()]
    # Strip the printed number off the text: "... 14-060" or "... 15".
    s = re.sub(r"\s+(?:\d\d-)?\d{1,4}\s*$", "", s) if marker is not None else s
    s = unicodedata.normalize("NFC", " ".join(s.split()))
    return s, marker


def split_units(segment):
    """Break a canto's html into candidate lines at br/p/tr boundaries."""
    # The number cell belongs to the line before it, so glue "<td ...>5" on first.
    segment = re.sub(r"\s*\n\s*(<td[^>]*valign=bottom)", r" \1", segment, flags=re.I)
    return re.split(r"<br\s*/?>|<p\s*/?>|</tr>|\n", segment, flags=re.I)


def is_note(s):
    """Metre labels like (நிலைமண்டில ஆசிரியப்பா) or end notes, not verse."""
    return s.startswith("(") and s.endswith(")")


def parse(epic, fname, kandam, titles, rows, summary):
    # Vowel signs like கோ can be stored in two ways in Unicode. NFC makes them one
    # way, otherwise plain string matching quietly misses names.
    text = unicodedata.normalize("NFC", (RAW / fname).read_text(encoding="utf-8-sig"))
    spots = find_sections(text, titles)
    for i, (canto, title, start, end) in enumerate(spots):
        stop = spots[i + 1][2] if i + 1 < len(spots) else len(text)
        seq = 0
        checks = []
        metres = []
        for unit in split_units(text[end:stop]):
            s, marker = clean_line(unit)
            if not s or not TAMIL.search(s):
                continue
            if is_note(s) or "முற்றிற்று" in s:
                # Metre labels aren't verse, but the app can sort songs by them, so keep them here.
                if is_note(s) and s.strip("()").endswith(("பா", "பாக்கள்", "வெண்பா")) and s.strip("()") not in metres:
                    metres.append(s.strip("()"))
                continue
            seq += 1
            rows.append({
                "id": f"{epic}-{canto:02d}-{seq:04d}", "epic": epic, "kandam": kandam,
                "canto": canto, "canto_title": title, "line": seq,
                "printed": marker, "text": s,
            })
            if marker is not None:
                checks.append((seq, marker))
        drift = [s - m for s, m in checks]
        summary.append({
            "epic": epic, "canto": canto, "title": title, "lines": seq,
            "markers": len(checks), "last_printed": checks[-1][1] if checks else "",
            "max_abs_drift": max((abs(d) for d in drift), default=""),
            "final_drift": drift[-1] if drift else "",
            "metres": " | ".join(metres),
        })


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows, summary = [], []
    for fname, kandam, titles in SIL_FILES:
        parse("SIL", fname, kandam, titles, rows, summary)
    fname, kandam, titles = MAN_FILE
    parse("MAN", fname, kandam, titles, rows, summary)
    with open(OUT / "lines.jsonl", "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    with open(OUT / "cantos.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(summary[0]))
        w.writeheader()
        w.writerows(summary)
    manifest = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(RAW.glob("*.html"))}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))
    print(f"{len(rows)} lines, {len(summary)} cantos")


if __name__ == "__main__":
    main()
