"use client";

// Telescope-style finder: files · projects · PRs · commands/actions.
// No workspace actions — sections are locations, not workspaces.
import { useEffect, useMemo, useRef, useState } from "react";
import { useShell } from "@/lib/store";
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
  let i = 0;
  for (const c of s) {
    if (c === q[i]) i++;
    if (i === q.length) return true;
  }
  return i === q.length;
}

function rank(q: string, label: string, path: string): number {
  // lower is better; -1 = no match
  const ql = q.toLowerCase().trim();
  const pl = `${label} ${path}`.toLowerCase();
  const pathl = path.toLowerCase();
  if (!ql) return 0;
  if (pathl === ql || pathl === `${ql}/` || `${pathl}/` === ql) return 0; // exact path
  if (pathl.endsWith(`/${ql}`) || pathl.endsWith(`/${ql}/`)) return 1; // exact final segment
  const base = pathl.split("/").pop() ?? "";
  if (base.startsWith(ql.replace(/^~\//, ""))) return 2; // basename prefix
  if (pathl.includes(ql)) return 3; // path substring
  return fuzzy(ql, pl) ? 4 : -1; // fuzzy fallback
}

const catFor = (n: VNode): string => {
  if (n.path.includes("/oss/")) return "oss";
  if (n.path.includes("/research/")) return "research";
  if (n.path.includes("/collaborations/")) return "team";
  if (n.path.includes("/practice/")) return "practice";
  if (n.path.includes("/projects/")) return "project";
  return n.kind === "dir" ? "dir" : "file";
};

export function Palette() {
  const { paletteOpen, toggle, navTo, openFile } = useShell();
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
        cat: catFor(n),
        node: n,
      }));
    const cmds: Item[] = (
      [
        ["new terminal tab", () => { s.openDock("term"); s.setMode("TERMINAL"); }],
        ["open agent", () => s.openDock("agent")],
        ["contact", () => s.toggle("contactOpen")],
        ["settings", () => s.toggle("settingsOpen")],
        ["help / keybindings", () => s.toggle("helpOpen")],
        ["background (about + evidence)", () => s.navTo(`${HOME}/about`)],
        ["pet on/off", () => s.setPet(!s.petOn)],
        ["desktop: workstation", () => { s.setDesktopWs(1); s.setPhase("app"); }],
        ["desktop: orbit", () => { s.setDesktopWs(2); s.setPhase("app"); }],
        ["desktop: signal", () => { s.setDesktopWs(3); s.setPhase("app"); }],
      ] as [string, () => void][]
    ).map(([label, run]) => ({ label, path: "action", cat: "command", run }));
    const all = [...cmds, ...files];
    if (!q.trim()) {
      const rec = s.recent.slice(0, 4).map((r) => all.find((a) => a.node?.path === r)).filter(Boolean) as Item[];
      return [...rec, ...cmds.slice(0, 6)];
    }
    return all
      .map((a) => ({ a, r: rank(q, a.label, a.node?.path ?? a.path) }))
      .filter((e) => e.r >= 0)
      .sort((x, y) => x.r - y.r)
      .map((e) => e.a)
      .slice(0, 16);
  }, [q]);

  useEffect(() => setIdx(0), [q]);
  if (!paletteOpen) return null;

  const pick = (it: Item) => {
    sound.select();
    toggle("paletteOpen");
    if (it.run) it.run();
    else if (it.node) {
      if (it.node.kind === "dir") { navTo(it.node.path); useShell.getState().focusList(); }
      else openFile(it.node.path, it.node.kind);
    }
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
