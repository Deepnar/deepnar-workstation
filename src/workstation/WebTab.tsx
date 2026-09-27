"use client";

// Web — external lookup launcher. Google/ChatGPT/GitHub all refuse
// framing (X-Frame-Options/CSP), so everything opens in a real tab.
// History is kept here.
import { useState } from "react";
import { useShell } from "@/lib/store";
import { sound } from "@/audio/engine";

interface Entry {
  label: string;
  url: string;
}

const QUICK: Entry[] = [
  { label: "Google", url: "https://www.google.com/" },
  { label: "ChatGPT", url: "https://chat.openai.com/" },
  { label: "GitHub · Deepnar", url: "https://github.com/Deepnar" },
];

export function WebTab() {
  const { sessionEpoch } = useShell();
  const [q, setQ] = useState("");
  const [hist, setHist] = useState<Entry[]>([]);
  const open = (label: string, url: string) => {
    sound.select();
    window.open(url, "_blank", "noopener,noreferrer");
    setHist((h) => [{ label, url }, ...h].slice(0, 12));
  };
  const search = () => {
    const query = q.trim();
    if (!query) return;
    open(`google: ${query}`, `https://www.google.com/search?q=${encodeURIComponent(query)}`);
    setQ("");
  };
  const askGpt = () => {
    const query = q.trim();
    if (!query) return;
    open(`chatgpt: ${query}`, "https://chat.openai.com/");
    setQ("");
  };
  return (
    <div className="h-full overflow-auto p-3 text-[12.5px]" key={sessionEpoch}>
      <div className="mb-1" style={{ color: "var(--muted)" }}>external lookup — opens in a new tab</div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex gap-1.5 mb-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search the web…"
          aria-label="web search"
          className="flex-1 min-w-0 bg-transparent border px-2 py-1.5 outline-none text-[12.5px]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
        <button
          type="submit"
          className="px-2.5 border text-[12px]"
          style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}
        >
          Google ↗
        </button>
        <button
          type="button"
          onClick={askGpt}
          className="px-2.5 border text-[12px]"
          style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}
        >
          GPT ↗
        </button>
      </form>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {QUICK.map((e) => (
          <button
            key={e.label}
            onClick={() => open(e.label, e.url)}
            className="px-2 py-1 border text-[12px]"
            style={{ borderColor: "var(--border)", color: "var(--fg-dim)" }}
          >
            {e.label} ↗
          </button>
        ))}
      </div>
      {hist.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
            opened
          </div>
          {hist.map((h, i) => (
            <button
              key={`${h.url}-${i}`}
              onClick={() => open(h.label, h.url)}
              className="block w-full text-left truncate py-[3px] text-[12px] hover:bg-[var(--sel-bg)]"
              style={{ color: "var(--fg-dim)" }}
            >
              <span style={{ color: "var(--muted)" }}>→ </span>
              {h.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
