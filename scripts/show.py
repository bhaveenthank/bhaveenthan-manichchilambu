"""Print a range of verse lines. Usage: show.py SIL-16 90 222  (or show.py SIL-16 for the whole canto)."""
import sys

from manichchilambu.text import lines

rows = lines()
prefix = sys.argv[1]
lo = int(sys.argv[2]) if len(sys.argv) > 2 else 0
hi = int(sys.argv[3]) if len(sys.argv) > 3 else 10**6
for r in rows:
    if r["id"].startswith(prefix) and lo <= r["line"] <= hi:
        print(r["line"], r["text"])
