"use client";

// SYSTEM → DESKTOP (3 real spaces) → APP.
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleHelp, LogOut, Search, Volume2, VolumeX } from "lucide-react";
import { useShell } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { Workstation } from "@/workstation/Workstation";
import { Palette } from "@/workstation/Palette";
import { Orbit } from "@/apps/Orbit";
import { Constellation } from "@/apps/Constellation";
import { Pet } from "./Pet";
import { Contact, Help, Settings, Toasts } from "./Overlays";
import { CustomCursor } from "./Cursor";
import { sound, ambience } from "@/audio/engine";

import { Starfield } from "./Starfield";

/* ── phase 1: boot ── */
const BOOT_LINES = ["deepnar/orien-compat · kernel 6.16-guest", "mounting ~/projects ~/research ~/oss", "local index ready · starting compositor", "ready."];
export function Boot() {
  const { phase, setPhase } = useShell();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (phase !== "boot") return;
    if (n >= BOOT_LINES.length) {
      const t = setTimeout(() => advance(), 250);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((v) => v + 1), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, phase]);
  if (phase !== "boot") return null;
  const advance = () => setPhase("greeter");
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center cursor-pointer" style={{ background: "var(--bg)" }} onClick={advance} onKeyDown={advance} role="button" tabIndex={0} aria-label="skip boot">
      <div className="text-[13px] leading-7 font-mono" style={{ color: "var(--fg-dim)" }}>
        {BOOT_LINES.slice(0, n).map((l, i) => (
          <div key={i}><span style={{ color: "var(--ok)" }}>ok</span> · {l}</div>
        ))}
        <span className="animate-pulse" style={{ color: "var(--warm)" }}>▊</span>
      </div>
    </div>
  );
}

/* ── phase 2: greeter (the one clock lives here + waybar) ── */
export function Greeter() {
  const { phase, setPhase, setDesktopWs, notify } = useShell();
  const [time, setTime] = useState("--:--");
  useEffect(() => {
    if (phase !== "greeter") return;
    const f = () => {
      const d = new Date();
      setTime(d.toTimeString().slice(0, 5));
    };
    f();
    const t = setInterval(f, 5000);
    return () => clearInterval(t);
  }, [phase]);
  if (phase !== "greeter") return null;
  return <GreeterCard time={time} setPhase={setPhase} setDesktopWs={setDesktopWs} />;
}

