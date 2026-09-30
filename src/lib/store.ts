import { create } from "zustand";
import { HOME, findNode } from "@/vfs/vfs";

export type Phase = "boot" | "greeter" | "desktop" | "app";
export type Mode = "BROWSE" | "TERMINAL" | "COMMAND" | "SEARCH" | "AGENT";
export type PetMode = "idle" | "walk" | "sleep" | "thinking" | "working" | "success" | "failed" | "wave";

export interface Settings {
  motion: boolean;
  vimKeys: boolean;
  sound: boolean;
  ambient: boolean;
  volume: number;
  petRoam: boolean;
  petSize: number; // 0.75 | 1 | 1.25
}

export interface Toast {
  id: number;
  text: string;
}

export interface TermLine {
  text: string;
  kind: "cmd" | "out" | "err" | "ok" | "dim";
}

export interface TermSession {
  id: string;
  cwd: string;
  history: string[];
  lines: TermLine[];
}

export interface DockTab {
  id: string;
  kind: "term" | "agent" | "web";
  sessionId?: string;
  title: string;
}

/** portfolio section derived from location — never a navigation model. */
export function sectionFor(path: string): string {
  if (path.startsWith(`${HOME}/projects`)) return "projects";
  if (path.startsWith(`${HOME}/research`)) return "research";
  if (path.startsWith(`${HOME}/oss`)) return "oss";
  if (path === HOME) return "home";
  return "profile";
}

interface ShellState {
  phase: Phase;
  desktopWs: 1 | 2 | 3;
  // navigator
  cwd: string;
  navHistory: string[];
  navIndex: number;
  selected: string | null;
  preview: string | null;
  // buffers (id-keyed tabs; several tabs may show the same path)
  openBuffers: BufTab[];
  activeBuffer: string | null;
  activeTab: string | null;
  mainView: "browser" | "buffer";
  recent: string[];
  // explorer + sizes
  expanded: string[];
  explorerWidth: number;
  dockWidth: number;
  // dock + terminals
  dockTabs: DockTab[];
  activeDock: string | null;
  dockVisible: boolean;
  terms: Record<string, TermSession>;
  listFocusNonce: number;
  sessionEpoch: number;
  // overlays / mode
  mode: Mode;
  paletteOpen: boolean;
  helpOpen: boolean;
  contactOpen: boolean;
  settingsOpen: boolean;
  appMaximized: boolean;
  // pet / theme / settings
  petOn: boolean;
  petMode: PetMode;
  theme: "light";
  settings: Settings;
  toasts: Toast[];
  lastEntity: string | null;
  lastIntent: string | null;

  setPhase: (p: Phase) => void;
  setDesktopWs: (w: 1 | 2 | 3) => void;
  navTo: (path: string) => void;
  navUp: () => void;
  navReplace: (path: string) => void;
  navBack: () => void;
  navFwd: () => void;
  setSelected: (p: string | null) => void;
  setPreview: (p: string | null) => void;
  openFile: (path: string, kind: string, opts?: { inPlace?: boolean }) => void;
  openHomeTab: () => void;
  goHome: () => void;
  activateBuffer: (id: string) => void;
  cycleBuffer: (dir: 1 | -1) => void;
  homeFiles: boolean;
  setHomeFiles: (v: boolean) => void;
  closeBuffer: (id: string) => void;
  setMainView: (v: "browser" | "buffer") => void;
  focusList: () => void;
  setDockVisible: (v: boolean) => void;
  setExpanded: (paths: string[]) => void;
  toggleExpand: (path: string) => void;
  ensureVisible: (path: string) => void;
  setExplorerWidth: (n: number) => void;
  setDockWidth: (n: number) => void;
  openDock: (kind: "term" | "agent" | "web") => void;
  closeDock: (id: string) => void;
  setActiveDock: (id: string | null) => void;
  logout: () => void;
  termNew: () => string;
  termAppend: (id: string, lines: TermLine[]) => void;
  termSetCwd: (id: string, cwd: string) => void;
  termHist: (id: string, cmd: string) => void;
  termClear: (id: string) => void;
  setMode: (m: Mode) => void;
  toggle: (k: "paletteOpen" | "helpOpen" | "contactOpen" | "settingsOpen" | "appMaximized") => void;
  setPet: (on: boolean) => void;
  setPetMode: (m: PetMode) => void;
  setTheme: (t: "light") => void;
  setSettings: (s: Partial<Settings>) => void;
  notify: (text: string) => void;
  dismissToast: (id: number) => void;
  setAssistantCtx: (entity: string | null, intent: string | null) => void;
}

