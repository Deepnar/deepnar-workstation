// VFS — one virtual filesystem. Explorer, terminal, finder, buffers,
// assistant context and navigation ALL read these nodes.
// Bodies are curated public content assembled from src/content/* (verified).
import { profile } from "@/content/profile";
import { projects, type Project } from "@/content/projects";
import { paper, researchEval } from "@/content/research";
import { prs } from "@/content/oss";

export type VKind =
  | "dir" | "markdown" | "json" | "log" | "code"
  | "table" | "pdf" | "contact" | "calendar";

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

export const HOME = "/home/deepnar";

const md = (path: string, name: string, title: string, body: string[], extra?: Partial<VNode>): VNode => ({
  path, name, kind: "markdown", title, body, ...extra,
});
const dir = (path: string, name: string, children: VNode[], extra?: Partial<VNode>): VNode => ({
  path, name, kind: "dir", children, ...extra,
});

const actions = (p: Pick<Project, "links" | "upstream" | "repo">): Record<string, string> => ({
  github: p.links.github,
  ...(p.links.arxiv ? { arxiv: p.links.arxiv } : {}),
  ...(p.upstream ? { upstream: `https://github.com/${p.upstream}` } : {}),
});

function projectReadme(p: Project, base: string): VNode {
  const pre = `${base}/${p.slug}`;
  const roleLine = p.kind === "team" ? `team project · ${p.status}` : p.status;
  const body = [
    `# ${p.name}`, ``, roleLine, ``, p.blurb, ``,
    ...(p.lane ? [`## my role`, ...p.lane.map((r) => `· ${r}`), ``] : []),
    ...(p.evidence.length ? [`## evidence`, ...p.evidence.map((e) => `· ${e}`), ``] : []),
    ...(p.motivation ? [`## why`, p.motivation, ``] : []),
    `## stack`, p.stack.join(" · "),
  ];
  return md(`${pre}/README.md`, "README.md", p.name, body, {
    searchTerms: `${p.slug} ${p.name} ${p.repo} ${p.stack.join(" ")}`,
    meta: { repo: p.repo, ...actions(p) },
  });
}

function soloDir(p: Project, base: string, details: VNode[]): VNode {
  const pre = `${base}/${p.slug}`;
  return dir(pre, p.slug, [projectReadme(p, base), ...(details.length ? [dir(`${pre}/details`, "details", details)] : [])]);
}

const iceDetails: VNode[] = [
  md(`${HOME}/projects/ice/details/architecture.md`, "architecture.md", "ice architecture", [
    `# architecture`, ``,
    `client ──▶ ICE proxy ──▶ local model (Ollama / SGLang)`, `           │`, `           └── PostgreSQL + pgvector`,
    `               episodic · knowledge graph · procedural · documents`, ``,
    `each turn: synchronous pre-flight, asynchronous post-flight.`, ``,
    `pre-flight: Qwen3-Embedding-0.6B (frozen) → 27 all-sigmoid logits`, `  (11 topic · 12 intent · 4 context-reliance) → calibrated routing`, `  decides whether long-term retrieval fires at all.`, ``,
    `retrieval: lexical · vector · graph · procedural · document · timeline`, `  → rank fusion → dedup → bounded token budgets.`,
  ]),
  md(`${HOME}/projects/ice/details/evaluation.log`, "evaluation.log", "ice v2 evaluation", [
    `run  controlled-eval      frozen v2 snapshot`, `     turns           1,985`, `     probes            219`,
    `     observations    1,211`, `     checkpoints        52`, ``,
    `run  density-stress       memory-pressure behavior`, `run  fidelity-audit     which mechanisms reached the output`, ``,
    `note candid failure cases included — settings where ICE trails pure vector-RAG.`,
    `note untested mechanisms reported as untested, not failed.`,
  ], { searchTerms: "ice evaluation metrics turns probes" }),
];

const pfDetails: VNode[] = [
  md(`${HOME}/projects/presentation-forge/details/architecture.md`, "architecture.md", "forge pipeline", [
    `# pipeline`, ``, `sources ──▶ research ──▶ human approval ──▶ schema validation`,
    `  ──▶ deterministic render ──▶ critique ──▶ PPTX / DOCX / report`, ``,
    `74 slide types · 34 themes · Docker-first · BYOK or Ollama.`,
  ]),
];

const ttDetails: VNode[] = [
  md(`${HOME}/projects/timetable-generator/details/constraints.md`, "constraints.md", "constraint model", [
    `# constraints`, ``, `hard: rooms · faculty · groups · shared resources (solver must satisfy)`,
    `soft (weighted): preferences scored, ranked candidates`, ``,
    `solvers: greedy + OR-Tools CP-SAT · audit + publish workflow.`,
  ]),
];

const prcDetails: VNode[] = [
  md(`${HOME}/projects/prompt-routing-classifier/details/evaluation.log`, "evaluation.log", "classifier eval", [
    `corpus  5,100 prompts · documented dataset + training path`, `model   sentence embeddings + one-vs-rest logistic regression`, ``,
    `     topic F1    0.68`, `     intent F1   0.56`, ``,
    `note CPU-only inference. routing design reused as ICE pre-flight basis.`,
  ], { searchTerms: "prompt routing classifier eval f1" }),
];

