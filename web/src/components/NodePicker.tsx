import { useId, useRef, useState } from "react";
import { useApp, useT } from "../lib/app";
import type { GraphNode } from "../lib/types";
import { EntityIcon } from "./Marks";

/** Type a name, pick from what matches. A 260-item dropdown is no way to find one person. */
export function NodePicker({ nodes, value, onPick, empty, label }: {
  nodes: GraphNode[]; value: string; onPick: (id: string) => void;
  /** Allow picking nobody: [what the box shows, what the list says]. Without it, someone must be picked. */
  empty?: [string, string]; label: string;
}) {
  const { lang } = useApp();
  const t = useT();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const first = empty ? 1 : 0; // where the real names start in the keyboard order
  const current = nodes.find((n) => n.id === value);
  const q = text.trim().toLowerCase();
  // Best match first: the name itself, then a name that starts with it, then one that contains it, then an alias.
  const rank = (n: GraphNode) => {
    const en = n.en.toLowerCase().replace(/^the /, ""), ta = n.ta, raw = text.trim();
    if (en === q || ta === raw) return 0;
    if (en.startsWith(q) || ta.startsWith(raw)) return 1;
    if (en.includes(q) || ta.includes(raw)) return 2;
    return n.also.some((a) => a.toLowerCase() === q) ? 2.5 : n.also.some((a) => a.toLowerCase().includes(q)) ? 3 : 9;
  };
  const hits = (q ? nodes.map((n) => [n, rank(n)] as const).filter(([, r]) => r < 9).sort((x, y) => x[1] - y[1]).map(([n]) => n) : nodes).slice(0, 40);
  const choose = (id: string) => { onPick(id); setText(""); setOpen(false); };
  return (
    <div className="combo" ref={box} onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <input value={open ? text : current?.[lang] ?? empty?.[0] ?? ""} onFocus={() => { setOpen(true); setText(""); setAt(0); }}
        // After a pick the box keeps focus with the list closed, so a click or a keystroke must open it again.
        onClick={() => { if (!open) { setOpen(true); setText(""); setAt(0); } }}
        onChange={(e) => { setText(open ? e.target.value : (e.nativeEvent as InputEvent).data ?? ""); setAt(0); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setAt((i) => Math.min(i + 1, hits.length - 1 + first)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setAt((i) => Math.max(i - 1, 0)); }
          if (e.key === "Enter") { e.preventDefault(); if (!open) return; const id = empty && at === 0 ? "" : hits[at - first]?.id; if (id !== undefined) choose(id); }
          if (e.key === "Escape") setOpen(false);
        }}
        role="combobox" aria-expanded={open} aria-controls={listId} aria-label={label} placeholder={t("Type a name", "பெயரைத் தட்டச்சிடுக")} />
      {open && (
        <ul className="combo__list" id={listId} role="listbox">
          {empty && <li><button type="button" role="option" aria-selected={at === 0} onMouseDown={(e) => e.preventDefault()} onClick={() => choose("")}>{empty[1]}</button></li>}
          {hits.map((n, i) => <li key={n.id}><button type="button" role="option" aria-selected={at === i + first} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(n.id)}><EntityIcon cls={n.cls} id={n.id} kind={n.kind} size={14} />{n[lang]} <span className="fine" lang={lang === "ta" ? "en" : "ta"}>{lang === "ta" ? n.en : n.ta}</span></button></li>)}
          {!hits.length && <li className="fine" style={{ padding: "6px 10px" }}>{t("No one by that name", "அப்பெயரில் யாரும் இல்லை")}</li>}
        </ul>
      )}
    </div>
  );
}

