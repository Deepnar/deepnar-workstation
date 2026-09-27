// VFS — one virtual filesystem. Explorer, terminal, finder, buffers,
// assistant context, breadcrumbs and recent files ALL read these nodes.
// Bodies are curated public content assembled from src/content/* (verified).
import { profile } from "@/content/profile";
import { projects, type Project } from "@/content/projects";
import { papers, experiments, researchTimeline } from "@/content/research";
import { prs } from "@/content/oss";

export type VKind =
  | "dir" | "markdown" | "json" | "toml" | "log" | "code"
  | "table" | "link" | "pdf" | "contact" | "resume" | "activity";

export interface VNode {
  path: string;
  name: string;
  kind: VKind;
  title?: string;
  body?: string[];
  meta?: Record<string, string>;
  link?: string;
  children?: VNode[];
  searchTerms?: string;
}

const md = (path: string, name: string, title: string, body: string[], extra?: Partial<VNode>): VNode => ({
  path, name, kind: "markdown", title, body, ...extra,
});
const dir = (path: string, name: string, children: VNode[], extra?: Partial<VNode>): VNode => ({
  path, name, kind: "dir", children, ...extra,
});
const link = (path: string, name: string, title: string, url: string): VNode => ({
  path, name, kind: "link", title, link: url, body: [title, "", url],
});

const ev = (p: Project) => p.evidence.map((e) => `· ${e}`);

function projectNodes(p: Project, base: string): VNode[] {
  const pre = `${base}/${p.slug}`;
  const nodes: VNode[] = [
    md(`${pre}/README.md`, "README.md", p.name, [
      `# ${p.name}`, ``, `${p.period} · ${p.status}`, ``, p.blurb, ``,
      `## evidence`, ...ev(p), ``,
      `## stack`, p.stack.join(" · "), ``, `## source`, p.links.github,
      ...(p.links.arxiv ? [`## paper`, p.links.arxiv] : []),
    ], { searchTerms: `${p.slug} ${p.name} ${p.stack.join(" ")}` }),
  ];
  if (p.motivation) nodes.push(md(`${pre}/why.md`, "why.md", `why ${p.slug} exists`, [`# why`, ``, p.motivation]));
  return nodes;
}

function collabNodes(p: Project, base: string): VNode[] {
  const pre = `${base}/${p.slug}`;
  const role: Record<string, string[]> = {
    nexus: ["transaction fraud head (XGBoost + calibration)", "message-head upgrade (TF-IDF + direction features)", "URL-head debias", "website txn flows + admin AI-provider console", "removed WhatsApp/n8n dependency"],
    civicresolve: ["AI Observation Engine (street-imagery verification, worker, tests, docs)", "security threat model + infrastructure cost model", "pitch at SIH ×2 rounds and DIPEX state final"],
    rapidrail: ["core service: booking, wallet, QR e-tickets, fare engine", "README + docs, secured API keys into local profile", "Razorpay checkout is a test-mode demo (sandbox keys, never live)"],
    "iis-mini": ["Person-1 lane: classical baselines (LogReg + RF, full sweep)", "REPORT_PERSON1.md + outputs"],
  };
  return [
    md(`${pre}/README.md`, "README.md", p.name, [`# ${p.name}`, ``, `team project · ${p.status}`, ``, p.blurb, ``, `## evidence`, ...ev(p), ``, `## source`, p.links.github]),
    md(`${pre}/team.md`, "team.md", "team + my lane", [`# team`, ``, `team project — read lanes, not solo credit.`, ``, `# my lane`, ...(role[p.slug] ?? []).map((r) => `· ${r}`)]),
  ];
}

/* ── tree ── */
const ice = projects.find((p) => p.slug === "ice")!;
const pf = projects.find((p) => p.slug === "presentation-forge")!;
const tt = projects.find((p) => p.slug === "timetable-generator")!;
const labs = ["prompt-routing-classifier", "micrograd-from-scratch", "ml-notebooks"].map((s) => projects.find((p) => p.slug === s)!);
const collabs = ["nexus", "civicresolve", "rapidrail", "iis-mini"].map((s) => projects.find((p) => p.slug === s)!);
const archived = projects.find((p) => p.slug === "ds-practice")!;

export const HOME = "/home/deepnar";

