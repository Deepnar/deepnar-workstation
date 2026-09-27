"use client";

// tmux/nvim, not VS Code: flat splits, separators, buffer line, lualine-like status.
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useShell, DEFAULTS } from "@/lib/store";
import { HOME, ROOT, findNode, shortPath, type VNode } from "@/vfs/vfs";
import { DirView, FileView, HomeView, OssView, ProfileView, ResearchView } from "./panes";
import { Terminal } from "./Terminal";
import { Assistant } from "./Assistant";
import { Pet } from "@/system/Pet";
import { sound } from "@/audio/engine";

/* ── buffer line ── */
function BufferLine() {
  const { openBuffers, activeBuffer, openFile, closeBuffer, cycleBuffer } = useShell();
  if (!openBuffers.length) return null;
  return (
    <div className="flex items-center gap-0 border-b overflow-x-auto shrink-0" style={{ borderColor: "var(--border)" }} role="tablist" aria-label="buffers">
      {openBuffers.map((b) => {
        const active = b === activeBuffer;
        const name = b.split("/").pop() ?? b;
        const node = findNode(b);
        return (
          <div key={b} role="tab" aria-selected={active}
            className="flex items-center gap-1.5 px-3 py-[7px] text-[12px] whitespace-nowrap cursor-pointer border-r"
            style={{
              borderColor: "var(--border)",
              background: active ? "var(--sel-bg)" : "transparent",
              color: active ? "var(--accent-soft)" : "var(--muted)",
              boxShadow: active ? "inset 0 2px 0 var(--accent)" : "none",
            }}
            onClick={() => node && openFile(b, node.kind)}
          >
            <span>{name}</span>
            <button aria-label={`close ${name}`} className="hover:text-[var(--err)] px-0.5"
              onClick={(e) => { e.stopPropagation(); sound.fileClose(); closeBuffer(b); }}>✕</button>
          </div>
        );
      })}
      <div className="ml-auto px-2 text-[10.5px] hidden md:block shrink-0" style={{ color: "var(--muted)" }}>
        :bnext :bprev :bd
      </div>
      <div className="hidden">{String(cycleBuffer)}</div>
    </div>
  );
}

/* ── explorer ── */
function Tree({ node, depth }: { node: VNode; depth: number }) {
  const { openFile, activeBuffer, cwd } = useShell();
  const [open, setOpen] = useState(depth < 2);
  if (node.kind !== "dir") {
    const active = activeBuffer === node.path;
    return (
      <button onClick={() => { sound.fileOpen(); openFile(node.path, node.kind); }}
        className="w-full text-left truncate px-2 py-[4px] text-[11.5px]"
        style={{ paddingLeft: 8 + depth * 8, background: active ? "var(--sel-bg)" : "transparent", color: active ? "var(--accent-soft)" : "var(--fg-dim)" }}>
        {node.name}
      </button>
    );
  }
  const inPath = cwd === node.path || cwd.startsWith(node.path + "/");
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)}
        className="w-full text-left truncate px-2 py-[4px] text-[11.5px]"
        style={{ paddingLeft: 8 + depth * 8, color: inPath ? "var(--fg)" : "var(--muted)" }}>
        {open ? "▾" : "▸"} {node.name}/
      </button>
      {open && (node.children ?? []).map((c) => <Tree key={c.path} node={c} depth={depth + 1} />)}
    </div>
  );
}

function Explorer() {
  const { explorerOpen, toggle } = useShell();
  if (!explorerOpen) return null;
  return (
    <aside aria-label="file explorer" className="w-60 shrink-0 border-r overflow-auto py-1 max-lg:hidden" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center px-2 py-1 text-[10.5px] uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
        <span>explorer</span>
        <button onClick={() => toggle("explorerOpen")} className="ml-auto hover:text-[var(--fg)]" aria-label="close explorer">✕</button>
      </div>
      <Tree node={ROOT} depth={0} />
    </aside>
  );
}

