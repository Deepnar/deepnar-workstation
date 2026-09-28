"use client";

// Workstation: sparse header, resizable explorer / main / utility dock,
// yazi-like browser, buffer tabs, lualine-like status (no clock, no host).
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, ArrowUp, GraduationCap, Home, Mail, PanelLeft, PanelRight, Plus, Search } from "lucide-react";
import { GithubIcon } from "./GithubIcon";
import { Group, Panel, Separator, usePanelRef, type PanelImperativeHandle } from "react-resizable-panels";
import { useShell } from "@/lib/store";
import { HOME, ROOT, findNode, listDir, shortPath, type VNode } from "@/vfs/vfs";
import { FileView, HomeView, OssView, PreviewPane, Row, iconFor } from "./panes";
import { PathBadge } from "./DomainBadge";
import { XTerminal } from "./XTerminal";
import { Agent } from "./Agent";
import { WebTab } from "./WebTab";
import { sound } from "@/audio/engine";

const ICON = 19;

/* ── header: [tree] identity ··· search · github · [dock] ──
   window chrome (minimize/maximize) lives in the outer AppWindow only. */
function Header() {
  const { cwd, navTo, navBack, navFwd, navUp, focusList, toggle, setPhase } = useShell();
  const btn = "flex items-center justify-center w-9 h-9 hover:bg-[var(--sel-bg)] shrink-0";
  return (
    <header className="flex items-center gap-1 px-2 py-1 border-b shrink-0" style={{ borderColor: "var(--border)" }} aria-label="file navigation">
      <NavBtn title="back" onClick={() => { navBack(); focusList(); }}><ArrowLeft size={15} /></NavBtn>
      <NavBtn title="forward" onClick={() => { navFwd(); focusList(); }}><ArrowRight size={15} /></NavBtn>
      <NavBtn title="parent" onClick={() => { navUp(); sound.tick(-1); focusList(); }}><ArrowUp size={15} /></NavBtn>
      <NavBtn title="home" onClick={() => { navTo(HOME); sound.nav(); focusList(); }}><Home size={15} /></NavBtn>
      <span className="ml-1 truncate text-[12px]" style={{ color: "var(--icy)" }}>{shortPath(cwd)}</span>
      <span className="flex-1" />
      <button className={btn} title="search (ctrl+k)" aria-label="search" onClick={() => { sound.palette(); toggle("paletteOpen"); }}>
        <Search size={ICON} style={{ color: "var(--fg-dim)" }} />
      </button>
      <span className="w-px h-5 mx-1 shrink-0" style={{ background: "var(--border)" }} aria-hidden />
      <button className={btn} title="hide to desktop" aria-label="minimize"
        onClick={() => { sound.appClose(); setPhase("desktop"); }}>
        <span aria-hidden style={{ color: "var(--fg-dim)", fontSize: 19, lineHeight: 1 }}>–</span>
      </button>
    </header>
  );
}

/* ── tabnav: arrows/home + buffer tabs + crumb in ONE bar ── */
/* ── responsive: small screens get drawer explorer + overlay dock ── */
export function useSmallScreen() {
  const [small, setSmall] = useState(() => {
    try { return window.matchMedia("(max-width: 639px)").matches; }
    catch { return false; }
  });
  useEffect(() => {
    let mq: MediaQueryList | null = null;
    const onChange = (e: MediaQueryListEvent) => setSmall(e.matches);
    try {
      mq = window.matchMedia("(max-width: 639px)");
      mq.addEventListener("change", onChange);
    } catch { /* noop */ }
    return () => { try { mq?.removeEventListener("change", onChange); } catch { /* noop */ } };
  }, []);
  return small;
}

