"use client";

import { useMemo, useState } from "react";
import { useShell } from "@/lib/store";
import { HOME, ROOT, findNode, listDir, shortPath, type VNode } from "@/vfs/vfs";
import { projects } from "@/content/projects";
import { prs } from "@/content/oss";
import { profile } from "@/content/profile";
import gh from "@/generated/github.json";
import { Code, Markdown } from "./highlight";
import { sound } from "@/audio/engine";

/* ── shared rows ── */
function Row({ active, onOpen, children, hint }: { active?: boolean; onOpen: () => void; children: React.ReactNode; hint?: string }) {
  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => useShell.getState().setPetMood("peek")}
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

const iconFor = (n: VNode) =>
  n.kind === "dir" ? "▸" : n.name.endsWith(".log") ? "≣" : n.name.endsWith(".toml") ? "⚙" : n.name.endsWith(".json") ? "{}" : n.name.endsWith(".pdf") ? "▦" : n.name.endsWith(".link") ? "↗" : "▤";

/* ── oil-style directory ── */
const PROJ_TYPE: Record<string, string> = {};
for (const p of projects) {
  PROJ_TYPE[p.slug] = ["ice", "presentation-forge", "timetable-generator"].includes(p.slug)
    ? "flagship" : ["prompt-routing-classifier", "micrograd-from-scratch", "ml-notebooks"].includes(p.slug)
    ? "lab" : p.slug === "ds-practice" ? "archive" : "team";
}

export function DirView({ path }: { path: string }) {
  const { openFile, activeBuffer } = useShell();
  const nodes = listDir(path);
  const isProjects = path === `${HOME}/projects`;
  return (
    <div role="list" aria-label={`directory ${shortPath(path)}`}>
      <div className="flex gap-3 px-3 py-1 text-[10.5px] uppercase tracking-[0.14em] border-b" style={{ color: "var(--muted)", borderColor: "var(--border)" }}>
        <span className="flex-1">name</span>
        {isProjects && <><span className="w-20">type</span><span className="w-16 text-right">status</span></>}
      </div>
      {nodes.map((n) => {
        const slug = n.path.split("/").pop() ?? "";
        const proj = isProjects ? projects.find((p) => p.slug === slug) : undefined;
        return (
          <div key={n.path} role="listitem">
            <Row
              active={activeBuffer === n.path}
              hint={isProjects && proj ? undefined : n.kind === "dir" ? "dir" : n.kind}
              onOpen={() => { sound.fileOpen(); openFile(n.path, n.kind); }}
            >
              <span className="flex gap-3 items-baseline">
                <span style={{ color: "var(--icy)" }}>{iconFor(n)}</span>
                <span className="truncate">{n.name}{n.kind === "dir" ? "/" : ""}</span>
                {isProjects && proj && (
                  <>
                    <span className="w-20 shrink-0 text-[11px]" style={{ color: "var(--muted)" }}>{PROJ_TYPE[slug]}</span>
                    <span className="w-16 shrink-0 text-right text-[11px]" style={{ color: "var(--ok)" }}>{proj.status}</span>
                  </>
                )}
              </span>
            </Row>
          </div>
        );
      })}
      {nodes.length === 0 && <div className="px-3 py-4 text-[12px]" style={{ color: "var(--muted)" }}>empty directory</div>}
    </div>
  );
}

