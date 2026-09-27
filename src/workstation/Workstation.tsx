"use client";

// Workstation: sparse header, resizable explorer / main / utility dock,
// yazi-like browser, buffer tabs, lualine-like status (no clock, no host).
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ExternalLink, Minus, PanelLeft, Plus, Search } from "lucide-react";
import { Group, Panel, Separator, usePanelRef, type PanelImperativeHandle } from "react-resizable-panels";
import { useShell } from "@/lib/store";
import { HOME, ROOT, findNode, listDir, shortPath, type VNode } from "@/vfs/vfs";
import { FileView, HomeView, OssView, PreviewPane, Row, iconFor } from "./panes";
import { XTerminal } from "./XTerminal";
import { Agent } from "./Agent";
import { Pet } from "@/system/Pet";
import { sound } from "@/audio/engine";

const ICON = 19;

/* ── sparse header: identity · search · github · sidebar · minimize ── */
function Header({ explorerRef }: { explorerRef: React.RefObject<PanelImperativeHandle | null> }) {
  const { toggle, setPhase } = useShell();
  const btn = "flex items-center justify-center w-9 h-9 hover:bg-[var(--sel-bg)] shrink-0";
  return (
    <header className="flex items-center gap-1 px-2 py-1 border-b shrink-0" style={{ borderColor: "var(--border)" }} aria-label="workstation header">
      <span className="flex items-center gap-2 px-2 text-[13px] font-bold" style={{ color: "var(--fg)" }}>
        <span style={{ color: "var(--accent-soft)" }}>◈</span> workstation
      </span>
      <span className="flex-1" />
      <button className={btn} title="search (ctrl+k)" aria-label="search" onClick={() => { sound.palette(); toggle("paletteOpen"); }}>
        <Search size={ICON} style={{ color: "var(--fg-dim)" }} />
      </button>
      <a className={btn} title="github profile" aria-label="github profile" href="https://github.com/Deepnar" target="_blank" rel="noreferrer">
        <ExternalLink size={ICON} style={{ color: "var(--fg-dim)" }} />
      </a>
      <button
        className={btn} title="toggle file tree" aria-label="toggle file tree"
        onClick={() => {
          const p = explorerRef.current;
          if (!p) return;
          if (p.isCollapsed()) p.expand();
          else p.collapse();
          sound.toggle();
        }}
      >
        <PanelLeft size={ICON} style={{ color: "var(--fg-dim)" }} />
      </button>
      <button className={btn} title="minimize to desktop" aria-label="minimize to desktop"
        onClick={() => { sound.appClose(); setPhase("desktop"); }}>
        <Minus size={ICON} style={{ color: "var(--fg-dim)" }} />
      </button>
    </header>
  );
}