function GreeterCard({ time, setPhase, setDesktopWs }: {
  time: string;
  setPhase: (p: "app") => void;
  setDesktopWs: (w: 1 | 2 | 3) => void;
}) {
  const [connecting, setConnecting] = useState<string[] | null>(null);
  const enter = () => {
    if (connecting) return;
    sound.enter();
    try {
      localStorage.setItem("deepnar-seen", "1");
    } catch {
      /* private mode */
    }
    // ssh-style handshake before the session opens
    setConnecting(["$ ssh guest@orien"]);
    const lines = ["connecting to orien… ok (11ms)", "auth: guest — welcome"];
    lines.forEach((ln, i) => {
      setTimeout(() => setConnecting((c) => (c ? [...c, ln] : c)), 380 * (i + 1));
    });
    setTimeout(() => {
      // guest lands straight in the workstation; the desktop page waits
      // behind minimize and launches the other two spaces from there
      setDesktopWs(1);
      setPhase("app");
      try { window.dispatchEvent(new Event("star-boost")); } catch { /* noop */ }
    }, 380 * (lines.length + 1));
  };
  return (
    <div className="fixed inset-0 z-[60] overflow-hidden cursor-theme" style={{ background: "var(--bg)" }}>
      <Starfield />
      <div className="relative h-full flex flex-col items-center justify-center gap-1 text-center px-6">
        <div className="text-[54px] font-bold tabular-nums" style={{ color: "var(--fg)" }}>{time}</div>
        <div className="text-[12px] uppercase tracking-[0.3em] mb-8" style={{ color: "var(--muted)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div className="text-[15px]" style={{ color: "var(--fg)" }}>deepnar</div>
        <div className="text-[12px] mb-6" style={{ color: "var(--muted)" }}>guest session · host orien</div>
        {connecting ? (
          <div className="text-left text-[12.5px] font-mono px-5 py-4 border min-w-[300px]" style={{ borderColor: "var(--border)", color: "var(--fg-dim)" }} aria-live="polite">
            {connecting.map((ln, i) => (
              <div key={i} className={i === 0 ? "mb-1" : undefined} style={i === 0 ? { color: "var(--fg)" } : undefined}>{ln}</div>
            ))}
            <span className="inline-block w-2 h-4 mt-1" style={{ background: "var(--accent)" }} />
          </div>
        ) : (
          <button onClick={enter} autoFocus
            className="px-6 py-2.5 text-[13px] border enter-btn" style={{ borderColor: "var(--accent)", color: "var(--accent-soft)" }}
            onKeyDown={(e) => { if (e.key === "Enter") enter(); }}>
            [ enter guest session ]
          </button>
        )}
      </div>
    </div>
  );
}

/* ── waybar: real desktop state only ── */
export function Waybar() {
  const { desktopWs, setDesktopWs, toggle, phase, logout } = useShell();
  const soundOn = useShell((s) => s.settings.sound);
  const setSettings = useShell((s) => s.setSettings);
  const [time, setTime] = useState("--:--");
  useEffect(() => {
    const f = () => setTime(new Date().toTimeString().slice(0, 5));
    f();
    const t = setInterval(f, 10000);
    return () => clearInterval(t);
  }, []);
  const names = ["workstation", "orbit", "signal"];
  const glyphs = [">_", "◌", "✦"];
  return (
    <header className="relative z-20 flex items-center gap-1 px-3 h-9 text-[12px] border-b shrink-0" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 82%, transparent)", backdropFilter: "blur(8px)" }} aria-label="system bar">

      <nav className="flex gap-0.5" aria-label="desktop workspaces">
        {([1, 2, 3] as const).map((w) => (
          <button key={w} title={`${w} · ${names[w - 1]} (alt+${w})`} aria-label={`desktop workspace ${names[w - 1]}`}
            onClick={() => { sound.tick(w >= desktopWs ? 1 : -1); setDesktopWs(w); }}
            className="h-7 grid place-items-center px-1.5 min-w-7"
            style={desktopWs === w
              ? { color: "var(--accent-soft)", background: "var(--sel-bg)", boxShadow: "inset 0 -2px 0 var(--accent)" }
              : { color: "var(--muted)", background: "transparent" }}>
            {desktopWs === w ? <span><b>{w}</b> <span className="text-[11.5px]">{glyphs[w - 1]} {names[w - 1]}</span></span> : w}
          </button>
        ))}
      </nav>
      <span className="mx-2 hidden sm:inline" style={{ color: "var(--muted)" }}>deepnar@orien</span>
      <span className="ml-auto" />
      {phase === "app" && (
        <button title="find anything (ctrl+k)" onClick={() => toggle("paletteOpen")} className="p-1.5 hover:text-[var(--fg)]" style={{ color: "var(--muted)" }} aria-label="search"><Search size={17} /></button>
      )}
      <button title="sound on/off" onClick={() => { try { setSettings({ sound: !soundOn }); } catch {} sound.select(); }} className="p-1.5 hover:text-[var(--fg)]" style={{ color: "var(--muted)" }} aria-label="sound">{soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
      <button title="help (?)" onClick={() => toggle("helpOpen")} className="p-1.5 hover:text-[var(--fg)]" style={{ color: "var(--muted)" }} aria-label="help"><CircleHelp size={17} /></button>
      {phase !== "greeter" && (
        <button title="log out (back to greeter)" onClick={() => { sound.appClose(); logout(); }} className="p-1.5 hover:text-[var(--fg)]" style={{ color: "var(--muted)" }} aria-label="log out"><LogOut size={17} /></button>
      )}
      <span className="pl-1 tabular-nums" style={{ color: "var(--fg-dim)" }}>{time}</span>
    </header>
  );
}

/* ── phase 3: desktop — one launcher per real workspace ── */
const LAUNCHERS = {
  1: { glyph: ">_", name: "workstation", hint: "portfolio · files · terminal" },
  2: { glyph: "◌", name: "orbit", hint: "60-second toy" },
  3: { glyph: "✦", name: "signal", hint: "the work, as a sky" },
} as const;

export function Desktop() {
  const { phase, setPhase, desktopWs } = useShell();
  if (phase !== "desktop") return null;
  const L = LAUNCHERS[desktopWs];
  const open = () => {
    sound.appOpen();
    setPhase("app");
  };
  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden cursor-theme" style={{ background: "var(--bg)" }}>
      <Starfield />
      <Waybar />
      <div className="relative flex-1">
        <button onClick={open} autoFocus
          className="absolute left-1/2 top-[38%] -translate-x-1/2 flex flex-col items-center gap-2 p-5 group launcher"
          aria-label={`open ${L.name}`}>
          <span className="w-16 h-16 grid place-items-center border text-[26px] transition-transform group-hover:-translate-y-0.5"
            style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 88%, transparent)", color: "var(--accent-soft)" }}>
            {L.glyph}
          </span>
          <span className="text-[12px]" style={{ color: "var(--fg-dim)" }}>{L.name}</span>
          <span className="text-[10.5px]" style={{ color: "var(--muted)" }}>{L.hint} · open ⏎</span>
        </button>
      </div>
      <Toasts />
    </div>
  );
}

