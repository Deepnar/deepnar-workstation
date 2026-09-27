"use client";

// Agent — deterministic local guide, now a right-dock tab.
// Conversational intents, conversation context, real sources,
// inline action chips. Retrieval activity only for retrieval answers.
import { useEffect, useRef, useState } from "react";
import { useShell } from "@/lib/store";
import { answer, type AgentAction } from "@/lib/assistant/engine";
import { findNode, shortPath, HOME } from "@/vfs/vfs";
import { sound } from "@/audio/engine";
import { paper } from "@/content/research";

interface Msg {
  role: "user" | "agent";
  text: string[];
  sources?: string[];
  actions?: AgentAction[];
  retrieval?: boolean;
}

const OPENERS = ["what is ICE?", "show me the paper", "what got merged upstream?"];

const ENTITY_PATH: Record<string, string> = {
  ice: `${HOME}/projects/ice/README.md`,
  "presentation-forge": `${HOME}/projects/presentation-forge/README.md`,
  "timetable-generator": `${HOME}/projects/timetable-generator/README.md`,
  "prompt-routing-classifier": `${HOME}/projects/prompt-routing-classifier/README.md`,
  nexus: `${HOME}/projects/collaborations/nexus/README.md`,
  civicresolve: `${HOME}/projects/collaborations/civicresolve/README.md`,
  rapidrail: `${HOME}/projects/collaborations/rapidrail/README.md`,
  "iis-mini": `${HOME}/projects/collaborations/iis-mini/README.md`,
  research: `${HOME}/research/lsrep-ice/README.md`,
  paper: `${HOME}/research/lsrep-ice/README.md`,
  oss: `${HOME}/oss`,
  about: `${HOME}/about/README.md`,
  projects: `${HOME}/projects`,
  practice: `${HOME}/projects/practice`,
  resume: `${HOME}/resume.pdf`,
};

export function runAgentAction(run: string, ask: (q: string) => void) {
  const s = useShell.getState();
  const r = run.trim();
  if (r === "pet") {
    s.setPet(!s.petOn);
    return;
  }
  if (r === "terminal") {
    s.openDock("term");
    s.setMode("TERMINAL");
    return;
  }
  if (r === "contact") {
    if (!s.contactOpen) s.toggle("contactOpen");
    return;
  }
  if (r === "arxiv") {
    try {
      window.open(paper.url, "_blank", "noopener");
    } catch {
      /* noop */
    }
    return;
  }
  if (r === "download resume") {
    try {
      const a = document.createElement("a");
      a.href = "/resume/Deepesh_Sonar_Resume.pdf";
      a.download = "Deepesh_Sonar_Resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      sound.download();
      s.notify("resume downloaded");
    } catch {
      /* noop */
    }
    return;
  }
  const m = r.match(/^open\s+(.+)$/);
  if (m) {
    const key = m[1].toLowerCase().replace(/^(the\s+|~\/)/, "");
    const direct = findNode(m[1]) ? m[1] : findNode(key) ? key : null;
    const target = direct ?? ENTITY_PATH[key];
    if (target) {
      const n = findNode(target);
      if (n) {
        if (n.kind === "dir") s.navTo(target);
        else s.openFile(target, n.kind);
        sound.fileOpen();
        return;
      }
    }
  }
  ask(r); // fall back: treat as a question
}

export function Agent({ hidden }: { hidden: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const epoch = useShell((s) => s.sessionEpoch);

  useEffect(() => {
    setMsgs([]);
    setValue("");
    setBusy(false);
  }, [epoch]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [msgs, busy]);

  useEffect(() => {
    if (!hidden) setTimeout(() => inputRef.current?.focus(), 60);
  }, [hidden]);

  const ask = (q: string) => {
    const query = q.trim();
    if (!query || busy) return;
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: [query] }]);
    setValue("");
    const s = useShell.getState();
    s.setPetMode("working");
    const a = answer(query, { cwd: s.cwd, lastEntity: s.lastEntity, lastIntent: s.lastIntent });
    s.setAssistantCtx(a.entity, a.intent);
    setTimeout(() => {
      sound.success();
      setMsgs((m) => [...m, { role: "agent", text: a.body, sources: a.sources, actions: a.actions, retrieval: !a.smalltalk }]);
      setBusy(false);
      useShell.getState().setPetMode("idle");
    }, a.smalltalk ? 120 : 320);
  };

  const openSource = (p: string) => {
    const n = findNode(p);
    if (!n) return;
    const s = useShell.getState();
    if (n.kind === "dir") s.navTo(p);
    else s.openFile(p, n.kind);
    sound.fileOpen();
  };

  return (
    <section aria-label="agent" className="h-full flex-col min-h-0" style={{ display: hidden ? "none" : "flex" }}>
      <div className="flex items-center gap-2 px-1 pb-2 text-[12px]" style={{ color: "var(--fg)" }}>
        <span className="w-[7px] h-[7px] rounded-full" style={{ background: "var(--ok)" }} aria-hidden />
        <span className="font-bold">Agent</span>
        <button
          className="ml-auto text-[11px] hover:underline"
          style={{ color: "var(--muted)" }}
          title="how this assistant works"
          onClick={() => ask("how do you work?")}
        >
          ?
        </button>
      </div>
      <div ref={bodyRef} className="flex-1 overflow-auto space-y-3 min-h-0 pr-1" role="log" aria-label="agent conversation">
        {msgs.length === 0 && (
          <div className="space-y-1.5 text-[12.5px]">
            <div style={{ color: "var(--muted)" }}>local guide. try:</div>
            {OPENERS.map((o) => (
              <button key={o} onClick={() => ask(o)} className="block w-full text-left px-2 py-1.5 border hover:bg-[var(--sel-bg)]"
                style={{ borderColor: "var(--border)", color: "var(--fg-dim)" }}>
                {o}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i}>
            {m.role === "user" ? (
              <div className="text-[12.5px] pl-2 border-l-2" style={{ borderColor: "var(--warm)", color: "var(--fg)" }}>{m.text[0]}</div>
            ) : (
              <div className="text-[12.5px] space-y-1.5">
                {m.retrieval && <div style={{ color: "var(--muted)" }}>◇ reading index…</div>}
                <div className="space-y-1 whitespace-pre-wrap" style={{ color: "var(--fg-dim)" }}>
                  {m.text.map((t, j) => <div key={j}>{t}</div>)}
                </div>
                {!!m.sources?.length && (
                  <div className="flex gap-1.5 flex-wrap items-center text-[11px]" style={{ color: "var(--muted)" }}>
                    <span>sources</span>{m.sources.map((sp) => (
                      <button key={sp} onClick={() => openSource(sp)} className="px-1.5 py-0.5 border hover:bg-[var(--sel-bg)]" style={{ borderColor: "var(--border)", color: "var(--icy)" }}>
                        {shortPath(sp)}
                      </button>
                    ))}
                  </div>
                )}
                {!!m.actions?.length && (
                  <div className="flex gap-1.5 flex-wrap pt-0.5">
                    {m.actions.map((a) => (
                      <button key={a.label} onClick={() => runAgentAction(a.run, ask)}
                        className="px-2 py-1 border text-[11.5px]" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="text-[12px]" style={{ color: "var(--muted)" }}>◇ thinking…</div>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(value); }} className="flex gap-1.5 pt-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ask about this workstation…"
          aria-label="agent input"
          autoComplete="off"
          className="flex-1 min-w-0 px-2 py-1.5 text-[12.5px] bg-transparent outline-none border"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
        <button type="submit" aria-label="send" className="px-2.5 border text-[12.5px]" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}>→</button>
      </form>
    </section>
  );
}
