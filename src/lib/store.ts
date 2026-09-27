import { create } from "zustand";
import { HOME } from "@/vfs/vfs";

export type Phase = "boot" | "greeter" | "desktop" | "app";
export type WorkspaceId = "home" | "projects" | "research" | "git" | "profile";
export type Mode = "BROWSE" | "TERMINAL" | "COMMAND" | "SEARCH" | "AGENT";
export type PetMood = "idle" | "alert" | "thinking" | "sleep" | "peek";
export type PetAnchor = "desktop" | "status";

export interface Settings {
  motion: boolean;
  vimKeys: boolean;
  sound: boolean;
  ambient: boolean;
  volume: number; // 0..1
}

export interface Toast {
  id: number;
  text: string;
}

const DEFAULTS: Record<WorkspaceId, string> = {
  home: HOME,
  projects: `${HOME}/projects`,
  research: `${HOME}/research`,
  git: `${HOME}/oss`,
  profile: `${HOME}/about`,
};

export function workspaceFor(path: string): WorkspaceId {
  if (path.startsWith(`${HOME}/projects`)) return "projects";
  if (path.startsWith(`${HOME}/research`)) return "research";
  if (path.startsWith(`${HOME}/oss`)) return "git";
  return "profile";
}

interface ShellState {
  phase: Phase;
  workspace: WorkspaceId;
  lastPath: Record<WorkspaceId, string>;
  cwd: string;
  openBuffers: string[];
  activeBuffer: string | null;
  recent: string[];
  mode: Mode;
  terminalOpen: boolean;
  aiOpen: boolean;
  explorerOpen: boolean;
  paletteOpen: boolean;
  overviewOpen: boolean;
  helpOpen: boolean;
  contactOpen: boolean;
  settingsOpen: boolean;
  appMaximized: boolean;
  petOn: boolean;
  petMood: PetMood;
  petAnchor: PetAnchor;
  theme: "dark" | "light";
  settings: Settings;
  toasts: Toast[];
  lastIntent: string | null;

  setPhase: (p: Phase) => void;
  go: (w: WorkspaceId, path?: string) => void;
  setCwd: (cwd: string) => void;
  openFile: (path: string, kind: string) => void;
  closeBuffer: (path: string) => void;
  cycleBuffer: (dir: 1 | -1) => void;
  setMode: (m: Mode) => void;
  toggle: (k: "terminalOpen" | "aiOpen" | "explorerOpen" | "paletteOpen" | "overviewOpen" | "helpOpen" | "contactOpen" | "settingsOpen" | "appMaximized") => void;
  setPet: (on: boolean) => void;
  setPetMood: (m: PetMood) => void;
  setPetAnchor: (a: PetAnchor) => void;
  setTheme: (t: "dark" | "light") => void;
  setSettings: (s: Partial<Settings>) => void;
  notify: (text: string) => void;
  dismissToast: (id: number) => void;
  setLastIntent: (s: string | null) => void;
}

let toastId = 0;

function loadSettings(): Settings {
  const base: Settings = { motion: true, vimKeys: false, sound: true, ambient: false, volume: 0.5 };
  try {
    const raw = localStorage.getItem("deepnar-settings");
    if (raw) return { ...base, ...JSON.parse(raw) };
  } catch {
    /* defaults */
  }
  return base;
}

export const useShell = create<ShellState>((set) => ({
  phase: "boot",
  workspace: "home",
  lastPath: { ...DEFAULTS },
  cwd: HOME,
  openBuffers: [],
  activeBuffer: null,
  recent: [],
  mode: "BROWSE",
  terminalOpen: true,
  aiOpen: false,
  explorerOpen: true,
  paletteOpen: false,
  overviewOpen: false,
  helpOpen: false,
  contactOpen: false,
  settingsOpen: false,
  appMaximized: true,
  petOn: true,
  petMood: "idle",
  petAnchor: "status",
  theme: "dark",
  settings: { motion: true, vimKeys: false, sound: true, ambient: false, volume: 0.5 },
  toasts: [],
  lastIntent: null,

  setPhase: (p) => set({ phase: p, overviewOpen: false, paletteOpen: false }),
  go: (w, path) =>
    set((s) => {
      const target = path ?? s.lastPath[w] ?? DEFAULTS[w];
      // buffers are global; the main view follows the workspace —
      // park a foreign buffer instead of showing stale content.
      const park = s.activeBuffer && workspaceFor(s.activeBuffer) !== w;
      return {
        workspace: w, cwd: target,
        lastPath: { ...s.lastPath, [w]: target },
        ...(park ? { activeBuffer: null } : {}),
        overviewOpen: false, paletteOpen: false,
      };
    }),
  setCwd: (cwd) =>
    set((s) => ({ cwd, lastPath: { ...s.lastPath, [s.workspace]: cwd } })),
  openFile: (path, kind) =>
    set((s) => {
      if (kind === "dir") {
        return { cwd: path, lastPath: { ...s.lastPath, [s.workspace]: path }, workspace: workspaceFor(path) };
      }
      const bufs = s.openBuffers.includes(path) ? s.openBuffers : [...s.openBuffers, path].slice(-12);
      const parent = path.slice(0, path.lastIndexOf("/")) || HOME;
      return {
        openBuffers: bufs, activeBuffer: path,
        recent: [path, ...s.recent.filter((r) => r !== path)].slice(0, 10),
        cwd: parent, workspace: workspaceFor(path),
        lastPath: { ...s.lastPath, [workspaceFor(path)]: parent },
      };
    }),
  closeBuffer: (path) =>
    set((s) => {
      const bufs = s.openBuffers.filter((b) => b !== path);
      return { openBuffers: bufs, activeBuffer: s.activeBuffer === path ? (bufs[bufs.length - 1] ?? null) : s.activeBuffer };
    }),
  cycleBuffer: (dir) =>
    set((s) => {
      if (s.openBuffers.length < 2) return {};
      const i = s.openBuffers.indexOf(s.activeBuffer ?? "");
      const n = (i + dir + s.openBuffers.length) % s.openBuffers.length;
      const path = s.openBuffers[n];
      const parent = path.slice(0, path.lastIndexOf("/")) || HOME;
      return { activeBuffer: path, cwd: parent };
    }),
  setMode: (m) => set({ mode: m }),
  toggle: (k) =>
    set((s) => {
      const next = !s[k];
      if (k === "terminalOpen") {
        try {
          localStorage.setItem("deepnar-terminal", next ? "open" : "closed");
        } catch {
          /* private mode */
        }
      }
      return { [k]: next } as Partial<ShellState>;
    }),
  setPet: (on) => {
    try {
      localStorage.setItem("deepnar-pet", on ? "on" : "off");
    } catch {
      /* private mode */
    }
    set({ petOn: on });
  },
  setPetMood: (m) => set({ petMood: m }),
  setPetAnchor: (a) => set({ petAnchor: a }),
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
  setLastIntent: (s) => set({ lastIntent: s }),
}));

export function hydratePrefs() {
  try {
    if (document.documentElement.dataset.theme === "light") useShell.setState({ theme: "light" });
    if (localStorage.getItem("deepnar-pet") === "off") useShell.setState({ petOn: false });
    useShell.setState({ settings: loadSettings() });
    if (window.innerWidth < 768 && localStorage.getItem("deepnar-terminal") === null) useShell.setState({ terminalOpen: false });
  } catch {
    /* private mode */
  }
}

export { DEFAULTS };