let toastId = 0;
let termId = 0;
let dockId = 0;

function loadSettings(): Settings {
  // OS reduced-motion seeds the default (explicit user toggle still wins
  // once stored — this only applies when no saved preference exists).
  let motion = true;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) motion = false;
  } catch {
    /* SSR / old browsers */
  }
  const base: Settings = { motion, vimKeys: false, sound: true, ambient: false, volume: 0.35, petRoam: true, petSize: 1 };
  try {
    const raw = localStorage.getItem("deepnar-settings");
    if (raw) return { ...base, ...JSON.parse(raw) };
  } catch {
    /* defaults */
  }
  return base;
}

const num = (k: string, fb: number) => {
  try {
    const v = Number(localStorage.getItem(k));
    return Number.isFinite(v) && v > 0 ? v : fb;
  } catch {
    return fb;
  }
};

// buffer tabs: id-keyed so the same location can sit in several tabs
// (alt+t / + always mint a fresh tab, never steal an existing one).
export interface BufTab { id: string; path: string }
let tabSeq = 0;
const newTab = (path: string): BufTab => ({ id: `t${++tabSeq}`, path });

// view sync for landing on / activating a tab (no merging, no history).
function tabView(path: string) {
  if (path === HOME)
    return { activeBuffer: HOME, mainView: "buffer" as const, cwd: HOME, homeFiles: false, selected: null, preview: null };
  const n = findNode(path);
  if (n && n.kind === "dir")
    return { activeBuffer: path, mainView: "browser" as const, cwd: path, selected: null, preview: null };
  return { activeBuffer: path, mainView: "buffer" as const, cwd: parentOf(path), selected: path, preview: path };
}

function activateTab(s: ShellState, id: string) {
  const t = s.openBuffers.find((t) => t.id === id);
  if (!t) return {};
  return { activeTab: id, ...tabView(t.path) };
}

// folder-tab sync: every directory arrival lands on a tab for that dir.
// existing tab → activate; active tab dir-like (dir or HOME) → retitle in
// place (same-tab folder nav); active file → new tab (the file is kept).
function dirTab(s: ShellState, path: string) {
  // HOME is dual-rendered (home tab = HomeView, browser = ~ listing):
  // navigate UP/in-tab from a dir-like tab → retitle in place so the ~
  // listing shows; arrive from a file → land on the HomeView tab.
  if (path === HOME) {
    const at = s.openBuffers.find((t) => t.id === s.activeTab);
    const an = at && at.path !== HOME ? findNode(at.path) : null;
    if (at && (at.path === HOME || !an || an.kind === "dir")) {
      const bufs = s.openBuffers.map((t) => (t.id === at.id ? { ...t, path } : t));
      return { openBuffers: bufs, activeTab: at.id, activeBuffer: path };
    }
    const hit = s.openBuffers.find((t) => t.path === path);
    if (hit) return { activeTab: hit.id, ...tabView(path) };
    const t = newTab(path);
    return { openBuffers: [...s.openBuffers, t].slice(-12), activeTab: t.id, activeBuffer: path };
  }
  const hit = s.openBuffers.find((t) => t.path === path);
  if (hit) return { activeTab: hit.id, ...tabView(path) };
  const at = s.openBuffers.find((t) => t.id === s.activeTab);
  const an = at && at.path !== HOME ? findNode(at.path) : null;
  if (at && (at.path === HOME || !an || an.kind === "dir")) {
    const bufs = s.openBuffers.map((t) => (t.id === at.id ? { ...t, path } : t));
    return { openBuffers: bufs, activeTab: at.id, activeBuffer: path };
  }
  const t = newTab(path);
  return { openBuffers: [...s.openBuffers, t].slice(-12), activeTab: t.id, activeBuffer: path };
}

const parentOf = (p: string) => {
  if (p === HOME) return HOME;
  const i = p.lastIndexOf("/");
  return i <= 0 ? HOME : p.slice(0, i);
};

const ancestorsOf = (p: string): string[] => {
  const out: string[] = [];
  let cur = parentOf(p);
  while (true) {
    out.push(cur);
    if (cur === HOME) break;
    cur = parentOf(cur);
  }
  return out;
};

