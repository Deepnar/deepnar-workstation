"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useShell } from "@/lib/store";
import { HOME, findNode, listDir, shortPath, type VNode } from "@/vfs/vfs";
import { prs } from "@/content/oss";
import { achievements } from "@/content/achievements";
import { profile } from "@/content/profile";
import gh from "@/generated/github.json";
import { Code, Markdown } from "./highlight";
import { RepoMetaRail, RepoMetaStrip } from "./RepoMeta";
import { DomainBadge, PathBadge, RecognitionBadges } from "./DomainBadge";
import { DocViewer } from "./DocViewer";
import { projects } from "@/content/projects";
import { sound } from "@/audio/engine";

/* ── shared rows ── */
export function Row({ active, onOpen, onPick, children, hint }: {
  active?: boolean; onOpen: () => void; onPick?: () => void;
  children: React.ReactNode; hint?: string;
}) {
  return (
    <button
      onClick={onOpen}
      onMouseEnter={onPick}
      onDoubleClick={onOpen}
      className="w-full flex items-center gap-3 px-3 py-[7px] text-left text-[12.5px] outline-none"
      style={{
        background: active ? "var(--sel-bg)" : "transparent",
        color: active ? "var(--accent-soft)" : "var(--fg-dim)",
        borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
      }}
    >
      <span className="flex-1 min-w-0 truncate">{children}</span>
      {hint && <span className="text-[11px] shrink-0" style={{ color: "var(--muted)" }}>{hint}</span>}
    </button>
  );
}

export function PaneTitle({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-1 text-[10.5px] uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>{children}</div>;
}

export const iconFor = (n: VNode) =>
  n.kind === "dir" ? "▸" : n.name.endsWith(".log") ? "≣" : n.name.endsWith(".json") ? "{}" : n.name.endsWith(".pdf") ? "▦" : n.kind === "calendar" ? "▦" : "▤";

/* ── external actions: links are actions, never fake files ── */
export function ActionBar({ node }: { node: VNode }) {
  const { notify } = useShell();
  const meta = node.meta ?? {};
  const acts: { label: string; href: string }[] = [];
  if (meta.github) acts.push({ label: "GitHub ↗", href: meta.github });
  if (meta.demo) acts.push({ label: "live demo ↗", href: meta.demo });
  if (meta.arxiv) acts.push({ label: "arXiv ↗", href: meta.arxiv });
  if (meta.doi) acts.push({ label: "DOI ↗", href: meta.doi });
  if (meta.upstream) acts.push({ label: "upstream ↗", href: meta.upstream });
  if (!acts.length) return null;
  return (
    <div className="flex gap-2 flex-wrap">
      {acts.map((a) => (
        <a key={a.label} href={a.href} target="_blank" rel="noreferrer"
          className="px-3 py-1.5 border text-[12px]"
          style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}
          onClick={() => notify(`opened ${a.label.replace(" ↗", "").toLowerCase()}`)}>
          {a.label}
        </a>
      ))}
    </div>
  );
}

/* ── yazi preview: name + one hint + short summary + actions ── */
export function PreviewPane({ path }: { path: string }) {
  const node = findNode(path);
  if (!node)
    return <div className="p-4 text-[12px]" style={{ color: "var(--muted)" }}>no selection</div>;
  if (node.kind === "dir") {
    const kids = listDir(path);
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>{kids.length} items</div>
          <PathBadge path={path} />
        </div>
        {kids.slice(0, 12).map((k) => (
          <div key={k.path} className="text-[12px] truncate" style={{ color: "var(--fg-dim)" }}>
            <span style={{ color: "var(--icy)" }}>{iconFor(k)} </span>{k.name}{k.kind === "dir" ? "/" : ""}
          </div>
        ))}
        {kids.length > 12 && <div className="text-[11px]" style={{ color: "var(--muted)" }}>+{kids.length - 12} more — enter to browse</div>}
      </div>
    );
  }
  return (
    <div className="p-4 space-y-3 text-[12.5px]" style={{ color: "var(--fg-dim)" }}>
      <div className="font-bold text-[13.5px]" style={{ color: "var(--fg)" }}>{node.title ?? node.name}</div>
      <ActionBar node={node} />
      {(node.body ?? []).slice(0, 8).map((l, i) => (
        <div key={i} className={l.startsWith("#") ? "font-bold" : l.startsWith("·") ? "" : ""} style={l.startsWith("#") ? { color: "var(--fg)" } : undefined}>
          {l.startsWith("# ") ? l.slice(2) : l === "" ? " " : l}
        </div>
      ))}
      {(node.body ?? []).length > 8 && <div className="text-[11px]" style={{ color: "var(--muted)" }}>…open for the full file</div>}
    </div>
  );
}

