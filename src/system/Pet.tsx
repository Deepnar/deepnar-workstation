"use client";

// Companion: an original pixel creature on canvas driven by an autonomous
// behavior scheduler — no LLM, no API. Weighted local decisions based on
// idle time, cursor proximity, drag velocity and system events (terminal
// results, agent activity). Speech lives in a bubble above the pet;
// it never uses global notifications.
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

// side profile: walking view (faces right; mirrored when heading left)
const SIDE = [
  ".....BB...BB....",
  ".....BBBBBBB....",
  "....BBBBBBBBB...",
  "....BBBBBBBBBB..",
  "...BBBBBBBBBBB..",
  "...BBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  "...BBBBBBBBBBB..",
  "...BBBBBBBBBBB..",
  "...BBB...BB.....",
];
const SIDE_FEET_B = "...BB.....BBB...";
// curled back: sleeping view (faces away, tail wrapped)
const BACK = [
  "....BBBBBBB.....",
  "...BBBBBBBBB....",
  "..BBBBBBBBBBB...",
  "..BBBBBBBBBBB...",
  ".BBBBBBBBBBBBB..",
  ".BBBBBBBBBBBBB..",
  ".BBBBBBBBBBBBB..",
  ".BBBBBBBBBBBBB..",
  "..BBBBBBBBBBB...",
  "..BBBBBBBBBBB...",
  "...BBBBBBBBB....",
  "....BBB.BBB.....",
];
const WALK_FEET = "...BB..BB..BB...";
const WALK_FEET2 = "....BB..BB..B....";
const SIT_FEET = "...BBBBBBBBB....";

type Face = "open" | "closed" | "happy" | "x" | "dot";
type LocalAct = "none" | "sit" | "groom" | "stretch" | "inspect" | "hop" | "spin" | "drag" | "dizzy" | "flop" | "fall";

function cssVar(name: string, fb: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  } catch {
    return fb;
  }
}

interface Palette { body: string; dark: string; warm: string; icy: string }

