"use client";

import { useEffect, useRef, useState } from "react";
import { profile } from "@/content/profile";
import { useShell } from "@/lib/store";
import { runCommand, complete, type TermLine } from "@/lib/terminal";

const MOTD: TermLine[] = [
  { kind: "dim", text: "deepnar workstation · type `help` · plain English works too (“why did you build ICE?”)" },
];

export function Terminal() {
  const { terminalOpen, toggle, cwd, workspace, project, setCwd, go, setMode, setTheme, setPetMood } = useShell();
  const [lines, setLines] = useState<TermLine[]>(MOTD);
  const [input, setInput] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const [fail, setFail] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [lines, terminalOpen]);

  if (!terminalOpen) return null;

  const exec = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    setHist((h) => [...h, cmd]);
    setHi(-1);
    const res = runCommand(cmd, { cwd, workspace, project, history: hist });
    setFail(res.lines.some((l) => l.kind === "err"));
    setLines((ls) => [...ls, { kind: "cmd" as const, text: cmd, cwd }, ...res.lines].slice(-300));
    if (res.cwd) setCwd(res.cwd);
    const e = res.effect;
    if (e) {
      if (e.go) go(e.go, e.project !== undefined ? e.project : undefined);
      if (e.theme) setTheme(e.theme);
      if (e.clear) setLines([]);
      if (e.toggle) toggle(e.toggle);
      if (e.openUrl) window.open(e.openUrl, "_blank", "noopener");
    }
    setPetMood("alert");
    setTimeout(() => setPetMood("idle"), 2500);
  };

  const onKey = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter") {
      exec(input);
      setInput("");
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      if (hist.length) {
        const n = hi < 0 ? hist.length - 1 : Math.max(0, hi - 1);
        setHi(n);
        setInput(hist[n]);
      }
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();
      if (hi >= 0) {
        const n = hi + 1;
        if (n >= hist.length) {
          setHi(-1);
          setInput("");
        } else {
          setHi(n);
          setInput(hist[n]);
        }
      }
    } else if (ev.key === "Tab") {
      ev.preventDefault();
      const hits = complete(cwd, input);
      if (hits.length === 1) {
        const parts = input.split(" ");
        parts[parts.length - 1] = hits[0];
        setInput(parts.join(" ") + (parts.length > 1 ? " " : ""));
      } else if (hits.length > 1) {
        setLines((ls) => [...ls, { kind: "dim", text: hits.join("   ") }]);
      }
    } else if (ev.key === "l" && ev.ctrlKey) {
      ev.preventDefault();
      setLines([]);
    }
  };

  return (
    <section
      className="pane pane-active flex flex-col min-h-0 h-56 shrink-0 max-md:fixed max-md:inset-x-2 max-md:bottom-9 max-md:top-28 max-md:z-30 max-md:h-auto"
      aria-label="terminal"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center gap-2 px-2.5 h-7 text-[11.5px] border-b shrink-0" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        <span className="flex gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--err)" }} /><i className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--warm)" }} /><i className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--ok)" }} /></span>
        <span>terminal — portfolio-sh</span>
        <span className="flex-1" />
        <button onClick={() => toggle("terminalOpen")} className="cursor-pointer hover:text-[var(--fg)]" aria-label="hide terminal">hide ▲</button>
      </div>
      <div ref={boxRef} className="flex-1 overflow-y-auto px-2.5 py-1.5 text-[12.5px] leading-[1.65]" role="log" aria-live="polite">
        {lines.map((l, i) =>
          l.kind === "cmd" ? (
            <div key={i} className="mt-1.5"><Prompt cwd={l.cwd ?? cwd} cmd={l.text} fail={false} static /></div>
          ) : (
            <div key={i} style={{ color: l.kind === "err" ? "var(--err)" : l.kind === "dim" ? "var(--muted)" : l.kind === "agent" ? "var(--icy)" : "var(--fg-dim)" }}>{l.text}</div>
          )
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <Prompt cwd={cwd} fail={fail} />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => setMode("INSERT")}
            onBlur={() => setMode("NORMAL")}
            className="flex-1 bg-transparent outline-none min-w-0"
            style={{ color: "var(--fg)" }}
            aria-label="terminal input"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
      </div>
    </section>
  );
}

export function Prompt({ cwd, fail, cmd, static: st }: { cwd: string; fail?: boolean; cmd?: string; static?: boolean }) {
  if (st) {
    return (
      <span>
        <span style={{ color: "var(--ok)" }}>deepnar@nexus</span>
        <span style={{ color: "var(--muted)" }}>:</span>
        <span style={{ color: "var(--accent-soft)" }}>{cwd}</span>
        <span style={{ color: fail ? "var(--err)" : "var(--ok)", fontWeight: 700, fontFamily: '"JetBrains Mono","DejaVu Sans Mono",monospace' }}> ❯ </span>
        <span style={{ color: "var(--fg)" }}>{cmd}</span>
      </span>
    );
  }
  void profile;
  return (
    <span className="shrink-0" aria-hidden>
      <span style={{ color: "var(--ok)" }}>deepnar@nexus</span>
      <span style={{ color: "var(--muted)" }}>:</span>
      <span style={{ color: "var(--accent-soft)" }}>{cwd}</span>
      <span style={{ color: fail ? "var(--err)" : "var(--ok)", fontWeight: 700, fontFamily: '"JetBrains Mono","DejaVu Sans Mono",monospace' }}> ❯</span>
    </span>
  );
}
