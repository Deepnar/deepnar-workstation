"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useShell } from "@/lib/store";
import { answer } from "@/lib/assistant/engine";

interface Msg {
  role: "user" | "agent";
  steps?: string[];
  body: string[];
}

export function Assistant({ full }: { full?: boolean }) {
  const { workspace, project, setPetMood, setLastIntent } = useShell();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [shownSteps, setShownSteps] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [msgs, shownSteps]);

  const ask = (q: string) => {
    const query = q.trim();
    if (!query || busy) return;
    const a = answer(query, { project, workspace, lastIntent: null });
    setLastIntent(a.intent);
    setMsgs((m) => [...m, { role: "user", body: [query] }]);
    setBusy(true);
    setPetMood("thinking");
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setMsgs((m) => [...m, { role: "agent", steps: a.steps, body: a.body }]);
      setShownSteps(a.steps.length);
      setBusy(false);
      setPetMood("alert");
      setTimeout(() => setPetMood("idle"), 2000);
      return;
    }
    setShownSteps(0);
    const total = a.steps.length;
    let i = 0;
    setMsgs((m) => [...m, { role: "agent", steps: a.steps, body: [] }]);
    const tick = () => {
      i++;
      setShownSteps(i);
      if (i < total) {
        setTimeout(tick, 90);
      } else {
        setMsgs((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "agent", steps: a.steps, body: a.body };
          return copy;
        });
        setBusy(false);
        setPetMood("alert");
        setTimeout(() => setPetMood("idle"), 2000);
      }
    };
    setTimeout(tick, 90);
  };

  return (
    <div className="flex flex-col min-h-0 h-full" aria-label="ai assistant">
      <div className="flex flex-wrap gap-1.5 px-1 pb-2 text-[11px]" style={{ color: "var(--muted)" }}>
        <span className="px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border)" }}>ctx: {project ? `~/projects/${project}` : workspace === "home" ? "~" : `~/${workspace}`}</span>
        <span className="px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border)" }}>local intents · no LLM</span>
      </div>
      <div ref={boxRef} className={`flex-1 overflow-y-auto px-1 space-y-3 ${full ? "text-[13px]" : "text-[12.5px]"}`}>
        {msgs.length === 0 && (
          <div style={{ color: "var(--muted)" }}>
            <div className="mb-2">session — ask about the work. answers come from the indexed portfolio, not a model.</div>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="whitespace-pre-wrap" style={{ color: "var(--fg)" }}><span style={{ color: "var(--accent)" }}>&gt; </span>{m.body[0]}</div>
          ) : (
            <div key={i}>
              {m.steps && (
                <div className="mb-1.5 space-y-0.5">
                  {m.steps.slice(0, m.body.length ? m.steps.length : shownSteps).map((s, j, arr) => (
                    <div key={j} style={{ color: j === arr.length - 1 && m.body.length ? "var(--accent)" : "var(--muted)" }} className="text-[11.5px]">
                      {j === arr.length - 1 && m.body.length ? "◆ " : "◇ "}{s}
                    </div>
                  ))}
                </div>
              )}
              {m.body.map((t, j) => (
                <div key={j} className="whitespace-pre-wrap leading-relaxed" style={{ color: t.startsWith("·") || t.startsWith("  ") ? "var(--fg-dim)" : "var(--fg)" }}>{t}</div>
              ))}
            </div>
          )
        )}
        {busy && <span className="term-cursor" aria-hidden />}
      </div>
      <form
        className="mt-2 pt-2 border-t shrink-0"
        style={{ borderColor: "var(--border)" }}
        onSubmit={(e) => { e.preventDefault(); ask(input); setInput(""); }}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>+ask</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={project ? `ask about ${project}…` : "ask about the work…"}
            className="flex-1 bg-transparent outline-none min-w-0 text-[12.5px]"
            style={{ color: "var(--fg)" }}
            aria-label="ask assistant"
            autoComplete="off"
          />
          <button type="submit" className="p-1 rounded cursor-pointer hover:bg-[var(--raised)]" aria-label="send"><Send size={13} /></button>
        </div>
      </form>
    </div>
  );
}