function draw(
  ctx: CanvasRenderingContext2D, px: number,
  mode: PetMode, act: LocalAct, frame: number, flip: boolean,
  colors: Palette, look: { x: number; y: number } = { x: 0, y: 0 },
) {
  const wpx = W * px, hpx = H * px + 4 * px;
  ctx.clearRect(0, 0, wpx, hpx);
  ctx.save();
  if (flip) { ctx.translate(wpx, 0); ctx.scale(-1, 1); }
  // flop lies flat
  if (act === "flop") { ctx.translate(0, hpx); ctx.scale(1, 0.5); ctx.translate(0, -hpx); }

  let dy = 0;
  let face: Face = "open";
  const f = frame;
  if (act === "hop" || act === "fall") dy = -2;
  else if (act === "stretch") dy = -1;

  if (mode === "sleep" || act === "flop") face = "closed";
  else if (mode === "failed") face = "x";
  else if (mode === "success") face = "happy";
  else if (mode === "wave") face = "happy";
  else if (mode === "thinking") face = f % 2 ? "open" : "dot";
  else if (act === "dizzy") face = "x";
  else if (act === "groom") face = f % 3 === 2 ? "closed" : "open";
  else if (f % 7 === 6) face = "closed"; // blink
  if (mode === "working" && f % 2) dy = -1;

  const put = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x * px, (y + dy) * px, px, px);
  };

  const side = mode === "walk" && act !== "drag" && act !== "fall";
  const back = mode === "sleep";
  let rows = BODY;
  if (side) rows = SIDE.map((r, i) => (i === 11 ? (f % 2 ? SIDE[11] : SIDE_FEET_B) : r));
  else if (back) rows = BACK;
  else if (mode === "walk") rows = BODY.map((r, i) => (i === 11 ? (f % 2 ? WALK_FEET : WALK_FEET2) : r));
  if (act === "sit" && !side) rows = BODY.map((r, i) => (i === 11 ? SIT_FEET : r));
  rows.forEach((row, y) => {
    for (let x = 0; x < W; x++) if (row[x] === "B") put(x, y, colors.body);
  });

  // tail (wags while walking / happy; wrapped when curled)
  if (!back) {
    const wag = mode === "walk" ? (f % 2 ? 6 : 8) : mode === "success" ? (f % 2 ? 6 : 7) : 7;
    if (side) { put(0, 5, colors.body); put(0, 6, colors.body); }
    else { put(0, wag, colors.body); put(0, wag + 1, colors.body); }
  }

  // groom: paw over face every few frames
  if (act === "groom" && f % 3 !== 2) { put(4, 6, colors.body); put(4, 7, colors.body); }
  // inspect: lean — nose pixel forward
  if (act === "inspect") { put(14, 7, colors.body); }
  // stretch: front paws forward
  if (act === "stretch") { put(14, 10, colors.body); put(15, 10, colors.body); }
  // wave arm
  if (mode === "wave") { put(14, 3, colors.body); put(15, 2 - (f % 2), colors.body); }

  // face (rows 4-6); pupils lean toward the cursor
  const eye = (x: number) => {
    x += look.x > 0.35 ? 1 : look.x < -0.35 ? -1 : 0;
    if (face === "open") { put(x, 5, colors.dark); put(x + 1, 5, colors.dark); put(x, 6, colors.dark); put(x + 1, 6, colors.dark); }
    else if (face === "closed" || face === "dot") { put(x, 6, colors.dark); put(x + 1, 6, colors.dark); }
    else if (face === "happy") { put(x, 6, colors.dark); put(x, 5, colors.dark); put(x + 1, 5, colors.dark); put(x + 1, 6, colors.dark); }
    else { put(x, 5, colors.dark); put(x + 1, 6, colors.dark); put(x + 1, 5, colors.dark); put(x, 6, colors.dark); }
  };
  // look-left / look-right: shift pupils
  if (side) {
    // single forward eye + nose (profile); pupil tracks the cursor
    const ex = 10 + (look.x > 0.35 ? 1 : look.x < -0.35 ? -1 : 0);
    if (face === "closed") { put(ex, 6, colors.dark); put(ex + 1, 6, colors.dark); }
    else if (face === "x") { put(ex, 5, colors.dark); put(ex + 1, 6, colors.dark); put(ex + 1, 5, colors.dark); put(ex, 6, colors.dark); }
    else { put(ex, 5, colors.dark); put(ex + 1, 5, colors.dark); put(ex, 6, colors.dark); put(ex + 1, 6, colors.dark); }
    if (face === "open") put(13, 7, colors.dark); // nose
  } else if (!back) {
    let lx = 5, rx = 9;
    if (act === "inspect") { lx = 6; rx = 10; }
    eye(lx); eye(rx);
    if (face === "open" || face === "happy") { put(7, 7, colors.dark); put(8, 7, colors.dark); }
  }

  // overlays
  if (mode === "sleep") {
    const zoff = f % 3;
    ctx.fillStyle = colors.icy;
    const zx = 12 * px, zy = (1 - zoff) * px;
    const s2 = px * (zoff === 0 ? 2 : 1); // nearest z puffs up
    ctx.fillRect(zx, zy, 3 * px, px);
    ctx.fillRect(zx + 2 * px, zy + px, s2, s2);
    ctx.fillRect(zx, zy + 2 * px, 3 * px, px);
    if (zoff === 0) say2(ctx, zx, zy, px, colors);
  }
  if (mode === "thinking") {
    ctx.fillStyle = colors.icy;
    const n = 1 + (f % 3);
    for (let i = 0; i < n; i++) ctx.fillRect((6 + i * 2) * px, 1 * px, px, px);
  }
  if (mode === "working") {
    ctx.fillStyle = colors.warm;
    const sx = f % 2 ? 1 : 14;
    ctx.fillRect(sx * px, 3 * px, px, px);
    ctx.fillRect((15 - sx) * px, 8 * px, px, px);
  }
  if (mode === "success") {
    ctx.fillStyle = colors.warm;
    ctx.fillRect(2 * px, 2 * px, px, px);
    ctx.fillRect(13 * px, 2 * px, px, px);
  }
  // dizzy spiral: orbiting sparks above the head
  if (act === "dizzy") {
    ctx.fillStyle = colors.warm;
    for (let i = 0; i < 3; i++) {
      const a = (f / 3) + (i * Math.PI * 2) / 3;
      const sx = Math.round(8 + Math.cos(a) * 5);
      const sy = Math.round(1 + Math.sin(a) * 1.5);
      ctx.fillRect(sx * px, sy * px, px, px);
    }
  }
  ctx.restore();
}

// tiny floating "z" above the big sleep-Z
function say2(ctx: CanvasRenderingContext2D, zx: number, zy: number, px: number, colors: Palette) {
  ctx.fillStyle = colors.icy;
  ctx.fillRect(zx + 4 * px, zy - 2 * px, 2 * px, px);
  ctx.fillRect(zx + 5 * px, zy - px, px, px);
  ctx.fillRect(zx + 4 * px, zy, 2 * px, px);
}

