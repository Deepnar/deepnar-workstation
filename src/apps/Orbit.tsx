"use client";

// ORBIT — a 60-second desktop toy. Steer the mote, dodge asteroids,
// catch signals. Arrows/WASD + Space (brake), touch drag. Canvas only.
import { useEffect, useRef, useState } from "react";
import { sound } from "@/audio/engine";

interface Body { x: number; y: number; vx: number; vy: number; r: number; kind: "rock" | "signal"; hue: number }

export function Orbit() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [time, setTime] = useState(60);
  const [over, setOver] = useState(false);
  const stateRef = useRef({ bodies: [] as Body[], px: 0, py: 0, vx: 0, vy: 0, keys: new Set<string>(), t: 60, score: 0, alive: true });

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem("deepnar-orbit-best") ?? 0));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const st = stateRef.current;
    const W = (cv.width = cv.clientWidth * 2);
    const H = (cv.height = cv.clientHeight * 2);
    st.px = W / 2;
    st.py = H / 2;
    st.bodies = [];
    st.t = 60;
    st.score = 0;
    st.alive = true;
    setOver(false);
    setScore(0);
    setTime(60);

    const spawn = () => {
      const edge = Math.floor(Math.random() * 4);
      const signal = Math.random() < 0.3;
      const b: Body = {
        x: edge === 0 ? -20 : edge === 1 ? W + 20 : Math.random() * W,
        y: edge === 2 ? -20 : edge === 3 ? H + 20 : Math.random() * H,
        vx: 0, vy: 0,
        r: signal ? 12 : 16 + Math.random() * 26,
        kind: signal ? "signal" : "rock",
        hue: signal ? 190 : 30,
      };
      const ang = Math.atan2(H / 2 - b.y, W / 2 - b.x) + (Math.random() - 0.5) * 0.8;
      const sp = (signal ? 1.2 : 0.8 + Math.random()) * 2;
      b.vx = Math.cos(ang) * sp;
      b.vy = Math.sin(ang) * sp;
      st.bodies.push(b);
    };

    const keys = st.keys;
    const down = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      keys.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    let last = performance.now();
    let acc = 0;
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      acc += dt;
      if (st.alive) {
        st.t -= dt / 1000;
        if (st.t <= 0) {
          st.t = 0;
          st.alive = false;
          setOver(true);
          setBest((b) => {
            const nb = Math.max(b, st.score);
            try {
              localStorage.setItem("deepnar-orbit-best", String(nb));
            } catch {
              /* noop */
            }
            return nb;
          });
        }
        setTime(Math.ceil(st.t));
      }
      // ship
      const thrust = 0.35;
      if (st.alive) {
        if (keys.has("arrowup") || keys.has("w")) st.vy -= thrust;
        if (keys.has("arrowdown") || keys.has("s")) st.vy += thrust;
        if (keys.has("arrowleft") || keys.has("a")) st.vx -= thrust;
        if (keys.has("arrowright") || keys.has("d")) st.vx += thrust;
        if (keys.has(" ")) { st.vx *= 0.94; st.vy *= 0.94; }
      }
      st.px = Math.max(10, Math.min(W - 10, st.px + st.vx));
      st.py = Math.max(10, Math.min(H - 10, st.py + st.vy));

      if (st.alive && Math.random() < 0.03 && st.bodies.length < 14) spawn();
      for (const b of st.bodies) {
        b.x += b.vx;
        b.y += b.vy;
      }
      st.bodies = st.bodies.filter((b) => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);

      // collisions
      if (st.alive) {
        for (const b of st.bodies) {
          const d = Math.hypot(b.x - st.px, b.y - st.py);
          if (d < b.r + 10) {
            if (b.kind === "signal") {
              st.score += 10;
              setScore(st.score);
              sound.select();
              b.x = -9999;
            } else {
              st.score = Math.max(0, st.score - 15);
              setScore(st.score);
              sound.error();
              // knock away
              const a = Math.atan2(st.py - b.y, st.px - b.x);
              st.vx = Math.cos(a) * 6;
              st.vy = Math.sin(a) * 6;
              b.x = -9999;
            }
          }
        }
        st.bodies = st.bodies.filter((b) => b.x > -5000);
      }

      // draw
      const dark = document.documentElement.dataset.theme !== "light";
      ctx.fillStyle = dark ? "#0d0f14" : "#f4f2ec";
      ctx.fillRect(0, 0, W, H);
      // starfield
      ctx.fillStyle = dark ? "#c9d1e3" : "#2a2d3a";
      for (let i = 0; i < 40; i++) {
        const sx = (i * 173) % W, sy = (i * 311) % H;
        ctx.globalAlpha = 0.25 + ((i * 7) % 10) / 20;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
      // orbit ring
      ctx.strokeStyle = dark ? "#2a3352" : "#d7dbf2";
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.32, 0, Math.PI * 2);
      ctx.stroke();
      // bodies
      for (const b of st.bodies) {
        if (b.kind === "signal") {
          ctx.fillStyle = "#57c7d4";
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = dark ? "#0d0f14" : "#fff";
          ctx.font = `${b.r}px monospace`;
          ctx.fillText("~", b.x - b.r / 2, b.y + b.r / 2);
        } else {
          ctx.fillStyle = "#8a6d3b";
          ctx.beginPath();
          for (let k = 0; k < 7; k++) {
            const a = (k / 7) * Math.PI * 2 + b.hue;
            const rr = b.r * (0.8 + ((k * 37) % 10) / 30);
            ctx.lineTo(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
      // ship
      ctx.fillStyle = "#8fa3ff";
      ctx.beginPath();
      ctx.arc(st.px, st.py, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark ? "#0d0f14" : "#fff";
      ctx.beginPath();
      ctx.arc(st.px, st.py, 4, 0, Math.PI * 2);
      ctx.fill();

      if (acc > 100) {
        acc = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const touch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || !st.alive) return;
      const rect = cv.getBoundingClientRect();
      const tx = (t.clientX - rect.left) * 2, ty = (t.clientY - rect.top) * 2;
      st.vx += (tx - st.px) * 0.002;
      st.vy += (ty - st.py) * 0.002;
    };
    cv.addEventListener("touchmove", touch, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cv.removeEventListener("touchmove", touch);
    };
  }, [over === true ? 1 : 0]);

  return (
    <div className="h-full flex flex-col min-h-0" aria-label="orbit game">
      <div className="flex items-center gap-4 px-4 py-2 text-[12.5px] border-b shrink-0" style={{ borderColor: "var(--border)", color: "var(--fg-dim)" }}>
        <span className="font-bold" style={{ color: "var(--fg)" }}>ORBIT</span>
        <span>score <b style={{ color: "var(--accent-soft)" }}>{score}</b></span>
        <span>best <b>{best}</b></span>
        <span className="ml-auto tabular-nums">{over ? "done" : `${time}s`}</span>
        {over && (
          <button className="px-2.5 py-1 border text-[12px]" style={{ borderColor: "var(--accent)", color: "var(--accent-soft)" }}
            onClick={() => { setOver(false); }}>
            fly again
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 relative">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        {over && (
          <div className="absolute inset-0 grid place-items-center" style={{ background: "rgba(3,4,8,0.55)" }}>
            <div className="text-center space-y-1">
              <div className="text-[20px] font-bold" style={{ color: "var(--fg)" }}>{score} signals</div>
              <div className="text-[12px]" style={{ color: "var(--muted)" }}>arrows / wasd · space brakes · touch drags</div>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-1.5 text-[11.5px] border-t shrink-0" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        arrows / wasd to thrust · space to brake · catch ~ · dodge rock
      </div>
    </div>
  );
}
