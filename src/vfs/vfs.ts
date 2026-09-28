// VFS — one virtual filesystem. Explorer, terminal, finder, buffers,
// assistant context and navigation ALL read these nodes.
// Bodies are curated public content assembled from src/content/* (verified).
import { profile } from "@/content/profile";
import { aboutReadme, notableBody } from "@/content/about";
import { dirOf, projects, type Project } from "@/content/projects";
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

/* links are actions/metadata — never fake files, never dead buttons */
const actions = (p: Pick<Project, "links" | "upstream" | "repo">): Record<string, string> => {
  const out: Record<string, string> = { repo: p.repo };
  if (p.links.github) out.github = p.links.github;
  else out.private = "private source";
  if (p.links.demo) out.demo = p.links.demo;
  if (p.links.arxiv) out.arxiv = p.links.arxiv;
  if (p.links.doi) out.doi = p.links.doi;
  if (p.upstream) out.upstream = `https://github.com/${p.upstream}`;
  return out;
};

function projectReadme(p: Project): VNode {
  const base = dirOf(p);
  const roleLine =
    p.kind === "team" ? `team project · ${p.status}` : p.status;
  const body = [
    `# ${p.name}`, ``, roleLine, ``, p.blurb, ``,
    ...(p.lane ? [`## my contribution`, ...p.lane.map((r) => `· ${r}`), ``] : []),
    ...(p.evidence.length ? [`## evidence`, ...p.evidence.map((e) => `· ${e}`), ``] : []),
    ...(p.motivation ? [`## why`, p.motivation, ``] : []),
    ...(p.visibility === "private" ? [`private source — described here, no public repo button.`, ``] : []),
    `## stack`, p.stack.join(" · "),
  ];
  return md(`${base}/README.md`, "README.md", p.name, body, {
    searchTerms: `${p.slug} ${p.name} ${p.repo} ${p.stack.join(" ")}`,
    meta: actions(p),
  });
}

function projectDir(p: Project, details: VNode[] = []): VNode {
  const base = dirOf(p);
  // practice entries are one README only — breadth, not fake products
  return dir(base, p.slug, [projectReadme(p), ...(details.length ? [dir(`${base}/details`, "details", details)] : [])]);
}

const iceDetails: VNode[] = [
  md(`${HOME}/projects/ice/details/architecture.md`, "architecture.md", "ice architecture", [
    `# architecture`, ``,
    `client ──▶ ICE proxy / service layer ──▶ OpenAI-compatible local model`, ``,
    `pre-flight: prompt classifier → context-reliance decision → retrieval gate`, ``,
    `hybrid retrieval: lexical · vector · temporal · knowledge graph · procedural · documents`, ``,
    `  → fusion → dedup → diversification → token budget`, ``,
    `prompt assembly → model`, ``,
    `post-flight: density decision → summarisation → pattern mining → graph extraction`, ``,
    `  → maintenance: decay · clustering · reflection · compaction`, ``,
    `PostgreSQL + pgvector: episodic · temporally versioned graph · procedural · documents · slots · ledger`, ``,
    `The boundary that matters: retrieval ELIGIBILITY first (should memory fire at all?),`,
    `retrieval RANKING only when that decision is positive.`, ``,
    `The graph is temporal, not overwrite-only: superseded facts keep valid_from / valid_until history.`, ``,
    `One service layer serves both the HTTP proxy and the MCP surface.`,
  ], { searchTerms: "ice architecture proxy pre-flight post-flight retrieval graph" }),
  md(`${HOME}/projects/ice/details/evaluation.log`, "evaluation.log", "ice v2 evaluation", [
    `run  controlled-eval      frozen v2 snapshot (v2-paper-eval tag, NOT main)`, `     turns           1,985`, `     probes            219`,
    `     observations    1,211`, `     checkpoints        52`, ``,
    `run  density-stress       memory-pressure behavior`, `run  fidelity-audit     which mechanisms reached the output`, ``,
    `note candid failure cases included — settings where ICE trails pure vector-RAG.`,
    `note untested mechanisms reported as untested, not failed.`,
  ], { searchTerms: "ice evaluation metrics turns probes" }),
];

