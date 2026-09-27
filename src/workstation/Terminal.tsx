"use client";

import { useEffect, useRef, useState } from "react";
import { useShell } from "@/lib/store";
import { execCommand, type TermLine } from "@/lib/terminal";
import { findNode, listDir, resolvePath, shortPath } from "@/vfs/vfs";

const COMMANDS = ["help", "ls", "tree", "cd", "pwd", "cat", "open", "find", "grep", ":e", ":bd", ":bnext", ":bprev", "whoami", "hostname", "uname", "man", "pacman", "neofetch", "btop", "fortune", "nvim", "sudo", "pet", "radio", "theme", "resume", "contact", "github", "home", "projects", "research", "git", "profile", "download", "history", "clear", "ask", "exit"];

function Prompt({ cwd }: { cwd: string }) {
  return (
    <span className="shrink-0 select-none" aria-hidden>
      <span style={{ color: "var(--muted)" }}>╭─ </span>
      <span style={{ color: "var(--ok)" }}>deepnar@orien</span>
      <span style={{ color: "var(--muted)" }}> </span>
      <span style={{ color: "var(--icy)" }}>{shortPath(cwd)}</span>
      <span style={{ color: "var(--muted)" }}> main</span>
      <br />
      <span style={{ color: "var(--muted)" }}>╰─ </span>
      <span style={{ color: "var(--warm)" }}>❯</span>
      <span> </span>
    </span>
  );
}

export function Terminal() {
  const { cwd, terminalOpen, toggle, setMode } = useShell();
  const [lines, setLines] = useState<TermLine[]>([
    { text: "workstation-shell · guest session · type help", kind: "dim", cwd: "/home/deepnar" },
  ]);
  const [value, setValue] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines, terminalOpen]);

  if (!terminalOpen) return null;

  const run = (raw: string) => {
    const res = execCommand(raw, useShell.getState().cwd);
    if (res.clear) {
      setLines([]);
    } else {
      setLines((l) => [...l.slice(-200), { text: raw, kind: "cmd" as const, cwd }, ...res.lines].slice(-220));
    }
    if (raw.trim()) {
      setHist((h) => [raw, ...h].slice(0, 100));
      setHi(-1);
    }
  };

  const complete = () => {
    const parts = value.split(/\s+/);
    const last = parts[parts.length - 1] ?? "";
    let cands: string[] = [];
    if (parts.length <= 1) {
      cands = COMMANDS.filter((c) => c.startsWith(last));
    } else {
      cands = listDir(useShell.getState().cwd).map((n) => n.name).filter((n) => n.startsWith(last));
      if (!cands.length) {
        const base = last.includes("/") ? last.slice(0, last.lastIndexOf("/") + 1) : "";
        const frag = last.slice(base.length);
        const dir = resolvePath(useShell.getState().cwd, base || ".");
        cands = listDir(dir).map((n) => base + n.name).filter((n) => n.slice(base.length).startsWith(frag));
      }
    }
    if (cands.length === 1) {
      const done = cands[0] + (findNode(resolvePath(useShell.getState().cwd, cands[0]))?.kind === "dir" ? "/" : " ");
      setValue([...parts.slice(0, -1), done].join(" "));
    } else if (cands.length > 1) {
      setLines((l) => [...l, { text: value, kind: "cmd", cwd: useShell.getState().cwd }, ...cands.slice(0, 12).map((c) => ({ text: c, kind: "dim" as const }))]);
    }
  };

  return (
    <section aria-label="terminal" className="border-t flex flex-col min-h-0" style={{ borderColor: "var(--border)", background: "var(--term-bg)" }}>
      <div className="flex items-center gap-2 px-2.5 py-1 text-[10.5px] uppercase tracking-[0.14em] select-none shrink-0" style={{ color: "var(--muted)" }}>
        <span>terminal</span>
        <span className="opacity-60 normal-case tracking-normal">ctrl+` · ↑↓ history · tab complete</span>
        <button onClick={() => toggle("terminalOpen")} className="ml-auto px-1.5 hover:text-[var(--fg)]" aria-label="close terminal">✕</button>
      </div>
      <div ref={bodyRef} className="px-2.5 pb-1 overflow-auto max-h-44 min-h-0 text-[12.5px] leading-[1.65]" role="log" aria-label="terminal output">
        {lines.map((l, i) => (
          <div key={i}>
            {l.kind === "cmd" ? (
              <div className="flex gap-1 items-start">
                <Prompt cwd={l.cwd ?? cwd} />
                <span style={{ color: "var(--fg)" }}>{l.text}</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words pl-1" style={{
                color: l.kind === "err" ? "var(--err)" : l.kind === "ok" ? "var(--ok)" : l.kind === "dim" ? "var(--muted)" : "var(--fg-dim)",
              }}>{l.text}</div>
            )}
          </div>
        ))}
        <form
          onSubmit={(e) => { e.preventDefault(); run(value); setValue(""); }}
          className="flex gap-1 items-start"
        >
          <Prompt cwd={cwd} />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setMode("TERMINAL")}
            onBlur={() => setMode("BROWSE")}
            onKeyDown={(e) => {
              if (e.key === "Tab") { e.preventDefault(); complete(); }
              if (e.key === "Escape") { inputRef.current?.blur(); setMode("BROWSE"); }
              if (e.key === "ArrowUp") { e.preventDefault(); const n = Math.min(hist.length - 1, hi + 1); setHi(n); if (hist[n]) setValue(hist[n]); }
              if (e.key === "ArrowDown") { e.preventDefault(); const n = hi - 1; setHi(n); setValue(n >= 0 ? hist[n] ?? "" : ""); }
              if (e.key === "l" && e.ctrlKey) { e.preventDefault(); setLines([]); }
            }}
            aria-label="terminal input"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="flex-1 min-w-0 bg-transparent outline-none caret-[var(--warm)]"
            style={{ color: "var(--fg)" }}
          />
        </form>
      </div>
    </section>
  );
}