const projectsDir: VNode = dir(`${HOME}/projects`, "projects", [
  dir(`${HOME}/projects/ice`, "ice", [
    ...projectNodes(ice, `${HOME}/projects`),
    md(`${HOME}/projects/ice/architecture.md`, "architecture.md", "ice architecture", [
      `# architecture`, ``,
      `client ──▶ ICE proxy ──▶ local model (Ollama / SGLang)`, `           │`, `           └── PostgreSQL + pgvector`,
      `               episodic · knowledge graph · procedural · documents`, ``,
      `each turn: synchronous pre-flight, asynchronous post-flight.`, ``,
      `pre-flight: Qwen3-Embedding-0.6B (frozen) → 27 all-sigmoid logits`, `  (11 topic · 12 intent · 4 context-reliance) → calibrated routing`, `  decides whether long-term retrieval fires at all.`, ``,
      `retrieval: lexical · vector · graph · procedural · document · timeline`, `  → rank fusion → dedup → bounded token budgets.`,
    ]),
    md(`${HOME}/projects/ice/evaluation.log`, "evaluation.log", "ice v2 evaluation", [
      `run  controlled-eval      frozen v2 snapshot`, `     turns           1,985`, `     probes            219`,
      `     observations    1,211`, `     checkpoints        52`, ``,
      `run  density-stress       memory-pressure behavior`, `run  fidelity-audit     which mechanisms reached the output`, ``,
      `note candid failure cases included — settings where ICE trails pure vector-RAG.`,
      `note untested mechanisms reported as untested, not failed.`,
    ], { searchTerms: "ice evaluation metrics turns probes" }),
    link(`${HOME}/projects/ice/paper.link`, "paper.link", "LSREP paper (arXiv 2609.16730)", papers[0].url),
    link(`${HOME}/projects/ice/source.link`, "source.link", "ice source", ice.links.github),
  ]),
  dir(`${HOME}/projects/presentation-forge`, "presentation-forge", [
    ...projectNodes(pf, `${HOME}/projects`),
    md(`${HOME}/projects/presentation-forge/architecture.md`, "architecture.md", "forge pipeline", [
      `# pipeline`, ``, `sources ──▶ research ──▶ human approval ──▶ schema validation`,
      `  ──▶ deterministic render ──▶ critique ──▶ PPTX / DOCX / report`, ``,
      `74 slide types · 34 themes · Docker-first · BYOK or Ollama.`,
    ]),
    link(`${HOME}/projects/presentation-forge/source.link`, "source.link", "forge source", pf.links.github),
  ]),
  dir(`${HOME}/projects/timetable-generator`, "timetable-generator", [
    ...projectNodes(tt, `${HOME}/projects`),
    md(`${HOME}/projects/timetable-generator/constraints.md`, "constraints.md", "constraint model", [
      `# constraints`, ``, `hard: rooms · faculty · groups · shared resources (solver must satisfy)`,
      `soft (weighted): preferences scored, ranked candidates`, ``,
      `solvers: greedy + OR-Tools CP-SAT · audit + publish workflow.`,
    ]),
    link(`${HOME}/projects/timetable-generator/source.link`, "source.link", "timetable source", tt.links.github),
  ]),
  dir(`${HOME}/projects/labs`, "labs", labs.map((p) => dir(`${HOME}/projects/labs/${p.slug}`, p.slug, projectNodes(p, `${HOME}/projects/labs`)))),
  dir(`${HOME}/projects/collaborations`, "collaborations", collabs.map((p) => dir(`${HOME}/projects/collaborations/${p.slug}`, p.slug, collabNodes(p, `${HOME}/projects/collaborations`)))),
  dir(`${HOME}/projects/archive`, "archive", [dir(`${HOME}/projects/archive/ds-practice`, "ds-practice", projectNodes(archived, `${HOME}/projects/archive`))]),
]);

