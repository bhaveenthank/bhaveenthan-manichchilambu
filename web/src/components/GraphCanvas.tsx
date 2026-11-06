import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import louvain from "graphology-communities-louvain";
import noverlap from "graphology-layout-noverlap";
import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import Sigma from "sigma";
import { useApp, useName } from "../lib/app";
import { classColour, classStyle, FAMILY, familyOf, type Shape } from "../lib/icons";
import type { Subgraph } from "../lib/model";

export { classColour };
// Louvain clusters get their colours from the same list. They change between filters, so they never mean "this class".
const CLUSTER_ORDER = ["Person", "Deity", "Place", "Object", "Group", "Material", "Food"];

/** Class shapes, drawn on our own canvas so a class reads by shape as well as by colour (Bertin: two channels, one meaning). */
function tracePath(ctx: CanvasRenderingContext2D, shape: Shape, x: number, y: number, r: number) {
  const poly = (n: number, turn: number, scale = 1) => {
    for (let i = 0; i < n; i++) {
      const a = turn + (i / n) * Math.PI * 2;
      const px = x + Math.cos(a) * r * scale, py = y + Math.sin(a) * r * scale;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  };
  ctx.beginPath();
  if (shape === "circle") ctx.arc(x, y, r, 0, Math.PI * 2);
  else if (shape === "dot") ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  else if (shape === "square") ctx.rect(x - r * 0.88, y - r * 0.88, r * 1.76, r * 1.76);
  else if (shape === "hexagon") poly(6, 0, 1.05);
  else if (shape === "triangle") poly(3, -Math.PI / 2, 1.25);
  else if (shape === "down") poly(3, Math.PI / 2, 1.25);
  else if (shape === "diamond") poly(4, -Math.PI / 2, 1.2);
  else poly(5, -Math.PI / 2, 1.1);
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

interface Props {
  data: Subgraph;
  selected?: string | null;
  selectedEdge?: string | null;
  onNode?: (id: string | null) => void;
  onEdge?: (rec: string) => void;
  /** In a big graph, only links touching this node can be clicked, so a near miss on a node doesn't open a link. */
  edgeOf?: string | null;
  compact?: boolean;
  /** Spread the small graphs out and name every edge, since there's room. */
  edgeLabels?: boolean;
  /** Colour by clusters the graph finds for itself, instead of by class. */
  clusters?: boolean;
  ariaLabel: string;
}

/** Stable start positions, so the same data lays out the same way every time. */
function hash(s: string) { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; }

/**
 * Force layouts fling unconnected pieces far apart, and the camera then shrinks the main cluster to fit them.
 * So keep the biggest piece in the middle and place the small ones in a ring close around it.
 */
function packComponents(g: Graph) {
  const seen = new Set<string>();
  const parts: string[][] = [];
  g.forEachNode((start) => {
    if (seen.has(start)) return;
    const part: string[] = [];
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const cur = queue.pop()!;
      part.push(cur);
      g.forEachNeighbor(cur, (n) => { if (!seen.has(n)) { seen.add(n); queue.push(n); } });
    }
    parts.push(part);
  });
  if (parts.length < 2) return;
  parts.sort((a, b) => b.length - a.length);
  const boxes = parts.map((part) => {
    const xs = part.map((n) => g.getNodeAttribute(n, "x")), ys = part.map((n) => g.getNodeAttribute(n, "y"));
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    return { part, cx, cy, r: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 };
  });
  const main = boxes[0];
  const ring = main.r * 1.12 + Math.max(...boxes.slice(1).map((b) => b.r)) + 10;
  boxes.forEach((b, i) => {
    const angle = i === 0 ? 0 : ((i - 1) / (boxes.length - 1)) * Math.PI * 2 + 0.6;
    const tx = i === 0 ? 0 : Math.cos(angle) * ring, ty = i === 0 ? 0 : Math.sin(angle) * ring;
    b.part.forEach((n) => {
      g.setNodeAttribute(n, "x", g.getNodeAttribute(n, "x") - b.cx + tx);
      g.setNodeAttribute(n, "y", g.getNodeAttribute(n, "y") - b.cy + ty);
    });
  });
}

export function GraphCanvas({ data, selected, selectedEdge, onNode, onEdge, edgeOf, compact, edgeLabels, clusters, ariaLabel }: Props) {
  const { corpus, lang, dark } = useApp();
  const name = useName();
  const box = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const state = useRef({ selected, selectedEdge, hovered, lang });
  state.current = { selected, selectedEdge, hovered, lang };
  const handlers = useRef({ onNode, onEdge, edgeOf });
  handlers.current = { onNode, onEdge, edgeOf };
  const key = useMemo(() => JSON.stringify([data.nodes.slice().sort(), data.edges.map((e) => e.rec + e.s + e.t).sort(), data.suggested.length]), [data]);

  const graph = useMemo(() => {
    const g = new Graph({ multi: true, type: "undirected" });
    const edgeColour = { done: css("--edge-done"), said: css("--edge-said"), hint: css("--edge-hint"), under: css("--line") };
    const surface = css("--surface");
    data.nodes.forEach((id) => {
      const n = corpus.nodeById.get(id);
      const h = hash(id);
      const angle = ((h % 360) * Math.PI) / 180;
      const radius = 10 + Math.abs(h % 90);
      // Sigma draws a surface-coloured disc (for hit testing and a halo over the edges); the shape on top is ours.
      g.addNode(id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, size: 4, color: surface, fill: classColour(n?.cls ?? "Other", dark), shape: classStyle(n?.cls ?? "Other").shape, isKind: !!n?.kind, bridge: (n?.epics.length ?? 0) > 1 });
    });
    data.edges.forEach((e, i) => {
      if (g.hasNode(e.s) && g.hasNode(e.t) && e.s !== e.t) {
        const done = e.mood === "asserted";
        // Anything not told as fact gets a faint base line here and its family's dash on the overlay.
        g.addEdgeWithKey(`${e.rec}:${i}`, e.s, e.t, { size: done ? 1.6 : 1.4, color: done ? edgeColour.done : edgeColour.under, rec: e.rec, kind: e.kind, done, family: familyOf(e.mood) });
      }
    });
    data.suggested.forEach((s, i) => { if (g.hasNode(s.s) && g.hasNode(s.t)) g.addEdgeWithKey(`hint:${i}`, s.s, s.t, { size: 0.8, color: edgeColour.hint, hint: true }); });
    g.forEachNode((id) => {
      const base = compact ? 5 : 4;
      const mentions = corpus.nodeById.get(id)?.mentions ?? 0;
      g.setNodeAttribute(id, "size", Math.min(compact ? 10 : 15, base + Math.sqrt(g.degree(id)) * 1.3 + Math.sqrt(mentions) * 0.25));
    });
    if (g.order > 1) {
      const settings = forceAtlas2.inferSettings(g);
      forceAtlas2.assign(g, { iterations: g.order > 60 ? 260 : 180, settings: { ...settings, gravity: compact ? 2 : 0.5, scalingRatio: compact ? 14 : g.order > 60 ? 90 : 30, strongGravityMode: false, adjustSizes: false, linLogMode: false } });
      noverlap.assign(g, { maxIterations: g.order > 60 ? 200 : 80, settings: { margin: compact ? 16 : g.order > 60 ? 14 : 8, ratio: 1.3 } });
      packComponents(g);
    }
    if (clusters && g.size > 0) {
      const found = louvain(g, { randomWalk: false });
      g.forEachNode((id) => g.setNodeAttribute(id, "fill", classColour(CLUSTER_ORDER[found[id] % CLUSTER_ORDER.length], dark)));
    }
    return g;
    // The key stands in for data: rebuilding on every parent render would throw the layout away.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, corpus, compact, dark, clusters]);

  const edgeEnds = (rec: string | null | undefined): string[] => {
    if (!rec) return [];
    const e = graph.findEdge((_, a) => a.rec === rec);
    return e ? graph.extremities(e) : [];
  };

  // Labels live on our own canvas. The browser shapes Tamil properly there, and we decide who gets drawn.
  const drawLabels = useRef(() => {});
  drawLabels.current = () => {
    const sigma = sigmaRef.current, canvas = overlay.current;
    if (!sigma || !canvas || !box.current) return;
    const { width, height } = box.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== width * dpr) { canvas.width = width * dpr; canvas.height = height * dpr; }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const { selected: sel, selectedEdge: selEdge, hovered: hov } = state.current;
    const focus = hov ?? sel;
    const ends = edgeEnds(selEdge);
    const near = new Set<string>(ends.length && !hov ? ends : focus && graph.hasNode(focus) ? [focus, ...graph.neighbors(focus)] : []);
    const ink = css("--ink"), halo = css("--surface"), muted = css("--ink-soft");
    const family = `"Source Sans 3","Noto Sans Tamil",system-ui,sans-serif`;
    const placed: [number, number, number, number][] = [];
    const clash = (x: number, y: number, w: number, h: number) => placed.some(([a, b, c, d]) => x < a + c && a < x + w && y < b + d && b < y + h);

    const faded = (id: string) => (ends.length && !hov ? !ends.includes(id) : !!focus && graph.hasNode(focus) && !near.has(id));

    // Dashed edges first: the mood family's dash over the faint base line Sigma drew.
    graph.forEachEdge((edge, a, s, t, sa, ta) => {
      if (a.hint || a.done || a.rec === selEdge) return;
      const lit = selEdge ? false : !focus || !graph.hasNode(focus) || s === focus || t === focus;
      const p1 = sigma.graphToViewport({ x: sa.x, y: sa.y }), p2 = sigma.graphToViewport({ x: ta.x, y: ta.y });
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.setLineDash(FAMILY[a.family as keyof typeof FAMILY]?.dash ?? [6, 4]);
      ctx.lineCap = "round";
      ctx.strokeStyle = css("--edge-said");
      ctx.lineWidth = focus && lit ? 2.2 : 1.6;
      ctx.globalAlpha = lit ? 0.95 : 0.12;
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Then the nodes: a ring for "in both epics", the class shape, and a copper halo on the one picked.
    const ringInk = css("--ink"), copper = css("--copper"), surface = css("--surface");
    graph.forEachNode((id, a) => {
      const p = sigma.graphToViewport({ x: a.x, y: a.y });
      const r = a.size; // nodes keep their pixel size at every zoom, so the maths stays simple
      ctx.globalAlpha = faded(id) ? 0.2 : 1;
      if (id === sel) {
        ctx.beginPath(); ctx.arc(p.x, p.y, r + 7, 0, Math.PI * 2);
        ctx.fillStyle = css("--copper-tint"); ctx.fill();
        ctx.strokeStyle = copper; ctx.lineWidth = 2; ctx.stroke();
      }
      if (a.bridge) {
        ctx.beginPath(); ctx.arc(p.x, p.y, r + 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = ringInk; ctx.lineWidth = 1.5; ctx.stroke();
      }
      tracePath(ctx, a.shape, p.x, p.y, r);
      if (a.isKind) {
        // A kind ("a jewel") is outlined and dashed; an individual ("this jewel") is filled.
        ctx.fillStyle = surface; ctx.fill();
        ctx.setLineDash([3, 2]); ctx.strokeStyle = a.fill; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.fillStyle = a.fill; ctx.fill();
        ctx.strokeStyle = surface; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });

    // Who gets a label first: the selected and their neighbours, then the biggest. If it would overlap, it waits for a zoom.
    const order = graph.nodes().sort((a, b) => Number(near.has(b)) - Number(near.has(a)) || graph.getNodeAttribute(b, "size") - graph.getNodeAttribute(a, "size"));
    const ratio = sigma.getCamera().ratio;
    order.forEach((id) => {
      const a = graph.getNodeAttributes(id);
      const forced = near.has(id);
      if (focus && !forced && !compact) return;
      // In a big graph small nodes wait for a zoom. A small graph has room to name everyone.
      if (!forced && !compact && graph.order > 26 && a.size < 5.5 && ratio > 0.8) return;
      const p = sigma.graphToViewport({ x: a.x, y: a.y });
      const r = a.size;
      if (p.x < -40 || p.y < -20 || p.x > width + 40 || p.y > height + 20) return;
      const size = forced && id === focus ? 14 : compact ? 13 : a.size > 10 ? 13.5 : 12.5;
      ctx.font = `${id === focus ? 600 : a.size > 10 ? 600 : 500} ${size}px ${family}`;
      const text = name(id).replace(/\s*\(.*\)\s*$/, ""); // the bracketed notes are for lists, too long for a label
      const w = ctx.measureText(text).width;
      // Try right, left, below, above before giving up.
      const spots: [number, number][] = [[p.x + r + 5, p.y], [p.x - r - 5 - w, p.y], [p.x - w / 2, p.y + r + size / 2 + 3], [p.x - w / 2, p.y - r - size / 2 - 3]];
      const fits = ([x]: [number, number]) => x >= 2 && x + w <= width - 2;
      const spot = spots.find((s) => fits(s) && !clash(s[0] - 3, s[1] - size / 2 - 2, w + 6, size + 4)) ?? (forced ? spots.find(fits) ?? [Math.max(2, width - w - 2), p.y + r + 10] as [number, number] : null);
      if (!spot) return;
      placed.push([spot[0] - 3, spot[1] - size / 2 - 2, w + 6, size + 4]);
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = halo;
      ctx.strokeText(text, spot[0], spot[1]);
      ctx.fillStyle = forced && id !== focus ? muted : ink;
      ctx.fillStyle = ink;
      ctx.fillText(text, spot[0], spot[1]);
    });

    // Edge words only where they fit: small graphs, or around what's selected.
    if (edgeLabels || focus || selEdge) {
      ctx.font = `600 12.5px ${family}`;
      graph.forEachEdge((edge, a, s, t, sa, ta) => {
        if (a.hint) return;
        const related = edgeLabels || a.rec === selEdge || (focus && (s === focus || t === focus));
        if (!related) return;
        const p = sigma.graphToViewport({ x: (sa.x + ta.x) / 2, y: (sa.y + ta.y) / 2 });
        const text = String(a.kind).replace(/_/g, " ");
        const w = ctx.measureText(text).width;
        if (clash(p.x - w / 2 - 3, p.y - 8, w + 6, 16)) return;
        placed.push([p.x - w / 2 - 3, p.y - 8, w + 6, 16]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = halo;
        ctx.strokeText(text, p.x - w / 2, p.y);
        ctx.fillStyle = a.done ? muted : css("--edge-said");
        ctx.fillText(text, p.x - w / 2, p.y);
      });
    }
  };

  useEffect(() => {
    if (!box.current) return;
    const sigma = new Sigma(graph, box.current, {
      settings: { allowInvalidContainer: true, renderLabels: false, renderEdgeLabels: false, enableEdgeEvents: true, itemSizesReference: "screen", zoomToSizeRatioFunction: () => 1, stagePadding: compact ? 46 : 30, minCameraRatio: 0.08, maxCameraRatio: 3, gestureTarget: compact ? "shared" : "graph" },
      nodeReducer: (id, attrs) => {
        const { selected: sel, hovered: hov, selectedEdge: selE } = state.current;
        const ends = edgeEnds(selE);
        if (ends.length && !hov) return ends.includes(id) ? { ...attrs, zIndex: 2 } : { ...attrs, opacity: 0.22 };
        const focus = hov ?? sel;
        if (!focus || !graph.hasNode(focus) || id === focus || graph.areNeighbors(focus, id)) return { ...attrs, zIndex: id === focus ? 2 : 1 };
        return { ...attrs, opacity: 0.22 };
      },
      edgeReducer: (edge, attrs) => {
        const { selected: sel, hovered: hov, selectedEdge: selE } = state.current;
        const focus = hov ?? sel;
        if (selE) return graph.getEdgeAttribute(edge, "rec") === selE ? { ...attrs, size: 4, color: css("--copper"), zIndex: 3 } : { ...attrs, opacity: 0.08 };
        if (!focus || !graph.hasNode(focus)) return attrs;
        return graph.hasExtremity(edge, focus) ? { ...attrs, size: (attrs.size ?? 1) + 0.8 } : { ...attrs, opacity: 0.1 };
      },
    });
    sigmaRef.current = sigma;
    sigma.on("afterRender", () => drawLabels.current());
    sigma.on("clickNode", ({ node }) => handlers.current.onNode?.(node));
    sigma.on("clickStage", () => handlers.current.onNode?.(null));
    sigma.on("clickEdge", ({ edge }) => {
      const { onEdge: pick, edgeOf: only } = handlers.current;
      const rec = graph.getEdgeAttribute(edge, "rec");
      if (!pick || !rec || (only && graph.order > 60 && !graph.hasExtremity(edge, only))) return;
      pick(rec);
    });
    sigma.on("enterNode", ({ node }) => { setHovered(node); box.current && (box.current.style.cursor = "pointer"); });
    sigma.on("leaveNode", () => { setHovered(null); box.current && (box.current.style.cursor = ""); });
    sigma.on("enterEdge", ({ edge }) => {
      const { onEdge: pick, edgeOf: only } = handlers.current;
      if (pick && !(only && graph.order > 60 && !graph.hasExtremity(edge, only)) && box.current) box.current.style.cursor = "pointer";
    });
    sigma.on("leaveEdge", () => { box.current && (box.current.style.cursor = ""); });
    return () => { sigma.kill(); sigmaRef.current = null; };
  }, [graph, compact]);

  useEffect(() => { sigmaRef.current?.refresh(); }, [selected, selectedEdge, hovered, lang, dark]);

  return (
    <div className={compact ? "graph graph--compact" : "graph"} role="img" aria-label={ariaLabel}>
      <div ref={box} className="graph__stage" />
      <canvas ref={overlay} className="graph__labels" aria-hidden="true" />
      {!compact && (
        <div className="graph__zoom">
          <button aria-label="Zoom in" onClick={() => sigmaRef.current?.getCamera().zoomIn({ duration: 200 })}><Plus size={16} aria-hidden="true" /></button>
          <button aria-label="Zoom out" onClick={() => sigmaRef.current?.getCamera().zoomOut({ duration: 200 })}><Minus size={16} aria-hidden="true" /></button>
          <button aria-label="Fit" onClick={() => sigmaRef.current?.getCamera().reset({ duration: 200 })}><Maximize size={16} aria-hidden="true" /></button>
        </div>
      )}
    </div>
  );
}