function teamNode(p: Project, base: string): VNode {
  const pre = `${base}/${p.slug}`;
  return dir(pre, p.slug, [projectReadme(p, base)]);
}

function practiceNode(p: Project, base: string): VNode {
  const pre = `${base}/${p.slug}`;
  return dir(pre, p.slug, [md(`${pre}/README.md`, "README.md", p.name, [
    `# ${p.name}`, ``, `${p.repo} · ${p.status}`, ``, p.blurb, ``, `## stack`, p.stack.join(" · "),
  ], { searchTerms: `${p.slug} ${p.name} ${p.stack.join(" ")}`, meta: { repo: p.repo, github: p.links.github } })]);
}

/* ── tree ── */
const solo = (s: string) => projects.find((p) => p.slug === s)!;
const ice = solo("ice"), pf = solo("presentation-forge"), tt = solo("timetable-generator"), prc = solo("prompt-routing-classifier");
const collabs = projects.filter((p) => p.bucket === "collaborations");
const practice = projects.filter((p) => p.bucket === "practice");

const projectsDir: VNode = dir(`${HOME}/projects`, "projects", [
  soloDir(ice, `${HOME}/projects`, iceDetails),
  soloDir(pf, `${HOME}/projects`, pfDetails),
  soloDir(tt, `${HOME}/projects`, ttDetails),
  soloDir(prc, `${HOME}/projects`, prcDetails),
  dir(`${HOME}/projects/collaborations`, "collaborations", collabs.map((p) => teamNode(p, `${HOME}/projects/collaborations`))),
  dir(`${HOME}/projects/practice`, "practice", practice.map((p) => practiceNode(p, `${HOME}/projects/practice`))),
]);

const researchDir: VNode = dir(`${HOME}/research`, "research", [
  dir(`${HOME}/research/lsrep-ice`, "lsrep-ice", [
    md(`${HOME}/research/lsrep-ice/README.md`, "README.md", paper.title, [
      `# LSREP + ICE`, ``, `${paper.venue} · arXiv:${paper.id}`, ``, paper.note, ``,
      `## one work, two halves`, paper.relationship,
    ], { searchTerms: "lsrep ice paper research arxiv memory evaluation", meta: { arxiv: paper.url, github: "https://github.com/Deepnar/ice" } }),
    dir(`${HOME}/research/lsrep-ice/details`, "details", [
      md(`${HOME}/research/lsrep-ice/details/evaluation.log`, "evaluation.log", researchEval.name, [
        `run  ${researchEval.slug}`, `date ${researchEval.date}`, ``,
        `H: ${researchEval.hypothesis}`, `setup: ${researchEval.setup}`, ``,
        ...researchEval.metrics.map((m) => `     ${m.label.padEnd(16)} ${m.value}`), ``,
        `→ ${researchEval.result}`, ``, `artifact: ${researchEval.artifact}`,
      ], { searchTerms: "lsrep evaluation metrics turns probes" }),
    ]),
  ]),
]);

const prNode = (repo: string, title: string, url: string, state: string, note: string, n: string): VNode => {
  const id = url.split("/").pop() ?? n;
  return md(`${HOME}/oss/${state}/${repo.split("/")[1].toLowerCase()}-${id}.md`, `${repo.split("/")[1].toLowerCase()}-${id}.md`,
    `${repo} #${id} — ${title}`, [`# ${title}`, ``, `${repo} · ${state}`, ``, note, ``, url],
    { searchTerms: `${repo} ${title} pr ${id}`, meta: { repo, state, github: url } });
};

const ossDir: VNode = dir(`${HOME}/oss`, "oss", [
  md(`${HOME}/oss/repositories.md`, "repositories.md", "tracked repositories",
    [`# repositories`, ``, ...[...new Set(prs.map((p) => p.repo))].map((r) => `· ${r}  (${prs.filter((p) => p.repo === r && p.state === "merged").length} merged · ${prs.filter((p) => p.repo === r && p.state === "open").length} open)`)],
    { searchTerms: "oss repos repositories" }),
  dir(`${HOME}/oss/merged`, "merged", prs.filter((p) => p.state === "merged").map((p, i) => prNode(p.repo, p.title, p.url, "merged", p.note, `m${i}`))),
  dir(`${HOME}/oss/open`, "open", prs.filter((p) => p.state === "open").map((p, i) => prNode(p.repo, p.title, p.url, "open", p.note, `o${i}`))),
  { path: `${HOME}/oss/activity`, name: "activity", kind: "calendar", title: "contribution calendar" },
]);

const aboutDir: VNode = dir(`${HOME}/about`, "about", [
  md(`${HOME}/about/README.md`, "README.md", "about deepesh", [
    `# Deepesh Sonar (deepnar)`, ``, profile.tagline, ``, ...profile.aboutLong, ``,
    `${profile.education.degree}, ${profile.education.school} — expected ${profile.education.expected} · CGPA ${profile.education.cgpa}`,
  ]),
]);

export const ROOT: VNode = dir(HOME, "deepnar", [projectsDir, researchDir, ossDir, aboutDir,
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
    for (const c of ["/projects", "/projects/collaborations", "/projects/practice", "/oss/merged", "/oss/open"]) {
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