const researchDir: VNode = dir(`${HOME}/research`, "research", [
  md(`${HOME}/research/README.md`, "README.md", "research index", [
    `# research`, ``, `memory as evolving state, evaluated honestly.`, ``,
    `papers/ — LSREP + ICE v2 manuscript`, `experiments/ — runs with real numbers only`, `timeline.log — curated technical log`,
  ]),
  dir(`${HOME}/research/papers`, "papers", papers.map((p, i) => md(`${HOME}/research/papers/${i === 0 ? "lsrep" : "ice-v2"}.md`, `${i === 0 ? "lsrep" : "ice-v2"}.md`, p.title, [`# ${p.title}`, ``, `${p.venue}${p.id ? ` · arXiv:${p.id}` : ""}`, ``, p.note, ``, p.url]))),
  dir(`${HOME}/research/experiments`, "experiments", experiments.map((e) => ({
    path: `${HOME}/research/experiments/${e.slug}.log`, name: `${e.slug}.log`, kind: "log" as VKind, title: e.name,
    body: [`run  ${e.slug}`, `date ${e.date}`, ``, `H: ${e.hypothesis}`, `setup: ${e.setup}`, ``,
      ...(e.metrics ? e.metrics.map((m) => `     ${m.label.padEnd(14)} ${m.value}`) : [`     (qualitative — no invented numbers)`]), ``,
      `→ ${e.result}`, ``, `artifact: ${e.artifact}`],
    searchTerms: `${e.slug} ${e.name} metrics`,
  }))),
  { path: `${HOME}/research/timeline.log`, name: "timeline.log", kind: "log", title: "research timeline",
    body: researchTimeline.map((t) => `${t.date.padEnd(10)} ${t.event}`) },
]);

const prNode = (repo: string, title: string, url: string, state: string, note: string, n: string): VNode => {
  const id = url.split("/").pop() ?? n;
  return md(`${HOME}/oss/${state}/${repo.split("/")[1].toLowerCase()}-${id}.md`, `${repo.split("/")[1].toLowerCase()}-${id}.md`,
    `${repo} #${id} — ${title}`, [`# ${title}`, ``, `${repo} · ${state}`, ``, note, ``, url],
    { searchTerms: `${repo} ${title} pr ${id}`, meta: { repo, state, url } });
};

const ossDir: VNode = dir(`${HOME}/oss`, "oss", [
  md(`${HOME}/oss/repositories.md`, "repositories.md", "tracked repositories",
    [`# repositories`, ``, ...[...new Set(prs.map((p) => p.repo))].map((r) => `· ${r}  (${prs.filter((p) => p.repo === r && p.state === "merged").length} merged · ${prs.filter((p) => p.repo === r && p.state === "open").length} open)`)],
    { searchTerms: "oss repos repositories" }),
  dir(`${HOME}/oss/merged`, "merged", prs.filter((p) => p.state === "merged").map((p, i) => prNode(p.repo, p.title, p.url, "merged", p.note, `m${i}`))),
  dir(`${HOME}/oss/open`, "open", prs.filter((p) => p.state === "open").map((p, i) => prNode(p.repo, p.title, p.url, "open", p.note, `o${i}`))),
  { path: `${HOME}/oss/activity.log`, name: "activity.log", kind: "activity", title: "github activity" },
]);

const aboutDir: VNode = dir(`${HOME}/about`, "about", [
  md(`${HOME}/about/README.md`, "README.md", "about deepesh", [
    `# Deepesh Sonar (deepnar)`, ``, profile.tagline, ``, ...profile.aboutLong, ``,
    `${profile.education.degree}, ${profile.education.school} — expected ${profile.education.expected} · CGPA ${profile.education.cgpa}`,
  ]),
  md(`${HOME}/about/now.md`, "now.md", "now", [`# now`, ``, `building      ICE follow-up evaluation`, `exploring     systems · Rust`, `contributing  open source upstream`, ``, `arXiv: LSREP (2609.16730) · ICE v2 manuscript in revision.`]),
  { path: `${HOME}/about/stack.toml`, name: "stack.toml", kind: "toml", title: "stack", body: [
    `[identity]`, `handle = "deepnar"`, ``, `[environment]`, `os = "Arch (CachyOS)"`, `editor = "Neovim (LazyVim)"`,
    `shell = "zsh + starship"`, `terminal = "Ghostty"`, ``, `[work]`, `languages = ["Python", "TypeScript", "Java"]`,
    `learning = ["Rust"]`, ``, `[systems]`, `tools = ["Docker", "PostgreSQL + pgvector", "Ollama", "OR-Tools"]`,
    ...profile.stack.map((s) => `# used-in: see evidence below`),
  ], searchTerms: "stack tools languages" },
  { path: `${HOME}/about/timeline.log`, name: "timeline.log", kind: "log", title: "timeline",
    body: [`2026-01  TRAINEE  CyberPeace Foundation (security awareness, OSINT)`, `2026-03  BUILD    prompt-routing-classifier · timetable-generator begins`,
      `2026-06  INIT     ICE — local-first conversational memory`, `2026-08  RELEASE  Presentation Forge · ModelDock #221/#222 + semantic-router #3288 merged`,
      `2026-09  PAPER    LSREP (arXiv 2609.16730)`, `2026-09  MERGE    MNE-Python #14283`] },
]);

