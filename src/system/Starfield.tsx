"use client";

// Deep-space starfield: canvas, three depth layers, slow drift,
// twinkle, pointer parallax, rare streak. No glow blobs, no planets.
// Pauses when hidden; honors reduced-motion + the motion setting.
import { useEffect, useRef } from "react";
import { useShell } from "@/lib/store";

interface Star {
  x: number;
  y: number;
  z: number; // 0 far → 2 near
  r: number;
  tw: number;
  sp: number;
}

export function Starfield({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useShell((s) => s.theme);
  const motion = useShell((s) => s.settings.motion);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let stars: Star[] = [];
    let px = 0; // pointer parallax -1..1
    let py = 0;
    let boost = 0; // login whoosh energy 0..1
    const onBoost = () => {
      boost = 1;
    };
    window.addEventListener("star-boost", onBoost);
    let tpx = 0, tpy = 0;
    const onMove = (e: PointerEvent) => {
      tpx = (e.clientX / window.innerWidth) * 2 - 1;
      tpy = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);

    const seed = () => {
      const n = Math.floor(((w * h) / 9000) * density);
      stars = Array.from({ length: n }, () => {
        const z = Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          r: z === 0 ? 0.4 + Math.random() * 0.5 : z === 1 ? 0.6 + Math.random() * 0.7 : 0.9 + Math.random() * 0.9,
          tw: Math.random() * Math.PI * 2,
          sp: 0.3 + Math.random() * 0.7,
        };
      });
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };
    resize();
    window.addEventListener("resize", resize);

    // one streak at a time, rarely
    let streak: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let nextStreak = performance.now() + 9000 + Math.random() * 12000;

    const dark = () => document.documentElement.dataset.theme !== "light";
    let t = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      t += 1 / 60;
      boost = Math.max(0, boost - 0.012);
      const d = dark();
      ctx.fillStyle = d ? "#06070b" : "#f4f1e8";
      ctx.fillRect(0, 0, w, h);
      const still = reduced || !motion;
      const drift = still ? 0 : 1 + boost * 14;
      for (const s of stars) {
        if (!still) {
          s.x -= (0.008 + s.z * 0.03) * s.sp * drift;
          if (s.x < -2) {
            s.x = w + 2;
            s.y = Math.random() * h;
          }
          s.tw += 0.02 * s.sp;
        }
        const twinkle = 0.55 + 0.45 * Math.sin(s.tw);
        // eased pointer: layers breathe instead of the whole sky sliding
        px += (tpx - px) * 0.04;
        py += (tpy - py) * 0.04;
        const par = (s.z + 1) * 3;
        const x = s.x + px * par;
        const y = s.y + py * par;
        const a = (d ? 0.35 + s.z * 0.25 : 0.5 + s.z * 0.2) * twinkle;
        ctx.beginPath();
        ctx.fillStyle =
          d || s.z < 2
            ? `rgba(${d ? "214,220,255" : "60,72,110"},${a.toFixed(3)})`
            : `rgba(255,244,220,${a.toFixed(3)})`;
        ctx.arc(x, y, s.r + (d ? 0 : 0.55), 0, Math.PI * 2);
        ctx.fill();
      }
      if (!still && !streak && now > nextStreak) {
        streak = { x: Math.random() * w * 0.7 + w * 0.15, y: Math.random() * h * 0.3, vx: 5 + Math.random() * 3, vy: 2 + Math.random() * 2, life: 1 };
      }
      if (streak) {
        streak.x += streak.vx;
        streak.y += streak.vy;
        streak.life -= 0.03;
        if (streak.life <= 0) {
          streak = null;
          nextStreak = now + 14000 + Math.random() * 20000;
        } else {
          ctx.strokeStyle = `rgba(214,220,255,${(streak.life * 0.7).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(streak.x, streak.y);
          ctx.lineTo(streak.x - streak.vx * 8, streak.y - streak.vy * 8);
          ctx.stroke();
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("star-boost", onBoost);
    };
  }, [theme, motion, density]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}
