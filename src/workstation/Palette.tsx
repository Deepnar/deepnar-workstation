"use client";

// Telescope-style finder: files · projects · research · PRs · commands · actions.
import { useEffect, useMemo, useRef, useState } from "react";
import { useShell, type WorkspaceId } from "@/lib/store";
import { HOME, flatten, shortPath, type VNode } from "@/vfs/vfs";
import { sound } from "@/audio/engine";

interface Item {
  label: string;
  path: string;
  cat: string;
  node?: VNode;
  run?: () => void;
}

function fuzzy(q: string, s: string): boolean {
  q = q.toLowerCase();
  s = s.toLowerCase();
  let i = 0;
  for (const c of s) {
    if (c === q[i]) i++;
    if (i === q.length) return true;
  }
  return i === q.length;
}

export function Palette() {
  const { paletteOpen, toggle, go, openFile, notify, setTheme, theme } = useShell();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      setIdx(0);
      useShell.getState().setMode("COMMAND");
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      useShell.getState().setMode("BROWSE");
    }
  }, [paletteOpen]);

  const items: Item[] = useMemo(() => {
    const s = useShell.getState();
    const files: Item[] = flatten()
      .filter((n) => n.path !== HOME)
      .map((n) => ({
        label: n.title ?? n.name,
        path: shortPath(n.path),
        cat: n.path.includes("/projects/") ? "project" : n.path.includes("/research/") ? "research" : n.path.includes("/oss/") ? "oss" : n.kind === "dir" ? "dir" : "file",
        node: n,
      }));
    const cmds: Item[] = (
      [
        ["toggle terminal", () => s.toggle("terminalOpen")],
        ["ask about current context", () => { if (!s.aiOpen) s.toggle("aiOpen"); }],
        ["contact", () => s.toggle("contactOpen")],
        ["settings", () => s.toggle("settingsOpen")],
        ["help / keybindings", () => s.toggle("helpOpen")],
        ["overview", () => s.toggle("overviewOpen")],
        ["resume (open pdf)", () => s.openFile(`${HOME}/resume.pdf`, "pdf")],
        ["resume (download)", () => s.notify("resume downloaded")],
        [`theme → ${theme === "dark" ? "light" : "dark"}`, () => { s.setTheme(theme === "dark" ? "light" : "dark"); sound.relay(); }],
        ["pet on/off", () => s.setPet(!s.petOn)],
        ["workspace: home", () => s.go("home" as WorkspaceId)],
        ["workspace: projects", () => s.go("projects" as WorkspaceId)],
        ["workspace: research", () => s.go("research" as WorkspaceId)],
        ["workspace: oss", () => s.go("git" as WorkspaceId)],
        ["workspace: profile", () => s.go("profile" as WorkspaceId)],
      ] as [string, () => void][]
    ).map(([label, run]) => ({ label, path: "action", cat: "command", run }));
    const all = [...cmds, ...files];
    if (!q.trim()) {
      const rec = s.recent.slice(0, 4).map((r) => all.find((a) => a.node?.path === r)).filter(Boolean) as Item[];
      return [...rec, ...cmds.slice(0, 6)];
    }
    return all.filter((a) => fuzzy(q, `${a.label} ${a.path}`)).slice(0, 16);
  }, [q, theme]);

  useEffect(() => setIdx(0), [q]);
  if (!paletteOpen) return null;

  const pick = (it: Item) => {
    sound.select();
    toggle("paletteOpen");
    if (it.run) it.run();
    else if (it.node) openFile(it.node.path, it.node.kind);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center pt-[12vh] px-4" role="dialog" aria-modal="true" aria-label="finder">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => toggle("paletteOpen")} />
      <div className="relative w-full max-w-xl h-fit border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--accent)", boxShadow: "0 12px 48px rgba(0,0,0,0.5)" }}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
            if (e.key === "Enter" && items[idx]) pick(items[idx]);
            if (e.key === "Escape") toggle("paletteOpen");
          }}
          placeholder="find files · projects · PRs · commands"
          aria-label="finder input"
          className="w-full px-4 py-3 text-[13.5px] bg-transparent outline-none border-b"
          style={{ color: "var(--fg)", borderColor: "var(--border)" }}
        />
        <div className="max-h-80 overflow-auto py-1" role="listbox">
          {items.map((it, i) => (
            <button
              key={`${it.path}-${it.label}`}
              role="option"
              aria-selected={i === idx}
              onMouseEnter={() => setIdx(i)}
              onClick={() => pick(it)}
              className="w-full flex items-center gap-3 px-4 py-[7px] text-left text-[12.5px]"
              style={{ background: i === idx ? "var(--sel-bg)" : "transparent" }}
            >
              <span className="w-16 shrink-0 text-[10.5px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>{it.cat}</span>
              <span className="flex-1 min-w-0 truncate" style={{ color: i === idx ? "var(--accent-soft)" : "var(--fg-dim)" }}>{it.label}</span>
              <span className="text-[11px] truncate max-w-[220px]" style={{ color: "var(--muted)" }}>{it.path}</span>
            </button>
          ))}
          {items.length === 0 && <div className="px-4 py-3 text-[12.5px]" style={{ color: "var(--muted)" }}>no matches — try a filename, project, or PR number</div>}
        </div>
        <div className="px-4 py-1.5 text-[11px] border-t" style={{ color: "var(--muted)", borderColor: "var(--border)" }}>
          ↑↓ navigate · enter open · esc close
        </div>
      </div>
    </div>
  );
}
