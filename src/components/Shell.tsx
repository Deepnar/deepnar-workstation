"use client";

import { useEffect, useState } from "react";
import {
  Folder, FileText, ChevronRight, ChevronDown, Terminal as TerminalIcon,
  Search, Sun, Moon, LayoutGrid, Keyboard, PawPrint, GitBranch, PanelLeft, Bot,
} from "lucide-react";
import { workspaces, tree, type TreeNode } from "@/content/navigation";
import { useShell, type WorkspaceId as WId } from "@/lib/store";
import { Pet } from "@/components/Pet";

/* ── top bar: workspace tabs + breadcrumbs + controls ── */
export function TopBar() {
  const { workspace, go, toggle, theme, setTheme, petOn, setPet } = useShell();
  return (
    <header className="flex items-center gap-1 px-2 h-10 shrink-0 border-b" style={{ borderColor: "var(--border)", background: "var(--bg1)" }} aria-label="workspace bar">
      <div className="flex items-center gap-0.5 overflow-x-auto flex-nowrap" role="tablist" aria-label="workspaces">
        {workspaces.map((w) => (
          <button
            key={w.id}
            role="tab"
            aria-selected={workspace === w.id}
            title={`${w.label} (${w.num})`}
            onClick={() => go(w.id as WId)}
            className={`px-2 max-sm:px-1.5 h-7 rounded-md text-[12px] max-sm:text-[11px] border border-transparent cursor-pointer transition-colors shrink-0 ${workspace === w.id ? "tab-active border" : "hover:bg-[var(--raised)]"}`}
            style={workspace === w.id ? undefined : { color: "var(--muted)" }}
          >
            <span style={{ color: workspace === w.id ? "var(--accent)" : "var(--muted)" }}>{w.num}:</span>{w.label}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1 text-[12px]" style={{ color: "var(--muted)" }}>
        <button title="command palette (ctrl+k)" onClick={() => toggle("paletteOpen")} className="p-1.5 rounded-md hover:bg-[var(--raised)] cursor-pointer" aria-label="command palette"><Search size={14} /></button>
        <button title="terminal (ctrl+`)" onClick={() => toggle("terminalOpen")} className="p-1.5 rounded-md hover:bg-[var(--raised)] cursor-pointer" aria-label="terminal"><TerminalIcon size={14} /></button>
        <button title={`theme: ${theme} (click to switch)`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-1.5 rounded-md hover:bg-[var(--raised)] cursor-pointer" aria-label="toggle theme">
          {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        <span className="hidden sm:contents">
        <button title="overview (workspaces)" onClick={() => toggle("overviewOpen")} className="p-1.5 rounded-md hover:bg-[var(--raised)] cursor-pointer" aria-label="overview"><LayoutGrid size={14} /></button>
        <button title="ai pane" onClick={() => toggle("aiOpen")} className="p-1.5 rounded-md hover:bg-[var(--raised)] cursor-pointer" aria-label="ai pane"><Bot size={14} /></button>
        <button title="explorer" onClick={() => toggle("explorerOpen")} className="p-1.5 rounded-md hover:bg-[var(--raised)] cursor-pointer" aria-label="explorer"><PanelLeft size={14} /></button>
        <button title={petOn ? "pet off" : "pet on"} onClick={() => setPet(!petOn)} className="p-1.5 rounded-md hover:bg-[var(--raised)] cursor-pointer" aria-label="toggle pet"><PawPrint size={14} style={petOn ? { color: "var(--warm)" } : undefined} /></button>
        <button title="keybindings (?)" onClick={() => toggle("helpOpen")} className="p-1.5 rounded-md hover:bg-[var(--raised)] cursor-pointer" aria-label="help"><Keyboard size={14} /></button>
        </span>
      </div>
    </header>
  );
}

/* ── explorer: neo-tree style ── */
function Node({ node, depth }: { node: TreeNode; depth: number }) {
  const { go, project } = useShell();
  const [open, setOpen] = useState(depth < 1);
  const active = node.target && (node.target === project || node.target === useShell.getState().workspace);
  const activate = () => {
    if (node.kind === "dir" && node.children) {
      setOpen(!open);
      if (node.target && workspaces.some((w) => w.id === node.target)) go(node.target as WId, undefined);
      else if (node.target) go("projects", node.target);
    } else if (node.target) {
      if (workspaces.some((w) => w.id === node.target)) go(node.target as WId, undefined);
      else go("projects", node.target);
    }
  };
  return (
    <div>
      <button
        onClick={activate}
        title={node.name}
        className={`flex items-center gap-1.5 w-full text-left px-1.5 py-[3px] rounded text-[12px] cursor-pointer hover:bg-[var(--raised)] ${active ? "bg-[var(--raised)]" : ""}`}
        style={{ paddingLeft: 6 + depth * 8, color: active ? "var(--accent-soft)" : "var(--fg-dim)" }}
      >
        {node.kind === "dir" ? (
          open ? <ChevronDown size={12} style={{ color: "var(--muted)" }} /> : <ChevronRight size={12} style={{ color: "var(--muted)" }} />
        ) : (
          <span className="w-3" />
        )}
        {node.kind === "dir" ? <Folder size={13} style={{ color: "var(--icy)" }} /> : <FileText size={13} style={{ color: "var(--muted)" }} />}
        <span className="truncate">{node.name}</span>
      </button>
      {open && node.children?.map((c) => <Node key={c.name} node={c} depth={depth + 1} />)}
    </div>
  );
}

export function Explorer() {
  const { explorerOpen } = useShell();
  if (!explorerOpen) return null;
  return (
    <aside className="pane w-64 shrink-0 p-1.5 overflow-y-auto max-md:hidden" aria-label="file explorer">
      <div className="px-1.5 py-1 text-[11px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>explorer</div>
      {tree.map((n) => (
        <Node key={n.name} node={n} depth={0} />
      ))}
      <div className="px-1.5 pt-2 text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
        main · <GitBranch size={10} className="inline" /> deepnar
      </div>
    </aside>
  );
}

/* ── statusline: lualine spirit ── */
const LANG: Record<string, string> = { home: "md", projects: "py", research: "tex", oss: "git", about: "md", notes: "md", contact: "json", ai: "prompt" };

function Clock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const f = () => setT(new Date().toTimeString().slice(0, 5));
    f();
    const id = setInterval(f, 20000);
    return () => clearInterval(id);
  }, []);
  return <span>{t}</span>;
}

export function Statusline() {
  const { mode, cwd, workspace, project, petOn } = useShell();
  const modeColor = mode === "NORMAL" ? "var(--icy)" : mode === "INSERT" ? "var(--ok)" : mode === "COMMAND" ? "var(--warm)" : "var(--accent)";
  return (
    <footer className="flex items-center gap-3 px-3 h-7 shrink-0 text-[12px] border-t" style={{ borderColor: "var(--border)", background: "var(--bg1)" }} aria-label="statusline">
      <span className="font-bold px-1.5 rounded" style={{ background: modeColor, color: "var(--bg0)" }}>{mode}</span>
      <span className="max-sm:hidden" style={{ color: "var(--muted)" }}>deepnar@nexus</span>
      <span className="truncate" style={{ color: "var(--accent-soft)" }}>{cwd}</span>
      <span className="flex items-center gap-1 max-sm:hidden" style={{ color: "var(--muted)" }}>
        <GitBranch size={12} /> main · {LANG[workspace]} {project ? `· ${project}` : ""}
      </span>
      <span className="flex-1" />
      {petOn && <Pet />}
      <span className="max-sm:hidden" style={{ color: "var(--muted)" }}>{workspace}{project ? `/${project}` : ""}</span>
      <span style={{ color: "var(--muted)" }}><Clock /></span>
    </footer>
  );
}

/* ── overview: hypr-workspace tiles ── */
export function Overview() {
  const { overviewOpen, toggle, workspace, go } = useShell();
  if (!overviewOpen) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6" style={{ background: "color-mix(in srgb, var(--bg0) 78%, transparent)" }} onClick={() => toggle("overviewOpen")} role="dialog" aria-label="workspace overview">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        {workspaces.map((w) => (
          <button
            key={w.id}
            onClick={() => go(w.id as WId)}
            className={`pane anim-pane p-4 text-left cursor-pointer hover:scale-[1.02] ${workspace === w.id ? "pane-active" : ""}`}
          >
            <div className="text-[11px]" style={{ color: "var(--muted)" }}>{w.num}</div>
            <div className="text-[15px] font-bold" style={workspace === w.id ? { color: "var(--accent-soft)" } : undefined}>{w.label}</div>
            <div className="text-[11px] truncate" style={{ color: "var(--muted)" }}>{w.path}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── help overlay ── */
const KEYS: [string, string][] = [
  ["1–8", "switch workspace"], ["ctrl+k", "command palette"], ["ctrl+p", "finder"],
  ["ctrl+`", "terminal"], ["?", "this help"], ["esc", "close overlay"],
  ["j/k + enter", "move / open in lists"], ["/", "assistant"], ["tab / ↑↓", "complete / history in terminal"],
];
export function Help() {
  const { helpOpen, toggle } = useShell();
  if (!helpOpen) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6" style={{ background: "color-mix(in srgb, var(--bg0) 78%, transparent)" }} onClick={() => toggle("helpOpen")} role="dialog" aria-label="keybindings">
      <div className="pane p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="text-[13px] font-bold mb-3">keymap <span style={{ color: "var(--muted)" }}>— mouse works everywhere too</span></div>
        {KEYS.map(([k, d]) => (
          <div key={k} className="flex justify-between py-1 text-[12.5px] border-b last:border-0" style={{ borderColor: "var(--border)" }}>
            <code style={{ color: "var(--icy)" }}>{k}</code><span style={{ color: "var(--muted)" }}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
