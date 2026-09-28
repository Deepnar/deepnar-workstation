"use client";

// SIGNAL — the work as a temporal knowledge graph, Obsidian-style.
// X = time (older left, newer right), Y = domain band. Links carry the
// *reason* for the relationship, not random adjacency.
// Single click selects + shows a detail card; double-click (or Enter) opens
// the artifact in the workstation. Shift+click pins two nodes and highlights
// the shortest conceptual path between them. Ghost nodes are history-only
// (no project page) — opening one lands on its real successor.
import { useEffect, useRef, useState } from "react";
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import { useShell } from "@/lib/store";
import { HOME } from "@/vfs/vfs";
import { sound } from "@/audio/engine";
import { openLineForNode } from "@/system/pry";

type Cluster = "personal" | "collab" | "research" | "oss" | "practice" | "systems" | "ghost";
type Domain = "web" | "oss" | "backend" | "ml" | "systems";

interface GNode {
  id: string; label: string; detail: string; cluster: Cluster; domain: Domain;
  year: number; size: "flagship" | "normal" | "minor"; open: string;
  x?: number; y?: number; vx?: number; vy?: number; fx?: number | null; fy?: number | null;
}
interface GLink { source: string; target: string; why: string }

const RADIUS = { flagship: 11, normal: 7, minor: 5 };
const BAND: Record<Domain, number> = { web: -150, oss: -75, backend: 5, ml: 95, systems: 170 };
// soft chronology: compressed X scale — direction without kilometer gaps.
// world span ≈ 4.2yr × 96 ≈ 405, close to the Y band span (≈360).
const X0 = 2024.2, XSCALE = 96;
const xFor = (year: number) => (year - X0) * XSCALE;

