"use client";

// SYSTEM → DESKTOP → APP. Fictional guest machine; one workstation app.
import { useEffect, useMemo, useState } from "react";
import { useShell, type WorkspaceId } from "@/lib/store";
import { ExternalLink, LayoutGrid, Maximize2, Minimize2, Minus, PanelLeft, Sparkles, SquareTerminal } from "lucide-react";
import { findNode, shortPath } from "@/vfs/vfs";
import { Workstation } from "@/workstation/Workstation";
import { Palette } from "@/workstation/Palette";
import { Pet } from "./Pet";
import { Contact, Help, Settings, Toasts } from "./Overlays";
import { sound, ambience } from "@/audio/engine";

const WS: { id: WorkspaceId; label: string }[] = [
  { id: "home", label: "home" },
  { id: "projects", label: "projects" },
  { id: "research", label: "research" },
  { id: "git", label: "git" },
  { id: "profile", label: "profile" },
];

/* ── procedural backdrop ── */
export function Wallpaper() {
  const stars = useMemo(() => {
    let seed = 1337;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    return Array.from({ length: 210 }, () => ({ x: rnd() * 100, y: rnd() * 100, r: rnd() * rnd() * 0.36 + 0.08, o: rnd() * 0.8 + 0.2 }));
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden style={{ background: "var(--wallpaper)" }}>
      <div className="absolute -top-32 left-[8%] w-[560px] h-[380px] rounded-full" style={{ background: "radial-gradient(ellipse, var(--accent) 0%, transparent 65%)", opacity: 0.1, filter: "blur(10px)" }} />
      <div className="absolute bottom-[-160px] right-[4%] w-[640px] h-[420px] rounded-full" style={{ background: "radial-gradient(ellipse, var(--icy) 0%, transparent 65%)", opacity: 0.08, filter: "blur(12px)" }} />
      <div className="absolute top-[38%] left-[52%] w-[300px] h-[180px] rounded-full" style={{ background: "radial-gradient(ellipse, var(--warm) 0%, transparent 65%)", opacity: 0.05, filter: "blur(14px)" }} />
      <svg className="absolute inset-0 w-full h-full wallpaper-stars" viewBox="0 0 100 100" preserveAspectRatio="none">
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.14} fill="var(--fg)" opacity={s.o * 0.65} />
        ))}
        <g transform="rotate(-18 76 24)">
          <ellipse cx="76" cy="24" rx="15" ry="4.5" fill="none" stroke="var(--accent)" strokeOpacity="0.28" strokeWidth="0.3" />
          <ellipse cx="76" cy="24" rx="10.5" ry="3" fill="none" stroke="var(--accent)" strokeOpacity="0.18" strokeWidth="0.25" />
        </g>
        <circle cx="76" cy="24" r="5" fill="var(--accent)" fillOpacity="0.2" />
        <circle cx="74.5" cy="22.5" r="5" fill="var(--wallpaper)" opacity="0.55" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.35))" }} />
    </div>
  );
}

/* ── phase 1: boot ── */
const BOOT_LINES = ["deepnar/orion-compat · kernel 6.16-guest", "mounting ~/projects ~/research ~/oss", "indexing 60+ artifacts · local-index ready", "starting compositor · workstation", "ready."];
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
  const advance = () => {
    try {
      const seen = localStorage.getItem("deepnar-seen");
      setPhase(seen ? "greeter" : "greeter");
    } catch {
      setPhase("greeter");
    }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center cursor-pointer" style={{ background: "#06070b" }} onClick={advance} onKeyDown={advance} role="button" tabIndex={0} aria-label="skip boot">
      <div className="text-[13px] leading-7 font-mono" style={{ color: "var(--fg-dim)" }}>
        {BOOT_LINES.slice(0, n).map((l, i) => (
          <div key={i}><span style={{ color: "var(--ok)" }}>ok</span> · {l}</div>
        ))}
        <span className="animate-pulse" style={{ color: "var(--warm)" }}>▊</span>
      </div>
    </div>
  );
}

