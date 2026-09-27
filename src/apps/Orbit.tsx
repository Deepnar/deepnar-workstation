"use client";

// ORBIT — an endless desktop toy. Steer the mote, dodge asteroids,
// catch signals. 5 hull hits and you are out — score survives hits.
// Arrows/WASD + Space (brake), Esc pauses, touch drag. Canvas only.
import { useEffect, useRef, useState } from "react";
import { sound } from "@/audio/engine";
import { useShell } from "@/lib/store";

interface Body { x: number; y: number; vx: number; vy: number; r: number; kind: "rock" | "signal"; hue: number }

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number }
interface Pop { x: number; y: number; text: string; life: number }
interface Ring { x: number; y: number; r: number; life: number }

export function Orbit() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(5);
  const [over, setOver] = useState(false);
  const [count, setCount] = useState(3);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const stateRef = useRef({
    bodies: [] as Body[], particles: [] as Particle[], pops: [] as Pop[], rings: [] as Ring[],
    px: 0, py: 0, vx: 0, vy: 0, angle: -Math.PI / 2, keys: new Set<string>(),
    score: 0, lives: 5, invuln: 0, alive: true, shake: 0, thrusting: false, braking: false, countdown: 3,
  });

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
    st.particles = [];
    st.pops = [];
    st.rings = [];
    st.score = 0;
    st.lives = 5;
    st.invuln = 0;
    st.alive = true;
    st.shake = 0;
    st.countdown = 3;
    pausedRef.current = false;
    setOver(false);
    setScore(0);
    setLives(5);
    setPaused(false);
    setCount(3);

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
      if (e.key === "Escape") {
        e.preventDefault();
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        sound.toggle();
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      keys.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    let last = performance.now();
    let acc = 0;
    let raf = 0;
    let countAcc = 0;
    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      acc += dt;
      // countdown: the ship holds while the clock ticks 3·2·1
      if (st.countdown > 0) {
        countAcc += dt;
        if (countAcc > 750) {
          countAcc = 0;
          st.countdown -= 1;
          setCount(st.countdown);
          sound.nav();
        }
      }
      if (pausedRef.current) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const flying = st.alive && st.countdown <= 0;
      if (st.invuln > 0) st.invuln -= dt;
      // ship
      const thrust = 0.35;
      st.thrusting = false;
      st.braking = false;
      if (flying) {
        if (keys.has("arrowup") || keys.has("w")) { st.vy -= thrust; st.thrusting = true; }
        if (keys.has("arrowdown") || keys.has("s")) { st.vy += thrust; st.thrusting = true; }
        if (keys.has("arrowleft") || keys.has("a")) { st.vx -= thrust; st.thrusting = true; }
        if (keys.has("arrowright") || keys.has("d")) { st.vx += thrust; st.thrusting = true; }
        if (keys.has(" ")) { st.vx *= 0.94; st.vy *= 0.94; st.braking = true; }
        const sp = Math.hypot(st.vx, st.vy);
        if (sp > 0.6) st.angle = Math.atan2(st.vy, st.vx);
        // exhaust trail while thrusting
        if (st.thrusting && st.particles.length < 90) {
          st.particles.push({
            x: st.px - Math.cos(st.angle) * 16, y: st.py - Math.sin(st.angle) * 16,
            vx: -Math.cos(st.angle) * 2 + (Math.random() - 0.5), vy: -Math.sin(st.angle) * 2 + (Math.random() - 0.5),
            life: 22, max: 22,
          });
        }
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
      if (flying) {
        for (const b of st.bodies) {
          const d = Math.hypot(b.x - st.px, b.y - st.py);
          if (d < b.r + 10) {
            if (b.kind === "signal") {
              st.score += 10;
              setScore(st.score);
              sound.select();
              st.rings.push({ x: b.x, y: b.y, r: 6, life: 26 });
              st.pops.push({ x: b.x, y: b.y - 14, text: "+10", life: 40 });
              b.x = -9999;
            } else if (st.invuln <= 0) {
              // hull hit: lose a life, never points — brief shields after
              st.lives -= 1;
              setLives(st.lives);
              st.invuln = 1500;
              sound.error();
              st.shake = 9;
              st.pops.push({ x: st.px, y: st.py - 18, text: "HIT", life: 40 });
              // knock away
              const a = Math.atan2(st.py - b.y, st.px - b.x);
              st.vx = Math.cos(a) * 6;
              st.vy = Math.sin(a) * 6;
              b.x = -9999;
              if (st.lives <= 0) {
                st.alive = false;
                setOver(true);
                setBest((bb) => {
                  const nb = Math.max(bb, st.score);
                  try {
                    localStorage.setItem("deepnar-orbit-best", String(nb));
                  } catch {
                    /* noop */
                  }
                  return nb;
                });
              }
            }
          }
        }
        st.bodies = st.bodies.filter((b) => b.x > -5000);
      }
      // particles / pops / rings age
      for (const p of st.particles) { p.x += p.vx; p.y += p.vy; p.life -= dt / 16; }
      st.particles = st.particles.filter((p) => p.life > 0);
      for (const p of st.pops) { p.y -= 0.6; p.life -= dt / 16; }
      st.pops = st.pops.filter((p) => p.life > 0);
      for (const r of st.rings) { r.r += 2.4; r.life -= dt / 16; }
      st.rings = st.rings.filter((r) => r.life > 0);
      if (st.shake > 0) st.shake = Math.max(0, st.shake - dt / 16);

      // draw (screen shake on rock hits: tiny, decaying)
      const dark = document.documentElement.dataset.theme !== "light";
      ctx.save();
      if (st.shake > 0) ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
      ctx.fillStyle = dark ? "#0d0f14" : "#f4f2ec";
      ctx.fillRect(-12, -12, W + 24, H + 24);
      // starfield
      ctx.fillStyle = dark ? "#c9d1e3" : "#2a2d3a";
      for (let i = 0; i < 40; i++) {
        const sx = (i * 173) % W, sy = (i * 311) % H;
        ctx.globalAlpha = 0.25 + ((i * 7) % 10) / 20;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
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
      // ship: small rocket rotated toward velocity, exhaust flicker on thrust
      // shield blink while invulnerable
      if (st.invuln <= 0 || Math.floor(now / 120) % 2 === 0) {
      ctx.save();
      ctx.translate(st.px, st.py);
      ctx.rotate(st.angle + Math.PI / 2);
      const flame = st.thrusting ? 15 + Math.random() * 12 : st.braking ? 6 : 0;
      if (flame > 0) {
        ctx.fillStyle = st.braking ? "#8fa3ff" : "#57c7d4";
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(-8, 12);
        ctx.lineTo(0, 12 + flame);
        ctx.lineTo(8, 12);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // fins
      ctx.fillStyle = dark ? "#3a4568" : "#9aa2c8";
      ctx.beginPath();
      ctx.moveTo(-11, 3); ctx.lineTo(-19, 16); ctx.lineTo(-9, 12); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(11, 3); ctx.lineTo(19, 16); ctx.lineTo(9, 12); ctx.closePath(); ctx.fill();
      // body
      ctx.fillStyle = dark ? "#e8ebf7" : "#2a2d3a";
      ctx.beginPath();
      ctx.moveTo(0, -25);
      ctx.lineTo(9, 3); ctx.lineTo(9, 12); ctx.lineTo(-9, 12); ctx.lineTo(-9, 3);
      ctx.closePath(); ctx.fill();
      // cockpit
      ctx.fillStyle = st.braking ? "#8fa3ff" : "#57c7d4";
      ctx.beginPath();
      ctx.arc(0, -6, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      }
      // exhaust particles
      for (const p of st.particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.8;
        ctx.fillStyle = "#57c7d4";
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
      ctx.globalAlpha = 1;
      // pickup rings
      for (const r of st.rings) {
        ctx.globalAlpha = Math.max(0, r.life / 26);
        ctx.strokeStyle = "#57c7d4";
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // score pops
      ctx.font = `${15 * 2}px monospace`;
      for (const p of st.pops) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 20));
        ctx.fillStyle = p.text.startsWith("+") ? "#7fd08a" : "#e08a8a";
        ctx.fillText(p.text, p.x - 12, p.y);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

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
        <span title="hull" aria-label={`${lives} hull left`} className="tabular-nums" style={{ color: lives <= 2 ? "var(--err)" : undefined }}>
          {"♥".repeat(Math.max(0, lives))}{"♡".repeat(Math.max(0, 5 - lives))}
        </span>
        <span className="ml-auto tabular-nums">{over ? "done" : paused ? "paused" : "endless"}</span>
        <button title="hide to desktop" aria-label="minimize" className="px-2 hover:bg-[var(--sel-bg)]"
          style={{ color: "var(--muted)" }} onClick={() => { useShell.getState().setPhase("desktop"); }}>
          <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>–</span>
        </button>
        {over && (
          <button className="px-2.5 py-1 border text-[12px]" style={{ borderColor: "var(--accent)", color: "var(--accent-soft)" }}
            onClick={() => { setOver(false); }}>
            fly again
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 relative">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" tabIndex={0}
          onKeyDown={(e) => { if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault(); }} />
        {!over && count > 0 && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-[44px] font-bold tabular-nums px-6 py-2 border" style={{ color: "var(--fg)", background: "var(--surface)", borderColor: "var(--border)" }}>{count}</div>
          </div>
        )}
        {!over && paused && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center px-6 py-4 border space-y-1" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="text-[16px] font-bold" style={{ color: "var(--fg)" }}>paused</div>
              <div className="text-[12px]" style={{ color: "var(--muted)" }}>esc to resume</div>
            </div>
          </div>
        )}
        {over && (
          <div className="absolute inset-0 grid place-items-center" style={{ background: "rgba(3,4,8,0.55)" }}>
            <div className="text-center space-y-1">
              <div className="text-[20px] font-bold" style={{ color: "var(--fg)" }}>hull breached · {score} signals</div>
              <div className="text-[12px]" style={{ color: "var(--muted)" }}>arrows / wasd · space brakes · esc pauses · touch drags</div>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-1.5 text-[11.5px] border-t shrink-0" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        arrows / wasd to thrust · space to brake · esc pauses · catch ~ · dodge rock · 5 hits out
      </div>
    </div>
  );
}