/* ── buffer tabs: click · middle-click · × ── */
function BufferLine() {
  const { openBuffers, activeBuffer, openFile, closeBuffer } = useShell();
  if (!openBuffers.length) return null;
  return (
    <div className="flex items-center border-b overflow-x-auto shrink-0" style={{ borderColor: "var(--border)" }} role="tablist" aria-label="buffers">
      {openBuffers.map((b) => {
        const active = b === activeBuffer;
        const name = b.split("/").pop() ?? b;
        const node = findNode(b);
        return (
          <div
            key={b} role="tab" aria-selected={active}
            onClick={() => node && openFile(b, node.kind)}
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
        onClick={() => { sound.nav(); navTo(node.path); }}
      >
        <button
          aria-label={`${isOpen ? "collapse" : "expand"} ${node.name}`}
          className="shrink-0 w-4 text-center hover:text-[var(--fg)]"
          style={{ color: "var(--icy)" }}
          onClick={(e) => { e.stopPropagation(); toggleExpand(node.path); sound.tick(isOpen ? -1 : 1); }}
        >
          {isOpen ? "▾" : "▸"}
        </button>
        <span className="truncate">{node.name}/</span>
      </div>
      {isOpen && (node.children ?? []).map((c) => <TreeRow key={c.path} node={c} depth={depth + 1} />)}
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

/* ── yazi browser: list | preview, back/fwd/up, keyboard ── */
function NavBar() {
  const { cwd, navTo, navBack, navFwd } = useShell();
  const up = () => {
    if (cwd === HOME) return;
    const i = cwd.lastIndexOf("/");
    navTo(i <= 0 ? HOME : cwd.slice(0, i));
    sound.tick(-1);
  };
  return (
    <div className="flex items-center gap-0.5 px-2 py-[5px] border-b text-[12px] shrink-0" style={{ borderColor: "var(--border)" }} aria-label="file navigation">
      <NavBtn title="back" onClick={navBack}><ArrowLeft size={15} /></NavBtn>
      <NavBtn title="forward" onClick={navFwd}><ArrowRight size={15} /></NavBtn>
      <NavBtn title="parent" onClick={up}><ArrowUp size={15} /></NavBtn>
      <span className="ml-1 truncate" style={{ color: "var(--icy)" }}>{shortPath(cwd)}</span>
    </div>
  );
}

function Browser() {
  const { cwd, navTo, selected, setSelected, openFile } = useShell();
  const nodes = useMemo(() => listDir(cwd), [cwd]);
  const selIdx = Math.max(0, nodes.findIndex((n) => n.path === (selected ?? previewDefault(nodes))));
  const listRef = useRef<HTMLDivElement>(null);

  function previewDefault(ns: VNode[]): string | null {
    return ns[0]?.path ?? null;
  }
  const preview = selected ?? previewDefault(nodes);

  const choose = (n: VNode) => {
    if (n.kind === "dir") {
      sound.nav();
      navTo(n.path);
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
    if (cwd === HOME) return;
    const i = cwd.lastIndexOf("/");
    navTo(i <= 0 ? HOME : cwd.slice(0, i));
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
            onKeyDown={(e) => {
              const n = nodes[selIdx];
              if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); move(1); }
              else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); move(-1); }
              else if (e.key === "Enter" && n) { e.preventDefault(); activate(n); }
              else if ((e.key === "h" || e.key === "ArrowLeft")) { e.preventDefault(); up(); }
              else if ((e.key === "l" || e.key === "ArrowRight") && n) { e.preventDefault(); activate(n); }
            }}
          >
            {nodes.map((n) => (
              <div key={n.path} role="option" aria-selected={n.path === (selected ?? nodes[selIdx]?.path)} onDoubleClick={() => activate(n)}>
                <Row active={n.path === (selected ?? nodes[selIdx]?.path)} hint={hint(n)} onPick={() => setSelected(n.path)} onOpen={() => choose(n)}>
                  <span className="flex gap-2 items-baseline">
                    <span style={{ color: "var(--icy)" }}>{iconFor(n)}</span>
                    <span className="truncate">{n.name}{n.kind === "dir" ? "/" : ""}</span>
                  </span>
                </Row>
              </div>
            ))}
            {nodes.length === 0 && <div className="px-3 py-4 text-[12px]" style={{ color: "var(--muted)" }}>empty directory</div>}
          </div>
        </Panel>
        <Separator className="w-[5px] cursor-col-resize shrink-0 hover:bg-[var(--sel-bg)]" aria-label="resize list and preview" />
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
  const { cwd, activeBuffer } = useShell();
  if (activeBuffer) {
    const node = findNode(activeBuffer);
    if (node && node.kind !== "dir") return <FileView node={node} />;
  }
  if (cwd === HOME) return <HomeView />;
  if (cwd === `${HOME}/oss`) return <OssView />;
  return <Browser />;
}

/* ── right utility dock: terminal tabs + agent ── */
function Dock() {
  const { dockTabs, activeDock, setActiveDock, closeDock, openDock, terms } = useShell();
  const [plus, setPlus] = useState(false);
  if (!dockTabs.length) return null;
  const active = dockTabs.find((t) => t.id === activeDock) ?? dockTabs[0];
  return (
    <section aria-label="utility dock" className="h-full flex flex-col min-h-0 border-l" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex items-center border-b overflow-x-auto shrink-0" style={{ borderColor: "var(--border)" }} role="tablist" aria-label="utility tabs">
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
        <div className="relative">
          <button aria-label="new utility tab" title="new terminal / agent" className="px-2.5 py-[7px] hover:bg-[var(--sel-bg)]" style={{ color: "var(--fg-dim)" }}
            onClick={() => setPlus((v) => !v)}>
            <Plus size={14} />
          </button>
          {plus && (
            <div className="absolute right-0 top-full z-30 border shadow-xl text-[12.5px] min-w-40" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <button className="block w-full text-left px-3 py-2 hover:bg-[var(--sel-bg)]" style={{ color: "var(--fg-dim)" }}
                onClick={() => { openDock("term"); setPlus(false); sound.select(); }}>new terminal</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-[var(--sel-bg)]" style={{ color: "var(--fg-dim)" }}
                onClick={() => { openDock("agent"); setPlus(false); sound.select(); }}>agent</button>
            </div>
          )}
        </div>
      </div>
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
      </div>
      <div className="hidden">{Object.keys(terms).length}</div>
    </section>
  );
}

/* ── statusline: mode · location · branch · buffer · dock — no clock, no host ── */
function Statusline() {
  const { mode, cwd, activeBuffer, toggle, dockTabs, activeDock, terms } = useShell();
  const buf = activeBuffer?.split("/").pop() ?? "—";
  const activeTab = dockTabs.find((t) => t.id === activeDock);
  const dockState = activeTab
    ? activeTab.kind === "term" && activeTab.sessionId
      ? `term:${shortPath(terms[activeTab.sessionId]?.cwd ?? "~")}`
      : "agent"
    : "—";
  return (
    <footer className="flex items-center gap-0 text-[11.5px] border-t shrink-0 overflow-x-auto" style={{ borderColor: "var(--border)", background: "var(--surface)" }} aria-label="status">
      <span className="px-2.5 py-[5px] font-bold shrink-0" style={{ background: "var(--accent)", color: "#0b0c11" }}>{mode}</span>
      <span className="px-2.5 py-[5px] shrink-0 truncate" style={{ color: "var(--icy)" }}>{shortPath(cwd)}</span>
      <span className="px-2 py-[5px] shrink-0 hidden sm:inline" style={{ color: "var(--muted)" }}>main</span>
      <span className="px-2 py-[5px] shrink-0 hidden md:inline truncate" style={{ color: "var(--muted)" }}>{buf}</span>
      <span className="ml-auto" />
      <span className="px-2 py-[5px] shrink-0 hidden lg:inline" style={{ color: "var(--muted)" }}>{dockState}</span>
      <Pet anchor="status" />
      <button className="px-2.5 py-[5px] shrink-0 hover:bg-[var(--sel-bg)]" style={{ color: "var(--accent-soft)" }}
        onClick={() => toggle("contactOpen")}>contact</button>
    </footer>
  );
}

/* ── workstation ── */
export function Workstation() {
  const explorerPanel = usePanelRef();
  const dockTabs = useShell((s) => s.dockTabs);
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
      <Header explorerRef={explorerPanel} />
      <BufferLine />
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
          <Separator className="w-[5px] cursor-col-resize shrink-0 hover:bg-[var(--sel-bg)]" aria-label="resize explorer" />
          <Panel id="main" defaultSize="56" minSize="30">
            <div className="h-full flex flex-col min-h-0">
              <NavBar />
              <main id="main" className="flex-1 min-h-0 min-w-0 overflow-auto" aria-label="workspace">
                <Main />
              </main>
            </div>
          </Panel>
          {dockTabs.length > 0 && (
            <>
              <Separator className="w-[5px] cursor-col-resize shrink-0 hover:bg-[var(--sel-bg)]" aria-label="resize utility dock" />
              <Panel id="dock" defaultSize="25" minSize="18" maxSize="55">
                <Dock />
              </Panel>
            </>
          )}
        </Group>
      </div>
      <Statusline />
    </div>
  );
}