/* ── full buffer ── */
export function FileView({ node }: { node: VNode }) {
  const { notify, toggle } = useShell();
  const [pdfOpen, setPdfOpen] = useState(false);
  if (node.kind === "markdown") {
    const repo = node.meta?.repo;
    const priv = node.meta?.private != null;
    if (!repo && !priv)
      return <div className="p-5 max-w-3xl space-y-4"><ActionBar node={node} /><Markdown node={node} /></div>;
    const proj = projects.find((p) => p.repo === repo);
    return (
      <div className="p-5 flex gap-6 items-start">
        <div className="flex-1 min-w-0 max-w-3xl space-y-4">
          <div className="lg:hidden"><RepoMetaStrip repo={repo} isPrivate={priv} /></div>
          {(proj?.domain || proj?.recognition?.length) && (
            <div className="flex flex-wrap items-center gap-2">
              {proj.domain && <DomainBadge domain={proj.domain} modifier={proj.modifier} />}
              {proj.recognition && <RecognitionBadges items={proj.recognition} />}
            </div>
          )}
          <ActionBar node={node} /><Markdown node={node} />
        </div>
        <div className="hidden lg:block w-[210px] shrink-0 sticky top-2">
          <RepoMetaRail repo={repo} isPrivate={priv} />
        </div>
      </div>
    );
  }
  if (node.kind === "contact") {
    return (
      <div className="p-5 space-y-3 max-w-xl">
        <Code lang="json" lines={node.body ?? []} />
        <button className="px-3 py-1.5 border text-[12px]" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}
          onClick={() => toggle("contactOpen")}>
          open contact panel →
        </button>
      </div>
    );
  }
  if (node.kind === "log") return <div className="p-5 max-w-3xl"><Code lang="log" lines={node.body ?? []} /></div>;
  if (node.kind === "pdf" || node.kind === "image") {
    return (
      <div className="p-5 space-y-3 text-[13px] max-w-3xl" style={{ color: "var(--fg-dim)" }}>
        <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>{node.title}</div>
        <DocViewer src={node.link ?? ""} title={node.title ?? node.name} kind={node.kind}
          pages={1} caption={node.body} downloadName={node.name} />
      </div>
    );
  }
  return <div className="p-5 max-w-3xl"><Markdown node={node} /></div>;
}

/* ── home activity: the full year, github-style ── */
interface CalDay { date: string; count: number }

function useCalendar() {
  const cal = (gh as unknown as { total?: number; calendar: { total: number; weeks: CalDay[][] } }).calendar;
  const max = useMemo(() => Math.max(1, ...cal.weeks.flat().map((d) => d.count)), [cal]);
  const level = (c: number) => (c === 0 ? 0 : c < max * 0.25 ? 1 : c < max * 0.5 ? 2 : c < max * 0.8 ? 3 : 4);
  return { cal, level };
}

