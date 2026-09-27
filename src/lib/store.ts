import { create } from "zustand";
import { HOME } from "@/vfs/vfs";

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
  kind: "term" | "agent";
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
  // buffers
  openBuffers: string[];
  activeBuffer: string | null;
  recent: string[];
  // explorer + sizes
  expanded: string[];
  explorerWidth: number;
  dockWidth: number;
  // dock + terminals
  dockTabs: DockTab[];
  activeDock: string | null;
  terms: Record<string, TermSession>;
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
  theme: "dark" | "light";
  settings: Settings;
  toasts: Toast[];
  lastEntity: string | null;
  lastIntent: string | null;

  setPhase: (p: Phase) => void;
  setDesktopWs: (w: 1 | 2 | 3) => void;
  navTo: (path: string) => void;
  navBack: () => void;
  navFwd: () => void;
  setSelected: (p: string | null) => void;
  setPreview: (p: string | null) => void;
  openFile: (path: string, kind: string) => void;
  closeBuffer: (path: string) => void;
  setExpanded: (paths: string[]) => void;
  toggleExpand: (path: string) => void;
  ensureVisible: (path: string) => void;
  setExplorerWidth: (n: number) => void;
  setDockWidth: (n: number) => void;
  openDock: (kind: "term" | "agent") => void;
  closeDock: (id: string) => void;
  setActiveDock: (id: string | null) => void;
  termNew: () => string;
  termAppend: (id: string, lines: TermLine[]) => void;
  termSetCwd: (id: string, cwd: string) => void;
  termHist: (id: string, cmd: string) => void;
  termClear: (id: string) => void;
  setMode: (m: Mode) => void;
  toggle: (k: "paletteOpen" | "helpOpen" | "contactOpen" | "settingsOpen" | "appMaximized") => void;
  setPet: (on: boolean) => void;
  setPetMode: (m: PetMode) => void;
  setTheme: (t: "dark" | "light") => void;
  setSettings: (s: Partial<Settings>) => void;
  notify: (text: string) => void;
  dismissToast: (id: number) => void;
  setAssistantCtx: (entity: string | null, intent: string | null) => void;
}

let toastId = 0;
let termId = 0;
let dockId = 0;

function loadSettings(): Settings {
  const base: Settings = { motion: true, vimKeys: false, sound: true, ambient: false, volume: 0.35, petRoam: true, petSize: 1 };
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
  openBuffers: [],
  activeBuffer: null,
  recent: [],
  expanded: [HOME],
  explorerWidth: 240,
  dockWidth: 380,
  dockTabs: [],
  activeDock: null,
  terms: {},
  mode: "BROWSE",
  paletteOpen: false,
  helpOpen: false,
  contactOpen: false,
  settingsOpen: false,
  appMaximized: true,
  petOn: true,
  petMode: "idle",
  theme: "dark",
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
        selected: null, preview: null,
      };
    }),
  navBack: () =>
    set((s) => {
      if (s.navIndex <= 0) return {};
      const path = s.navHistory[s.navIndex - 1];
      return { navIndex: s.navIndex - 1, cwd: path, selected: null, preview: null };
    }),
  navFwd: () =>
    set((s) => {
      if (s.navIndex >= s.navHistory.length - 1) return {};
      const path = s.navHistory[s.navIndex + 1];
      return { navIndex: s.navIndex + 1, cwd: path, selected: null, preview: null };
    }),
  setSelected: (p) => set({ selected: p }),
  setPreview: (p) => set({ preview: p }),
  openFile: (path, kind) =>
    set((s) => {
      if (kind === "dir") {
        if (path === s.cwd) return {};
        const hist = [...s.navHistory.slice(0, s.navIndex + 1), path];
        return { cwd: path, navHistory: hist.slice(-50), navIndex: Math.min(s.navIndex + 1, 49), expanded: [...new Set([...s.expanded, ...ancestorsOf(path), path])] };
      }
      const bufs = s.openBuffers.includes(path) ? s.openBuffers : [...s.openBuffers, path].slice(-12);
      const parent = parentOf(path);
      const hist = [...s.navHistory.slice(0, s.navIndex + 1), parent];
      return {
        openBuffers: bufs, activeBuffer: path,
        recent: [path, ...s.recent.filter((r) => r !== path)].slice(0, 10),
        cwd: parent, navHistory: hist.slice(-50), navIndex: Math.min(s.navIndex + 1, 49),
        expanded: [...new Set([...s.expanded, ...ancestorsOf(path)])],
        selected: path, preview: path,
      };
    }),
  closeBuffer: (path) =>
    set((s) => {
      const bufs = s.openBuffers.filter((b) => b !== path);
      const i = s.openBuffers.indexOf(path);
      const next = s.activeBuffer === path ? (bufs[Math.min(i, bufs.length - 1)] ?? null) : s.activeBuffer;
      return { openBuffers: bufs, activeBuffer: next };
    }),
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
      if (kind === "agent") {
        const ex = s.dockTabs.find((t) => t.kind === "agent");
        if (ex) return { activeDock: ex.id };
        const id = `dock-${++dockId}`;
        return { dockTabs: [...s.dockTabs, { id, kind, title: "agent" }], activeDock: id };
      }
      const id = `dock-${++dockId}`;
      const sid = `term-${++termId}`;
      const terms = { ...s.terms, [sid]: { id: sid, cwd: s.cwd, history: [], lines: [{ text: "workstation-shell · type help", kind: "dim" as const }] } };
      const n = s.dockTabs.filter((t) => t.kind === "term").length + 1;
      return { dockTabs: [...s.dockTabs, { id, kind, sessionId: sid, title: `terminal ${n}` }], activeDock: id, terms };
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
    if (document.documentElement.dataset.theme === "light") useShell.setState({ theme: "light" });
    if (localStorage.getItem("deepnar-pet") === "off") useShell.setState({ petOn: false });
    useShell.setState({ settings: loadSettings(), explorerWidth: num("deepnar-explorer-w", 240), dockWidth: num("deepnar-dock-w", 380) });
  } catch {
    /* private mode */
  }
}