/* ── file buffer ── */
export function FileView({ node }: { node: VNode }) {
  const { notify, toggle } = useShell();
  if (node.kind === "dir") return <DirView path={node.path} />;
  if (node.kind === "markdown") return <div className="p-4"><Markdown node={node} /></div>;
  if (node.kind === "json" || node.kind === "contact") {
    return (
      <div className="p-4 space-y-3">
        <Code lang="json" lines={node.body ?? []} />
        {node.kind === "contact" && (
          <div className="flex gap-2 text-[12px]">
            <button className="px-3 py-1.5 border" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}
              onClick={() => { try { void navigator.clipboard.writeText("18deepnar@gmail.com"); } catch { /* noop */ } sound.copy(); notify("email copied"); }}>
              copy email
            </button>
            <button className="px-3 py-1.5 border" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}
              onClick={() => toggle("contactOpen")}>
              compose →
            </button>
          </div>
        )}
      </div>
    );
  }
  if (node.kind === "toml") return <div className="p-4"><Code lang="toml" lines={node.body ?? []} /></div>;
  if (node.kind === "log") return <div className="p-4"><Code lang="log" lines={node.body ?? []} /></div>;
  if (node.kind === "activity") return <ActivityView />;
  if (node.kind === "link") {
    return (
      <div className="p-4 space-y-3 text-[13px]" style={{ color: "var(--fg-dim)" }}>
        <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>external link</div>
        <div style={{ color: "var(--fg)" }}>{node.title}</div>
        <div className="break-all" style={{ color: "var(--icy)" }}>{node.link}</div>
        <a href={node.link} target="_blank" rel="noreferrer" className="inline-block px-3 py-1.5 border text-[12px]"
          style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }} onClick={() => notify("opened external link")}>
          open ↗
        </a>
      </div>
    );
  }
  if (node.kind === "pdf") {
    return (
      <div className="p-4 space-y-3 text-[13px]" style={{ color: "var(--fg-dim)" }}>
        <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>resume.pdf — sanitized public CV</div>
        <div className="flex gap-2 text-[12px]">
          <a href={node.link} target="_blank" rel="noreferrer" className="px-3 py-1.5 border" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}>open pdf</a>
          <a href={node.link} download className="px-3 py-1.5 border" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}
            onClick={() => { sound.download(); notify("resume downloaded"); }}>download ↓</a>
        </div>
        <iframe title="resume preview" src={node.link} className="w-full h-[60vh] border" style={{ borderColor: "var(--border)", background: "#fff" }} />
      </div>
    );
  }
  return <div className="p-4"><Markdown node={node} /></div>;
}

