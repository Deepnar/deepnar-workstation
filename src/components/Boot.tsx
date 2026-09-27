"use client";

import { useEffect, useState } from "react";
import { useShell } from "@/lib/store";

const LINES = [
  "$ boot deepnar",
  "loading workspace …",
  "mounting ~/projects (10) …",
  "indexing research (2 papers · 3 experiments) …",
  "connecting github (34 repos · 9 PRs) …",
  "initializing agent (local intents, no LLM) …",
  "ready.",
];

export function Boot() {
  const { booted, boot } = useShell();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (booted) return;
    if (n >= LINES.length) {
      const t = setTimeout(boot, 220);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((v) => v + 1), n === 0 ? 120 : 85);
    return () => clearTimeout(t);
  }, [n, booted, boot]);

  useEffect(() => {
    if (booted) return;
    const skip = () => boot();
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [booted, boot]);

  if (booted) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center wallpaper" onClick={boot} role="status" aria-label="booting">
      <div className="w-full max-w-md px-6 text-[13px] leading-[1.9]">
        {LINES.slice(0, n).map((l, i) => (
          <div key={i} style={{ color: i === 0 ? "var(--accent-soft)" : l === "ready." ? "var(--ok)" : "var(--muted)" }}>{l}</div>
        ))}
        <span className="term-cursor" aria-hidden />
        <div className="mt-4 text-[11px]" style={{ color: "var(--muted)" }}>any key / click to skip</div>
      </div>
    </div>
  );
}
