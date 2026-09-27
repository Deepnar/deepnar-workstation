"use client";

// Global contextual tool. Local index — deterministic retrieval over the
// VFS, no model, no network. Available in every workspace via `/`.
import { useEffect, useRef, useState } from "react";
import { useShell } from "@/lib/store";
import { answer } from "@/lib/assistant/engine";
import { shortPath } from "@/vfs/vfs";
import { sound } from "@/audio/engine";

interface Msg {
  role: "user" | "agent";
  text: string;
  steps?: string[];
  intent?: string;
}

function projectFromCwd(cwd: string): string | null {
  const m = cwd.match(/^\/home\/deepnar\/projects\/(?:labs\/|collaborations\/|archive\/)?([^/]+)/);
  return m ? m[1] : null;
}

const SUGGESTIONS: Record<string, string[]> = {
  projects: ["why did you build this?", "show me the evaluation", "what was hard?"],
  research: ["what were the results?", "tell me about LSREP", "show experiments"],
  git: ["what got merged upstream?", "show open PRs", "what did you own in NEXUS?"],
  profile: ["show the resume", "how do I contact you?", "what is the stack?"],
  home: ["what are you working on?", "show me your research", "tell me about ICE"],
};

export function Assistant() {
  const { cwd, workspace, aiOpen, toggle, setMode } = useShell();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [msgs, busy]);

  useEffect(() => {
    if (aiOpen) {
      setMode("AGENT");
      useShell.getState().setPetMood("thinking");
      setTimeout(() => inputRef.current?.focus(), 60);
      const t = setTimeout(() => useShell.getState().setPetMood("idle"), 2500);
      return () => clearTimeout(t);
    }
    setMode("BROWSE");
  }, [aiOpen, setMode]);

  if (!aiOpen) return null;

  const ask = (q: string) => {
    const query = q.trim();
    if (!query || busy) return;
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: query }]);
    setValue("");
    const s = useShell.getState();
    // fast staged reveal — process illusion, not artificial waiting
    const a = answer(query, { project: projectFromCwd(s.cwd), workspace: s.workspace, lastIntent: s.lastIntent });
    s.setLastIntent(a.intent);
    const steps = [`ctx ${shortPath(s.cwd)}`, ...a.steps.slice(0, 2), `◆ ${a.body.length} artifacts matched`];
    setTimeout(() => {
      sound.success();
      setMsgs((m) => [...m, { role: "agent", text: a.body.join("\n"), steps, intent: a.intent }]);
      setBusy(false);
      useShell.getState().setPetMood("idle");
    }, 260);
  };

  return (
    <section aria-label="assistant" className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-1 pb-2 text-[11px]" style={{ color: "var(--muted)" }}>
        <span className="uppercase tracking-[0.14em]">agent</span>
        <span className="px-1.5 border text-[10px]" style={{ borderColor: "var(--border)", color: "var(--ok)" }}>local-index</span>
        <span className="px-1.5 border text-[10px] hidden sm:inline" style={{ borderColor: "var(--border)" }}>offline</span>
        <button onClick={() => toggle("aiOpen")} className="ml-auto hover:text-[var(--fg)]" aria-label="close assistant">✕</button>
      </div>
      <div className="px-1 pb-2 text-[11.5px]" style={{ color: "var(--muted)" }}>
        ctx <span style={{ color: "var(--icy)" }}>{shortPath(cwd)}</span>
      </div>
      <div ref={bodyRef} className="flex-1 overflow-auto space-y-3 min-h-0 pr-1" role="log" aria-label="assistant conversation">
        {msgs.length === 0 && (
          <div className="space-y-1.5 text-[12.5px]">
            <div style={{ color: "var(--muted)" }}>indexed answers about this workstation. try:</div>
            {(SUGGESTIONS[workspace] ?? SUGGESTIONS.home).map((sug) => (
              <button key={sug} onClick={() => ask(sug)} className="block w-full text-left px-2 py-1.5 border hover:bg-[var(--sel-bg)]"
                style={{ borderColor: "var(--border)", color: "var(--fg-dim)" }}>
                {sug}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i}>
            {m.role === "user" ? (
              <div className="text-[12.5px] pl-2 border-l-2" style={{ borderColor: "var(--warm)", color: "var(--fg)" }}>{m.text}</div>
            ) : (
              <div className="text-[12.5px] space-y-1">
                {m.steps?.map((st, j) => (
                  <div key={j} style={{ color: j === m.steps!.length - 1 ? "var(--ok)" : "var(--muted)" }}>{st}</div>
                ))}
                <div className="whitespace-pre-wrap" style={{ color: "var(--fg-dim)" }}>{m.text}</div>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="text-[12px]" style={{ color: "var(--muted)" }}>◇ reading index…</div>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(value); }} className="flex gap-1.5 pt-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ask about this context…"
          aria-label="assistant input"
          autoComplete="off"
          className="flex-1 min-w-0 px-2 py-1.5 text-[12.5px] bg-transparent outline-none border"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
        <button type="submit" aria-label="send" className="px-2.5 border text-[12.5px]" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}>→</button>
      </form>
    </section>
  );
}
