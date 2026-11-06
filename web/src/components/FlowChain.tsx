// A pan-and-zoom chain of records: React Flow draws it (xyflow/xyflow, MIT) and dagre lays it out (dagrejs/dagre, MIT).
// Solid arrows are causes the text states. Dashed ones only say "this comes next", which isn't the same claim.
import dagre from "@dagrejs/dagre";
import { Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { useApp } from "../lib/app";

export function FlowChain({ recs, selected, onPick }: { recs: string[]; selected: string | null; onPick: (id: string) => void }) {
  const { corpus, lang, dark } = useApp();
  const { nodes, edges, height } = useMemo(() => {
    const records = recs.map((id) => corpus.byId.get(id)).filter((r) => !!r);
    const links: Edge[] = [];
    records.forEach((r, i) => {
      const causes = (r.because ?? []).filter((b) => recs.includes(b.of));
      causes.forEach((b) => links.push({ id: `${b.of}-${r.id}`, source: b.of, target: r.id, label: b.rel.replace(/_/g, " "), animated: false, style: { strokeWidth: 1.6 } }));
      if (!causes.length && i > 0) links.push({ id: `${records[i - 1].id}-${r.id}`, source: records[i - 1].id, target: r.id, style: { strokeDasharray: "5 4", strokeWidth: 1.2 } });
    });
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "TB", nodesep: 26, ranksep: 34 });
    g.setDefaultEdgeLabel(() => ({}));
    const textOf = (id: string) => (lang === "ta" ? corpus.byId.get(id)!.ta : corpus.byId.get(id)!.en);
    const shortText = (id: string) => { const t = textOf(id); return t.length > 150 ? `${t.slice(0, 146).trimEnd()}...` : t; };
    records.forEach((r) => g.setNode(r.id, { width: 380, height: 30 + Math.ceil(shortText(r.id).length / 54) * 20 }));
    links.forEach((e) => g.setEdge(e.source, e.target));
    dagre.layout(g);
    const placed: Node[] = records.map((r) => {
      const p = g.node(r.id);
      return { id: r.id, position: { x: p.x - p.width / 2, y: p.y - p.height / 2 }, data: { label: shortText(r.id) }, selected: r.id === selected, draggable: false, connectable: false,
        className: r.mood === "asserted" ? "" : "flow--said", sourcePosition: "bottom", targetPosition: "top" } as Node;
    });
    return { nodes: placed, edges: links, height: Math.min(1400, g.graph().height ?? 400) + 50 };
  }, [recs, corpus, lang, selected]);
  // Tall enough to read at full size. The wheel keeps scrolling the page, so nobody gets stuck inside the diagram.
  return (
    <div className="flow" style={{ height }}>
      <ReactFlow key={recs.join()} nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.06, maxZoom: 1 }} minZoom={0.3} maxZoom={1.6} nodesDraggable={false} nodesConnectable={false} zoomOnScroll={false} preventScrolling={false} panOnScroll={false} colorMode={dark ? "dark" : "light"} onNodeClick={(_, n) => onPick(n.id)} proOptions={{ hideAttribution: false }}>
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