const pfDetails: VNode[] = [
  md(`${HOME}/projects/presentation-forge/details/architecture.md`, "architecture.md", "forge architecture", [
    `# architecture`, ``,
    `web app / CLI ──▶ briefing + project state`, `  ├─ research adapters: SearXNG · arXiv · Crossref · uploads`, `  ▼`,
    `outline / plan ──▶ HUMAN GATE ──▶ schema-constrained content`, `  ├─ semantic slide vocabulary · theme YAML · locked chrome`, `  ▼`,
    `deterministic renderer ──▶ PPTX · DOCX · report/script`, `  ▼`,
    `raster preview ──▶ geometry checks · draw checks · text-survival · vision critique`, ``,
    `The model decides WHAT a slide is; the renderer decides HOW that type is laid out.`, ``,
    `74 slide types · 34 themes · Docker-first · BYOK or Ollama.`,
  ], { searchTerms: "forge architecture pipeline renderer themes slide types" }),
];

const ttDetails: VNode[] = [
  md(`${HOME}/projects/timetable-generator/details/constraint-engine.md`, "constraint-engine.md", "constraint engine", [
    `# constraint engine`, ``,
    `profile: resources · assignments · parameters · hard constraints · soft constraints`, `  ▼`,
    `Scheduler.run(): load published conflicts → generate N diversified candidates`, `  ├─ GreedySolver (most-constrained-first) · OR-Tools CP-SAT`, `  └─ ConstraintChecker + Scorer`, `  ▼`,
    `TimetableGeneration → TimetableInstance[] → TimetableSlot[]`, ``,
    `Cross-timetable safety is per-resource (faculty / room / group independent sets):`, `a combined tuple would only block identical five-way matches and miss real conflicts.`, ``,
    `Lifecycle: DRAFT → SELECTED → PUBLISHED → ARCHIVED.`,
  ], { searchTerms: "timetable constraint solver greedy ortools cp-sat" }),
];

const prcDetails: VNode[] = [
  md(`${HOME}/projects/prompt-routing-classifier/details/evaluation.log`, "evaluation.log", "classifier eval", [
    `corpus  ~5,100 labelled prompts · documented dataset + training path`, `model   MiniLM sentence embedding (384-d) + one-vs-rest logistic regression`, ``,
    `     topic F1    ~0.68`, `     intent F1   ~0.56`, ``,
    `note CPU-only inference. The cheap pre-flight idea later became central to ICE.`,
    `note Prompts derive from private history and are not published.`,
  ], { searchTerms: "prompt routing classifier eval f1" }),
];

const wsDetails: VNode[] = [
  md(`${HOME}/projects/deepnar-workstation/details/architecture.md`, "architecture.md", "workstation architecture", [
    `# architecture`, ``,
    `system layer: boot · greeter · Waybar · desktop workspaces · app window · pet · audio · settings`, ``,
    `workstation layer: Explorer · Yazi-style browser · preview · buffers · right utility dock · terminal · finder · Agent`, ``,
    `VFS: one source of truth — paths, dirs, files, project content, research artifacts, OSS entries.`, ``,
    `terminal: xterm renderer + safe client-side interpreter; independent session cwd/history/scrollback.`, ``,
    `agent: deterministic intent/entity engine over the VFS/content index; no remote model.`, ``,
    `github sync: authenticated gh at local sync time only; visitors never need a token.`, ``,
    `deploy: static-friendly Next.js, no persistent backend.`,
  ], { searchTerms: "workstation architecture vfs terminal agent system" }),
];