const P = (slug: string) => `${HOME}/projects/${slug}/README.md`;
const NODES: GNode[] = [
  // personal flagships — left-to-right also reads as the growth story
  { id: "ice", label: "ice", detail: "local-first memory layer · sole author", cluster: "personal", domain: "ml", year: 2026.54, size: "flagship", open: P("ice") },
  { id: "forge", label: "presentation-forge", detail: "topic in, researched .pptx out", cluster: "personal", domain: "web", year: 2026.61, size: "flagship", open: P("presentation-forge") },
  { id: "timetable", label: "timetable", detail: "constraint-driven college scheduling", cluster: "personal", domain: "backend", year: 2026.21, size: "flagship", open: P("timetable-generator") },
  { id: "workstation", label: "workstation", detail: "this portfolio — a browsable Linux workstation", cluster: "personal", domain: "systems", year: 2026.72, size: "flagship", open: P("deepnar-workstation") },
  { id: "router", label: "prompt-router", detail: "topic+intent router · became ICE pre-flight", cluster: "personal", domain: "ml", year: 2026.20, size: "normal", open: P("prompt-routing-classifier") },
  // systems
  { id: "orien", label: "orien-config", detail: "chezmoi CachyOS/Hyprland workstation config", cluster: "systems", domain: "systems", year: 2025.65, size: "normal", open: `${HOME}/projects/systems/orien-config/README.md` },
  // collaborations
  { id: "civic", label: "civicresolve", detail: "civic reporting · AI observation engine lane", cluster: "collab", domain: "web", year: 2026.61, size: "normal", open: `${HOME}/projects/collaborations/civicresolve/README.md` },
  { id: "nexus", label: "nexus", detail: "fraud safety · my lane: full ML expansion, merged", cluster: "collab", domain: "ml", year: 2026.72, size: "normal", open: `${HOME}/projects/collaborations/nexus/README.md` },
  { id: "rapidrail", label: "rapidrail", detail: "suburban ticketing · my lane: wallet + Razorpay test", cluster: "collab", domain: "backend", year: 2026.02, size: "normal", open: `${HOME}/projects/collaborations/rapidrail/README.md` },
  { id: "iis", label: "iis-mini", detail: "Person-1 lane: classical fraud baselines", cluster: "collab", domain: "ml", year: 2026.72, size: "minor", open: `${HOME}/projects/collaborations/iis-mini/README.md` },
  // research
  { id: "lsrep", label: "lsrep", detail: "longitudinal eval protocol for memory", cluster: "research", domain: "ml", year: 2026.72, size: "normal", open: `${HOME}/research/lsrep-ice/README.md` },
  // oss — thematic overlap, never random
  { id: "semantic", label: "semantic-router#3288", detail: "merged · Envoy log default, routing overlap", cluster: "oss", domain: "oss", year: 2026.6, size: "normal", open: `${HOME}/oss/merged/semantic-router-3288.md` },
  { id: "modeldock", label: "modeldock#221", detail: "merged #221 + #222 · local model serving", cluster: "oss", domain: "oss", year: 2026.6, size: "normal", open: `${HOME}/oss/merged/modeldock-221.md` },
  { id: "mne", label: "mne#14283", detail: "merged · sklearn-compat fix in EEG tooling", cluster: "oss", domain: "oss", year: 2026.6, size: "normal", open: `${HOME}/oss/merged/mne-python-14283.md` },
  { id: "graphiti", label: "graphiti#1772", detail: "open PR · temporal-graph memory ideas", cluster: "oss", domain: "oss", year: 2026.7, size: "minor", open: `${HOME}/oss/open/graphiti-1772.md` },
  { id: "openverif", label: "openverifiable#135", detail: "open PR · tokenizer hash artifacts", cluster: "oss", domain: "oss", year: 2026.7, size: "minor", open: `${HOME}/oss/open/openverifiablellm-135.md` },
  { id: "archi", label: "archi#653", detail: "open PR · model context-window metadata", cluster: "oss", domain: "oss", year: 2026.7, size: "minor", open: `${HOME}/oss/open/archi-653.md` },
  // practice — progression, not products
  { id: "micrograd", label: "micrograd", detail: "autodiff from first principles", cluster: "practice", domain: "ml", year: 2026.09, size: "minor", open: `${HOME}/projects/practice/ml/micrograd-from-scratch/README.md` },
  { id: "grad", label: "grad-desc", detail: "gradient descent, one notebook", cluster: "practice", domain: "ml", year: 2026.08, size: "minor", open: `${HOME}/projects/practice/ml/gradient-descent-from-scratch/README.md` },
  { id: "wine", label: "wine-quality", detail: "red-wine regression on physicochemistry", cluster: "practice", domain: "ml", year: 2026.08, size: "minor", open: `${HOME}/projects/practice/ml/wine-quality-regression/README.md` },
  { id: "titanic", label: "titanic", detail: "tabular sklearn pipeline", cluster: "practice", domain: "ml", year: 2026.08, size: "minor", open: `${HOME}/projects/practice/ml/titanic-ml-pipeline/README.md` },
  { id: "ppo", label: "ppo-clip", detail: "classroom PPO on Pendulum-v1", cluster: "practice", domain: "ml", year: 2026.69, size: "minor", open: `${HOME}/projects/practice/ml/ppo-clip-demo/README.md` },
  { id: "dsp", label: "ds-practice", detail: "algorithms + OS + networks coursework", cluster: "practice", domain: "backend", year: 2025.56, size: "minor", open: `${HOME}/projects/practice/software/ds-practice/README.md` },
  { id: "quiz", label: "quiz-game", detail: "early Python + MySQL quiz", cluster: "practice", domain: "ml", year: 2025.46, size: "minor", open: `${HOME}/projects/practice/software/quiz-game/README.md` },
  { id: "pylab", label: "python-practice-lab", detail: "learning archive → standalone ML repos", cluster: "practice", domain: "ml", year: 2025.4, size: "minor", open: `${HOME}/projects/practice/software/python-practice-lab/README.md` },
  { id: "hostel", label: "hostel-alloc", detail: "Servlets/JDBC booking before Spring", cluster: "practice", domain: "backend", year: 2026.09, size: "minor", open: `${HOME}/projects/practice/software/hostel-room-allocation-system/README.md` },
  { id: "movietix", label: "movie-tickets", detail: "Spring Boot booking + wallet + QR", cluster: "practice", domain: "backend", year: 2025.9, size: "minor", open: `${HOME}/projects/practice/software/movie-ticket-booking/README.md` },
  { id: "ecommerce", label: "ecommerce", detail: "static storefront, no framework", cluster: "practice", domain: "web", year: 2025.82, size: "minor", open: `${HOME}/projects/practice/software/ecommerce-client/README.md` },
  { id: "cricbuzz", label: "cricbuzz", detail: "cricket sim · Java + standalone UI", cluster: "practice", domain: "backend", year: 2024.5, size: "minor", open: `${HOME}/projects/practice/software/cricbuzz-app/README.md` },
  { id: "webvm", label: "ubuntu-vm", detail: "early Apache deploy on a VM", cluster: "practice", domain: "systems", year: 2024.5, size: "minor", open: `${HOME}/projects/practice/early/website-on-ubuntu-vm/README.md` },
  { id: "placement", label: "placement-check", detail: "early C++ course assignment", cluster: "practice", domain: "backend", year: 2024.3, size: "minor", open: `${HOME}/projects/practice/early/placement-eligibility-checker/README.md` },
  { id: "pricing", label: "pricing-panel", detail: "early CSS code-along", cluster: "practice", domain: "web", year: 2023.5, size: "minor", open: `${HOME}/projects/practice/early/pricing-tier-panel/README.md` },
  // history-only ghosts — small, muted, open their real successor
  { id: "fgd", label: "first-github-demo", detail: "history · first git steps", cluster: "ghost", domain: "web", year: 2022.5, size: "minor", open: `${HOME}/projects/practice/early/pricing-tier-panel/README.md` },
  { id: "lwd", label: "learning-web-dev", detail: "history · structured web learning", cluster: "ghost", domain: "web", year: 2023.0, size: "minor", open: `${HOME}/projects/practice/early/pricing-tier-panel/README.md` },
  { id: "logindemo", label: "LoginDemo", detail: "history · Java web/auth begins", cluster: "ghost", domain: "backend", year: 2024.0, size: "minor", open: `${HOME}/projects/practice/software/hostel-room-allocation-system/README.md` },
  { id: "loginjdbc", label: "LoginDemoJDBC", detail: "history · persistence/JDBC step", cluster: "ghost", domain: "backend", year: 2024.1, size: "minor", open: `${HOME}/projects/practice/software/hostel-room-allocation-system/README.md` },
  { id: "capdocs", label: "cap-docs", detail: "history · spec repo that planned a timetable module", cluster: "ghost", domain: "backend", year: 2025.3, size: "minor", open: P("timetable-generator") },
  { id: "rust", label: "rust-lab", detail: "history · first Rust steps", cluster: "ghost", domain: "systems", year: 2025.2, size: "minor", open: `dir:${HOME}/projects/practice/software` },
  { id: "pybackend", label: "python-backend", detail: "history · FastAPI tutorial-pattern API", cluster: "ghost", domain: "backend", year: 2025.4, size: "minor", open: `dir:${HOME}/projects/practice/software` },
];