const POKE_QUIPS = ["mrrp.", "hey.", "prrt.", "you again?", "mrrp mrrp.", "*stretches*",
  "that tickles.", "busy loafing.", "shh. plotting.", "did you see that graph?",
  "orbit is my cardio.", "*happy wiggles*", "pet the graph, not me.", "brb. napping later.",
  "one more lap. maybe.", "is that a bug? ship it.", "i eat stale tabs.", "pspsps.",
  "vim or emacs? trick question.", "touch grass? never met her.", "*judges your commit messages*",
  "i saw that typo.", "rebase in peace.", "works on my machine.", "have you tried turning it off?",
  "*loaf intensifies*", "professional napper.", "404: motivation found."];
const RARE_QUIPS = ["working.", "nice.", "...", "zzz...", "hmm.", "oh! hi."];

export function Pet({ anchor }: { anchor: "desktop" | "status" }) {
  const { petOn, petMode, settings } = useShell();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const actRef = useRef<LocalAct>("none");
  const [act, setActState] = useState<LocalAct>("none");
  const [pos, setPos] = useState({ x: 62, y: 0 });
  const posRef = useRef({ x: 62, y: 0 });
  useEffect(() => { posRef.current = pos; }, [pos]);
  const [flip, setFlip] = useState(false);
  const [quip, setQuip] = useState<string | null>(null);
  const targetRef = useRef<number | null>(null);
  const busyUntil = useRef(0);
  const idleRef = useRef(Date.now());
  const dragTrail = useRef<{ x: number; y: number; t: number }[]>([]);
  const quipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quipIdx = useRef(-1);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const [, force] = useState(0);

  const setAct = (a: LocalAct) => {
    actRef.current = a;
    setActState(a);
    force((n) => n + 1);
  };
  const say = (text: string, ms = 4200) => {
    setQuip(text);
    if (quipTimer.current) clearTimeout(quipTimer.current);
    quipTimer.current = setTimeout(() => setQuip(null), ms);
  };
  const busy = () => Date.now() < busyUntil.current;
  const hold = (ms: number) => { busyUntil.current = Date.now() + ms; };
  const settleRef = useRef(0);
  const settle = () => { settleRef.current = Date.now() + 20000 + Math.random() * 10000; };
  const settled = () => Date.now() < settleRef.current;

  // wake on activity; sleep after 75s idle
  useEffect(() => {
    if (!petOn) return;
    const wake = () => {
      idleRef.current = Date.now();
      const s = useShell.getState();
      if (s.petMode === "sleep") { s.setPetMode("idle"); say("..."); }
    };
    window.addEventListener("mousemove", wake, { passive: true });
    window.addEventListener("keydown", wake);
    const t = setInterval(() => {
      const s = useShell.getState();
      if (Date.now() - idleRef.current > 75000 && (s.petMode === "idle" || s.petMode === "walk"))
        s.setPetMode("sleep");
    }, 5000);
    return () => {
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
      clearInterval(t);
    };
  }, [petOn]);

  // cursor tracking (watch-cursor + proximity reactions)
  useEffect(() => {
    if (!petOn) return;
    const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [petOn]);

  // autonomous scheduler: desktop only
  useEffect(() => {
    if (anchor !== "desktop" || !petOn || !settings.petRoam || !settings.motion) return;
    const t = setInterval(() => {
      if (document.hidden || busy() || settled() || actRef.current === "drag" || actRef.current === "dizzy" || actRef.current === "flop" || actRef.current === "fall") return;
      const s = useShell.getState();
      if (s.petMode !== "idle" && s.petMode !== "walk") return;
      const r = Math.random();
      if (s.petMode === "walk") {
        // occasionally change mind mid-walk, or stop to inspect
        if (r < 0.12) targetRef.current = posRef.current.x < 50 ? 68 + Math.random() * 22 : 3 + Math.random() * 22;
        else if (r < 0.4) { targetRef.current = null; s.setPetMode("idle"); setAct("inspect"); hold(2200); setTimeout(() => { if (actRef.current === "inspect") setAct("none"); }, 2200); }
        return;
      }
      // idle: overwhelmingly rest; a walk is a rare event
      if (r < 0.12) {
        const tx = posRef.current.x < 50 ? 68 + Math.random() * 22 : 3 + Math.random() * 22;
        targetRef.current = tx;
        setFlip(tx < posRef.current.x);
        s.setPetMode("walk");
      } else if (r < 0.26) { setAct("sit"); hold(4000); setTimeout(() => { if (actRef.current === "sit") setAct("none"); }, 4000); }
      else if (r < 0.40) { setAct("sit"); hold(12000); setTimeout(() => { if (actRef.current === "sit") setAct("none"); }, 9000); }
      else if (r < 0.50) { setAct("groom"); hold(3200); setTimeout(() => { if (actRef.current === "groom") setAct("none"); }, 3200); }
      else if (r < 0.56) { setAct("stretch"); hold(2000); setTimeout(() => { if (actRef.current === "stretch") setAct("none"); }, 2000); }
      else if (r < 0.58) {
        // spin: whip around twice, then sit down dizzy-ish
        setAct("spin"); hold(1400);
        let n = 0;
        const sp = setInterval(() => { setFlip((f) => !f); if (++n >= 6) clearInterval(sp); }, 180);
        setTimeout(() => { if (actRef.current === "spin") setAct("none"); }, 1400);
      }
      else if (r < 0.60) {
        setAct("hop"); hold(900);
        setPos((p) => ({ ...p, y: -14 }));
        setTimeout(() => { setPos((p) => ({ ...p, y: 0 })); if (actRef.current === "hop") setAct("none"); }, 450);
      } else if (r < 0.68) {
        // watch: stop and track the cursor, sometimes comment
        hold(3200);
        if (Math.random() < 0.4) say(RARE_QUIPS[Math.floor(Math.random() * RARE_QUIPS.length)]);
        setTimeout(() => {}, 3200);
      } else if (r < 0.71 && Math.random() < 0.3) {
        say(RARE_QUIPS[Math.floor(Math.random() * RARE_QUIPS.length)]);
      }
      // else: keep idling (blink handled in draw)
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, petOn, settings.petRoam, settings.motion]);

  // walking locomotion: step toward target, face travel direction
  useEffect(() => {
    if (anchor !== "desktop" || !petOn || !settings.motion) return;
    const t = setInterval(() => {
      const s = useShell.getState();
      if (s.petMode !== "walk" || targetRef.current == null || document.hidden) return;
      if (actRef.current === "drag") return;
      setPos((p) => {
        const d = targetRef.current! - p.x;
        if (Math.abs(d) < 1.6) {
          // arrived: rarely turn back, almost always settle
          if (Math.random() < 0.15) {
            targetRef.current = p.x < 50 ? 72 + Math.random() * 18 : 4 + Math.random() * 18;
            setFlip(targetRef.current! < p.x);
            return { ...p, y: 0 };
          }
          targetRef.current = null;
          if (useShell.getState().petMode === "walk") useShell.getState().setPetMode("idle");
          settleRef.current = Date.now() + 20000 + Math.random() * 10000;
          return { ...p, y: 0 };
        }
        setFlip(d < 0);
        // waddle: alternate a small hop each step so it walks instead of sliding
        return { ...p, x: p.x + Math.sign(d) * 1.5, y: p.y === 0 ? -2 : 0 };
      });
    }, 70);
    return () => clearInterval(t);
  }, [anchor, petOn, settings.motion]);

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
      // pupils track the cursor
      let look = { x: 0, y: 0 };
      try {
        const r = cv.getBoundingClientRect();
        const m = mouseRef.current;
        look = {
          x: Math.max(-1, Math.min(1, (m.x - (r.left + r.width / 2)) / 160)),
          y: Math.max(-1, Math.min(1, (m.y - (r.top + r.height / 2)) / 160)),
        };
      } catch { /* noop */ }
      // watch cursor while idle: face whoever is near
      if (actRef.current === "none" && useShell.getState().petMode === "idle" && anchor === "desktop") {
        const m = mouseRef.current;
        const px = (pos.x / 100) * window.innerWidth;
        if (Math.abs(m.x - px) < 220 && Math.abs(m.x - px) > 30) setFlip(m.x < px);
      }
      draw(ctx, px, useShell.getState().petMode, actRef.current, frameRef.current, flip, colors, look);
    }, 170);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petOn, settings.petSize, anchor, flip, pos.x]);

  if (!petOn) return null;

  const px = Math.max(2, Math.round((anchor === "desktop" ? 4 : 2) * settings.petSize));

  const poke = () => {
    const now = Date.now();
    idleRef.current = now;
    if (["drag", "dizzy", "flop", "fall"].includes(actRef.current)) return;
    const s = useShell.getState();
    sound.pet();
    if (actRef.current !== "none") setAct("none");
    if (s.petMode === "sleep") { s.setPetMode("idle"); say("..."); return; }
    if (s.petMode === "walk") { targetRef.current = null; s.setPetMode("idle"); settle(); }
    s.setPetMode("wave");
    hold(1300);
    setTimeout(() => { if (useShell.getState().petMode === "wave") useShell.getState().setPetMode("idle"); }, 1300);
    quipIdx.current = (quipIdx.current + 1) % POKE_QUIPS.length;
    say(POKE_QUIPS[quipIdx.current]);
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
      <button onClick={poke} title={`companion (${petMode}${act !== "none" ? ` · ${act}` : ""})`} aria-label="interact with companion" className="px-1.5 shrink-0 cursor-pointer">
        {cv}
      </button>
    );
  }

  const downAt = useRef({ x: 0, y: 0, t: 0 });
  const onDown = (e: React.PointerEvent) => {
    idleRef.current = Date.now();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragTrail.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
    downAt.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    targetRef.current = null;
    if (useShell.getState().petMode === "walk") useShell.getState().setPetMode("idle");
    if (useShell.getState().petMode === "sleep") useShell.getState().setPetMode("idle");
    setAct("drag");
    sound.select();
  };
  const onMove = (e: React.PointerEvent) => {
    if (actRef.current !== "drag") return;
    const trail = dragTrail.current;
    trail.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    if (trail.length > 12) trail.shift();
    const x = Math.min(94, Math.max(2, (e.clientX / window.innerWidth) * 100));
    // lift above the floor while held (floor ≈ bottom-14 → 56px)
    const y = Math.min(0, e.clientY - (window.innerHeight - 56 - ((H * px + 4 * px) / 2)));
    setFlip((trail.length > 1 && e.clientX < trail[trail.length - 2].x) || false);
    setPos({ x, y: Math.max(-260, y) });
  };
  const onUp = () => {
    if (actRef.current !== "drag") return;
    // a still press is a click (talk), not a pickup
    const d0 = downAt.current;
    const moved = dragTrail.current.reduce((m, p) => Math.max(m, Math.hypot(p.x - d0.x, p.y - d0.y)), 0);
    if (moved < 6 && Date.now() - d0.t < 500) {
      setAct("none");
      poke();
      return;
    }
    const trail = dragTrail.current;
    // shake detection: path length over the last ~1.2s
    const now = Date.now();
    const recent = trail.filter((p) => now - p.t < 1200);
    let dist = 0;
    for (let i = 1; i < recent.length; i++)
      dist += Math.hypot(recent[i].x - recent[i - 1].x, recent[i].y - recent[i - 1].y);
    if (dist > 750 && recent.length > 4) {
      setAct("dizzy");
      hold(5200);
      say("bonk.", 3000);
      setPos((p) => ({ ...p, y: 0 }));
      setTimeout(() => {
        setAct("flop");
        setTimeout(() => {
          if (actRef.current === "flop") { setAct("none"); say("...fine."); }
        }, 2200);
      }, 3000);
    } else {
      // drop: tiny gravity fall + settle bounce
      setAct("fall");
      hold(700);
      const from = pos.y;
      const steps = 6;
      let i = 0;
      const t = setInterval(() => {
        i++;
        const k = Math.min(1, i / steps);
        setPos((p) => ({ ...p, y: from * (1 - k * k) }));
        if (k >= 1) {
          clearInterval(t);
          sound.nav();
          if (actRef.current === "fall") setAct("none");
        }
      }, 40);
    }
  };

  return (
    <div className="fixed z-[45]" style={{ left: `${pos.x}%`, bottom: 56 + -pos.y, transition: "left 70ms linear" }}>
      {quip && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-[3px] text-[12px] border"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--fg)" }}
          aria-live="polite">
          {quip}
          <span className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-2 h-2 rotate-45 border-r border-b"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }} />
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        aria-label="companion creature — drag to pick up, shake for chaos"
        title={`companion (${petMode}${act !== "none" ? ` · ${act}` : ""})`}
        onKeyDown={(e) => e.key === "Enter" && poke()}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ touchAction: "none" }}
        className="cursor-grab active:cursor-grabbing"
      >
        {cv}
      </div>
    </div>
  );
}