export const ROOT: VNode = dir(HOME, "deepnar", [projectsDir, researchDir, ossDir, aboutDir,
  md(`${HOME}/resume.md`, "resume.md", "resume", [
    `# Deepesh Sonar`, `Mumbai, India · 18deepnar@gmail.com`, `github.com/Deepnar · linkedin.com/in/deepeshsonar · orcid.org/0009-0008-1762-4246`, ``,
    `## education`, `B.E. Computer Engineering, TCET Mumbai (expected 2028) · CGPA 9.53/10`, ``, `## flagships`,
    ...projects.filter((p) => p.flagship).map((p) => `· ${p.name} (${p.period}) — ${p.blurb}`), ``, `## merged upstream`,
    ...prs.filter((p) => p.state === "merged").map((p) => `· ${p.repo} — ${p.title}`), ``, `## team`,
    `SIH 2025 (×2 rounds) · DIPEX 2026 (state final) · NEXUS · RapidRail · IIS-mini — lanes in ~/projects/collaborations.`,
  ], { searchTerms: "resume cv" }),
  { path: `${HOME}/resume.pdf`, name: "resume.pdf", kind: "pdf", title: "resume (PDF)", link: "/resume/Deepesh_Sonar_CV.pdf", body: ["resume.pdf — sanitized public CV.", "open to view · download to save."] },
  { path: `${HOME}/contact.json`, name: "contact.json", kind: "contact", title: "contact",
    body: [`{`, `  "github": "${profile.links.github}",`, `  "linkedin": "${profile.links.linkedin}",`,
      `  "email": "18deepnar@gmail.com",`, `  "x": "${profile.links.x}",`, `  "orcid": "${profile.links.orcid}"`, `}`] },
]);

/* ── ops ── */
export function findNode(path: string, root: VNode = ROOT): VNode | null {
  if (root.path === path) return root;
  for (const c of root.children ?? []) {
    const hit = findNode(path, c);
    if (hit) return hit;
  }
  return null;
}

export function resolvePath(cwd: string, arg?: string): string {
  if (!arg || arg === "~") return HOME;
  if (arg === ".") return cwd;
  if (arg === "..") {
    if (cwd === HOME) return HOME;
    const i = cwd.lastIndexOf("/");
    return i <= 0 ? HOME : cwd.slice(0, i);
  }
  let p = arg.startsWith("~/") ? HOME + arg.slice(1) : arg.startsWith("/") ? arg : cwd === HOME ? `${HOME}/${arg}` : `${cwd}/${arg}`;
  p = p.replace(/\/$/, "");
  // tolerate short names: ice → projects/ice
  if (!findNode(p)) {
    for (const c of ["/projects", "/projects/labs", "/projects/collaborations", "/projects/archive", "/oss/merged", "/oss/open"]) {
      const cand = `${HOME}${c}/${arg}`;
      if (findNode(cand)) return cand;
    }
  }
  return p;
}

export function listDir(path: string): VNode[] {
  return findNode(path)?.children ?? [];
}

export function flatten(root: VNode = ROOT, acc: VNode[] = []): VNode[] {
  acc.push(root);
  for (const c of root.children ?? []) flatten(c, acc);
  return acc;
}

export function searchVfs(q: string): VNode[] {
  const needle = q.toLowerCase();
  if (!needle) return [];
  return flatten().filter((n) =>
    n.path !== HOME &&
    (n.name.toLowerCase().includes(needle) || (n.title ?? "").toLowerCase().includes(needle) || (n.searchTerms ?? "").toLowerCase().includes(needle) ||
      (n.body ?? []).join("\n").toLowerCase().includes(needle)),
  ).slice(0, 30);
}

export const shortPath = (p: string) => p.replace(HOME, "~");
