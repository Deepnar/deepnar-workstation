"use client";

// Companion: an original pixel creature drawn on canvas, with real
// animation states (idle/walk/sleep/thinking/working/success/failed/wave).
// System activity drives the state; roaming happens only while idle.
import { useEffect, useRef, useState } from "react";
import { useShell, type PetMode } from "@/lib/store";
import { sound } from "@/audio/engine";

const W = 16, H = 12;

const BODY = [
  "...BB......BB...",
  "...BBB....BBB...",
  "...BBBBBBBBBB...",
  "..BBBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  ".BBBBBBBBBBBBBB.",
  ".BBBBBBBBBBBBBB.",
  ".BBBBBBBBBBBBBB.",
  "..BBBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  "...BBBBBBBBBB...",
  "...BB..BB..BB...",
];

const WALK_FEET = "...BB..BB..BB...";
const WALK_FEET2 = "....BB..BB..B....";

type Face = "open" | "closed" | "happy" | "x" | "dot";

function cssVar(name: string, fb: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  } catch {
    return fb;
  }
}

function draw(
  ctx: CanvasRenderingContext2D, px: number,
  mode: PetMode, frame: number,
  colors: { body: string; dark: string; warm: string; icy: string },
) {
  ctx.clearRect(0, 0, W * px, H * px + 4 * px);
  let dy = 0;
  let face: Face = "open";
  if (mode === "idle") {
    dy = frame % 4 === 3 ? 0 : 0;
    face = frame % 6 === 5 ? "closed" : "open"; // blink
  } else if (mode === "walk") {
    face = "open";
  } else if (mode === "sleep") {
    face = "closed";
  } else if (mode === "thinking") {
    face = frame % 2 ? "open" : "dot";
  } else if (mode === "working") {
    dy = frame % 2 ? -1 : 0;
    face = "open";
  } else if (mode === "success") {
    dy = frame % 2 ? -2 : -1;
    face = "happy";
  } else if (mode === "failed") {
    face = "x";
  } else if (mode === "wave") {
    face = "happy";
  }

  const put = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x * px, (y + dy) * px, px, px);
  };

  const rows = BODY.map((r, i) => (i === 11 && mode === "walk" ? (frame % 2 ? WALK_FEET : WALK_FEET2) : r));
  rows.forEach((row, y) => {
    for (let x = 0; x < W; x++) if (row[x] === "B") put(x, y, colors.body);
  });

  // tail
  put(0, 7, colors.body);
  put(0, 8, colors.body);

  // wave arm
  if (mode === "wave") {
    put(14, 3, colors.body);
    put(15, 2, colors.body);
  }

  // face (rows 4-6)
  const eye = (x: number) => {
    if (face === "open") { put(x, 5, colors.dark); put(x + 1, 5, colors.dark); put(x, 6, colors.dark); put(x + 1, 6, colors.dark); }
    else if (face === "closed" || face === "dot") { put(x, 6, colors.dark); put(x + 1, 6, colors.dark); }
    else if (face === "happy") { put(x, 6, colors.dark); put(x, 5, colors.dark); put(x + 1, 5, colors.dark); put(x + 1, 6, colors.dark); }
    else { put(x, 5, colors.dark); put(x + 1, 6, colors.dark); put(x + 1, 5, colors.dark); put(x, 6, colors.dark); }
  };
  eye(5);
  eye(9);
  if (face === "open" || face === "happy") { put(7, 7, colors.dark); put(8, 7, colors.dark); }

  // overlays
  if (mode === "sleep") {
    const zoff = frame % 3;
    ctx.fillStyle = colors.icy;
    const zx = 13 * px, zy = (1 - zoff) * px;
    ctx.fillRect(zx, zy, 3 * px, px);
    ctx.fillRect(zx + 2 * px, zy + px, px, px);
    ctx.fillRect(zx, zy + 2 * px, 3 * px, px);
  }
  if (mode === "thinking") {
    ctx.fillStyle = colors.icy;
    const n = 1 + (frame % 3);
    for (let i = 0; i < n; i++) ctx.fillRect((6 + i * 2) * px, 1 * px, px, px);
  }
  if (mode === "working") {
    ctx.fillStyle = colors.warm;
    const sx = frame % 2 ? 1 : 14;
    ctx.fillRect(sx * px, 3 * px, px, px);
    ctx.fillRect((15 - sx) * px, 8 * px, px, px);
  }
  if (mode === "success") {
    ctx.fillStyle = colors.warm;
    ctx.fillRect(2 * px, 2 * px, px, px);
    ctx.fillRect(13 * px, 2 * px, px, px);
  }
}