function TabNav({ explorerRef, small, drawerOpen, onToggleDrawer }: {
  explorerRef: React.RefObject<PanelImperativeHandle | null>;
  small: boolean;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}) {
  const { dockVisible, setDockVisible, openBuffers, activeBuffer, openFile, closeBuffer } = useShell();
  const btn = "p-1.5 hover:text-[var(--fg)] shrink-0";
  return (
    <div className="flex items-center gap-0.5 pl-1 pr-2 py-[3px] border-b text-[12px] shrink-0 min-w-0" style={{ borderColor: "var(--border)" }} aria-label="buffer tabs">
      <button
        className={btn} title="toggle file tree" aria-label="toggle file tree" aria-expanded={small ? drawerOpen : undefined}
        onClick={() => {
          if (small) { onToggleDrawer(); return; }
          const p = explorerRef.current;
          if (!p) return;
          if (p.isCollapsed()) p.expand();
          else p.collapse();
          sound.toggle();
        }}
        style={{ color: "var(--fg-dim)" }}
      >
        <PanelLeft size={15} />
      </button>
      <span className="w-px h-5 mx-1 shrink-0" style={{ background: "var(--border)" }} aria-hidden />
      {openBuffers.length > 0 && (
      <div className="flex items-center overflow-x-auto shrink min-w-0" role="tablist" aria-label="buffers">
      {openBuffers.map((b) => {
        const active = b === activeBuffer;
        const name = b === HOME ? "home" : b.split("/").pop() ?? b;
        const node = findNode(b);
        return (
          <div
            key={b} role="tab" aria-selected={active}
            ref={active ? (el) => { try { el?.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch { /* noop */ } } : undefined}
            onClick={() => { if (b === HOME) useShell.getState().openHomeTab(); else if (node) openFile(b, node.kind); }}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                sound.fileClose();
                closeBuffer(b);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-[7px] text-[12px] whitespace-nowrap cursor-pointer border-r"
            style={{
              borderColor: "var(--border)",
              background: active ? "var(--sel-bg)" : "transparent",
              color: active ? "var(--accent-soft)" : "var(--muted)",
              boxShadow: active ? "inset 0 2px 0 var(--accent)" : "none",
            }}
          >
            <span>{name}</span>
            <button aria-label={`close ${name}`} className="hover:text-[var(--err)] px-0.5"
              onClick={(e) => { e.stopPropagation(); sound.fileClose(); closeBuffer(b); }}>✕</button>
          </div>
        );
      })}
      </div>
      )}
      <span className="flex-1" />
      <button className={btn} title="toggle utility dock" aria-label="toggle utility dock" aria-pressed={dockVisible}
        onClick={() => { setDockVisible(!dockVisible); sound.toggle(); }}
        style={{ color: dockVisible ? "var(--accent-soft)" : "var(--fg-dim)" }}>
        <PanelRight size={15} />
      </button>
    </div>
  );
}

/* ── explorer: arrow expands, row navigates ── */
function TreeRow({ node, depth }: { node: VNode; depth: number }) {
  const { openFile, activeBuffer, cwd, toggleExpand, expanded, navTo, ensureVisible } = useShell();
  const itemRef = useRef<HTMLDivElement>(null);
  const isDir = node.kind === "dir";
  const isOpen = expanded.includes(node.path);
  const isActive = activeBuffer === node.path || (!activeBuffer && cwd === node.path);

  useEffect(() => {
    if (isActive) {
      ensureVisible(node.path);
      itemRef.current?.scrollIntoView({ block: "nearest" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  if (!isDir) {
    return (
      <div ref={itemRef}>
        <button
          onClick={() => { sound.fileOpen(); openFile(node.path, node.kind); }}
          className="w-full text-left truncate py-[4px] pr-2 text-[12px]"
          style={{ paddingLeft: 10 + depth * 12, background: isActive ? "var(--sel-bg)" : "transparent", color: isActive ? "var(--accent-soft)" : "var(--fg-dim)" }}
        >
          {node.name}
        </button>
      </div>
    );
  }
  return (
    <div ref={itemRef}>
      <div
        className="w-full flex items-center text-left truncate py-[4px] pr-2 text-[12px] cursor-pointer"
        style={{ paddingLeft: 10 + depth * 12, background: isActive && !isOpen ? "var(--sel-bg)" : "transparent", color: cwd === node.path || cwd.startsWith(node.path + "/") ? "var(--fg)" : "var(--muted)" }}
        onClick={() => { sound.nav(); navTo(node.path); useShell.getState().focusList(); }}
      >
        <button
          aria-label={`${isOpen ? "collapse" : "expand"} ${node.name}`}
          className="shrink-0 w-5 text-center text-[13px] font-bold hover:text-[var(--fg)] transition-transform duration-150"
          style={{ color: "var(--accent-soft)", transform: isOpen ? "none" : "translateX(1px)" }}
          onClick={(e) => { e.stopPropagation(); toggleExpand(node.path); sound.tick(isOpen ? -1 : 1); }}
        >
          {isOpen ? "▼" : "▶"}
        </button>
        <span className="truncate">{node.name}/</span>
        <span className="ml-1.5"><PathBadge path={node.path} /></span>
      </div>
      {isOpen && (
        <div className="tree-kids">
          {(node.children ?? []).map((c) => <TreeRow key={c.path} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

function Explorer() {
  return (
    <nav aria-label="file explorer" className="h-full overflow-auto min-h-0 py-1">
      <div className="px-3 py-1 text-[10.5px] uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>files</div>
      {(ROOT.children ?? []).map((c) => <TreeRow key={c.path} node={c} depth={0} />)}
    </nav>
  );
}

/* ── yazi browser: list | preview, keyboard (nav lives in TabNav) ── */

function Browser() {
  const { cwd, navTo, navUp, selected, setSelected, openFile, listFocusNonce } = useShell();
  const nodes = useMemo(() => listDir(cwd), [cwd]);
  const small = useSmallScreen();
  const selIdx = Math.max(0, nodes.findIndex((n) => n.path === (selected ?? previewDefault(nodes))));
  const listRef = useRef<HTMLDivElement>(null);

  // auto-focus the listing after navigation settles — but never steal
  // focus from agent input, xterm, finder, or forms.
  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName ?? "";
      const busy = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable
        || el?.classList?.contains("xterm-helper-textarea")
        || el?.closest?.('[role="dialog"]');
      if (!busy) listRef.current?.focus({ preventScroll: true });
    }, 60);
    return () => clearTimeout(t);
  }, [cwd, listFocusNonce]);

  function previewDefault(ns: VNode[]): string | null {
    return ns[0]?.path ?? null;
  }
  const preview = selected ?? previewDefault(nodes);

  const choose = (n: VNode) => {
    if (n.kind === "dir") {
      sound.nav();
      navTo(n.path);
    } else if (small) {
      // phone: a file tap OPENS + reveals (drawer auto-closes via
      // activeBuffer). dir taps navigate. no select-then-wonder state.
      sound.fileOpen();
      openFile(n.path, n.kind);
    } else {
      sound.select();
      setSelected(n.path);
    }
  };
  const activate = (n: VNode) => {
    if (n.kind === "dir") {
      sound.nav();
      navTo(n.path);
    } else {
      sound.fileOpen();
      openFile(n.path, n.kind);
    }
  };

  const move = (d: 1 | -1) => {
    if (!nodes.length) return;
    const next = nodes[(selIdx + d + nodes.length) % nodes.length];
    setSelected(next.path);
    sound.tick(d);
  };

  const up = () => {
    navUp();
    sound.tick(-1);
  };

  const hint = (n: VNode) => (n.kind === "dir" ? `${(n.children ?? []).length} items` : n.name.split(".").pop() ?? n.kind);

  return (
    <div className="h-full flex flex-col min-h-0">
      <Group orientation="horizontal" className="flex-1 min-h-0" onLayoutChange={(l) => { try { localStorage.setItem("deepnar-browser-split", JSON.stringify(l)); } catch { /* noop */ } }}>
        <Panel id="listing" defaultSize="55" minSize="30">
          <div
            ref={listRef} tabIndex={0} role="listbox" aria-label={`directory ${shortPath(cwd)}`}
            className="h-full overflow-auto min-h-0 py-1 outline-none"
            onClick={() => listRef.current?.focus({ preventScroll: true })}
            onKeyDown={(e) => {
              if (e.ctrlKey || e.metaKey || e.altKey) return;
              const n = nodes[selIdx];
              if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); move(1); }
              else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); move(-1); }
              else if (e.key === "Enter" && n) { e.preventDefault(); e.stopPropagation(); activate(n); }
              else if ((e.key === "h" || e.key === "ArrowLeft")) { e.preventDefault(); e.stopPropagation(); up(); }
              else if ((e.key === "l" || e.key === "ArrowRight") && n) { e.preventDefault(); e.stopPropagation(); activate(n); }
            }}
          >
            {nodes.map((n, i) => (
              <div key={n.path} role="option" aria-selected={n.path === (selected ?? nodes[selIdx]?.path)} onDoubleClick={() => activate(n)}
                className="row-in" style={{ animationDelay: `${Math.min(i, 12) * 15}ms` }}>
                <Row active={n.path === (selected ?? nodes[selIdx]?.path)} hint={hint(n)} onPick={() => setSelected(n.path)} onOpen={() => choose(n)}>
                  <span className="flex gap-2 items-baseline">
                    <span style={{ color: "var(--icy)" }}>{iconFor(n)}</span>
                    <span className="truncate">{n.name}{n.kind === "dir" ? "/" : ""}</span>
                    <PathBadge path={n.path} />
                  </span>
                </Row>
              </div>
            ))}
            {nodes.length === 0 && <div className="px-3 py-4 text-[12px]" style={{ color: "var(--muted)" }}>empty directory</div>}
          </div>
        </Panel>
        <Separator className="w-[5px] cursor-col-resize shrink-0 hover:bg-[var(--border)] focus:outline-none focus-visible:outline-none" aria-label="resize list and preview" />
        <Panel id="preview" defaultSize="45" minSize="25">
          <div className="h-full overflow-auto min-h-0 border-l" style={{ borderColor: "var(--border)" }}>
            {preview ? <PreviewPane path={preview} /> : <div className="p-4 text-[12px]" style={{ color: "var(--muted)" }}>select a file to preview</div>}
          </div>
        </Panel>
      </Group>
    </div>
  );
}

function NavBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button title={title} aria-label={title} onClick={onClick} className="p-1.5 hover:bg-[var(--sel-bg)] shrink-0" style={{ color: "var(--fg-dim)" }}>
      {children}
    </button>
  );
}

function Main() {
  const { cwd, activeBuffer, mainView, homeFiles } = useShell();
  if (mainView === "buffer" && activeBuffer) {
    if (activeBuffer === HOME) return <HomeView />;
    const node = findNode(activeBuffer);
    if (node && node.kind !== "dir") return <FileView node={node} />;
  }
  if (cwd === HOME && !homeFiles) return <HomeView />;
  if (cwd === `${HOME}/oss`) return <OssView />;
  return <Browser />;
}

/* ── right utility dock: terminal tabs + agent + web.
   Visibility (header toggle) never destroys sessions or history. */
function Dock({ bare = false }: { bare?: boolean }) {
  const { dockTabs, activeDock, setActiveDock, closeDock, openDock, terms } = useShell();
  const [plus, setPlus] = useState(false);
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  if (!dockTabs.length) {
    return (
      <section aria-label="utility dock" className="h-full flex flex-col min-h-0 border-l" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {!bare && <div className="px-3 pt-2 pb-1 text-[10.5px] uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>utility dock</div>}
        <div className="flex-1 flex flex-col items-stretch justify-center gap-1 p-3">
          {([["term", "new terminal", "shell · files · git"], ["agent", "agent", "ask about the work"], ["web", "web lookup", "google · chatgpt · github"]] as const).map(([kind, label, hint]) => (
            <button key={kind} onClick={() => { openDock(kind); sound.select(); }}
              className="text-left px-3 py-2 border hover:bg-[var(--sel-bg)]" style={{ borderColor: "var(--border)" }}>
              <div className="text-[12.5px]" style={{ color: "var(--fg)" }}>{label}</div>
              <div className="text-[11px]" style={{ color: "var(--muted)" }}>{hint}</div>
            </button>
          ))}
        </div>
      </section>
    );
  }
    const active = dockTabs.find((t) => t.id === activeDock) ?? dockTabs[0];
  const openPlus = () => {
    const r = plusRef.current?.getBoundingClientRect();
    setMenuAt(r ? { x: Math.min(r.left, window.innerWidth - 190), y: r.bottom + 4 } : null);
    setPlus(true);
    sound.palette();
  };
  const pick = (kind: "term" | "agent" | "web") => {
    openDock(kind);
    setPlus(false);
    sound.select();
  };
  return (
    <section aria-label="utility dock" className="h-full flex flex-col min-h-0 border-l" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex items-center border-b shrink-0" style={{ borderColor: "var(--border)" }} role="tablist" aria-label="utility tabs">
        <div className="flex items-center overflow-x-auto flex-1 min-w-0">
          {dockTabs.map((t) => {
            const on = t.id === active.id;
            return (
              <div
                key={t.id} role="tab" aria-selected={on}
                onClick={() => { setActiveDock(t.id); sound.select(); }}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    sound.fileClose();
                    closeDock(t.id);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-[7px] text-[12px] whitespace-nowrap cursor-pointer border-r"
                style={{
                  borderColor: "var(--border)",
                  background: on ? "var(--sel-bg)" : "transparent",
                  color: on ? "var(--accent-soft)" : "var(--muted)",
                  boxShadow: on ? "inset 0 2px 0 var(--accent)" : "none",
                }}
              >
                <span>{t.title}</span>
                <button aria-label={`close ${t.title}`} className="hover:text-[var(--err)] px-0.5"
                  onClick={(e) => { e.stopPropagation(); sound.fileClose(); closeDock(t.id); }}>✕</button>
              </div>
            );
          })}
        </div>
        <button ref={plusRef} aria-label="new utility tab" aria-haspopup="menu" aria-expanded={plus}
          title="new terminal / agent / web" className="px-2.5 py-[7px] hover:bg-[var(--sel-bg)] shrink-0" style={{ color: "var(--fg-dim)" }}
          onClick={() => (plus ? setPlus(false) : openPlus())}>
          <Plus size={14} />
        </button>
      </div>
      {plus && menuAt && createPortal(
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setPlus(false)} aria-hidden />
          <div role="menu" aria-label="new utility" className="fixed z-[71] border shadow-xl text-[12.5px] min-w-44 py-1"
            style={{ left: menuAt.x, top: menuAt.y, borderColor: "var(--border)", background: "var(--surface)" }}>
            <button role="menuitem" className="block w-full text-left px-3 py-2 hover:bg-[var(--sel-bg)]" style={{ color: "var(--fg-dim)" }}
              onClick={() => pick("term")}>new terminal</button>
            <button role="menuitem" className="block w-full text-left px-3 py-2 hover:bg-[var(--sel-bg)]" style={{ color: "var(--fg-dim)" }}
              onClick={() => pick("agent")}>agent</button>
            <button role="menuitem" className="block w-full text-left px-3 py-2 hover:bg-[var(--sel-bg)]" style={{ color: "var(--fg-dim)" }}
              onClick={() => pick("web")}>web</button>
            <div className="border-t my-1" style={{ borderColor: "var(--border)" }} />
            <button role="menuitem" className="block w-full text-left px-3 py-2 hover:bg-[var(--sel-bg)]" style={{ color: "var(--fg-dim)" }}
              onClick={() => { setPlus(false); window.open("https://www.google.com/", "_blank", "noopener,noreferrer"); }}>google ↗</button>
            <button role="menuitem" className="block w-full text-left px-3 py-2 hover:bg-[var(--sel-bg)]" style={{ color: "var(--fg-dim)" }}
              onClick={() => { setPlus(false); window.open("https://chat.openai.com/", "_blank", "noopener,noreferrer"); }}>chatgpt ↗</button>
          </div>
        </>,
        document.body
      )}
      <div className="flex-1 min-h-0 relative">
        {dockTabs.filter((t) => t.kind === "term" && t.sessionId).map((t) => (
          <div key={t.id} className="absolute inset-0" style={{ visibility: t.id === active.id ? "visible" : "hidden" }}>
            <XTerminal sessionId={t.sessionId!} hidden={t.id !== active.id} />
          </div>
        ))}
        {dockTabs.some((t) => t.kind === "agent") && (
          <div className="absolute inset-0 p-3 overflow-hidden" style={{ visibility: active.kind === "agent" ? "visible" : "hidden" }}>
            <Agent hidden={active.kind !== "agent"} />
          </div>
        )}
        {dockTabs.some((t) => t.kind === "web") && (
          <div className="absolute inset-0 overflow-hidden" style={{ visibility: active.kind === "web" ? "visible" : "hidden" }}>
            <WebTab />
          </div>
        )}
      </div>
      <div className="hidden">{Object.keys(terms).length}</div>
    </section>
  );
}

/* ── statusline: mode · location · branch · buffer · dock — no clock, no host ── */
function Statusline() {
  const { mode, cwd, activeBuffer, dockTabs, activeDock, terms } = useShell();
  const buf = activeBuffer?.split("/").pop() ?? "—";
  const activeTab = dockTabs.find((t) => t.id === activeDock);
  const dockState = activeTab
    ? activeTab.kind === "term" && activeTab.sessionId
      ? `term:${shortPath(terms[activeTab.sessionId]?.cwd ?? "~")}`
      : "agent"
    : "—";
  return (
    <footer className="flex items-center gap-0 text-[11.5px] border-t shrink-0 overflow-x-auto" style={{ borderColor: "var(--border)", background: "var(--surface)" }} aria-label="status">
      <span className="px-2.5 py-[5px] font-bold shrink-0 whitespace-nowrap" style={{ background: "var(--accent)", color: "#0b0c11" }}>{mode}</span>
      <span className="px-2.5 py-[5px] shrink-0 truncate" style={{ color: "var(--icy)" }}>{shortPath(cwd)}</span>
      <span className="px-2 py-[5px] shrink-0 hidden sm:inline" style={{ color: "var(--muted)" }}>main</span>
      <span className="px-2 py-[5px] shrink-0 hidden md:inline truncate" style={{ color: "var(--muted)" }}>{buf}</span>
      <span className="ml-auto" />
      <span className="px-2 py-[5px] shrink-0 hidden lg:inline" style={{ color: "var(--muted)" }}>{dockState}</span>
      <span className="flex items-center gap-0.5 px-1.5 shrink-0" aria-label="profile links">
        <a className="px-1.5 py-[5px] hover:bg-[var(--sel-bg)]" title="GitHub · @Deepnar" aria-label="github profile" href="https://github.com/Deepnar" target="_blank" rel="noreferrer">
          <span style={{ color: "var(--fg-dim)", display: "inline-flex", verticalAlign: "-2px" }}><GithubIcon size={16} /></span>
        </a>
        <a className="px-1.5 py-[5px] hover:bg-[var(--sel-bg)]" title="Google Scholar" aria-label="google scholar profile" href="https://scholar.google.com/citations?user=LIHKqCAAAAAJ&hl=en" target="_blank" rel="noreferrer">
          <span style={{ color: "var(--fg-dim)", display: "inline-flex", verticalAlign: "-2px" }}><GraduationCap size={16} /></span>
        </a>
        <a className="px-1.5 py-[5px] hover:bg-[var(--sel-bg)]" title="LinkedIn · Deepesh Sonar" aria-label="linkedin profile" href="https://www.linkedin.com/in/deepeshsonar/" target="_blank" rel="noreferrer">
          <span style={{ display: "inline-flex", verticalAlign: "-2px" }} aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" fill="none" stroke="#0a66c2" strokeWidth="2.5" /><text x="12" y="17" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0a66c2" fontFamily="monospace">in</text></svg>
          </span>
        </a>
        <a className="px-1.5 py-[5px] hover:bg-[var(--sel-bg)]" title="ORCID · 0009-0008-1762-4246" aria-label="orcid profile" href="https://orcid.org/0009-0008-1762-4246" target="_blank" rel="noreferrer">
          <span style={{ display: "inline-flex", verticalAlign: "-2px" }} aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#a6ce39" strokeWidth="2.5" /><text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#a6ce39" fontFamily="monospace">iD</text></svg>
          </span>
        </a>
        <a className="px-1.5 py-[5px] hover:bg-[var(--sel-bg)]" title="email · 18deepnar@gmail.com" aria-label="email deepesh" href="mailto:18deepnar@gmail.com">
          <span style={{ color: "var(--fg-dim)", display: "inline-flex", verticalAlign: "-2px" }}><Mail size={16} /></span>
        </a>
      </span>
    </footer>
  );
}

/* ── small-screen overlays: explorer drawer + dock sheet ── */
function Drawer({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("button")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey); };
  }, [onClose]);
  return createPortal(
    <>
      <div className="fixed inset-0 z-[60]" style={{ background: "rgba(20,18,14,0.6)" }} onClick={onClose} aria-hidden />
      <div
        ref={ref} role="dialog" aria-modal="true" aria-label={label}
        className="fixed inset-y-0 left-0 z-[61] w-[86vw] max-w-[330px] flex flex-col border-r"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>{label}</span>
          <button aria-label={`close ${label}`} onClick={onClose} className="px-3 py-2 text-[14px]" style={{ color: "var(--fg-dim)" }}>✕</button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>
      </div>
    </>,
    document.body,
  );
}