/* ── phase 2: greeter ── */
export function Greeter() {
  const { phase, setPhase, notify } = useShell();
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
  const enter = () => {
    sound.enter();
    try {
      localStorage.setItem("deepnar-seen", "1");
    } catch {
      /* private mode */
    }
    const small = window.matchMedia("(max-width: 767px)").matches;
    useShell.getState().setPetAnchor(small ? "status" : "desktop");
    setPhase(small ? "app" : "desktop");
    notify(small ? "workstation opened" : "guest session started · read-only");
  };
  return (
    <div className="fixed inset-0 z-[60] overflow-hidden" style={{ background: "#06070b" }}>
      <Wallpaper />
      <div className="relative h-full flex flex-col items-center justify-center gap-1 text-center px-6">
        <div className="text-[54px] font-bold tabular-nums" style={{ color: "var(--fg)" }}>{time}</div>
        <div className="text-[12px] uppercase tracking-[0.3em] mb-8" style={{ color: "var(--muted)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div className="text-[15px]" style={{ color: "var(--fg)" }}>deepnar</div>
        <div className="text-[12px] mb-6" style={{ color: "var(--muted)" }}>research workstation · session: read-only · host: orien</div>
        <button onClick={enter} autoFocus
          className="px-6 py-2.5 text-[13px] border enter-btn" style={{ borderColor: "var(--accent)", color: "var(--accent-soft)" }}
          onKeyDown={(e) => { if (e.key === "Enter") enter(); }}>
          [ enter guest session ]
        </button>
      </div>
    </div>
  );
}

/* ── waybar ── */
export function Waybar({ bare = false }: { bare?: boolean }) {
  const { workspace, go, theme, setTheme, toggle } = useShell();
  const [time, setTime] = useState("--:--");
  useEffect(() => {
    const f = () => setTime(new Date().toTimeString().slice(0, 5));
    f();
    const t = setInterval(f, 10000);
    return () => clearInterval(t);
  }, []);
  return (
    <header className="relative z-20 flex items-center gap-1 px-3 h-9 text-[12px] border-b shrink-0" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 82%, transparent)", backdropFilter: "blur(8px)" }} aria-label="system bar">
      {!bare && (
        <nav className="flex gap-0.5" aria-label="workspaces">
          {WS.map((w, i) => (
            <button key={w.id} title={`${i + 1} · ${w.label}`} aria-label={`workspace ${w.label}`}
              onClick={() => { sound.tick(i >= WS.findIndex((x) => x.id === workspace) ? 1 : -1); go(w.id); }}
              className="w-7 h-7 grid place-items-center"
              style={workspace === w.id
                ? { color: "var(--accent-soft)", background: "var(--sel-bg)", boxShadow: "inset 0 -2px 0 var(--accent)" }
                : { color: "var(--muted)", background: "transparent" }}>
              {i + 1}
            </button>
          ))}
        </nav>
      )}
      <span className={`${bare ? "" : "mx-2"} hidden sm:inline`} style={{ color: "var(--muted)" }}>deepnar@orien{bare ? " · guest session" : ""}</span>
      <span className="ml-auto" />
      <button title="find anything (ctrl+k)" onClick={() => toggle("paletteOpen")} className="px-2 py-1 hover:text-[var(--fg)]" style={{ color: "var(--muted)" }} aria-label="search">⌕</button>
      <button title="ambient radio" onClick={() => toggle("settingsOpen")} className="px-2 py-1 hover:text-[var(--fg)]" style={{ color: "var(--muted)" }} aria-label="settings">♪</button>
      <button title="theme" onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); sound.relay(); }} className="px-2 py-1 hover:text-[var(--fg)]" style={{ color: "var(--muted)" }} aria-label="toggle theme">
        {theme === "dark" ? "◐" : "◑"}
      </button>
      <button title="help (?)" onClick={() => toggle("helpOpen")} className="px-2 py-1 hover:text-[var(--fg)]" style={{ color: "var(--muted)" }} aria-label="help">?</button>
      <span className="pl-1 tabular-nums" style={{ color: "var(--fg-dim)" }}>{time}</span>
    </header>
  );
}

/* ── phase 3: desktop ── */
export function Desktop() {
  const { phase, setPhase, setPetAnchor } = useShell();
  if (phase !== "desktop") return null;
  const open = () => {
    sound.appOpen();
    setPetAnchor("status");
    setPhase("app");
  };
  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden" style={{ background: "#06070b" }}>
      <Wallpaper />
      <Waybar bare />
      <div className="relative flex-1">
        <button onClick={open} autoFocus
          className="absolute left-1/2 top-[38%] -translate-x-1/2 flex flex-col items-center gap-2 p-5 group launcher"
          aria-label="open workstation">
          <span className="w-16 h-16 grid place-items-center border text-[26px] transition-transform group-hover:-translate-y-0.5"
            style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 88%, transparent)", color: "var(--accent-soft)" }}>
            &gt;_
          </span>
          <span className="text-[12px]" style={{ color: "var(--fg-dim)" }}>workstation</span>
          <span className="text-[10.5px]" style={{ color: "var(--muted)" }}>open ⏎</span>
        </button>
        <div className="absolute bottom-6 right-8"><Pet anchor="desktop" /></div>
        <div className="absolute bottom-6 left-8 text-[11px] hidden sm:block" style={{ color: "var(--muted)" }}>
          guest@orien · read-only · one app, no clutter
        </div>
      </div>
      <Toasts />
    </div>
  );
}

