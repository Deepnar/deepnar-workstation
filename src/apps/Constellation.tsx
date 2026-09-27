"use client";

// SIGNAL — the work as a knowledge graph, Obsidian-style. Small nodes,
// real relationships, force layout with drag / pan / zoom. Single click
// selects + shows a detail card; double-click (or Enter) opens the
// artifact in the workstation (workspace 1).
import { useEffect, useRef, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import { useShell } from "@/lib/store";
import { HOME } from "@/vfs/vfs";
import { sound } from "@/audio/engine";

type Cluster = "projects" | "research" | "oss" | "practice";

interface GNode {
  id: string; label: string; detail: string; cluster: Cluster;
  size: "flagship" | "normal" | "minor"; open: string;
  x?: number; y?: number; vx?: number; vy?: number; fx?: number | null; fy?: number | null;
}
interface GLink { source: string; target: string; why: string }

const RADIUS = { flagship: 11, normal: 7, minor: 5 };

const NODES: GNode[] = [
  { id: "ice", label: "ice", detail: "local-first memory layer · sole author", cluster: "projects", size: "flagship", open: `${HOME}/projects/ice/README.md` },
  { id: "lsrep", label: "lsrep", detail: "longitudinal eval protocol for memory", cluster: "research", size: "normal", open: `${HOME}/research/lsrep-ice/README.md` },
  { id: "router", label: "prompt-router", detail: "topic+intent router · basis for ICE pre-flight", cluster: "projects", size: "normal", open: `${HOME}/projects/prompt-routing-classifier/README.md` },
  { id: "forge", label: "presentation-forge", detail: "topic in, researched .pptx out", cluster: "projects", size: "normal", open: `${HOME}/projects/presentation-forge/README.md` },
  { id: "timetable", label: "timetable", detail: "constraint-driven college scheduling", cluster: "projects", size: "normal", open: `${HOME}/projects/timetable-generator/README.md` },
  { id: "nexus", label: "nexus", detail: "fraud safety · my lane: full ML expansion, merged", cluster: "projects", size: "normal", open: `${HOME}/projects/collaborations/nexus/README.md` },
  { id: "iis", label: "iis-mini", detail: "Person-1 lane: classical fraud baselines", cluster: "projects", size: "minor", open: `${HOME}/projects/collaborations/iis-mini/README.md` },
  { id: "rapidrail", label: "rapidrail", detail: "suburban ticketing · my lane: wallet + Razorpay test", cluster: "projects", size: "minor", open: `${HOME}/projects/collaborations/rapidrail/README.md` },
  { id: "civic", label: "civicresolve", detail: "civic reporting · AI observation engine lane", cluster: "projects", size: "minor", open: `${HOME}/projects/collaborations/civicresolve/README.md` },
  { id: "graphiti", label: "graphiti#1772", detail: "open PR · temporal-graph memory, upstream", cluster: "oss", size: "minor", open: `${HOME}/oss/open/graphiti-1772.md` },
  { id: "modeldock", label: "modeldock#221", detail: "merged · local model serving", cluster: "oss", size: "minor", open: `${HOME}/oss/merged/modeldock-221.md` },
  { id: "mne", label: "mne#14283", detail: "merged upstream · EEG tooling", cluster: "oss", size: "normal", open: `${HOME}/oss/merged/mne-python-14283.md` },
  { id: "micrograd", label: "micrograd", detail: "autodiff from first principles", cluster: "practice", size: "minor", open: `${HOME}/projects/practice/micrograd-from-scratch/README.md` },
  { id: "ppo", label: "ppo-clip", detail: "classroom PPO on Pendulum-v1", cluster: "practice", size: "minor", open: `${HOME}/projects/practice/ppo-clip-demo/README.md` },
  { id: "titanic", label: "titanic", detail: "tabular sklearn pipeline", cluster: "practice", size: "minor", open: `${HOME}/projects/practice/titanic-ml-pipeline/README.md` },
  { id: "grad", label: "grad-desc", detail: "gradient descent, one notebook", cluster: "practice", size: "minor", open: `${HOME}/projects/practice/gradient-descent-from-scratch/README.md` },
  { id: "wine", label: "wine-quality", detail: "red-wine regression on physicochemistry", cluster: "practice", size: "minor", open: `${HOME}/projects/practice/wine-quality-regression/README.md` },
  { id: "movietix", label: "movie-tickets", detail: "Spring Boot booking + wallet + QR", cluster: "practice", size: "minor", open: `${HOME}/projects/practice/movie-ticket-booking/README.md` },
  { id: "ecommerce", label: "ecommerce", detail: "static storefront, no framework", cluster: "practice", size: "minor", open: `${HOME}/projects/practice/ecommerce-client/README.md` },
  { id: "cricbuzz", label: "cricbuzz", detail: "cricket sim · Java + standalone UI", cluster: "practice", size: "minor", open: `${HOME}/projects/practice/cricbuzz-app/README.md` },
];

const LINKS: GLink[] = [
  { source: "router", target: "ice", why: "became the pre-flight router" },
  { source: "ice", target: "lsrep", why: "evaluated by LSREP" },
  { source: "ice", target: "forge", why: "local-first siblings" },
  { source: "graphiti", target: "ice", why: "temporal-graph memory ideas" },
  { source: "modeldock", target: "ice", why: "local inference serving" },
  { source: "nexus", target: "iis", why: "fraud-model lineage" },
  { source: "iis", target: "titanic", why: "tabular sklearn lineage" },
  { source: "micrograd", target: "ppo", why: "from-scratch ML" },
  { source: "movietix", target: "rapidrail", why: "ticketing + wallet lineage" },
  { source: "rapidrail", target: "civic", why: "team service builds" },
  { source: "timetable", target: "movietix", why: "service backends" },
  { source: "nexus", target: "titanic", why: "fraud models ↔ tabular ML" },
  { source: "micrograd", target: "grad", why: "from-scratch notebook pair" },
  { source: "grad", target: "wine", why: "linear regression → wine regression" },
  { source: "wine", target: "titanic", why: "tabular sklearn pair" },
  { source: "iis", target: "wine", why: "classical baselines ↔ regression" },
  { source: "movietix", target: "ecommerce", why: "booking ↔ storefront UIs" },
  { source: "movietix", target: "cricbuzz", why: "java full-stack pair" },
];

export function Constellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.5);
  const simRef = useRef<ReturnType<typeof forceSimulation<GNode, GLink>> | null>(null);
  const viewRef = useRef({ x: 0, y: 0, k: 1.5 });
  const bornRef = useRef(0);
  const nodesRef = useRef<GNode[]>([]);
  const hoverRef = useRef<string | null>(null);
  const selRef = useRef<string | null>(null);
  hoverRef.current = hover;
  selRef.current = sel;

  const open = (id: string) => {
    const n = NODES.find((x) => x.id === id);
    if (!n) return;
    const s = useShell.getState();
    const ext = n.open.endsWith(".md") ? "markdown" : "markdown";
    s.openFile(n.open, ext);
    s.setDesktopWs(1);
    s.setPhase("app");
    sound.fileOpen();
  };

  useEffect(() => {
    const cv = canvasRef.current, wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const nodes: GNode[] = NODES.map((n) => ({ ...n, x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 300 }));
    nodesRef.current = nodes;
    const links = LINKS.map((l) => ({ ...l }));
    const sim = forceSimulation<GNode>(nodes)
      .force("link", forceLink<GNode, GLink>(links).id((d) => (d as GNode).id).distance(90).strength(0.5))
      .force("charge", forceManyBody<GNode>().strength(-160))
      .force("collide", forceCollide<GNode>().radius((d) => RADIUS[d.size] + 14))
      .force("x", forceX<GNode>().strength(0.05))
      .force("y", forceY<GNode>().strength(0.05))
      .force("center", forceCenter<GNode>(0, 0))
      .alphaDecay(0.02);
    simRef.current = sim;
    bornRef.current = 0;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const css = (name: string, fb: string) => {
      try {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
      } catch { return fb; }
    };
    let theme = { fg: "#e8ebf7", muted: "#8b90a7", accent: "#8fa3ff", icy: "#57c7d4", ok: "#7fd08a", border: "#2a2f45", edge: "#3a4059", bg: "#0d0f14" };
    let frames = 0;
    const refreshTheme = () => {
      const light = document.documentElement.dataset.theme === "light";
      theme = light
        ? { fg: "#2a2d3a", muted: "#8b8578", accent: "#4653b0", icy: "#2a7d8c", ok: "#3f7d4e", border: "#d5d2c6", edge: "#5f5a4c", bg: "#f4f2ec" }
        : { fg: "#e8ebf7", muted: "#8b90a7", accent: "#8fa3ff", icy: "#57c7d4", ok: "#7fd08a", border: "#2a2f45", edge: "#3a4059", bg: "#0d0f14" };
    };
    refreshTheme();

    const clusterColor = (c: Cluster) =>
      c === "research" ? theme.icy : c === "oss" ? theme.ok : c === "practice" ? theme.muted : theme.accent;

    const toScreen = (x: number, y: number) => {
      const v = viewRef.current;
      return [(x - v.x) * v.k + W / 2, (y - v.y) * v.k + H / 2];
    };
    const toWorld = (sx: number, sy: number) => {
      const v = viewRef.current;
      return [(sx - W / 2) / v.k + v.x, (sy - H / 2) / v.k + v.y];
    };

    let raf = 0;
    const drawFrame = () => {
      if (document.hidden) { raf = requestAnimationFrame(drawFrame); return; }
      if (++frames % 120 === 0) refreshTheme();
      const v = viewRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, W, H);
      const hov = hoverRef.current, s = selRef.current;
      const linked = new Set<string>();
      if (hov || s) {
        const id = (hov ?? s)!;
        linked.add(id);
        for (const l of links) {
          const a = typeof l.source === "string" ? l.source : (l.source as GNode).id;
          const b = typeof l.target === "string" ? l.target : (l.target as GNode).id;
          if (a === id) linked.add(b);
          if (b === id) linked.add(a);
        }
      }
      const dim = (id: string) => (hov || s) && !linked.has(id) ? 0.45 : 1;
      // edges
      for (const l of links) {
        const a = (typeof l.source === "string" ? nodes.find((n) => n.id === l.source) : l.source)!;
        const b = (typeof l.target === "string" ? nodes.find((n) => n.id === l.target) : l.target)!;
        if (a.x == null || b.x == null) continue;
        const [ax, ay] = toScreen(a.x, a.y!);
        const [bx, by] = toScreen(b.x, b.y!);
        const on = !hov && !s ? true : linked.has(a.id) && linked.has(b.id);
        ctx.globalAlpha = on ? 1 : 0.15;
        ctx.strokeStyle = theme.edge;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // nodes (spawn: pop in staggered, ease-out)
      const now = (bornRef.current += 1);
      for (let ni = 0; ni < nodes.length; ni++) {
        const n = nodes[ni];
        if (n.x == null || n.y == null) continue;
        const [sx, sy] = toScreen(n.x, n.y);
        const grow = Math.min(1, Math.max(0, (now - ni * 8) / 26));
        const ease = 1 - Math.pow(1 - grow, 3);
        if (ease <= 0) continue;
        const r = RADIUS[n.size] * (0.7 + 0.3 * v.k) * ease;
        const isH = hov === n.id || s === n.id;
        ctx.globalAlpha = dim(n.id);
        if (isH) {
          ctx.strokeStyle = clusterColor(n.cluster);
          ctx.globalAlpha = 0.5 * dim(n.id);
          ctx.beginPath(); ctx.arc(sx, sy, r + 6, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = dim(n.id);
        }
        ctx.fillStyle = n.id === s ? theme.accent : clusterColor(n.cluster);
        ctx.beginPath(); ctx.arc(sx, sy, isH ? r + 1.5 : r, 0, Math.PI * 2); ctx.fill();
        // labels: flagship always, rest on hover/select/zoom
        if (n.size === "flagship" || isH || v.k > 1.35) {
          ctx.fillStyle = isH ? theme.fg : theme.muted;
          ctx.font = "11px monospace";
          ctx.textAlign = "center";
          ctx.fillText(n.label, sx, sy + r + 13);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(drawFrame);
    };
    raf = requestAnimationFrame(drawFrame);

    const at = (e: PointerEvent | WheelEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const nodeAt = (sx: number, sy: number) => {
      const [wx, wy] = toWorld(sx, sy);
      let bestN: GNode | null = null, bestD = 24 / viewRef.current.k + 6;
      for (const n of nodes) {
        if (n.x == null || n.y == null) continue;
        const d = Math.hypot(n.x - wx, n.y - wy);
        if (d < bestD) { bestD = d; bestN = n; }
      }
      return bestN;
    };

    let dragNode: GNode | null = null;
    let panning = false, lx = 0, ly = 0, moved = false;
    const onDown = (e: PointerEvent) => {
      cv.setPointerCapture(e.pointerId);
      const p = at(e);
      dragNode = nodeAt(p.x, p.y);
      if (dragNode) {
        sim.alphaTarget(0.15).restart();
        dragNode.fx = dragNode.x; dragNode.fy = dragNode.y;
      } else { panning = true; lx = p.x; ly = p.y; }
      moved = false;
    };
    const onMove = (e: PointerEvent) => {
      const p = at(e);
      if (dragNode) {
        const [wx, wy] = toWorld(p.x, p.y);
        dragNode.fx = wx; dragNode.fy = wy;
        moved = true;
      } else if (panning) {
        viewRef.current.x -= (p.x - lx) / viewRef.current.k;
        viewRef.current.y -= (p.y - ly) / viewRef.current.k;
        lx = p.x; ly = p.y;
        moved = true;
      } else {
        const n = nodeAt(p.x, p.y);
        setHover(n ? n.id : null);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (dragNode) {
        dragNode.fx = null; dragNode.fy = null;
        sim.alphaTarget(0);
        if (!moved) setSel(dragNode.id);
        dragNode = null;
      } else if (panning) {
        panning = false;
        if (!moved) setSel(null);
      }
      void e;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      const p = at(e);
      const [wx, wy] = toWorld(p.x, p.y);
      v.k = Math.min(3, Math.max(0.5, v.k * (e.deltaY < 0 ? 1.12 : 0.89)));
      v.x = wx - (p.x - W / 2) / v.k;
      v.y = wy - (p.y - H / 2) / v.k;
      setZoom(Math.round(v.k * 100) / 100);
    };
    const onDbl = (e: MouseEvent) => {
      const r = cv.getBoundingClientRect();
      const n = nodeAt(e.clientX - r.left, e.clientY - r.top);
      if (n) open(n.id);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selRef.current) open(selRef.current);
      if (e.key === "Escape") setSel(null);
    };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("wheel", onWheel, { passive: false });
    cv.addEventListener("dblclick", onDbl);
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      sim.stop();
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("wheel", onWheel);
      cv.removeEventListener("dblclick", onDbl);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selNode = NODES.find((n) => n.id === sel);
  const selLinks = sel ? LINKS.filter((l) => l.source === sel || l.target === sel) : [];
  return (
    <div className="h-full flex flex-col min-h-0" aria-label="signal knowledge graph">
      <div className="px-4 py-2 text-[12.5px] border-b shrink-0 flex items-center gap-3" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        <span className="font-bold" style={{ color: "var(--fg)" }}>SIGNAL</span>
        <span className="hidden sm:inline">drag to move · wheel to zoom · double-click opens</span>
        <span className="ml-auto tabular-nums">{Math.round(zoom * 100)}%</span>
        <button title="hide to desktop" aria-label="minimize" className="px-2 hover:bg-[var(--sel-bg)]"
          style={{ color: "var(--muted)" }} onClick={() => { useShell.getState().setPhase("desktop"); }}>
          <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>–</span>
        </button>
      </div>
      <div ref={wrapRef} className="flex-1 min-h-0 relative">
        <canvas ref={canvasRef} tabIndex={0} aria-label="graph canvas" data-nodes={NODES.length}
          onKeyDown={(e) => {
            if (e.key !== "]" && e.key !== "[" && e.key !== "Enter") return;
            e.preventDefault();
            const ids = NODES.map((n) => n.id);
            if (e.key === "Enter") { if (sel) open(sel); return; }
            const i = sel ? ids.indexOf(sel) : -1;
            const next = e.key === "]" ? ids[(i + 1) % ids.length] : ids[(i - 1 + ids.length) % ids.length];
            setSel(next);
            sound.tick(next ? 1 : -1);
          }}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" style={{ touchAction: "none" }} />
        {selNode && (
          <div className="absolute left-3 bottom-3 max-w-xs px-3 py-2 border text-[12px] space-y-1"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--fg-dim)" }}>
            <div className="font-bold text-[13px]" style={{ color: "var(--fg)" }}>{selNode.label}</div>
            <div>{selNode.detail}</div>
            {selLinks.map((l) => (
              <div key={`${l.source}-${l.target}`} style={{ color: "var(--muted)" }}>
                {l.source === sel ? "→" : "←"} {l.source === sel ? l.target : l.source} · {l.why}
              </div>
            ))}
            <button className="px-2 py-1 border text-[11.5px]" style={{ borderColor: "var(--accent)", color: "var(--accent-soft)" }}
              onClick={() => open(selNode.id)}>
              open in workstation ↵
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