/* ── main ── */
function Crumbs() {
  const { cwd, setCwd } = useShell();
  const rel = cwd === HOME ? [] : cwd.replace(`${HOME}/`, "").split("/");
  return (
    <div className="flex items-center gap-0.5 px-2 py-[5px] border-b text-[11.5px] shrink-0 overflow-x-auto" style={{ borderColor: "var(--border)" }} aria-label="breadcrumb">
      <button
        onClick={() => {
          const i = cwd.lastIndexOf("/");
          const up = cwd === HOME ? HOME : i <= 0 ? HOME : cwd.slice(0, i);
          setCwd(up);
          sound.tick(-1);
        }}
        title="up one level"
        aria-label="up one level"
        className="px-1.5 hover:text-[var(--fg)] shrink-0 flex items-center"
        style={{ color: "var(--icy)" }}
      >
        <ArrowUp size={13} />
      </button>
      <button onClick={() => setCwd(HOME)} className="shrink-0 hover:text-[var(--fg)]" style={{ color: cwd === HOME ? "var(--accent-soft)" : "var(--muted)" }}>~</button>
      {rel.map((seg, i) => {
        const target = `${HOME}/${rel.slice(0, i + 1).join("/")}`;
        const last = i === rel.length - 1;
        return (
          <span key={target} className="flex items-center gap-0.5 shrink-0">
            <span style={{ color: "var(--muted)" }}>/</span>
            <button
              onClick={() => { setCwd(target); sound.tick(-1); }}
              className="hover:text-[var(--fg)]"
              style={{ color: last ? "var(--accent-soft)" : "var(--muted)" }}
            >
              {seg}
            </button>
          </span>
        );
      })}
    </div>
  );
}

function Main() {
  const { workspace, cwd, activeBuffer } = useShell();
  if (activeBuffer) {
    const node = findNode(activeBuffer);
    if (node) return <FileView node={node} />;
  }
  const root = DEFAULTS[workspace];
  const offRoot = cwd !== root && findNode(cwd)?.kind === "dir";
  switch (workspace) {
    case "home": return offRoot ? <div className="p-2"><DirView path={cwd} /></div> : <HomeView />;
    case "projects": return <div className="p-2"><DirView path={findNode(cwd)?.kind === "dir" ? cwd : root} /></div>;
    case "research": return offRoot ? <div className="p-2"><DirView path={cwd} /></div> : <ResearchView />;
    case "git": return offRoot ? <div className="p-2"><DirView path={cwd} /></div> : <OssView />;
    case "profile": return offRoot && cwd !== HOME ? <div className="p-2"><DirView path={cwd} /></div> : <ProfileView />;
  }
}

/* ── statusline ── */
function Clock() {
  const [now, setNow] = useState("--:--");
  useEffect(() => {
    const f = () => setNow(new Date().toTimeString().slice(0, 5));
    f();
    const t = setInterval(f, 15000);
    return () => clearInterval(t);
  }, []);
  return <span>{now}</span>;
}

function Statusline() {
  const { mode, cwd, workspace, activeBuffer, toggle, contactOpen, setPetAnchor } = useShell();
  void contactOpen;
  const buf = activeBuffer?.split("/").pop() ?? "—";
  const ext = buf.includes(".") ? buf.split(".").pop() : "dir";
  return (
    <footer className="flex items-center gap-0 text-[11.5px] border-t shrink-0 overflow-x-auto" style={{ borderColor: "var(--border)", background: "var(--surface)" }} aria-label="status">
      <span className="px-2.5 py-[5px] font-bold shrink-0" style={{ background: "var(--accent)", color: "#0b0c11" }}>{mode}</span>
      <span className="px-2.5 py-[5px] shrink-0" style={{ color: "var(--fg-dim)" }}>deepnar@orien</span>
      <span className="px-2.5 py-[5px] shrink-0 truncate" style={{ color: "var(--icy)" }}>{shortPath(cwd)}</span>
      <span className="px-2 py-[5px] shrink-0 hidden sm:inline" style={{ color: "var(--muted)" }}>main</span>
      <span className="px-2 py-[5px] shrink-0 hidden md:inline" style={{ color: "var(--muted)" }}>{ext} · {buf}</span>
      <span className="ml-auto" />
      <Pet anchor="status" />
      <span className="px-2 py-[5px] shrink-0 hidden sm:inline" style={{ color: "var(--muted)" }}>{workspace}</span>
      <button className="px-2.5 py-[5px] shrink-0 hover:bg-[var(--sel-bg)]" style={{ color: "var(--accent-soft)" }}
        onClick={() => { setPetAnchor("status"); toggle("contactOpen"); }}>contact</button>
      <span className="px-2.5 py-[5px] shrink-0" style={{ color: "var(--muted)" }}><Clock /></span>
    </footer>
  );
}

/* ── workstation ── */
export function Workstation() {
  const { aiOpen, settingsOpen } = useShell();
  void settingsOpen;
  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <BufferLine />
      <Crumbs />
      <div className="flex-1 flex min-h-0">
        <Explorer />
        <main id="main" className="flex-1 min-w-0 overflow-auto" aria-label="workspace">
          <Main />
        </main>
        {aiOpen && (
          <aside className="w-80 shrink-0 border-l p-3 max-lg:fixed max-lg:right-2 max-lg:top-14 max-lg:bottom-48 max-lg:z-40 max-lg:w-[21rem] max-lg:border max-lg:shadow-2xl overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }} aria-label="assistant pane">
            <Assistant />
          </aside>
        )}
      </div>
      <Terminal />
      <Statusline />
    </div>
  );
}
