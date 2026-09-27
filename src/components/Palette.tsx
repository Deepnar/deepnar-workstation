"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { projects } from "@/content/projects";
import { workspaces } from "@/content/navigation";
import { useShell, type WorkspaceId } from "@/lib/store";

interface Action {
  label: string;
  hint: string;
  run: () => void;
}

export function Palette() {
  const { paletteOpen, toggle, go, setTheme, setPet, petOn, theme } = useShell();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions: Action[] = useMemo(() => {
    const s = useShell.getState();
    return [
      ...workspaces.map((w) => ({ label: `Go to ${w.label}`, hint: `workspace ${w.num} · ${w.path}`, run: () => go(w.id as WorkspaceId) })),
      ...projects.map((p) => ({ label: `Open Project: ${p.slug}`, hint: p.path, run: () => go("projects", p.slug) })),
      { label: "Toggle Terminal", hint: "ctrl+`", run: () => toggle("terminalOpen") },
      { label: "Toggle AI Pane", hint: "context assistant", run: () => toggle("aiOpen") },
      { label: "Toggle Explorer", hint: "file tree", run: () => toggle("explorerOpen") },
      { label: "Overview", hint: "workspace tiles", run: () => toggle("overviewOpen") },
      { label: `Theme: ${theme === "dark" ? "light" : "dark"}`, hint: "daylight workstation", run: () => setTheme(theme === "dark" ? "light" : "dark") },
      { label: `Pet: ${petOn ? "off" : "on"}`, hint: "statusline companion", run: () => setPet(!s.petOn) },
      { label: "Open Resume", hint: "~/about", run: () => go("about") },
      { label: "GitHub", hint: "github.com/Deepnar", run: () => window.open("https://github.com/Deepnar", "_blank") },
      { label: "Help / Keybindings", hint: "?", run: () => toggle("helpOpen") },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteOpen]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().replace(/^>\s*/, "");
    if (!needle) return actions.slice(0, 12);
    // fuzzy: chars in order
    const match = (t: string) => {
      let i = 0;
      for (const c of needle) {
        i = t.toLowerCase().indexOf(c, i);
        if (i < 0) return false;
        i++;
      }
      return true;
    };
    return actions.filter((a) => match(a.label + " " + a.hint)).slice(0, 12);
  }, [q, actions]);

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 30);
      useShell.getState().setMode("COMMAND");
    } else {
      useShell.getState().setMode("NORMAL");
    }
  }, [paletteOpen]);

  useEffect(() => setSel(0), [q]);
  if (!paletteOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-center pt-[12vh] p-4" style={{ background: "color-mix(in srgb, var(--bg0) 60%, transparent)" }} onClick={() => toggle("paletteOpen")} role="dialog" aria-label="command palette">
      <div className="pane w-full max-w-lg h-fit overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, filtered.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            else if (e.key === "Enter" && filtered[sel]) { filtered[sel].run(); toggle("paletteOpen"); }
            else if (e.key === "Escape") toggle("paletteOpen");
          }}
          placeholder="> type a command, project, or workspace…"
          className="w-full px-3.5 py-3 bg-transparent outline-none text-[13px] border-b"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          aria-label="command palette input"
        />
        <div className="max-h-72 overflow-y-auto p-1.5" role="listbox">
          {filtered.map((a, i) => (
            <button
              key={a.label}
              role="option"
              aria-selected={i === sel}
              onMouseEnter={() => setSel(i)}
              onClick={() => { a.run(); toggle("paletteOpen"); }}
              className="flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-[12.5px] cursor-pointer"
              style={i === sel ? { background: "var(--sel-bg)", color: "var(--fg)" } : { color: "var(--fg-dim)" }}
            >
              <span>{a.label}</span>
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>{a.hint}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="px-3 py-4 text-[12.5px]" style={{ color: "var(--muted)" }}>no match — try “theme”, “ice”, “oss”…</div>}
        </div>
      </div>
    </div>
  );
}
