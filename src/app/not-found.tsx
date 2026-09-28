"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PRY_W, PRY_H, drawPryIdle } from "@/system/pry-sprite";

const LINES = [
  "i can't find that",
  "this buffer does not exist",
  "did you delete it",
  "not my fault — i checked twice",
  "there's nothing here",
  "wrong directory?",
  "have you considered going back",
];

/* workstation-native 404: a mistyped buffer path, not a dead end.
   Pry (same idle sprite as the live site) keeps watch; he blinks unless
   the OS asks for reduced motion. No workstation runtime imported. */
export default function NotFound() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  // fixed initial line: the random pick happens post-mount, otherwise the
  // server render and the client hydration disagree (hydration mismatch).
  const [line, setLine] = useState(LINES[0]);
  useEffect(() => {
    setLine(LINES[Math.floor(Math.random() * LINES.length)]);
  }, []);
  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let root: CSSStyleDeclaration | null = null;
    try { root = getComputedStyle(document.documentElement); } catch { /* noop */ }
    const colors = {
      body: root?.getPropertyValue("--pet").trim() || "#7c8aff",
      dark: "#0b0c11",
    };
    const px = 4;
    let reduced = false;
    try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* noop */ }
    let alive = true;
    drawPryIdle(ctx, px, colors, false);
    if (reduced) return () => { alive = false; };
    const id = window.setInterval(() => {
      if (!alive) return;
      drawPryIdle(ctx, px, colors, true);
      window.setTimeout(() => { if (alive) drawPryIdle(ctx, px, colors, false); }, 160);
    }, 3400);
    return () => { alive = false; window.clearInterval(id); };
  }, []);
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg0)", color: "var(--fg)", fontFamily: "var(--font-mono), monospace" }}
      aria-label="page not found"
    >
      <div className="max-w-md w-full border p-6" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
        <div className="text-[12px] mb-3" style={{ color: "var(--muted)" }}>deepnar@orien:~</div>
        <div className="text-[15px] mb-4">
          <span style={{ color: "var(--accent-soft)" }}>$</span> 404 — no such buffer
        </div>
        <div className="flex items-end gap-4 mb-4">
          <canvas
            ref={cvRef} width={PRY_W * 4} height={PRY_H * 4}
            style={{ width: PRY_W * 4, height: PRY_H * 4, imageRendering: "pixelated" }}
            role="img" aria-label="pry, the workstation companion, keeping watch"
          />
          <p className="text-[13px] pb-1" style={{ color: "var(--fg-dim)" }} aria-live="polite">
            <span style={{ color: "var(--muted)" }}>pry:</span> “{line}”
          </p>
        </div>
        <div className="text-[12px] mb-5" style={{ color: "var(--muted)" }}>
          try ~/about · ~/projects · ~/research · ~/oss · ~/signal
        </div>
        <Link
          href="/"
          className="inline-block px-4 py-2 text-[13px] border"
          style={{ borderColor: "var(--accent)", color: "var(--accent-soft)" }}
        >[ enter workstation ]</Link>
      </div>
    </main>
  );
}