export function MiniCalendar() {
  const { cal, level } = useCalendar();
  const weeks = cal.weeks.slice(-53);
  const [hover, setHover] = useState<CalDay | null>(null);
  return (
    <div>
      <div className="pb-1 max-w-full overflow-x-auto">
        <div className="flex gap-[2px] w-max max-w-none">
          {weeks.map((w, i) => (
            <div key={i} className="flex flex-col gap-[2px]">
              {w.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date} — ${d.count} contribution${d.count === 1 ? "" : "s"}`}
                  onMouseEnter={() => setHover(d)}
                  className="w-[7px] h-[7px] md:w-[8px] md:h-[8px] rounded-[2px] cal-cell"
                  style={{
                    background: level(d.count) === 0 ? "var(--border)" : "var(--ok)",
                    opacity: level(d.count) === 0 ? 0.4 : 0.25 + level(d.count) * 0.19,
                    outline: hover?.date === d.date ? "1px solid var(--fg)" : "none",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="text-[11.5px] h-4 mt-1 cal-count" style={{ color: "var(--icy)" }} aria-live="polite">
        {hover ? `${hover.date} — ${hover.count}` : `${cal.total.toLocaleString()} in the last year`}
      </div>
    </div>
  );
}

/* ── home: lazyvim dashboard ── */
const ACTIONS: { key: string; label: string; run: () => void }[] = [
  { key: "f", label: "Find file", run: () => useShell.getState().toggle("paletteOpen") },
  { key: "a", label: "About", run: () => useShell.getState().navTo(`${HOME}/about`) },
  { key: "p", label: "Projects", run: () => useShell.getState().navTo(`${HOME}/projects`) },
  { key: "r", label: "Research", run: () => useShell.getState().navTo(`${HOME}/research/lsrep-ice`) },
  { key: "o", label: "Open source", run: () => useShell.getState().navTo(`${HOME}/oss`) },
  { key: "c", label: "Contact", run: () => useShell.getState().toggle("contactOpen") },
  { key: "?", label: "Help", run: () => useShell.getState().toggle("helpOpen") },
];

/* ── block/pixel identity, LazyVim-dashboard spirit, no LazyVim branding ── */
// 4-wide pixel glyphs, 2-space gaps — every row exactly 40 cells
function BlockLogo() {
  return (
    <img src="/deepnar-wordmark.png" alt="DEEPNAR" width={520} height={191}
      className="w-full max-w-[440px] md:max-w-[560px] h-auto select-none home-logo" draggable={false}
      style={{ borderRadius: 10, border: "1px solid var(--border)" }} />
  );
}

export function HomeView() {
  const { recent, openFile } = useShell();
  const recentShown = (recent.length > 0 ? recent : [`${HOME}/projects/ice/README.md`, `${HOME}/research/lsrep-ice/README.md`, `${HOME}/oss/merged/mne-python-14283.md`]).slice(0, 5);
  return (
    <div className="h-full overflow-auto px-6 py-5 home-root">
      <div className="min-h-full flex flex-col items-center justify-center">
      <BlockLogo />
      <div className="text-[12.5px] md:text-[14px] mt-2 md:mt-3 mb-1" style={{ color: "var(--muted)" }}>{profile.tagline}</div>
      <div className="text-[11px] md:text-[12px] mb-3 md:mb-4" style={{ color: "var(--faint)" }}>Deepesh Sonar · AI Systems · Research · Software Engineering</div>
      <div className="w-full max-w-[440px] md:max-w-[560px] grid gap-4 md:gap-5 md:grid-cols-2 justify-items-center md:justify-items-stretch">
        <div role="list" aria-label="quick actions" className="w-full max-w-[300px] md:max-w-none">
          {ACTIONS.map((a) => (
            <button key={a.key} role="listitem" onClick={() => { sound.select(); a.run(); }}
              className="w-full flex items-center gap-3 px-3 py-[5px] md:py-[7px] text-[13px] md:text-[14px] text-left hover:bg-[var(--sel-bg)]">
              <span className="w-6 text-center text-[12px] md:text-[13px]" style={{ color: "var(--icy)" }}>{a.key}</span>
              <span style={{ color: "var(--fg-dim)" }}>{a.label}</span>
            </button>
          ))}
        </div>
        <div className="w-full max-w-[300px] md:max-w-none recent-list">
          <div className="text-[10.5px] uppercase tracking-[0.16em] px-3 mb-1" style={{ color: "var(--muted)" }}>recent</div>
          {recentShown.map((r) => (
            <button key={r} onClick={() => { const n = findNode(r); if (n) { sound.fileOpen(); openFile(r, n.kind); } }}
              className="w-full text-left px-3 py-[3px] md:py-[5px] text-[12px] md:text-[13px] truncate hover:bg-[var(--sel-bg)]" style={{ color: "var(--fg-dim)" }}>
              <span style={{ color: "var(--muted)" }}>· </span>{shortPath(r)}
            </button>
          ))}
        </div>
      </div>
      <div className="w-full max-w-2xl mt-3 flex flex-col items-center">
        <div className="text-[10.5px] uppercase tracking-[0.16em] mb-2" style={{ color: "var(--muted)" }}>
          <a href="https://github.com/Deepnar" target="_blank" rel="noreferrer" className="hover:underline">activity ↗</a>
        </div>
        <MiniCalendar />
      </div>
      <div className="w-full max-w-2xl md:max-w-3xl mt-2 md:mt-3 flex flex-col items-center">
        <AchievementsStrip />
      </div>
      </div>
    </div>
  );
}

/* ── home achievements (real badge art, local) ── */
export function AchievementsStrip() {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.16em] mb-2 text-center" style={{ color: "var(--muted)" }}>
        <a href="https://github.com/Deepnar?tab=achievements" target="_blank" rel="noreferrer" className="hover:underline">achievements ↗</a>
      </div>
      <div className="flex gap-4 overflow-x-auto justify-center px-2 ach-strip" role="list" aria-label="github achievements">
        {achievements.map((a) => (
          <div key={a.slug} role="listitem" title={`${a.name}${a.tier ? ` ${a.tier}` : ""} — ${a.meaning}`}
            className="flex flex-col items-center gap-1 shrink-0 w-[84px] md:w-[104px] ach-item">
            <img src={a.img} alt={`${a.name} achievement badge`} width={44} height={44}
              className="rounded-full select-none md:w-[56px] md:h-[56px]" draggable={false}
              style={{ border: "1px solid var(--border)" }} />
            <div className="text-[10.5px] md:text-[11.5px] text-center leading-tight" style={{ color: "var(--fg-dim)" }}>
              {a.name}{a.tier ? ` ${a.tier}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export function OssView() {
  const repos = useMemo(() => [...new Set(prs.map((p) => p.repo))], []);
  const focusNonce = useShell((s) => s.listFocusNonce);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { listRef.current?.focus(); }, [focusNonce]);
  const [repo, setRepo] = useState(repos[0]);
  const [idx, setIdx] = useState(0);
  const [pane, setPane] = useState<"repos" | "prs">("prs");
  const { openFile } = useShell();
  const repoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // follow keyboard pane switches; never steal focus from outside (mouse browse)
    if (!document.activeElement?.closest?.("[aria-label='open source browser']")) return;
    (pane === "repos" ? repoRef : listRef).current?.focus();
  }, [pane]);
  const list = prs.filter((p) => p.repo === repo);
  const sel = list[Math.min(idx, list.length - 1)];
  const openSel = (i: number) => {
    const p = list[i];
    if (!p) return;
    sound.fileOpen();
    openFile(`${HOME}/oss/${p.state}/${p.repo.split("/")[1].toLowerCase()}-${p.url.split("/").pop()}.md`, "markdown");
  };
  return (
    <div className="h-full oss-grid grid grid-cols-[minmax(150px,220px)_minmax(200px,1fr)_minmax(220px,1.2fr)] min-h-0 text-[12.5px]" role="region" aria-label="open source browser">
      <div ref={repoRef} className="border-r overflow-auto min-h-0 outline-none" style={{ borderColor: "var(--border)", boxShadow: pane === "repos" ? "inset 2px 0 0 var(--accent)" : "none" }} tabIndex={0}
        aria-label="repositories" data-active={pane === "repos" ? "true" : undefined}
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          const i = repos.indexOf(repo);
          if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); const n = repos[Math.min(repos.length - 1, i + 1)]; setRepo(n); setIdx(0); sound.tick(1); }
          else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); const n = repos[Math.max(0, i - 1)]; setRepo(n); setIdx(0); sound.tick(-1); }
          else if (e.key === "Enter" || e.key === "l" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); setPane("prs"); sound.nav(); }
          else if (e.key === "h" || e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); useShell.getState().navUp(); sound.tick(-1); }
        }}>
        <PaneTitle>repositories{pane === "repos" ? " ●" : ""}</PaneTitle>
        {repos.map((r) => (
          <Row key={r} active={r === repo} onPick={() => setPane("repos")} onOpen={() => { setRepo(r); setIdx(0); setPane("prs"); sound.nav(); }}>
            <span className="truncate">{r.split("/")[1] ?? r}</span>
          </Row>
        ))}
      </div>
      <div ref={listRef} className="border-r overflow-auto min-h-0 outline-none" style={{ borderColor: "var(--border)", boxShadow: pane === "prs" ? "inset 2px 0 0 var(--accent)" : "none" }} tabIndex={0} autoFocus
        aria-label="pull requests" data-active={pane === "prs" ? "true" : undefined}
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); setIdx((i) => Math.min(list.length - 1, i + 1)); sound.tick(1); }
          else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); setIdx((i) => Math.max(0, i - 1)); sound.tick(-1); }
          else if (e.key === "Enter") { e.stopPropagation(); openSel(idx); }
          else if (e.key === "h" || e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); setPane("repos"); sound.nav(); }
        }}>
        <PaneTitle>pull requests · {repo}{pane === "prs" ? " ●" : ""}</PaneTitle>
        {list.map((p, i) => (
          <Row key={p.url} active={p.url === sel?.url} hint={p.state === "merged" ? "✓" : "○"}
            onPick={() => { setIdx(i); setPane("prs"); }} onOpen={() => openSel(i)}>
            <span className="truncate">#{p.url.split("/").pop()} {p.title}</span>
          </Row>
        ))}
      </div>
      <div className="overflow-auto min-h-0 p-4">
        {sel ? (
          <div className="space-y-2 max-w-xl">
            <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
              {sel.state === "merged" ? "merged ✓" : "open ○"} · {sel.repo}
            </div>
            <div className="text-[14px] font-bold" style={{ color: "var(--fg)" }}>{sel.title}</div>
            <div style={{ color: "var(--fg-dim)" }}>{sel.note}</div>
            <div className="break-all text-[12px]" style={{ color: "var(--icy)" }}>{sel.url}</div>
            <div className="flex gap-2">
              <a href={sel.url} target="_blank" rel="noreferrer" className="inline-block px-3 py-1.5 border text-[12px]"
                style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}>open on github ↗</a>
              <button className="px-3 py-1.5 border text-[12px]" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}
                onClick={() => openSel(idx)}>open detail ↵</button>
            </div>
          </div>
        ) : <div style={{ color: "var(--muted)" }}>no PRs</div>}
      </div>
    </div>
  );
}