/* ── app window: workstation / orbit / signal ── */
const APP_TITLES = { 1: "workstation", 2: "orbit", 3: "signal" } as const;

export function AppWindow() {
  const { phase } = useShell();
  const desktopWs = useShell((s) => s.desktopWs);
  if (phase !== "app") return null;
  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden pt-9 cursor-theme" style={{ background: "var(--bg)" }}>
      <div className="relative flex-1 flex flex-col min-h-0 app-open m-3 sm:m-6">
        <div className="flex flex-col flex-1 min-h-0 border overflow-hidden" style={{ borderColor: "var(--app-border)", background: "var(--bg)", borderRadius: 10 }}>
          <div className="flex-1 min-h-0 flex flex-col relative">
            {desktopWs === 1 ? <Workstation /> : desktopWs === 2 ? <Orbit /> : <Constellation />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── first-visit onboarding ── */
export function Onboarding() {
  const { phase } = useShell();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (phase !== "app") return;
    try {
      if (!localStorage.getItem("deepnar-onboard")) setShow(true);
    } catch {
      setShow(true);
    }
  }, [phase]);
  if (phase !== "app" || !show) return null;
  const close = () => {
    try {
      localStorage.setItem("deepnar-onboard", "1");
    } catch {
      /* private mode */
    }
    setShow(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-label="welcome">
      <div className="absolute inset-0" style={{ background: "rgba(3,4,8,0.6)" }} onClick={close} />
      <div className="relative border max-w-md w-full p-5 text-[13px]" style={{ background: "var(--surface)", borderColor: "var(--accent)" }}>
        <div className="font-bold mb-1" style={{ color: "var(--fg)" }}>welcome to deepnar@orien</div>
        <div className="mb-3" style={{ color: "var(--fg-dim)" }}>an interactive workstation. mouse works everywhere — no vim required.</div>
        <div className="grid grid-cols-[86px_1fr] gap-y-1.5 mb-4" style={{ color: "var(--fg-dim)" }}>
          <span style={{ color: "var(--icy)" }}>ctrl+k</span><span>find anything</span>
          <span style={{ color: "var(--icy)" }}>ctrl+`</span><span>terminal</span>
          <span style={{ color: "var(--icy)" }}>/</span><span>ask the agent</span>
          <span style={{ color: "var(--icy)" }}>alt+1·2·3</span><span>desktop spaces</span>
          <span style={{ color: "var(--icy)" }}>?</span><span>controls</span>
        </div>
        <button onClick={close} className="px-4 py-2 text-[13px] border" style={{ borderColor: "var(--accent)", color: "var(--accent-soft)" }}>[ enter workstation ]</button>
      </div>
    </div>
  );
}

/* root phase router (used by page) */
export function SystemRoot() {
  const { phase, desktopWs, settings } = useShell();
  const motionOn = settings.motion;
  const prevWs = useRef(desktopWs);
  const prevPhase = useRef(phase);
  const dir = desktopWs >= prevWs.current ? 1 : -1;
  useEffect(() => {
    prevWs.current = desktopWs;
    prevPhase.current = phase;
  }, [desktopWs, phase]);
  // alt+number hops between open spaces: no re-entry animation, just cut
  const hopping = prevPhase.current === "app" && phase === "app" && motionOn;
  // login/logout whoosh: stars accelerate briefly toward the viewer
  useEffect(() => {
    if (phase === "desktop" || phase === "app") {
      try {
        window.dispatchEvent(new Event("star-boost"));
      } catch {
        /* noop */
      }
    }
  }, [phase]);
  return (
    <>
      <Boot />
      <Greeter />
      <CustomCursor />
      {(phase === "desktop" || phase === "app") && <Pet anchor="desktop" />}
      {(phase === "desktop" || phase === "app") && (
        <>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={phase === "app" ? `app-${desktopWs}` : "desktop"}
              className="contents"
              initial={hopping ? false : motionOn ? { opacity: 0, x: phase === "app" ? 14 * dir : 0, scale: phase === "desktop" ? 1.16 : 0.98 } : false}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={hopping ? undefined : motionOn ? { opacity: 0, x: phase === "app" ? -12 * dir : 0, scale: phase === "desktop" ? 1.1 : 1, transition: { duration: phase === "desktop" ? 0.4 : 0.1 } } : undefined}
              transition={{ duration: phase === "desktop" ? 0.65 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {phase === "desktop" ? <Desktop /> : <AppWindow />}
            </motion.div>
          </AnimatePresence>
          <WaybarHost />
          <Palette />
          <Onboarding />
          <LoginHint />
          <Contact />
          <Help />
          <Settings />
          <Toasts fixed />
        </>
      )}
    </>
  );
}

/* first-login hint: points at the ? icon, teaches the keys, dismisses forever */
function LoginHint() {
  const { phase, toggle } = useShell();
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem("deepnar-hint-seen") === "1";
    } catch {
      return true;
    }
  });
  if (phase !== "app" || seen) return null;
  const dismiss = () => {
    try {
      localStorage.setItem("deepnar-hint-seen", "1");
    } catch {
      /* private mode */
    }
    setSeen(true);
  };
  const rows: [string, string][] = [
    ["ctrl+k", "find anything"],
    ["/", "agent"],
    [":", "terminal"],
    ["?", "all keys"],
  ];
  return (
    <div className="fixed top-11 right-3 z-50 w-[240px]" role="note" aria-label="keyboard hint">
      <div className="text-right pr-14 text-[14px] leading-none" style={{ color: "var(--accent)" }} aria-hidden>▲</div>
      <div className="border px-3 py-2.5 -mt-1 text-[12px] space-y-1" style={{ background: "var(--surface)", borderColor: "var(--accent)" }}>
        <div className="font-bold" style={{ color: "var(--fg)" }}>everything is keys <span style={{ color: "var(--muted)" }}>— ? for more</span></div>
        {rows.map(([k, what]) => (
          <div key={k} className="flex items-center gap-2">
            <kbd className="px-1.5 py-px border text-[11px]" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}>{k}</kbd>
            <span style={{ color: "var(--fg-dim)" }}>{what}</span>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <button onClick={() => { dismiss(); toggle("helpOpen"); }} className="px-2 py-1 border text-[11.5px]"
            style={{ borderColor: "var(--accent)", color: "var(--accent-soft)" }}>
            show all ?
          </button>
          <button onClick={dismiss} className="px-2 py-1 text-[11.5px]" style={{ color: "var(--muted)" }}>
            dismiss ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/** waybar stays mounted in app phase so desktop switching feels OS-level */
function WaybarHost() {
  const { phase } = useShell();
  if (phase !== "app") return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[45]">
      <Waybar />
    </div>
  );
}

export function useAmbience() {
  const { settings } = useShell();
  useEffect(() => {
    if (settings.ambient && settings.sound) ambience.start();
    else ambience.stop();
  }, [settings.ambient, settings.sound]);
}
