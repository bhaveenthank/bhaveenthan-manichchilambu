#!/usr/bin/env bash
# Usage: compile.sh <latex_dir> [basename=paper]
# Builds <latex_dir>/<basename>.tex -> PDF (latexmk, falls back to pdflatex+bibtex) and prints a health report.
set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIR="${1:?latex dir}"; NAME="${2:-paper}"
cd "$DIR" || exit 1
if command -v latexmk >/dev/null; then
  latexmk -xelatex -interaction=nonstopmode -halt-on-error -file-line-error "$NAME.tex" >/dev/null 2>&1
else
  pdflatex -interaction=nonstopmode -file-line-error "$NAME.tex" >/dev/null 2>&1
  bibtex "$NAME" >/dev/null 2>&1
  pdflatex -interaction=nonstopmode -file-line-error "$NAME.tex" >/dev/null 2>&1
  pdflatex -interaction=nonstopmode -file-line-error "$NAME.tex" >/dev/null 2>&1
fi
LOG="$NAME.log"
echo "== Build: $( [ -f "$NAME.pdf" ] && echo "PDF OK ($DIR/$NAME.pdf)" || echo "NO PDF" )"
echo "== Errors:";               grep -nE '^(\./)?[^:]+\.tex:[0-9]+:|^! ' "$LOG" 2>/dev/null | head -20
echo "== Undefined citations:";  grep -oE "Citation \`[^']+' .*undefined" "$LOG" 2>/dev/null | sort -u | head -20
echo "== Undefined references:"; grep -oE "Reference \`[^']+' .*undefined" "$LOG" 2>/dev/null | sort -u | head -20
echo "== Missing files:";        grep -E "File \`[^']+' not found|LaTeX Error: File" "$LOG" 2>/dev/null | head
echo "== Overfull boxes: $(grep -c 'Overfull \\hbox' "$LOG" 2>/dev/null || true)"
grep -A1 'Overfull \\hbox' "$LOG" 2>/dev/null | grep -oE 'at lines? [0-9-]+' | head -5
[ -f "$NAME.blg" ] && grep -iE 'warning|error' "$NAME.blg" | head -5
TOTAL=$(grep -oE 'Output written on .*\(([0-9]+) pages?' "$LOG" | grep -oE '[0-9]+ page' | grep -oE '[0-9]+')
REFP=$(grep -oE '\\newlabel\{po_refstart\}\{\{[^}]*\}\{[0-9]+\}' "$NAME.aux" 2>/dev/null | grep -oE '[0-9]+\}$' | tr -d '}')
[ -z "$REFP" ] && REFP='unknown (add \label{po_refstart} on the line before \bibliography)'
echo "== Pages: ${TOTAL:-?} total; main text through References start: $REFP"