function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    // keyup too: xterm consumes keydown Escape inside the terminal, but the
    // keyup still bubbles — either one closes the topmost sheet.
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey); };
  }, [onClose]);
  return createPortal(
    <>
      <div className="fixed inset-0 z-[60]" style={{ background: "rgba(20,18,14,0.6)" }} onClick={onClose} aria-hidden />
      <div
        role="dialog" aria-modal="true" aria-label={label}
        className="fixed inset-x-0 bottom-0 top-[8vh] z-[61] flex flex-col border-t rounded-t-[10px]"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>{label}</span>
          <button aria-label={`close ${label}`} onClick={onClose} className="px-3 py-2 text-[14px]" style={{ color: "var(--fg-dim)" }}>✕</button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>
      </div>
    </>,
    document.body,
  );
}

/* ── workstation ── */
export function Workstation() {
  const explorerPanel = usePanelRef();
  const dockVisible = useShell((s) => s.dockVisible);
  const setDockVisible = useShell((s) => s.setDockVisible);
  const small = useSmallScreen();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleDrawer = () => { sound.toggle(); setDrawerOpen((v) => !v); };
  // phone: opening any file reveals it immediately — a lingering drawer over
  // fresh content reads as "nothing happened". dir nav never touches buffers.
  const activeBuffer = useShell((s) => s.activeBuffer);
  useEffect(() => { setDrawerOpen((v) => (v ? false : v)); }, [activeBuffer]);
  // leaving small screens closes transient overlays; entering keeps desktop intact
  const wasSmall = useRef(small);
  useEffect(() => {
    if (!small && wasSmall.current) { setDrawerOpen(false); }
    wasSmall.current = small;
  }, [small]);
  // panel resize handles must never take keyboard focus — arrows belong to lists
  useEffect(() => {
    document.querySelectorAll("[role='separator']").forEach((el) => {
      (el as HTMLElement).tabIndex = -1;
    });
  }, []);
  const layout = (() => {
    try {
      const raw = localStorage.getItem("deepnar-ws-layout");
      return raw ? (JSON.parse(raw) as Record<string, number>) : null;
    } catch {
      return null;
    }
  })();
  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <Header />
      <TabNav explorerRef={explorerPanel} small={small} drawerOpen={drawerOpen} onToggleDrawer={toggleDrawer} />
      {small ? (
        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          <main id="main" className="flex-1 min-h-0 min-w-0 overflow-auto" aria-label="workspace">
            <Main />
          </main>
          {drawerOpen && (
            <Drawer label="files" onClose={() => setDrawerOpen(false)}>
              <Explorer />
            </Drawer>
          )}
          {dockVisible && (
            <Sheet label="utility dock" onClose={() => setDockVisible(false)}>
              <Dock bare />
            </Sheet>
          )}
        </div>
      ) : (
      <div className="flex-1 min-h-0">
        <Group
          orientation="horizontal"
          defaultLayout={layout ?? undefined}
          onLayoutChange={(l) => { try { localStorage.setItem("deepnar-ws-layout", JSON.stringify(l)); } catch { /* noop */ } }}
        >
          <Panel id="explorer" panelRef={explorerPanel} defaultSize="19" minSize="12" maxSize="32" collapsible collapsedSize="0">
            <div className="h-full border-r overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <Explorer />
            </div>
          </Panel>
          <Panel id="main" defaultSize="56" minSize="30">
            <div className="h-full flex flex-col min-h-0">
              <main id="main" className="flex-1 min-h-0 min-w-0 overflow-auto" aria-label="workspace">
                <Main />
              </main>
            </div>
          </Panel>
          {dockVisible && (
            <>
              <Separator className="w-[5px] cursor-col-resize shrink-0 hover:bg-[var(--border)] focus:outline-none focus-visible:outline-none" aria-label="resize utility dock" />
              <Panel id="dock" defaultSize="25" minSize="18" maxSize="55">
                <Dock />
              </Panel>
            </>
          )}
        </Group>
      </div>
      )}
      <Statusline />
    </div>
  );
}