/* ── github activity (generated data, real numbers) ── */
export function ActivityView() {
  const weeks = (gh.activityWeeks ?? []) as number[];
  const max = Math.max(1, ...weeks);
  return (
    <div className="p-4 space-y-4 text-[12.5px]" style={{ color: "var(--fg-dim)" }}>
      <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>github activity · synced {gh.syncedAt}</div>
      <div className="flex gap-6 flex-wrap">
        <span><b style={{ color: "var(--fg)" }}>{gh.repoCount}</b> public repos</span>
        <span><b style={{ color: "var(--ok)" }}>{gh.mergedPRs}</b> merged upstream (lifetime)</span>
        <span><b style={{ color: "var(--warm)" }}>{gh.openPRs}</b> open</span>
      </div>
      <div>
        <div className="text-[11px] mb-2" style={{ color: "var(--muted)" }}>contributions · last {weeks.length} weeks</div>
        <div className="flex items-end gap-[3px] h-16" role="img" aria-label="contribution activity chart">
          {weeks.map((w, i) => (
            <div key={i} title={`${w}`} className="flex-1 min-w-[4px]" style={{ height: `${Math.max(6, (w / max) * 100)}%`, background: w === 0 ? "var(--border)" : "var(--ok)", opacity: w === 0 ? 0.6 : 0.55 + 0.45 * (w / max) }} />
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] mb-1" style={{ color: "var(--muted)" }}>starred</div>
        {(gh.stars as { repo: string; stars: number }[]).slice(0, 5).map((s) => (
          <div key={s.repo} className="flex justify-between max-w-sm"><span>{s.repo}</span><span style={{ color: "var(--warm)" }}>★ {s.stars}</span></div>
        ))}
      </div>
    </div>
  );
}

/* ── home: lazyvim dashboard ── */
const ACTIONS = [
  { key: "f", label: "Find file", run: () => useShell.getState().toggle("paletteOpen") },
  { key: "p", label: "Projects", run: () => useShell.getState().go("projects") },
  { key: "r", label: "Research", run: () => useShell.getState().go("research") },
  { key: "o", label: "Open source", run: () => useShell.getState().go("git") },
  { key: "v", label: "Resume", run: () => useShell.getState().openFile(`${HOME}/resume.pdf`, "pdf") },
  { key: "a", label: "About", run: () => useShell.getState().go("profile") },
  { key: "?", label: "Help", run: () => useShell.getState().toggle("helpOpen") },
];

export function HomeView() {
  const { recent, openFile } = useShell();
  const recentShown = (recent.length > 0 ? recent : [`${HOME}/projects/ice/README.md`, `${HOME}/research/papers/lsrep.md`, `${HOME}/oss/merged/mne-python-14283.md`]).slice(0, 5);
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-8 overflow-auto">
      <div className="text-[26px] font-bold tracking-[0.3em] mb-1" style={{ color: "var(--fg)" }}>DEEPNAR</div>
      <div className="text-[12.5px] mb-7" style={{ color: "var(--muted)" }}>{profile.tagline}</div>
      <div className="w-full max-w-md" role="list" aria-label="quick actions">
        {ACTIONS.map((a) => (
          <button key={a.key} role="listitem" onClick={() => { sound.select(); a.run(); }}
            className="w-full flex items-center gap-4 px-3 py-[7px] text-[13px] text-left hover:bg-[var(--sel-bg)]">
            <span className="w-6 text-center border text-[11px] py-[1px]" style={{ borderColor: "var(--border)", color: "var(--icy)" }}>{a.key}</span>
            <span style={{ color: "var(--fg-dim)" }}>{a.label}</span>
          </button>
        ))}
      </div>
      <div className="w-full max-w-md mt-7">
        <div className="text-[10.5px] uppercase tracking-[0.16em] px-3 mb-1" style={{ color: "var(--muted)" }}>recent</div>
        {recentShown.map((r) => (
          <button key={r} onClick={() => { const n = findNode(r); if (n) { sound.fileOpen(); openFile(r, n.kind); } }}
            className="w-full text-left px-3 py-[5px] text-[12px] truncate hover:bg-[var(--sel-bg)]" style={{ color: "var(--fg-dim)" }}>
            <span style={{ color: "var(--icy)" }}>{iconFor(findNode(r) ?? ROOT)} </span>{shortPath(r)}
          </button>
        ))}
      </div>
      <div className="w-full max-w-md mt-6 px-3 text-[11.5px] flex flex-wrap gap-x-4 gap-y-1" style={{ color: "var(--muted)" }}>
        <span>arch · nvim · main · orien</span>
        <span>{gh.repoCount} repos · {gh.mergedPRs}↑ merged · synced {gh.syncedAt}</span>
      </div>
    </div>
  );
}

/* ── research lab ── */
export function ResearchView() {
  const { openFile, activeBuffer } = useShell();
  const expNodes = listDir(`${HOME}/research/experiments`);
  const paperNodes = listDir(`${HOME}/research/papers`);
  return (
    <div className="p-4 space-y-5 text-[12.5px] max-w-3xl" style={{ color: "var(--fg-dim)" }}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] mb-1" style={{ color: "var(--muted)" }}>papers</div>
        {paperNodes.map((n) => (
          <Row key={n.path} active={activeBuffer === n.path} onOpen={() => { sound.fileOpen(); openFile(n.path, n.kind); }}>{n.title}</Row>
        ))}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] mb-1" style={{ color: "var(--muted)" }}>runs — real numbers only</div>
        {expNodes.map((n) => (
          <Row key={n.path} active={activeBuffer === n.path} hint="log" onOpen={() => { sound.fileOpen(); openFile(n.path, n.kind); }}>{n.title}</Row>
        ))}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] mb-1" style={{ color: "var(--muted)" }}>lab log</div>
        <Row onOpen={() => { sound.fileOpen(); openFile(`${HOME}/research/timeline.log`, "log"); }}>timeline.log</Row>
      </div>
    </div>
  );
}