const LINKS: GLink[] = [
  // early web / frontend progression
  { source: "fgd", target: "lwd", why: "first git/web work → structured learning" },
  { source: "lwd", target: "pricing", why: "HTML → responsive CSS component" },
  { source: "pricing", target: "ecommerce", why: "component layout → multi-page client app" },
  { source: "ecommerce", target: "civic", why: "client state → full-stack product workflow" },
  { source: "civic", target: "forge", why: "app/system experience → standalone product design" },
  { source: "forge", target: "workstation", why: "interactive frontend/tooling → workstation UX" },
  // linux / environment progression
  { source: "webvm", target: "orien", why: "early Linux service → managed environment" },
  { source: "orien", target: "workstation", why: "environment / aesthetic identity" },
  // java / backend progression
  { source: "logindemo", target: "loginjdbc", why: "auth shape → persistence/JDBC" },
  { source: "loginjdbc", target: "hostel", why: "JDBC web app → larger MVC booking" },
  { source: "hostel", target: "rapidrail", why: "Servlets/JDBC → Spring Boot/JPA" },
  { source: "rapidrail", target: "movietix", why: "shared booking/wallet/QR patterns" },
  { source: "dsp", target: "timetable", why: "algorithms → solver-backed scheduling" },
  { source: "capdocs", target: "timetable", why: "planned subsystem → real project" },
  { source: "movietix", target: "timetable", why: "CRUD service → constraint-heavy service" },
  // python / ML progression
  { source: "quiz", target: "pylab", why: "scripts → learning archive" },
  { source: "pylab", target: "grad", why: "archive → explicit optimization" },
  { source: "grad", target: "micrograd", why: "manual optimization → autodiff" },
  { source: "micrograd", target: "router", why: "fundamentals → applied semantic ML" },
  { source: "router", target: "ice", why: "cheap pre-routing → ICE pre-flight" },
  { source: "pylab", target: "wine", why: "archive → tabular regression" },
  { source: "wine", target: "titanic", why: "regression → classification pipeline" },
  { source: "titanic", target: "iis", why: "sklearn workflows → imbalanced-tabular eval" },
  { source: "iis", target: "nexus", why: "fraud eval experience → fraud system" },
  { source: "micrograd", target: "ppo", why: "neural branch → RL" },
  // research edge — the strongest directed edge on the graph
  { source: "ice", target: "lsrep", why: "needed a way to evaluate evolving memory" },
  // oss theme overlaps (not derivation claims)
  { source: "router", target: "semantic", why: "routing overlap" },
  { source: "ice", target: "graphiti", why: "temporal-graph memory" },
  { source: "ice", target: "modeldock", why: "local inference serving" },
  { source: "forge", target: "modeldock", why: "local model tooling" },
  { source: "ice", target: "openverif", why: "tokenizer/eval-adjacent" },
  { source: "ice", target: "archi", why: "model metadata" },
  // collaboration + meta influences
  { source: "civic", target: "nexus", why: "team web system → team AI/fraud system" },
  { source: "ice", target: "workstation", why: "research/assistant identity" },
];

