"use client";

import { useState } from "react";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { profile } from "@/content/profile";
import { projects, getProject } from "@/content/projects";
import { papers, experiments, researchTimeline } from "@/content/research";
import { prs } from "@/content/oss";
import { useShell } from "@/lib/store";
import { Assistant } from "@/components/Assistant";

export function WorkspaceView() {
  const { workspace, project, go } = useShell();
  if (workspace === "projects" && project && getProject(project)) return <ProjectDetail slug={project} />;
  switch (workspace) {
    case "home": return <Home />;
    case "projects": return <Projects onOpen={(s) => go("projects", s)} />;
    case "research": return <Research />;
    case "oss": return <Oss />;
    case "about": return <About />;
    case "notes": return <Notes />;
    case "contact": return <Contact />;
    case "ai": return <AiView />;
    default: return <Home />;
  }
}

/* ── home: lazyvim-dashboard spirit ── */
function Home() {
  const { go } = useShell();
  const acts: [string, string, Parameters<typeof go>[0]][] = [
    ["f", "find file", "projects"], ["p", "projects", "projects"], ["r", "research", "research"],
    ["o", "open source", "oss"], ["n", "notes", "notes"], ["a", "about", "about"],
    ["c", "ai / chat", "ai"], ["g", "github →", "oss"], ["?", "help", "home"],
  ];
  return (
    <div className="wallpaper stars relative h-full overflow-y-auto rounded-[10px]">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <pre className="text-[13px] sm:text-[15px] leading-[1.35] font-bold select-none" style={{ color: "var(--accent-soft)" }} aria-hidden>
{` █▀▄ █▀▀ █▀▀ █▀█ █▄ █ ▄▀█ █▀█
 █▄▀ ██▄ ██▄ █▀█ █ ▀█ █▀█ █▀▄`}
        </pre>
        <div className="mt-1 text-[12.5px]" style={{ color: "var(--muted)" }}>{profile.tagline}</div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {acts.map(([k, label, w]) => (
            <button key={k} onClick={() => (k === "g" ? window.open(profile.links.github, "_blank") : k === "?" ? useShell.getState().toggle("helpOpen") : go(w))} className="pane anim-pane flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer hover:scale-[1.015]">
              <kbd className="px-1.5 py-0.5 rounded text-[11.5px] font-bold" style={{ background: "var(--sel-bg)", color: "var(--accent)" }}>{k}</kbd>
              <span className="text-[12.5px]" style={{ color: "var(--fg-dim)" }}>{label}</span>
            </button>
          ))}
        </div>
        <div className="mt-6 grid sm:grid-cols-2 gap-1.5 text-[12.5px]">
          <div className="pane p-3">
            <div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>recent</div>
            {projects.filter((p) => p.flagship).slice(0, 4).map((p) => (
              <button key={p.slug} onClick={() => go("projects", p.slug)} className="block w-full text-left py-0.5 cursor-pointer hover:text-[var(--accent-soft)]" style={{ color: "var(--fg-dim)" }}>
                <span style={{ color: "var(--icy)" }}>▸</span> {p.slug} <span style={{ color: "var(--muted)" }}>— {p.status}</span>
              </button>
            ))}
          </div>
          <div className="pane p-3">
            <div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>system</div>
            <div style={{ color: "var(--fg-dim)" }}>⎇ main · {profile.status.editor} · {profile.status.os.toLowerCase()}</div>
            <div style={{ color: "var(--fg-dim)" }}>papers 2 · experiments 3 · PRs {prs.filter((p) => p.state === "merged").length} merged</div>
            <div style={{ color: "var(--fg-dim)" }}>repos 34 · flagship {projects.filter((p) => p.flagship).length}</div>
            <div style={{ color: "var(--muted)" }}>{profile.status.availability}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── projects: directories, not cards ── */
function Projects({ onOpen }: { onOpen: (slug: string) => void }) {
  const flag = projects.filter((p) => p.flagship);
  const arch = projects.filter((p) => !p.flagship);
  const Row = ({ slug, name, blurb, path, stars }: { slug: string; name: string; blurb: string; path: string; stars: string }) => (
    <button onClick={() => onOpen(slug)} className="pane anim-pane w-full text-left px-3.5 py-2.5 cursor-pointer hover:scale-[1.005] group">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold group-hover:text-[var(--accent-soft)]" style={{ color: "var(--fg)" }}>{path}/</span>
        {stars !== "—" && <span className="text-[11px] shrink-0" style={{ color: "var(--muted)" }}>★ {stars}</span>}
      </div>
      <div className="text-[12.5px] mt-0.5" style={{ color: "var(--fg-dim)" }}>{name} — {blurb}</div>
    </button>
  );
  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>~/projects — flagships</div>
      <div className="space-y-1.5">{flag.map((p) => <Row key={p.slug} {...p} />)}</div>
      <div className="text-[11px] uppercase tracking-wider mt-4 mb-2" style={{ color: "var(--muted)" }}>~/projects/archive + team lanes</div>
      <div className="space-y-1.5">{arch.map((p) => <Row key={p.slug} {...p} />)}</div>
    </div>
  );
}

function ProjectDetail({ slug }: { slug: string }) {
  const p = getProject(slug)!;
  const { go } = useShell();
  return (
    <div className="h-full overflow-y-auto pr-1">
      <button onClick={() => go("projects")} className="flex items-center gap-1 text-[12px] mb-2 cursor-pointer hover:text-[var(--accent-soft)]" style={{ color: "var(--muted)" }}>
        <ArrowLeft size={13} /> ~/projects
      </button>
      <div className="text-[12px]" style={{ color: "var(--muted)" }}>{p.path}/README.md</div>
      <h2 className="text-[19px] font-bold mt-0.5" style={{ color: "var(--fg)" }}>{p.name}</h2>
      <div className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>{p.period} · {p.status}</div>
      <p className="font-body text-[14px] leading-relaxed mt-3 max-w-2xl" style={{ color: "var(--fg-dim)" }}>{p.blurb}</p>
      {p.motivation && (
        <div className="mt-3 pl-3 border-l-2 max-w-2xl font-body text-[13.5px] italic" style={{ borderColor: "var(--warm)", color: "var(--fg-dim)" }}>{p.motivation}</div>
      )}
      <div className="text-[11px] uppercase tracking-wider mt-5 mb-1.5" style={{ color: "var(--muted)" }}>evidence</div>
      <ul className="space-y-1 max-w-2xl">
        {p.evidence.map((e, i) => (
          <li key={i} className="font-body text-[13.5px] leading-relaxed flex gap-2" style={{ color: "var(--fg-dim)" }}>
            <span style={{ color: "var(--icy)" }}>▸</span>{e}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-1.5 mt-4">
        {p.stack.map((s) => (
          <span key={s} className="px-2 py-0.5 rounded text-[11.5px] border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>{s}</span>
        ))}
      </div>
      <div className="flex gap-3 mt-3 text-[12.5px]">
        <a href={p.links.github} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-[var(--accent-soft)]" style={{ color: "var(--icy)" }}>source <ExternalLink size={12} /></a>
        {p.links.arxiv && <a href={p.links.arxiv} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-[var(--accent-soft)]" style={{ color: "var(--icy)" }}>paper <ExternalLink size={12} /></a>}
      </div>
    </div>
  );
}

/* ── research: lab notebook ── */
function Research() {
  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>~/research/papers</div>
      {papers.map((p) => (
        <div key={p.id ?? p.title} className="pane px-3.5 py-2.5 mb-1.5">
          <a href={p.url} target="_blank" rel="noopener" className="text-[13px] font-bold hover:text-[var(--accent-soft)] flex items-center gap-1.5" style={{ color: "var(--fg)" }}>
            {p.title} <ExternalLink size={12} style={{ color: "var(--muted)" }} />
          </a>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>{p.venue}{p.id ? ` · arXiv:${p.id}` : ""}</div>
          <p className="font-body text-[13px] mt-1.5 max-w-2xl" style={{ color: "var(--fg-dim)" }}>{p.note}</p>
        </div>
      ))}
      <div className="text-[11px] uppercase tracking-wider mt-4 mb-2" style={{ color: "var(--muted)" }}>~/research/experiments</div>
      {experiments.map((e) => (
        <div key={e.slug} className="pane px-3.5 py-2.5 mb-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-bold" style={{ color: "var(--fg)" }}>{e.name}</span>
            <span className="text-[11px] shrink-0" style={{ color: "var(--muted)" }}>{e.date}</span>
          </div>
          <div className="font-body text-[13px] mt-1" style={{ color: "var(--muted)" }}>H: {e.hypothesis}</div>
          <div className="font-body text-[13px]" style={{ color: "var(--muted)" }}>setup: {e.setup}</div>
          {e.metrics ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {e.metrics.map((m) => (
                <span key={m.label} className="px-2 py-0.5 rounded text-[12px] font-bold" style={{ background: "var(--sel-bg)", color: "var(--accent-soft)" }}>{m.label}: {m.value}</span>
              ))}
            </div>
          ) : (
            <div className="text-[12px] mt-1.5" style={{ color: "var(--muted)" }}>metrics: qualitative — no invented numbers</div>
          )}
          <div className="font-body text-[13px] mt-1.5" style={{ color: "var(--fg-dim)" }}>→ {e.result}</div>
          <div className="text-[11.5px] mt-1" style={{ color: "var(--muted)" }}>artifact: {e.artifact}</div>
        </div>
      ))}
      <div className="text-[11px] uppercase tracking-wider mt-4 mb-2" style={{ color: "var(--muted)" }}>~/research/timeline.log</div>
      <div className="font-body text-[12.5px] space-y-0.5">
        {researchTimeline.map((t) => (
          <div key={t.date} className="flex gap-3"><span className="shrink-0 w-20" style={{ color: "var(--icy)" }}>{t.date}</span><span style={{ color: "var(--fg-dim)" }}>{t.event}</span></div>
        ))}
      </div>
    </div>
  );
}

/* ── oss: lazygit 3-pane ── */
function Oss() {
  const repos = [...new Set(prs.map((p) => p.repo))];
  const [repo, setRepo] = useState(repos[0]);
  const list = prs.filter((p) => p.repo === repo);
  const [sel, setSel] = useState(list[0]?.url ?? "");
  const cur = prs.find((p) => p.url === sel) ?? list[0];
  return (
    <div>
      <div className="text-[12px] mb-2 font-body" style={{ color: "var(--muted)" }}>I contribute upstream when I run into bugs worth fixing — small compat fixes to longer debugging sessions with tests and CI archaeology.</div>
      <div className="grid md:grid-cols-[1fr_1.4fr_1.4fr] gap-1.5 min-h-0">
        <div className="pane p-1.5 max-h-80 overflow-y-auto">
          <div className="px-1.5 py-1 text-[11px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>repos</div>
          {repos.map((r) => (
            <button key={r} onClick={() => { setRepo(r); const f = prs.filter((p) => p.repo === r); setSel(f[0]?.url ?? ""); }} className="block w-full text-left px-1.5 py-1 rounded text-[12px] cursor-pointer hover:bg-[var(--raised)] truncate" style={r === repo ? { background: "var(--sel-bg)", color: "var(--accent-soft)" } : { color: "var(--fg-dim)" }}>{r}</button>
          ))}
        </div>
        <div className="pane p-1.5 max-h-80 overflow-y-auto">
          <div className="px-1.5 py-1 text-[11px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>prs · {repo}</div>
          {list.map((p) => (
            <button key={p.url} onClick={() => setSel(p.url)} className="block w-full text-left px-1.5 py-1 rounded text-[12px] cursor-pointer hover:bg-[var(--raised)]" style={p.url === sel ? { background: "var(--sel-bg)" } : undefined}>
              <span className="px-1 rounded text-[10.5px] font-bold mr-1.5" style={p.state === "merged" ? { background: "var(--accent)", color: "#0b0c11" } : { border: "1px solid var(--warm)", color: "var(--warm)" }}>{p.state}</span>
              <span style={{ color: "var(--fg-dim)" }}>{p.title}</span>
            </button>
          ))}
        </div>
        <div className="pane p-3 max-h-80 overflow-y-auto">
          <div className="px-1 py-1 text-[11px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>detail</div>
          {cur && (
            <>
              <div className="text-[13px] font-bold" style={{ color: "var(--fg)" }}>{cur.title}</div>
              <div className="text-[12px]" style={{ color: "var(--muted)" }}>{cur.repo} · {cur.state}</div>
              <p className="font-body text-[13px] mt-2" style={{ color: "var(--fg-dim)" }}>{cur.note}</p>
              <a href={cur.url} target="_blank" rel="noopener" className="flex items-center gap-1 text-[12.5px] mt-2 hover:text-[var(--accent-soft)]" style={{ color: "var(--icy)" }}>view on github <ExternalLink size={12} /></a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── about: files + resume ── */
function About() {
  const [tab, setTab] = useState("README.md");
  const tabs = ["README.md", "now.md", "stack.toml", "timeline.log", "resume.md"];
  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="flex flex-wrap gap-1 mb-3" role="tablist" aria-label="about files">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-2.5 py-1 rounded-md text-[12px] border cursor-pointer ${tab === t ? "tab-active" : "border-transparent hover:bg-[var(--raised)]"}`} style={tab === t ? undefined : { color: "var(--muted)" }}>{t}</button>
        ))}
      </div>
      {tab === "README.md" && <div className="font-body text-[14px] leading-relaxed max-w-2xl space-y-2" style={{ color: "var(--fg-dim)" }}>{profile.aboutLong.map((p, i) => <p key={i}>{p}</p>)}<p style={{ color: "var(--muted)" }}>{profile.education.degree}, {profile.education.school} — expected {profile.education.expected} · CGPA {profile.education.cgpa}</p></div>}
      {tab === "now.md" && <div className="font-body text-[14px] leading-relaxed max-w-2xl" style={{ color: "var(--fg-dim)" }}>now: ICE follow-up evaluation · LSREP on arXiv (2609.16730) · monitoring open PRs (MNE #14287, graphiti #1772) · internship hunt for the December 2026 window · Fall 2028 master&apos;s prep.</div>}
      {tab === "stack.toml" && <pre className="text-[12.5px] leading-relaxed">{"[stack]\n"}{profile.stack.map((s) => `tool = "${s}"\n`).join("")}<span style={{ color: "var(--muted)" }}>{"# learning = \"Rust\"\n# runs_on = \"Arch, self-hosted tooling, local models\""}</span></pre>}
      {tab === "timeline.log" && <div className="font-body text-[13px] space-y-1">{researchTimeline.map((t) => <div key={t.date} className="flex gap-3"><span className="shrink-0 w-20" style={{ color: "var(--icy)" }}>{t.date}</span><span style={{ color: "var(--fg-dim)" }}>{t.event}</span></div>)}</div>}
      {tab === "resume.md" && (
        <div className="max-w-2xl font-body text-[13.5px] leading-relaxed" style={{ color: "var(--fg-dim)" }}>
          <div className="text-[16px] font-bold" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>DEEPESH SONAR</div>
          <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>Mumbai, India · 18deepnar@gmail.com · github.com/Deepnar · linkedin.com/in/deepeshsonar · orcid.org/0009-0008-1762-4246</div>
          <div className="mt-3 font-bold text-[13px]" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>EDUCATION</div>
          <div>{profile.education.degree} — {profile.education.school} (expected {profile.education.expected}) · CGPA {profile.education.cgpa}</div>
          <div className="mt-3 font-bold text-[13px]" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>PROJECTS</div>
          {projects.filter((p) => p.flagship).map((p) => <div key={p.slug} className="mt-1.5"><span style={{ color: "var(--accent-soft)" }}>{p.name}</span> <span style={{ color: "var(--muted)" }}>({p.period})</span><div>{p.blurb}</div></div>)}
          <div className="mt-3 font-bold text-[13px]" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>OPEN SOURCE (merged)</div>
          {prs.filter((p) => p.state === "merged").map((p) => <div key={p.url} className="mt-1"><span style={{ color: "var(--accent-soft)" }}>{p.repo}</span> — {p.title}</div>)}
          <div className="mt-3 font-bold text-[13px]" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>TEAM</div>
          <div>SIH 2025 (×2 rounds) · DIPEX 2026 (state final) · NEXUS · RapidRail · IIS-mini — lanes labeled in ~/projects.</div>
        </div>
      )}
    </div>
  );
}

function Notes() {
  return (
    <div className="h-full overflow-y-auto pr-1 max-w-2xl">
      <div className="text-[12px] mb-2" style={{ color: "var(--muted)" }}>~/notes/lab-notes.md</div>
      <div className="font-body text-[14px] leading-relaxed space-y-2" style={{ color: "var(--fg-dim)" }}>
        <p><span style={{ color: "var(--accent-soft)" }}>rule #1.</span> separate “didn&apos;t work” from “wasn&apos;t actually tested.” a mechanism that never ran, never fired, or never reached the output tells you nothing about itself.</p>
        <p><span style={{ color: "var(--accent-soft)" }}>rule #2.</span> prefer precise results to impressive ones. if it matches baseline, loses, or only works under conditions — the write-up says exactly that.</p>
        <p><span style={{ color: "var(--accent-soft)" }}>rule #3.</span> care about the whole system. data path, API, eval harness, deployment, cost, failure modes — the model is one piece.</p>
        <p><span style={{ color: "var(--accent-soft)" }}>rule #4.</span> document heavily. architecture notes, threat models, eval traces — that&apos;s where misunderstandings surface.</p>
      </div>
    </div>
  );
}

function Contact() {
  const rows: [string, string][] = [
    ["github", profile.links.github], ["linkedin", profile.links.linkedin],
    ["email", "mailto:18deepnar@gmail.com"], ["x", profile.links.x], ["orcid", profile.links.orcid],
  ];
  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="text-[12px] mb-2" style={{ color: "var(--muted)" }}>~/contact.json</div>
      <pre className="pane p-3.5 text-[12.5px] leading-relaxed max-w-xl overflow-x-auto">{"{"}{"\n"}{rows.map(([k, v]) => `  "${k}": "${v}",\n`).join("")}{"}"}</pre>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {rows.map(([k, v]) => (
          <a key={k} href={v} target={v.startsWith("mailto") ? undefined : "_blank"} rel="noopener" className="pane anim-pane px-3 py-1.5 text-[12.5px] cursor-pointer hover:scale-[1.03] flex items-center gap-1.5" style={{ color: "var(--fg-dim)" }}>{k} <ExternalLink size={11} style={{ color: "var(--muted)" }} /></a>
        ))}
      </div>
    </div>
  );
}

function AiView() {
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="text-[12px] mb-2 font-body" style={{ color: "var(--muted)" }}>session — deterministic local assistant. indexed portfolio only; unknown questions get “not indexed”, never invented.</div>
      <div className="pane p-3 flex-1 min-h-0"><Assistant full /></div>
    </div>
  );
}