const QUIPS = ["mrrp.", "…still here.", "prrt.", "*purrs in 8-bit*"];

export function Pet({ anchor }: { anchor: "desktop" | "status" }) {
  const { petOn, petMode, settings } = useShell();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const [x, setX] = useState(62);
  const [dragging, setDragging] = useState(false);
  const coolRef = useRef(0);
  const idleRef = useRef(Date.now());

  // wake on activity; sleep after 60s idle
  useEffect(() => {
    if (!petOn) return;
    const wake = () => {
      idleRef.current = Date.now();
      const s = useShell.getState();
      if (s.petMode === "sleep") s.setPetMode("idle");
    };
    window.addEventListener("mousemove", wake, { passive: true });
    window.addEventListener("keydown", wake);
    const t = setInterval(() => {
      const s = useShell.getState();
      if (Date.now() - idleRef.current > 60000 && (s.petMode === "idle" || s.petMode === "walk"))
        s.setPetMode("sleep");
    }, 5000);
    return () => {
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
      clearInterval(t);
    };
  }, [petOn]);

  // roam: desktop only, idle only, roam enabled, motion on
  useEffect(() => {
    if (anchor !== "desktop" || !petOn || !settings.petRoam || !settings.motion) return;
    const t = setInterval(() => {
      if (document.hidden || dragging) return;
      const s = useShell.getState();
      if (s.petMode !== "idle") return;
      s.setPetMode("walk");
      setX(8 + Math.random() * 62);
      setTimeout(() => {
        if (useShell.getState().petMode === "walk") useShell.getState().setPetMode("idle");
      }, 3200);
    }, 16000);
    return () => clearInterval(t);
  }, [anchor, petOn, settings.petRoam, settings.motion, dragging]);

  // sprite loop
  useEffect(() => {
    if (!petOn) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const colors = {
      body: cssVar("--pet", "#7c8aff"),
      dark: "#0b0c11",
      warm: cssVar("--warm", "#e0a100"),
      icy: cssVar("--icy", "#57c7d4"),
    };
    const t = setInterval(() => {
      frameRef.current++;
      draw(ctx, px, useShell.getState().petMode, frameRef.current, colors);
    }, 170);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petOn, settings.petSize, anchor]);

  if (!petOn) return null;

  const px = Math.max(2, Math.round((anchor === "desktop" ? 4 : 2) * settings.petSize));

  const poke = () => {
    const now = Date.now();
    if (now - coolRef.current < 1200) return;
    coolRef.current = now;
    const s = useShell.getState();
    idleRef.current = now;
    sound.pet();
    s.setPetMode("wave");
    setTimeout(() => {
      if (useShell.getState().petMode === "wave") useShell.getState().setPetMode("idle");
    }, 1300);
    if (Math.random() < 0.16) s.notify(QUIPS[Math.floor(Math.random() * QUIPS.length)]);
  };

  const cv = (
    <canvas
      ref={canvasRef}
      width={W * px}
      height={H * px + 4 * px}
      style={{ width: W * px, height: H * px + 4 * px, imageRendering: "pixelated" }}
    />
  );

  if (anchor === "status") {
    return (
      <button onClick={poke} title={`companion (${petMode})`} aria-label="interact with companion" className="px-1.5 shrink-0 cursor-pointer">
        {cv}
      </button>
    );
  }

  return (
    <div
      className="absolute bottom-14 z-10"
      style={{ left: `${x}%`, transition: petMode === "walk" ? "left 3s linear" : "none" }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="companion creature — drag or click"
        title={`companion (${petMode})`}
        onClick={poke}
        onKeyDown={(e) => e.key === "Enter" && poke()}
        onPointerDown={(e) => {
          setDragging(true);
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          const pct = Math.min(92, Math.max(2, (e.clientX / window.innerWidth) * 100));
          setX(pct);
        }}
        onPointerUp={() => setDragging(false)}
        className="cursor-grab active:cursor-grabbing"
      >
        {cv}
      </div>
    </div>
  );
}