export function Constellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pins, setPins] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [fitK, setFitK] = useState(0);
  const fitKRef = useRef(0);
  const fitFnRef = useRef<() => void>(() => {});
  const simRef = useRef<ReturnType<typeof forceSimulation<GNode, GLink>> | null>(null);
  const viewRef = useRef({ x: 0, y: 0, k: 1 });
  const bornRef = useRef(0);
  const nodesRef = useRef<GNode[]>([]);
  const hoverRef = useRef<string | null>(null);
  const selRef = useRef<string | null>(null);
  const pinsRef = useRef<string[]>([]);
  hoverRef.current = hover;
  selRef.current = sel;
  pinsRef.current = pins;

  const open = (id: string) => {
    const n = NODES.find((x) => x.id === id);
    if (!n) return;
    const s = useShell.getState();
    if (n.open.startsWith("dir:")) {
      s.navTo(n.open.slice(4));
    } else {
      const ext = n.open.endsWith(".md") ? "markdown" : "markdown";
      s.openFile(n.open, ext);
    }
    s.setDesktopWs(1);
    s.setPhase("app");
    sound.fileOpen();
  };

  useEffect(() => {
    const cv = canvasRef.current, wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    // non-null aliases: TS drops ref narrowing inside nested functions.
    const wrapEl: HTMLElement = wrap, cvEl: HTMLCanvasElement = cv;
    // deterministic initial placement: id-hashed jitter, NO Math.random.
    // same dataset → same canonical geometry on every reload.
    const hashId = (s: string) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0) / 4294967296;
    };
    const nodes: GNode[] = NODES.map((n) => ({
      ...n,
      x: xFor(n.year) + (hashId(n.id + ":x") - 0.5) * 60,
      y: BAND[n.domain] + (hashId(n.id + ":y") - 0.5) * 60,
    }));
    nodesRef.current = nodes;
    const links = LINKS.map((l) => ({ ...l }));
    // linkless nodes (history fragments with no relationships) have nothing
    // to place them except chronology — anchor them harder so charge
    // repulsion can't exile them into meaningless dead space.
    const degree = new Map<string, number>();
    for (const l of LINKS) {
      degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
      degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
    }
    const sim = forceSimulation<GNode>(nodes)
      .force("link", forceLink<GNode, GLink>(links).id((d) => (d as GNode).id)
        // sparser canonical geometry for proximity picking: ghost history
        // folds tight, real progressions sit close, thematic OSS overlaps
        // breathe outward — no uniform chain-stretch, no full-width sprawl.
        .distance((l) => {
          const id = (x: unknown) => typeof x === "string" ? x : (x as GNode).id;
          const byId = new Map(nodes.map((n) => [n.id, n]));
          const a = byId.get(id(l.source))?.cluster, b = byId.get(id(l.target))?.cluster;
          if (a === "ghost" || b === "ghost") return 42;
          if (a === "oss" || b === "oss") return 84;
          return 62;
        })
        .strength(0.7))
      .force("charge", forceManyBody<GNode>().strength(-105))
      .force("collide", forceCollide<GNode>().radius((d) => RADIUS[d.size] + 18))
      // soft chronology (weak X — direction, not proportional distance) +
      // gentle domain clustering (stronger Y) + strong relationship links:
      // linked eras concertina together, order preserved, gaps earned.
      .force("x", forceX<GNode>((d) => xFor(d.year))
        .strength((d) => (degree.get(d.id) ?? 0) === 0 ? 0.15 : 0.035))
      .force("y", forceY<GNode>((d) => BAND[d.domain]).strength(0.14))
      // no forceCenter: it exiles light chains to balance heavy clusters.
      // anchors + median-fit frame the graph; the centroid needs no policing.
      .alphaDecay(0.02);
    simRef.current = sim;
    bornRef.current = 0;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    const resize = () => {
      measureAndApplyGeometry();
    };
    // ONE authoritative geometry function: mount, ResizeObserver,
    // entrance-animation end, and fonts.ready ALL go through here.
    // (Mount-time root cause, 2026-09-28: the .app-open wrapper plays a
    // 260ms scale(0.93→1) entrance animation on every workspace switch.
    // Measuring during it fits the graph to a 7%-smaller, shifted rect;
    // the transform never fires ResizeObserver, so the stale fit survived
    // until any real resize — exactly the "browser zoom repairs it"
    // symptom. Fix: no canonical fit until the entrance has settled.)
    let geomGen = 0;
    let settled = false;
    let geometryReady = false;
    const rectAtFit = { w: 0, h: 0 };
    function measureAndApplyGeometry() {
      const r = wrapEl.getBoundingClientRect();
      if (r.width < 50 || r.height < 50) return false;
      W = r.width; H = r.height;
      cvEl.width = Math.round(W * dpr); cvEl.height = Math.round(H * dpr);
      geomGen++;
      // material container change refits the canonical view — until the
      // user deliberately pans/zooms, after which their view is preserved.
      try { if (!userView) fit(); } catch { /* fit not defined on first pass */ }
      if (settled) {
        geometryReady = true;
        rectAtFit.w = r.width; rectAtFit.h = r.height;
      }
      return true;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const css = (name: string, fb: string) => {
      try {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
      } catch { return fb; }
    };
    void css;
    let theme = { fg: "#e8ebf7", muted: "#8b90a7", accent: "#8fa3ff", icy: "#57c7d4", ok: "#7fd08a", violet: "#a79dff", amber: "#d9a441", ghost: "#5b6072", border: "#2a2f45", edge: "#3a4059", bg: "#0d0f14" };
    let frames = 0;
    const refreshTheme = () => {
      const light = document.documentElement.dataset.theme === "light";
      theme = light
        ? { fg: "#2a2d3a", muted: "#8b8578", accent: "#4653b0", icy: "#2a7d8c", ok: "#3f7d4e", violet: "#5b4fa8", amber: "#9a6a1f", ghost: "#a8a396", border: "#d5d2c6", edge: "#5f5a4c", bg: "#f4f2ec" }
        : { fg: "#e8ebf7", muted: "#8b90a7", accent: "#8fa3ff", icy: "#57c7d4", ok: "#7fd08a", violet: "#a79dff", amber: "#d9a441", ghost: "#5b6072", border: "#2a2f45", edge: "#3a4059", bg: "#0d0f14" };
    };
    refreshTheme();

    const clusterColor = (c: Cluster) =>
      c === "research" ? theme.icy : c === "oss" ? theme.ok : c === "practice" ? theme.muted
        : c === "collab" ? theme.violet : c === "systems" ? theme.amber : c === "ghost" ? theme.ghost : theme.accent;

    // shortest conceptual path between two pinned nodes (BFS, undirected)
    const adj = new Map<string, string[]>();
    for (const l of LINKS) {
      const a = typeof l.source === "string" ? l.source : (l.source as GNode).id;
      const b = typeof l.target === "string" ? l.target : (l.target as GNode).id;
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a)!.push(b);
      adj.get(b)!.push(a);
    }
    const pathBetween = (a: string, b: string): Set<string> => {
      const prev = new Map<string, string | null>([[a, null]]);
      const q = [a];
      while (q.length) {
        const cur = q.shift()!;
        if (cur === b) break;
        for (const nb of adj.get(cur) ?? []) {
          if (!prev.has(nb)) { prev.set(nb, cur); q.push(nb); }
        }
      }
      const out = new Set<string>();
      if (!prev.has(b)) return out;
      let cur: string | null = b;
      while (cur) { out.add(cur); cur = prev.get(cur) ?? null; }
      return out;
    };

    const toScreen = (x: number, y: number) => {
      const v = viewRef.current;
      return [(x - v.x) * v.k + W / 2, (y - v.y) * v.k + H / 2];
    };
    const toWorld = (sx: number, sy: number) => {
      const v = viewRef.current;
      return [(sx - W / 2) / v.k + v.x, (sy - H / 2) / v.k + v.y];
    };

    // label metrics (same 11px monospace geometry as draw) — used by fit
    // bounds AND screen-space label hit-testing.
    ctx.font = "11px monospace";
    const labelW = new Map<string, number>();
    for (const n of NODES) {
      try { labelW.set(n.id, ctx.measureText(n.label).width); }
      catch { labelW.set(n.id, n.label.length * 6.6); }
    }
    const FLAG_LABEL_MAX = Math.max(...NODES.filter((n) => n.size === "flagship").map((n) => labelW.get(n.id) ?? 60));

    // fit-to-content: bounds over node centers, expanded by label extents
    // (screen-space labels cost world = px/k — iterate to convergence),
    // padded so no node or label touches the viewport edge.
    // 100% = this canonical fitted view.
    // margins stay proportional (~11% each side → ~78% occupancy) on any viewport.
    const PAD = () => Math.min(130, W * 0.11, H * 0.11);
    const fit = () => {
      if (!W || !H) return;
      const pad = PAD();
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const n of nodes) {
        if (n.x == null || n.y == null) continue;
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      }
      if (!isFinite(minX)) return;
      let k = 1;
      for (let i = 0; i < 3; i++) {
        const showAll = k > 1.35;
        const lw = (showAll
          ? Math.max(...nodes.map((n) => labelW.get(n.id) ?? 60))
          : FLAG_LABEL_MAX) + 16;
        const needW = (maxX - minX) + lw / k + (pad * 2) / k;
        const needH = (maxY - minY) + 44 / k + (pad * 2) / k;
        k = Math.min(W / Math.max(1, needW), H / Math.max(1, needH));
      }
      k = Math.min(2, Math.max(0.3, k));
      // center on the MASS (median — robust to far-left ghost outliers),
      // clamped so the padded extremes still stay inside the viewport.
      // bounds-centering a skewed distribution is what pushed the story right.
      const med = (vs: number[]) => {
        const s = [...vs].sort((a, b) => a - b);
        return s[Math.floor(s.length / 2)] ?? 0;
      };
      const xs = nodes.map((n) => n.x ?? 0), ys = nodes.map((n) => n.y ?? 0);
      const lab = 80 / k; // world-unit allowance for labels + radii
      const hw = (W / 2 - pad) / k, hh = (H / 2 - pad) / k;
      const cx = Math.min(Math.max(med(xs), maxX + lab - hw), minX - lab + hw);
      const cy = Math.min(Math.max(med(ys), maxY + lab - hh), minY - lab + hh);
      viewRef.current = {
        x: hw * 2 >= maxX - minX + lab * 2 ? cx : (minX + maxX) / 2,
        y: hh * 2 >= maxY - minY + lab * 2 ? cy : (minY + maxY) / 2,
        k,
      };
      fitKRef.current = k;
      setFitK(k);
      setZoom(k);
    };
    fitFnRef.current = fit;
    // lifecycle: settle deterministically BEFORE first paint, normalize
    // aspect — but do NOT fit yet. The canonical fit waits for the
    // entrance to settle (animationend / motion-off-immediate), because
    // the .app-open scale animation falsifies the mount-time rect.
    // Positions from sim.tick are layout-independent, so they are final.
    let userView = false;
    const markTouched = () => { userView = true; };
    const settle = () => {
      sim.tick(300);
      // normalize content aspect toward the canvas (conservative, capped):
      // scale positions around the median — never the drawing itself.
      const xs = nodes.map((n) => n.x ?? 0), ys = nodes.map((n) => n.y ?? 0);
      const span = (vs: number[]) => Math.max(1, Math.max(...vs) - Math.min(...vs));
      const target = Math.min(1.75, Math.max(1.5, W / Math.max(1, H)));
      const f = Math.min(1.2, Math.max(0.85, Math.sqrt(target / (span(xs) / span(ys)))));
      const med = (vs: number[]) => [...vs].sort((a, b) => a - b)[Math.floor(vs.length / 2)] ?? 0;
      const mx = med(xs), my = med(ys);
      for (const n of nodes) {
        if (n.x == null || n.y == null) continue;
        n.x = mx + (n.x - mx) * f;
        n.y = my + (n.y - my) / f;
      }
    };
    settle();
    // entrance settling: exactly one of these establishes geometry.
    const settleEntrance = () => {
      if (settled) { measureAndApplyGeometry(); return; }
      settled = true;
      measureAndApplyGeometry();
    };
    const appEl = wrap.closest(".app-open") as HTMLElement | null;
    let animName = "none";
    try { animName = getComputedStyle(appEl ?? wrap).animationName; } catch { /* noop */ }
    if (!appEl || animName === "none") {
      // reduced-motion / no entrance animation: layout is final now.
      settleEntrance();
    } else {
      appEl.addEventListener("animationend", settleEntrance, { once: true });
    }
    // the fit button / "0" key: restore canonical geometry and hand future
    // resizes back to the canonical view (user re-takes over on next pan).
    fitFnRef.current = () => { userView = false; if (settled) measureAndApplyGeometry(); else fit(); };
    // label metrics depend on loaded fonts: recompute + refit (unless the
    // user already took over) once the browser has final text geometry.
    try {
      document.fonts?.ready.then(() => {
        for (const n of NODES) {
          try { labelW.set(n.id, ctx.measureText(n.label).width); } catch { /* keep */ }
        }
        if (!userView) measureAndApplyGeometry();
      });
    } catch { /* noop */ }

    // dev-only pointer diagnostic (§30): ?signal-debug exposes the live
    // view + a world→screen projector so tests drive the REAL event
    // pipeline (mouse.move → at() → nodeAt → hover card). Invisible in
    // production — no DOM, no visual surface.
    const measure = () => {
      const xs = nodes.map((n) => n.x ?? NaN), ys = nodes.map((n) => n.y ?? NaN);
      const scr = nodes.map((n) => (n.x == null || n.y == null ? [NaN, NaN] : toScreen(n.x, n.y)));
      const sx = scr.map((p) => p[0]), sy = scr.map((p) => p[1]);
      const nan = [...xs, ...ys].some((v) => !isFinite(v));
      const wMinX = Math.min(...xs), wMaxX = Math.max(...xs);
      const wMinY = Math.min(...ys), wMaxY = Math.max(...ys);
      const sMinX = Math.min(...sx), sMaxX = Math.max(...sx);
      const sMinY = Math.min(...sy), sMaxY = Math.max(...sy);
      const occX = (sMaxX - sMinX) / Math.max(1, W), occY = (sMaxY - sMinY) / Math.max(1, H);
      const flags = nodes.filter((n) => n.size === "flagship");
      const flagsVisible = flags.filter((n) => {
        const [fx, fy] = toScreen(n.x ?? 0, n.y ?? 0);
        return fx > 0 && fy > 0 && fx < W && fy < H;
      }).length;
      return {
        nan, W: Math.round(W), H: Math.round(H), k: +viewRef.current.k.toFixed(3),
        fitK: +fitKRef.current.toFixed(3),
        world: { minX: r1(wMinX), maxX: r1(wMaxX), minY: r1(wMinY), maxY: r1(wMaxY) },
        screen: { minX: r1(sMinX), maxX: r1(sMaxX), minY: r1(sMinY), maxY: r1(sMaxY) },
        occX: +occX.toFixed(2), occY: +occY.toFixed(2),
        aspect: +((wMaxX - wMinX) / Math.max(1, wMaxY - wMinY)).toFixed(2),
        margins: {
          L: r1(sMinX), R: r1(W - sMaxX), T: r1(sMinY), B: r1(H - sMaxY),
        },
        flagsVisible, flagsTotal: flags.length, nodes: nodes.length,
      };
      function r1(v: number) { return Math.round(v * 10) / 10; }
    };
    const debugMode = (() => {
      try { return new URLSearchParams(window.location.search).has("signal-debug"); }
      catch { return false; }
    })();
    try {
      if (debugMode) {
        (window as unknown as { __signal?: unknown }).__signal = {
          view: viewRef,
          nodes: nodesRef,
          fitK: fitKRef,
          screen: (id: string) => {
            const n = nodesRef.current.find((x) => x.id === id);
            return !n || n.x == null || n.y == null ? null : toScreen(n.x, n.y);
          },
          setView: (x: number, y: number, k: number) => {
            viewRef.current = { x, y, k };
            setZoom(k);
          },
          hover: () => hoverRef.current,
          pct: () => `${Math.round((viewRef.current.k / Math.max(1e-9, fitKRef.current)) * 100)}%`,
          measure,
          geom: () => {
            const r = wrap.getBoundingClientRect();
            const v = viewRef.current;
            return {
              ready: geometryReady, settled, gen: geomGen,
              rect: [Math.round(r.width), Math.round(r.height)],
              client: [cv.clientWidth, cv.clientHeight],
              backing: [cv.width, cv.height],
              dpr, W: Math.round(W), H: Math.round(H),
              fitK: +fitKRef.current.toFixed(3),
              zoom: +v.k.toFixed(3), pan: [+v.x.toFixed(1), +v.y.toFixed(1)],
              rectAtFit: [Math.round(rectAtFit.w), Math.round(rectAtFit.h)],
            };
          },
        };
      }
    } catch { /* noop */ }

    let raf = 0;
    const drawFrame = () => {
      if (document.hidden) { raf = requestAnimationFrame(drawFrame); return; }
      if (++frames % 120 === 0) refreshTheme();
      const v = viewRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, W, H);
      const hov = hoverRef.current, s = selRef.current;
      const focus = hov ?? s;
      const linked = new Set<string>();
      if (focus) {
        linked.add(focus);
        for (const l of links) {
          const a = typeof l.source === "string" ? l.source : (l.source as GNode).id;
          const b = typeof l.target === "string" ? l.target : (l.target as GNode).id;
          if (a === focus) linked.add(b);
          if (b === focus) linked.add(a);
        }
      }
      const pinned = pinsRef.current;
      const path = pinned.length === 2 ? pathBetween(pinned[0], pinned[1]) : new Set<string>();
      const dim = (id: string) => {
        if (path.size > 0) return path.has(id) ? 1 : 0.25;
        return (hov || s) && !linked.has(id) ? 0.45 : 1;
      };
      // edges
      for (const l of links) {
        const a = (typeof l.source === "string" ? nodes.find((n) => n.id === l.source) : l.source)!;
        const b = (typeof l.target === "string" ? nodes.find((n) => n.id === l.target) : l.target)!;
        if (a.x == null || b.x == null) continue;
        const [ax, ay] = toScreen(a.x, a.y!);
        const [bx, by] = toScreen(b.x, b.y!);
        const inPath = path.size > 0 && path.has(a.id) && path.has(b.id);
        const on = !hov && !s && path.size === 0 ? true : linked.has(a.id) && linked.has(b.id);
        ctx.globalAlpha = inPath ? 1 : on ? 1 : 0.15;
        ctx.strokeStyle = inPath ? theme.accent : theme.edge;
        ctx.lineWidth = inPath ? 2.2 : 1.6;
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
        const ghost = n.cluster === "ghost";
        ctx.globalAlpha = dim(n.id) * (ghost ? 0.6 : 1);
        if (isH) {
          ctx.strokeStyle = clusterColor(n.cluster);
          ctx.globalAlpha = 0.5 * dim(n.id);
          ctx.beginPath(); ctx.arc(sx, sy, r + 6, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = dim(n.id) * (ghost ? 0.6 : 1);
        }
        if (pinned.includes(n.id)) {
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx, sy, r + 3, 0, Math.PI * 2); ctx.stroke();
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
      // ?signal-debug ONLY: human visual oracle. Cross = the browser event
      // position (must sit at the custom cursor's logical tip), ENTER/LEAVE
      // circles, line to the picked node + numeric readout. Never drawn in
      // production — the pick radius stays invisible there.
      if (debugMode && dbgEvt.x >= 0) {
        const ex = dbgEvt.x, ey = dbgEvt.y;
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#ff5f5f";
        ctx.beginPath();
        ctx.moveTo(ex - 7, ey); ctx.lineTo(ex + 7, ey);
        ctx.moveTo(ex, ey - 7); ctx.lineTo(ex, ey + 7);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(ex, ey, ENTER, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(ex, ey, LEAVE, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        if (dbgPick.id) {
          const pn = byId.get(dbgPick.id);
          if (pn && pn.x != null && pn.y != null) {
            const [px, py] = toScreen(pn.x, pn.y);
            ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(px, py); ctx.stroke();
          }
        }
        ctx.font = "11px monospace";
        ctx.textAlign = "left";
        ctx.fillStyle = "#ff5f5f";
        const dTxt = dbgPick.d === Infinity ? "—" : `${dbgPick.d.toFixed(1)}px`;
        ctx.fillText(`pointer: ${Math.round(ex)},${Math.round(ey)}`, ex + 36, ey - 30);
        ctx.fillText(`candidate: ${dbgPick.id ?? "none"}`, ex + 36, ey - 16);
        ctx.fillText(`distance: ${dTxt}  enter: ${ENTER}  leave: ${LEAVE}`, ex + 36, ey - 2);
        // BLUE = graph round-trip (event → world → screen). Overlaps red
        // when the view math is self-consistent. NOTE: this cannot catch a
        // stale FIT (fit poisons both directions equally) — the stale-fit
        // detector is rectAtFit-vs-live-rect in geom(), not this cross.
        const [wx, wy] = toWorld(ex, ey);
        const [bx, by] = toScreen(wx, wy);
        ctx.strokeStyle = "#2f6fff";
        ctx.beginPath();
        ctx.moveTo(bx - 5, by); ctx.lineTo(bx + 5, by);
        ctx.moveTo(bx, by - 5); ctx.lineTo(bx, by + 5);
        ctx.stroke();
        // geometry strip: the values that diagnose mount-vs-resize defects
        ctx.fillStyle = "#2f6fff";
        const g = `rect:${Math.round(wrap.clientWidth)}x${Math.round(wrap.clientHeight)} backing:${cv.width}x${cv.height} dpr:${dpr} W/H:${Math.round(W)}/${Math.round(H)} fit:${fitKRef.current.toFixed(2)} gen:${geomGen} ready:${geometryReady ? 1 : 0} fitrect:${Math.round(rectAtFit.w)}x${Math.round(rectAtFit.h)}`;
        ctx.fillText(g, 12, 18);
        ctx.restore();
      }
      raf = requestAnimationFrame(drawFrame);
    };
    raf = requestAnimationFrame(drawFrame);

    // THE authoritative pointer→canvas conversion (§29): exactly one path.
    // clientX/Y are viewport-space; the canvas rect is viewport-space; their
    // difference is canvas CSS pixels — the same space draw uses (dpr is
    // folded into setTransform, never into these coordinates). toWorld then
    // inverts the single pan/zoom view. Never mix pageX/pageY/offsetX here.
    const at = (e: PointerEvent | WheelEvent | MouseEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    // Obsidian-like magnetic proximity picker: ONE rule for hover, click,
    // double-click, shift+click and drag start. Nearest node in SCREEN space
    // inside ENTER wins — zoom never changes targetability, label rects play
    // no part. Hysteresis: an active node holds until past LEAVE or a rival
    // is materially closer (no 1px Voronoi flicker). Linear scan: ~39 nodes.
    const ENTER = 24, LEAVE = 32, SWITCH_MARGIN = 4;
    let activeId: string | null = null;
    const dbgEvt = { x: -1, y: -1 };
    const dbgPick: { id: string | null; d: number } = { id: null, d: Infinity };
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const pickNode = (sx: number, sy: number): GNode | null => {
      let best: GNode | null = null, bd = Infinity;
      for (const n of nodes) {
        if (n.x == null || n.y == null) continue;
        const [nx, ny] = toScreen(n.x, n.y);
        const d = Math.hypot(sx - nx, sy - ny);
        if (d < bd) { bd = d; best = n; }
      }
      return bd <= ENTER ? best : null;
    };
    const hoverPick = (sx: number, sy: number): GNode | null => {
      const dists = new Map<string, number>();
      let best: GNode | null = null, bd = Infinity;
      for (const n of nodes) {
        if (n.x == null || n.y == null) continue;
        const [nx, ny] = toScreen(n.x, n.y);
        const d = Math.hypot(sx - nx, sy - ny);
        dists.set(n.id, d);
        if (d < bd) { bd = d; best = n; }
      }
      if (!best) { activeId = null; }
      else if (activeId == null) {
        if (bd <= ENTER) activeId = best.id;
      } else {
        const ad = dists.get(activeId);
        if (ad == null || ad > LEAVE) {
          activeId = bd <= ENTER ? best.id : null;
        } else if (best.id !== activeId && bd <= ENTER && bd < ad - SWITCH_MARGIN) {
          activeId = best.id;
        }
      }
      const act = activeId ? byId.get(activeId) ?? null : null;
      dbgPick.id = activeId;
      dbgPick.d = activeId ? dists.get(activeId) ?? Infinity : Infinity;
      return act;
    };
    const setPointerCursor = (on: boolean) => {
      if (on) cv.classList.add("cursor-pointer");
      else cv.classList.remove("cursor-pointer");
    };

    let dragNode: GNode | null = null;
    let panning = false, lx = 0, ly = 0, moved = false;
    const onDown = (e: PointerEvent) => {
      if (!settled) settleEntrance();
      if (!geometryReady) return;
      markTouched();
      cv.setPointerCapture(e.pointerId);
      const p = at(e);
      dragNode = pickNode(p.x, p.y);
      if (dragNode) {
        activeId = dragNode.id;
        setPointerCursor(true);
        sim.alphaTarget(0.15).restart();
        dragNode.fx = dragNode.x; dragNode.fy = dragNode.y;
      } else { panning = true; lx = p.x; ly = p.y; }
      moved = false;
    };
    const onMove = (e: PointerEvent) => {
      const p = at(e);
      dbgEvt.x = p.x; dbgEvt.y = p.y;
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
        const n = geometryReady ? hoverPick(p.x, p.y) : null;
        setPointerCursor(!!n);
        setHover(n ? n.id : null);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (dragNode) {
        dragNode.fx = null; dragNode.fy = null;
        sim.alphaTarget(0);
        if (!moved) {
          if (e.shiftKey) {
            const id = dragNode.id;
            setPins((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps.slice(-1), id]));
            sound.tick(1);
          } else {
            setSel(dragNode.id);
            // pry comments on the node — unique line per flagship/cluster
            try {
              const n = nodes.find((x) => x.id === dragNode!.id);
              if (n) window.dispatchEvent(new CustomEvent("pry-say", { detail: openLineForNode(n.id, n.label, n.cluster) }));
            } catch { /* noop */ }
          }
        }
        dragNode = null;
      } else if (panning) {
        panning = false;
        if (!moved) { setSel(null); setPins([]); }
      }
      setPointerCursor(!!hoverPick(dbgEvt.x, dbgEvt.y));
      void e;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!settled) settleEntrance();
      if (!geometryReady) return;
      markTouched();
      const v = viewRef.current;
      const p = at(e);
      const [wx, wy] = toWorld(p.x, p.y);
      v.k = Math.min(3, Math.max(0.3, v.k * (e.deltaY < 0 ? 1.12 : 0.89)));
      v.x = wx - (p.x - W / 2) / v.k;
      v.y = wy - (p.y - H / 2) / v.k;
      setZoom(Math.round(v.k * 100) / 100);
    };
    const onDbl = (e: MouseEvent) => {
      const p = at(e);
      const n = pickNode(p.x, p.y);
      if (n) open(n.id);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selRef.current) open(selRef.current);
      if (e.key === "Escape") { setSel(null); setPins([]); }
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

  const cardId = sel ?? hover;
  const selNode = NODES.find((n) => n.id === cardId);
  const selLinks = cardId ? LINKS.filter((l) => l.source === cardId || l.target === cardId) : [];
  const legend: { c: string; label: string }[] = [
    { c: "var(--accent)", label: "personal" },
    { c: "#8b7fd4", label: "team" },
    { c: "#57c7d4", label: "research" },
    { c: "#7fd08a", label: "oss" },
    { c: "#8b90a7", label: "practice" },
    { c: "#c9982f", label: "systems" },
    { c: "#5b6072", label: "history" },
  ];
  return (
    <div className="h-full flex flex-col min-h-0" aria-label="signal knowledge graph">
      <div className="px-4 py-2 text-[12.5px] border-b shrink-0 flex items-center gap-3 flex-wrap" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        <span className="font-bold" style={{ color: "var(--fg)" }}>SIGNAL</span>
        <span className="hidden sm:inline">drag to move · wheel to zoom · double-click opens · shift+click pins a path</span>
        <span className="hidden md:flex items-center gap-2 ml-2">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1 text-[11px]">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: l.c }} />{l.label}
            </span>
          ))}
        </span>
        <span className="ml-auto tabular-nums" title="zoom relative to fitted view">{fitK > 0 ? `${Math.round((zoom / fitK) * 100)}%` : "…"}</span>
        <button title="fit graph to view (0)" aria-label="fit graph" className="px-2 hover:bg-[var(--sel-bg)]"
          style={{ color: "var(--muted)" }} onClick={() => { fitFnRef.current(); sound.tick(1); }}>
          <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>fit</span>
        </button>
        <button title="hide to desktop" aria-label="minimize" className="px-2 hover:bg-[var(--sel-bg)]"
          style={{ color: "var(--muted)" }} onClick={() => { useShell.getState().setPhase("desktop"); }}>
          <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>–</span>
        </button>
      </div>
      <div ref={wrapRef} className="flex-1 min-h-0 relative">
        <canvas ref={canvasRef} tabIndex={0} aria-label="graph canvas" data-nodes={NODES.length}
          onKeyDown={(e) => {
            if (e.key !== "]" && e.key !== "[" && e.key !== "Enter" && e.key !== "0") return;
            e.preventDefault();
            if (e.key === "0") { fitFnRef.current(); sound.tick(1); return; }
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
            <div className="font-bold text-[13px]" style={{ color: "var(--fg)" }}>
              {selNode.label}
              {selNode.cluster === "ghost" && <span className="ml-2 text-[10.5px] font-normal" style={{ color: "var(--muted)" }}>history node</span>}
            </div>
            <div>{selNode.detail}</div>
            {selLinks.map((l) => (
              <div key={`${l.source}-${l.target}`} style={{ color: "var(--muted)" }}>
                {l.source === cardId ? "→" : "←"} {l.source === cardId ? l.target : l.source} · {l.why}
              </div>
            ))}
            <button className="px-2 py-1 border text-[11.5px]" style={{ borderColor: "var(--accent)", color: "var(--accent-soft)" }}
              onClick={() => open(selNode.id)}>
              {selNode.cluster === "ghost" ? "open successor ↵" : "open in workstation ↵"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