const iisDetails: VNode[] = [
  md(`${HOME}/projects/collaborations/iis-mini/details/person1-results.md`, "person1-results.md", "person-1 results", [
    `# Person-1 results`, ``,
    `Dataset: IBM synthetic credit-card transactions. Primary metric: PR-AUC.`, `Test set locked until model/threshold selection was complete.`, ``,
    `| Model | Strategy | Precision | Recall | F1 | PR-AUC |`,
    `| LogReg | original | 0.875 | 0.143 | 0.246 | 0.169 |`,
    `| LogReg | balanced | 0.007 | 0.837 | 0.014 | 0.206 |`,
    `| RF d10/200 | original | 0.955 | 0.429 | 0.592 | 0.618 |`,
    `| RF, threshold ~0.24 | tuned | 0.784 | 0.592 | 0.674 | 0.618 |`, ``,
    `Threshold tuning changes the operating point, not ranking quality — PR-AUC is unchanged.`,
  ], { searchTerms: "iis person-1 results random forest threshold pr-auc" }),
];

/* ── tree (curated: flagships first, practice on shelves, history in graph) ── */
const bySlug = (s: string) => projects.find((p) => p.slug === s)!;
const ice = bySlug("ice"), pf = bySlug("presentation-forge"), tt = bySlug("timetable-generator"),
  prc = bySlug("prompt-routing-classifier"), ws = bySlug("deepnar-workstation"), ori = bySlug("orien-config");
const collabs = projects.filter((p) => p.bucket === "collaborations");
const practiceBy = (t: "ml" | "software" | "early") => projects.filter((p) => p.bucket === "practice" && p.track === t);

const projectsDir: VNode = dir(`${HOME}/projects`, "projects", [
  projectDir(ice, iceDetails),
  projectDir(pf, pfDetails),
  projectDir(tt, ttDetails),
  projectDir(prc, prcDetails),
  projectDir(ws, wsDetails),
  dir(`${HOME}/projects/systems`, "systems", [projectDir(ori)]),
  dir(`${HOME}/projects/collaborations`, "collaborations", collabs.map((p) => projectDir(p, p.slug === "iis-mini" ? iisDetails : []))),
  dir(`${HOME}/projects/practice`, "practice", [
    dir(`${HOME}/projects/practice/ml`, "ml", practiceBy("ml").map((p) => projectDir(p))),
    dir(`${HOME}/projects/practice/software`, "software", practiceBy("software").map((p) => projectDir(p))),
    dir(`${HOME}/projects/practice/early`, "early", practiceBy("early").map((p) => projectDir(p))),
  ]),
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
]);

const aboutDir: VNode = dir(`${HOME}/about`, "about", [
  md(`${HOME}/about/README.md`, "README.md", "about deepesh", aboutReadme,
    { searchTerms: "about deepesh sonar who background education" }),
  md(`${HOME}/about/notable.md`, "notable.md", "notable — competitions, orgs, credentials", notableBody,
    { searchTerms: "notable achievements competitions SIH DIPEX hackathon certificates experience internship membership" }),
  { path: `${HOME}/about/resume.pdf`, name: "resume.pdf", kind: "pdf", title: "resume (PDF)", link: "/resume/Deepesh_Sonar_Resume.pdf", body: ["resume.pdf — sanitized public CV.", "open to view · download to save."] },
  dir(`${HOME}/about/evidence`, "evidence", [
    { path: `${HOME}/about/evidence/dipex-2026-state-final.pdf`, name: "dipex-2026-state-final.pdf", kind: "pdf", title: "DIPEX 2026 state-final certificate", link: "/evidence/dipex-2026-state-final.pdf", body: ["DIPEX 2026 state-final participation certificate — civeserve working model.", "open to view · download to save."] },
  ]),
]);

export const ROOT: VNode = dir(HOME, "deepnar", [projectsDir, researchDir, ossDir, aboutDir,
  { path: `${HOME}/resume.pdf`, name: "resume.pdf", kind: "pdf", title: "resume (PDF)", link: "/resume/Deepesh_Sonar_Resume.pdf", body: ["resume.pdf — sanitized public CV.", "open to view · download to save."] },
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
  if (!findNode(p)) {
    // tolerate short names anywhere in the tree: ice → projects/ice
    const leaf = p.split("/").pop()!.toLowerCase();
    const hit = flatten().find((n) => n.name.toLowerCase() === leaf || n.path.split("/").pop()!.toLowerCase() === leaf);
    if (hit) return hit.path;
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
