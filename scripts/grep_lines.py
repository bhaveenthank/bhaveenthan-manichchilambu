"""Search the corpus. Usage: grep_lines.py 'regex' [max_hits]. Prints id and text of matching lines."""
import re
import sys

from manichchilambu.text import lines, nfc

rows = lines()
pat = re.compile(nfc(sys.argv[1]))
limit = int(sys.argv[2]) if len(sys.argv) > 2 else 12
hits = [r for r in rows if pat.search(r["text"])]
print(f"-- {sys.argv[1]}: {len(hits)} hits")
for r in hits[:limit]:
    print(r["id"], r["text"])