/* ── workstation window ── */
export function AppWindow() {
  const { phase, setPhase, appMaximized, toggle, explorerOpen, terminalOpen, aiOpen, notify } = useShell();
  if (phase !== "app") return null;
  const min = () => { sound.appClose(); useShell.getState().setPetAnchor("desktop"); setPhase("desktop"); };
  const icon = "p-1.5 hover:bg-[var(--sel-bg)] transition-colors";
  const on = { color: "var(--accent-soft)", background: "var(--sel-bg)" };
  const off = { color: "var(--muted)" };
  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden pt-9" style={{ background: "#06070b" }}>
      <Wallpaper />
      <div className={`relative flex-1 flex flex-col min-h-0 app-open ${appMaximized ? "m-0" : "m-3 sm:m-6"}`}>
        <div className="flex flex-col flex-1 min-h-0 border overflow-hidden" style={{ borderColor: "var(--app-border)", background: "var(--bg)", borderRadius: appMaximized ? 0 : 10 }}>
          <div className="flex items-center gap-0.5 px-2 h-9 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <button onClick={() => toggle("explorerOpen")} title="worktree (file explorer)" aria-label="toggle explorer" className={icon} style={explorerOpen ? on : off}>
              <PanelLeft size={15} />
            </button>
            <button onClick={() => toggle("terminalOpen")} title="terminal (ctrl+`)" aria-label="toggle terminal" className={icon} style={terminalOpen ? on : off}>
              <SquareTerminal size={15} />
            </button>
            <button onClick={() => toggle("aiOpen")} title="assistant (/)" aria-label="toggle assistant" className={icon} style={aiOpen ? on : off}>
              <Sparkles size={15} />
            </button>
            <span className="mx-1.5 h-4 w-px" style={{ background: "var(--border)" }} />
            <span className="text-[12px] hidden min-[420px]:inline" style={{ color: "var(--accent-soft)" }}>&gt;_ workstation</span>
            <span className="text-[11px] hidden md:inline ml-1.5" style={{ color: "var(--muted)" }}>deepnar@orien · guest session</span>
            <span className="ml-auto" />
            <a href="https://github.com/Deepnar" target="_blank" rel="noreferrer" title="github.com/Deepnar ↗" aria-label="open github" className={icon} style={off}
              onClick={() => notify("opened external link")}>
              <ExternalLink size={15} />
            </a>
            <button onClick={() => toggle("overviewOpen")} title="overview" aria-label="overview" className={icon} style={off}>
              <LayoutGrid size={15} />
            </button>
            <button onClick={() => toggle("appMaximized")} title={appMaximized ? "restore" : "maximize"} aria-label="maximize" className={icon} style={off}>
              {appMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button onClick={min} title="hide to desktop" aria-label="minimize" className={icon} style={off}>
              <Minus size={15} />
            </button>
          </div>
          <Workstation />
        </div>
      </div>
    </div>
  );
}

/* ── hyprland overview ── */
export function Overview() {
  const { overviewOpen, toggle, workspace, go, cwd, activeBuffer } = useShell();
  if (!overviewOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label="workspace overview" onClick={() => toggle("overviewOpen")}>
      <div className="absolute inset-0" style={{ background: "rgba(3,4,8,0.72)", backdropFilter: "blur(6px)" }} />
      <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        {WS.map((w, i) => {
          const active = workspace === w.id;
          return (
            <button key={w.id} onClick={() => { sound.tick(1); go(w.id); }}
              className="text-left border p-4 min-h-28 overview-tile"
              style={{ borderColor: active ? "var(--accent)" : "var(--border)", background: "var(--surface)" }}>
              <div className="text-[22px] font-bold" style={{ color: active ? "var(--accent-soft)" : "var(--muted)" }}>{i + 1}</div>
              <div className="text-[12.5px] mt-1" style={{ color: "var(--fg)" }}>{w.label}</div>
              <div className="text-[11px] truncate mt-0.5" style={{ color: "var(--muted)" }}>
                {active ? shortPath(cwd) : "—"}
              </div>
              {active && activeBuffer && (
                <div className="text-[11px] truncate mt-0.5" style={{ color: "var(--icy)" }}>{activeBuffer.split("/").pop()}</div>
              )}
            </button>
          );
        })}
        <div className="col-span-full text-center text-[11.5px]" style={{ color: "var(--muted)" }}>click · 1–5 · esc — zoom to workspace</div>
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
          <span style={{ color: "var(--icy)" }}>/</span><span>ask the local index</span>
          <span style={{ color: "var(--icy)" }}>?</span><span>controls</span>
        </div>
        <button onClick={close} className="px-4 py-2 text-[13px] border" style={{ borderColor: "var(--accent)", color: "var(--accent-soft)" }}>[ enter workstation ]</button>
      </div>
    </div>
  );
}

/* root phase router (used by page) */
export function SystemRoot() {
  const { phase } = useShell();
  return (
    <>
      <Boot />
      <Greeter />
      {(phase === "desktop" || phase === "app") && (
        <>
          {phase === "desktop" ? <Desktop /> : <AppWindow />}
          <WaybarHost />
          <Palette />
          <Overview />
          <Onboarding />
          <Contact />
          <Help />
          <Settings />
          <Toasts fixed />
        </>
      )}
    </>
  );
}

/** waybar stays mounted in app phase so workspace keys/toasts feel OS-level */
function WaybarHost() {
  const { phase } = useShell();
  if (phase !== "app") return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[45]">
      <Waybar />
    </div>
  );
}

export { findNode };
export function useAmbience() {
  const { settings } = useShell();
  useEffect(() => {
    if (settings.ambient && settings.sound) ambience.start();
    else ambience.stop();
  }, [settings.ambient, settings.sound]);
}
