// A numbered hexagon for step-by-step explanations. Pass a number, or nothing for the check mark on the last step.
export function Hex({ n }: { n?: number }) {
  return (
    <svg width="76" height="84" viewBox="0 0 76 84" aria-hidden="true">
      <path d="M38 2 74 22v40L38 82 2 62V22z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2 56 38 76l36-20v6L38 82 2 62z" fill={n ? "var(--accent-soft)" : "var(--copper)"} />
      {n ? <text x="38" y="50" textAnchor="middle" className="hex__n">{n}</text> : <path d="M23 42l11 11 20-23" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
