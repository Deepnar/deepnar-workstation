import { create } from "zustand";

export type WorkspaceId = "home" | "projects" | "research" | "oss" | "about" | "notes" | "contact" | "ai";
export type Mode = "NORMAL" | "INSERT" | "COMMAND" | "SEARCH";

interface ShellState {
  booted: boolean;
  workspace: WorkspaceId;
  project: string | null; // active project slug
  cwd: string;
  mode: Mode;
  terminalOpen: boolean;
  aiOpen: boolean;
  explorerOpen: boolean;
  paletteOpen: boolean;
  overviewOpen: boolean;
  helpOpen: boolean;
  petOn: boolean;
  petMood: "idle" | "alert" | "thinking" | "sleep";
  theme: "dark" | "light";
  lastIntent: string | null;
  boot: () => void;
  go: (w: WorkspaceId, project?: string | null) => void;
  setCwd: (cwd: string) => void;
  setMode: (m: Mode) => void;
  toggle: (k: "terminalOpen" | "aiOpen" | "explorerOpen" | "paletteOpen" | "overviewOpen" | "helpOpen") => void;
  setPet: (on: boolean) => void;
  setPetMood: (m: ShellState["petMood"]) => void;
  setTheme: (t: "dark" | "light") => void;
  setLastIntent: (s: string | null) => void;
}

export const useShell = create<ShellState>((set) => ({
  booted: false,
  workspace: "home",
  project: null,
  cwd: "~",
  mode: "NORMAL",
  terminalOpen: true,
  aiOpen: false,
  explorerOpen: true,
  paletteOpen: false,
  overviewOpen: false,
  helpOpen: false,
  // Server-safe defaults (match SSR); real values hydrate on mount in page.tsx.
  petOn: true,
  petMood: "idle",
  theme: "dark",
  lastIntent: null,
  boot: () => set({ booted: true }),
  go: (w, project = null) =>
    set((s) => ({
      workspace: w,
      project: w === "projects" ? (project ?? s.project) : project,
      cwd: project ? `~/projects/${project}` : w === "home" ? "~" : `~/${w}`,
      overviewOpen: false,
      paletteOpen: false,
    })),
  setCwd: (cwd) => set({ cwd }),
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
  setTheme: (t) => {
    try {
      localStorage.setItem("deepnar-theme", t);
      document.documentElement.dataset.theme = t;
    } catch {
      /* private mode */
    }
    set({ theme: t });
  },
  setLastIntent: (s) => set({ lastIntent: s }),
}));

export const workspacePath = (w: WorkspaceId, project?: string | null) =>
  project ? `~/projects/${project}` : w === "home" ? "~" : `~/${w}`;