/* ── oss lazygit ── */
export function OssView() {
  const repos = useMemo(() => [...new Set(prs.map((p) => p.repo))], []);
  const [repo, setRepo] = useState(repos[0]);
  const [idx, setIdx] = useState(0);
  const { openFile } = useShell();
  const list = prs.filter((p) => p.repo === repo);
  const sel = list[Math.min(idx, list.length - 1)];
  return (
    <div className="h-full grid grid-cols-[180px_1fr_1.2fr] min-h-0 text-[12.5px]" role="region" aria-label="open source browser">
      <div className="border-r overflow-auto" style={{ borderColor: "var(--border)" }}>
        <PaneTitle>repositories</PaneTitle>
        {repos.map((r) => (
          <Row key={r} active={r === repo} onOpen={() => { setRepo(r); setIdx(0); sound.tick(1); }}>
            <span className="truncate">{r.split("/")[1] ?? r}</span>
          </Row>
        ))}
        <div className="border-t mt-1 pt-1" style={{ borderColor: "var(--border)" }}>
          <PaneTitle>activity</PaneTitle>
          <Row onOpen={() => { sound.fileOpen(); openFile(`${HOME}/oss/activity.log`, "activity"); }}>activity.log</Row>
        </div>
      </div>
      <div className="border-r overflow-auto" style={{ borderColor: "var(--border)" }} tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "j") setIdx((i) => Math.min(list.length - 1, i + 1));
          if (e.key === "k") setIdx((i) => Math.max(0, i - 1));
        }}>
        <PaneTitle>pull requests · {repo}</PaneTitle>
        {list.map((p, i) => (
          <Row key={p.url} active={p.url === sel?.url}
            hint={p.state === "merged" ? "✓" : "○"}
            onOpen={() => { setIdx(i); }}>
            <span className="truncate">#{p.url.split("/").pop()} {p.title}</span>
          </Row>
        ))}
      </div>
      <div className="overflow-auto p-4">
        {sel ? (
          <div className="space-y-2 max-w-xl">
            <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
              {sel.state === "merged" ? "merged ✓" : "open ○"} · {sel.repo}
            </div>
            <div className="text-[14px] font-bold" style={{ color: "var(--fg)" }}>{sel.title}</div>
            <div style={{ color: "var(--fg-dim)" }}>{sel.note}</div>
            <div className="break-all text-[12px]" style={{ color: "var(--icy)" }}>{sel.url}</div>
            <a href={sel.url} target="_blank" rel="noreferrer" className="inline-block px-3 py-1.5 border text-[12px]"
              style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}>open on github ↗</a>
          </div>
        ) : <div style={{ color: "var(--muted)" }}>no PRs</div>}
      </div>
    </div>
  );
}

function PaneTitle({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-1 text-[10.5px] uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>{children}</div>;
}

/* ── profile ── */
export function ProfileView() {
  const { openFile, activeBuffer } = useShell();
  return (
    <div className="p-4 space-y-5 text-[12.5px] max-w-3xl" style={{ color: "var(--fg-dim)" }}>
      <div>
        <PaneTitle>about/</PaneTitle>
        {listDir(`${HOME}/about`).map((n) => (
          <Row key={n.path} active={activeBuffer === n.path} onOpen={() => { sound.fileOpen(); openFile(n.path, n.kind); }}>{n.name}</Row>
        ))}
      </div>
      <div>
        <PaneTitle>artifacts</PaneTitle>
        <Row active={activeBuffer === `${HOME}/resume.md`} onOpen={() => { sound.fileOpen(); openFile(`${HOME}/resume.md`, "markdown"); }}>resume.md</Row>
        <Row active={activeBuffer === `${HOME}/resume.pdf`} onOpen={() => { sound.fileOpen(); openFile(`${HOME}/resume.pdf`, "pdf"); }}>resume.pdf — download ↓</Row>
        <Row active={activeBuffer === `${HOME}/contact.json`} onOpen={() => { sound.fileOpen(); openFile(`${HOME}/contact.json`, "contact"); }}>contact.json</Row>
      </div>
      <div>
        <PaneTitle>stack → evidence</PaneTitle>
        <div className="px-3 space-y-1">
          {[["Python", "ice · timetable · prompt-routing"], ["TypeScript", "presentation-forge · this workstation"], ["Java", "rapidrail · college systems"], ["Rust", "micrograd-from-scratch (learning)"], ["PyTorch", "prompt-routing · micrograd"], ["PostgreSQL + pgvector", "ICE memory stores"]].map(([s, e]) => (
            <div key={s} className="flex gap-3"><span className="w-44 shrink-0" style={{ color: "var(--fg)" }}>{s}</span><span style={{ color: "var(--muted)" }}>↳ {e}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}