export const useShell = create<ShellState>((set) => ({
  phase: "boot",
  desktopWs: 1,
  cwd: HOME,
  navHistory: [HOME],
  navIndex: 0,
  selected: null,
  preview: null,
  openBuffers: [{ id: "home", path: HOME }],
  activeBuffer: HOME,
  activeTab: "home",
  mainView: "buffer",
  homeFiles: false,
  recent: [],
  expanded: [HOME],
  explorerWidth: 240,
  dockWidth: 380,
  dockTabs: [],
  activeDock: null,
  dockVisible: false,
  terms: {},
  listFocusNonce: 0,
  sessionEpoch: 0,
  mode: "BROWSE",
  paletteOpen: false,
  helpOpen: false,
  contactOpen: false,
  settingsOpen: false,
  appMaximized: true,
  petOn: true,
  petMode: "idle",
  theme: "light",
  settings: { motion: true, vimKeys: false, sound: true, ambient: false, volume: 0.35, petRoam: true, petSize: 1 },
  toasts: [],
  lastEntity: null,
  lastIntent: null,

  setPhase: (p) => set({ phase: p, paletteOpen: false }),
  setDesktopWs: (w) => set({ desktopWs: w }),
  navTo: (path) =>
    set((s) => {
      if (path === s.cwd) return {};
      const hist = s.navHistory.slice(0, s.navIndex + 1);
      hist.push(path);
      return {
        cwd: path, navHistory: hist.slice(-50), navIndex: Math.min(s.navIndex + 1, 49),
        selected: null, preview: null, mainView: "browser", homeFiles: false,
        ...dirTab(s, path),
      };
    }),
  // up one level — stepping out of a top-level section lands on the ~
  // listing (projects/research/oss/about + root files), not the dashboard.
  navUp: () => {
    const s = useShell.getState();
    if (s.cwd === HOME) return;
    const i = s.cwd.lastIndexOf("/");
    const parent = i <= 0 ? HOME : s.cwd.slice(0, i);
    s.navTo(parent);
    if (parent === HOME) s.setHomeFiles(true);
  },
  // terminal follow: move cwd WITHOUT pushing history, so the
  // back button never has to walk through every cd you ever typed.
  navReplace: (path) =>
    set((s) => {
      if (path === s.cwd) return { mainView: "browser" as const };
      const hist = [...s.navHistory];
      hist[s.navIndex] = path;
      return { cwd: path, navHistory: hist, selected: null, preview: null, mainView: "browser" as const, ...dirTab(s, path) };
    }),
  navBack: () =>
    set((s) => {
      if (s.navIndex <= 0) return {};
      const path = s.navHistory[s.navIndex - 1];
      return { navIndex: s.navIndex - 1, cwd: path, selected: null, preview: null, mainView: "browser", ...dirTab(s, path) };
    }),
  navFwd: () =>
    set((s) => {
      if (s.navIndex >= s.navHistory.length - 1) return {};
      const path = s.navHistory[s.navIndex + 1];
      return { navIndex: s.navIndex + 1, cwd: path, selected: null, preview: null, mainView: "browser", ...dirTab(s, path) };
    }),
  setSelected: (p) => set({ selected: p }),
  setPreview: (p) => set({ preview: p }),
  openFile: (path, kind, opts) =>
    set((s) => {
      if (kind === "dir") {
        if (path === s.cwd && s.activeBuffer === path) return { mainView: "browser" as const };
        const hist = [...s.navHistory.slice(0, s.navIndex + 1), path];
        return { cwd: path, navHistory: hist.slice(-50), navIndex: Math.min(s.navIndex + 1, 49), expanded: [...new Set([...s.expanded, ...ancestorsOf(path), path])], mainView: "browser" as const, selected: null, preview: null, ...dirTab(s, path) };
      }
      // in-place (single click in a listing): the file takes over the
      // current tab instead of minting a new one.
      if (opts?.inPlace && s.activeTab) {
        const bufs = s.openBuffers.map((t) => (t.id === s.activeTab ? { ...t, path } : t));
        const parent = parentOf(path);
        const hist = [...s.navHistory.slice(0, s.navIndex + 1), parent];
        return {
          openBuffers: bufs, activeBuffer: path, mainView: "buffer" as const,
          recent: [path, ...s.recent.filter((r) => r !== path)].slice(0, 10),
          cwd: parent, navHistory: hist.slice(-50), navIndex: Math.min(s.navIndex + 1, 49),
          expanded: [...new Set([...s.expanded, ...ancestorsOf(path)])],
          selected: path, preview: path,
        };
      }
      const hit = s.openBuffers.find((t) => t.path === path);
      if (hit) return { activeTab: hit.id, ...tabView(path) };
      const t = newTab(path);
      const bufs = [...s.openBuffers, t].slice(-12);
      const parent = parentOf(path);
      const hist = [...s.navHistory.slice(0, s.navIndex + 1), parent];
      return {
        openBuffers: bufs, activeTab: t.id, activeBuffer: path, mainView: "buffer" as const,
        recent: [path, ...s.recent.filter((r) => r !== path)].slice(0, 10),
        cwd: parent, navHistory: hist.slice(-50), navIndex: Math.min(s.navIndex + 1, 49),
        expanded: [...new Set([...s.expanded, ...ancestorsOf(path)])],
        selected: path, preview: path,
      };
    }),
  closeBuffer: (id) =>
    set((s) => {
      const i = s.openBuffers.findIndex((t) => t.id === id);
      if (i < 0) return {};
      const bufs = s.openBuffers.filter((t) => t.id !== id);
      // last tab closed → fresh start: a single home tab, never zero tabs.
      if (bufs.length === 0) {
        const t = newTab(HOME);
        return { openBuffers: [t], activeTab: t.id, activeBuffer: HOME, mainView: "buffer" as const, cwd: HOME, navHistory: [HOME], navIndex: 0, selected: null, preview: null, homeFiles: false };
      }
      // closing a background tab leaves the active one (and cwd) alone.
      if (s.activeTab !== id) return { openBuffers: bufs };
      const next = bufs[Math.min(i, bufs.length - 1)];
      return { openBuffers: bufs, activeTab: next.id, ...tabView(next.path) };
    }),
  openHomeTab: () =>
    // always mints a FRESH home tab (alt+t / + never steal an existing one).
    set((s) => {
      const t = newTab(HOME);
      return {
        openBuffers: [...s.openBuffers, t].slice(-12),
        activeTab: t.id,
        activeBuffer: HOME,
        mainView: "buffer" as const,
        cwd: HOME,
        homeFiles: false,
        selected: null,
        preview: null,
        recent: [HOME, ...s.recent.filter((r) => r !== HOME)].slice(0, 10),
      };
    }),
  activateBuffer: (id) =>
    set((s) => activateTab(s, id)),
  goHome: () =>
    // the home button always lands on the HomeView (never the ~ listing):
    // existing home tab → activate; else take over the active tab / mint one.
    set((s) => {
      const hit = s.openBuffers.find((t) => t.path === HOME);
      if (hit) return { activeTab: hit.id, ...tabView(HOME) };
      const at = s.openBuffers.find((t) => t.id === s.activeTab);
      const an = at && at.path !== HOME ? findNode(at.path) : null;
      if (at && (at.path === HOME || !an || an.kind === "dir")) {
        const bufs = s.openBuffers.map((t) => (t.id === at.id ? { ...t, path: HOME } : t));
        return { openBuffers: bufs, activeTab: at.id, ...tabView(HOME) };
      }
      const t = newTab(HOME);
      return { openBuffers: [...s.openBuffers, t].slice(-12), activeTab: t.id, ...tabView(HOME) };
    }),
  cycleBuffer: (dir) =>
    set((s) => {
      if (s.openBuffers.length < 2) return {};
      const i = Math.max(0, s.openBuffers.findIndex((t) => t.id === s.activeTab));
      const next = s.openBuffers[(i + dir + s.openBuffers.length) % s.openBuffers.length];
      return activateTab(s, next.id);
    }),
  setHomeFiles: (v) => set({ homeFiles: v }),
  setMainView: (v) => set({ mainView: v }),
  focusList: () => set((s) => ({ listFocusNonce: s.listFocusNonce + 1 })),
  setDockVisible: (v) => set({ dockVisible: v }),
  setExpanded: (paths) => set({ expanded: paths }),
  toggleExpand: (path) =>
    set((s) => ({ expanded: s.expanded.includes(path) ? s.expanded.filter((e) => e !== path) : [...s.expanded, path] })),
  ensureVisible: (path) =>
    set((s) => ({ expanded: [...new Set([...s.expanded, ...ancestorsOf(path)])] })),
  setExplorerWidth: (n) => {
    try {
      localStorage.setItem("deepnar-explorer-w", String(n));
    } catch {
      /* private mode */
    }
    set({ explorerWidth: n });
  },
  setDockWidth: (n) => {
    try {
      localStorage.setItem("deepnar-dock-w", String(n));
    } catch {
      /* private mode */
    }
    set({ dockWidth: n });
  },
  openDock: (kind) =>
    set((s) => {
      if (kind === "agent" || kind === "web") {
        const ex = s.dockTabs.find((t) => t.kind === kind);
        if (ex) return { activeDock: ex.id, dockVisible: true };
        const id = `dock-${++dockId}`;
        return { dockTabs: [...s.dockTabs, { id, kind, title: kind }], activeDock: id, dockVisible: true };
      }
      const id = `dock-${++dockId}`;
      const sid = `term-${++termId}`;
      const terms = { ...s.terms, [sid]: { id: sid, cwd: s.cwd, history: [], lines: [{ text: "workstation-shell · type help", kind: "dim" as const }] } };
      const n = s.dockTabs.filter((t) => t.kind === "term").length + 1;
      return { dockTabs: [...s.dockTabs, { id, kind, sessionId: sid, title: `terminal ${n}` }], activeDock: id, terms, dockVisible: true };
    }),
  closeDock: (id) =>
    set((s) => {
      const tab = s.dockTabs.find((t) => t.id === id);
      const tabs = s.dockTabs.filter((t) => t.id !== id);
      const terms = { ...s.terms };
      if (tab?.sessionId) delete terms[tab.sessionId];
      return { dockTabs: tabs, activeDock: s.activeDock === id ? (tabs[tabs.length - 1]?.id ?? null) : s.activeDock, terms };
    }),
  setActiveDock: (id) => set({ activeDock: id }),
  logout: () =>
    set((s) => ({
      phase: "greeter",
      cwd: HOME, navHistory: [HOME], navIndex: 0,
      selected: null, preview: null,
      openBuffers: [], activeBuffer: null, mainView: "browser" as const,
      expanded: [HOME],
      dockTabs: [], activeDock: null, dockVisible: false, terms: {},
      mode: "BROWSE" as const,
      paletteOpen: false, helpOpen: false, contactOpen: false, settingsOpen: false,
      petMode: "idle" as const,
      lastEntity: null, lastIntent: null,
      sessionEpoch: s.sessionEpoch + 1,
    })),
  termNew: () => {
    const sid = `term-${++termId}`;
    set((s) => ({ terms: { ...s.terms, [sid]: { id: sid, cwd: s.cwd, history: [], lines: [] } } }));
    return sid;
  },
  termAppend: (id, lines) =>
    set((s) => {
      const t = s.terms[id];
      if (!t) return {};
      return { terms: { ...s.terms, [id]: { ...t, lines: [...t.lines, ...lines].slice(-500) } } };
    }),
  termSetCwd: (id, cwd) =>
    set((s) => {
      const t = s.terms[id];
      if (!t) return {};
      return { terms: { ...s.terms, [id]: { ...t, cwd } } };
    }),
  termHist: (id, cmd) =>
    set((s) => {
      const t = s.terms[id];
      if (!t || !cmd.trim()) return {};
      return { terms: { ...s.terms, [id]: { ...t, history: [cmd, ...t.history].slice(0, 100) } } };
    }),
  termClear: (id) =>
    set((s) => {
      const t = s.terms[id];
      if (!t) return {};
      return { terms: { ...s.terms, [id]: { ...t, lines: [] } } };
    }),
  setMode: (m) => set({ mode: m }),
  toggle: (k) => set((s) => ({ [k]: !s[k] }) as Partial<ShellState>),
  setPet: (on) => {
    try {
      localStorage.setItem("deepnar-pet", on ? "on" : "off");
    } catch {
      /* private mode */
    }
    set({ petOn: on });
  },
  setPetMode: (m) => set({ petMode: m }),
  setTheme: (t) => {
    try {
      localStorage.setItem("deepnar-theme", t);
      document.documentElement.dataset.theme = t;
    } catch {
      /* private mode */
    }
    set({ theme: t });
  },
  setSettings: (patch) =>
    set((s) => {
      const next = { ...s.settings, ...patch };
      try {
        localStorage.setItem("deepnar-settings", JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return { settings: next };
    }),
  notify: (text) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text }] }));
    setTimeout(() => useShell.getState().dismissToast(id), 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setAssistantCtx: (entity, intent) => set({ lastEntity: entity, lastIntent: intent }),
}));

export function hydratePrefs() {
  try {
    document.documentElement.dataset.theme = "light";
    useShell.setState({ theme: "light" });
    if (localStorage.getItem("deepnar-pet") === "off") useShell.setState({ petOn: false });
    useShell.setState({ settings: loadSettings(), explorerWidth: num("deepnar-explorer-w", 240), dockWidth: num("deepnar-dock-w", 380) });
  } catch {
    /* private mode */
  }
}
