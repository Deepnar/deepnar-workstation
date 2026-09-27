// Deterministic local intent engine — no LLM, no key, no server.
// normalize → entities → score intents (+workspace context) → retrieve → template.
import { profile } from "@/content/profile";
import { projects, getProject } from "@/content/projects";
import { papers, experiments, researchTimeline } from "@/content/research";
import { prs, ossNote } from "@/content/oss";
import type { WorkspaceId } from "@/lib/store";

export interface AssistCtx {
  project: string | null;
  workspace: WorkspaceId;
  lastIntent: string | null;
}

export interface AssistAnswer {
  intent: string;
  steps: string[];
  body: string[];
  suggestions: string[];
}

const STOP = new Set("what,whats,does,doing,did,do,are,is,the,a,an,of,to,for,you,your,me,my,i,how,why,tell,show,give,about,and,or,any,have,has,had,been,there,with,that,this,it,in,on,as,at,by,his,he".split(","));

const ALIASES: Record<string, string> = {
  oss: "oss", opensource: "oss", "open source": "oss", contributions: "oss", prs: "oss", "pull requests": "oss",
  ml: "ml", ai: "ml", llm: "ml", "machine learning": "ml", "artificial intelligence": "ml",
  forge: "presentation-forge", slides: "presentation-forge", pptx: "presentation-forge",
  timetable: "timetable-generator", scheduling: "timetable-generator",
  router: "prompt-routing-classifier", routing: "prompt-routing-classifier", classifier: "prompt-routing-classifier",
  fraud: "nexus", nexus: "nexus", transactions: "nexus",
  rail: "rapidrail", rapidrail: "rapidrail", train: "rapidrail", ticketing: "rapidrail",
  civic: "civicresolve", iis: "iis-mini", resume: "resume", cv: "resume",
  contact: "contact", email: "contact", hire: "contact",
  paper: "research", arxiv: "research", lsrep: "research",
};

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s+\-#/]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

function detectProject(tokens: string[], raw: string, ctx: AssistCtx): string | null {
  const joined = tokens.join(" ");
  for (const [alias, slug] of Object.entries(ALIASES)) {
    if (alias.includes(" ") ? raw.toLowerCase().includes(alias) : tokens.includes(alias)) {
      if (getProject(slug)) return slug;
    }
  }
  for (const p of projects) {
    if (tokens.includes(p.slug) || raw.toLowerCase().includes(p.name.toLowerCase().split(" ")[0])) return p.slug;
  }
  if (/^(this|that|it)\b/.test(raw.toLowerCase()) || /\b(this project|this repo|here)\b/.test(raw.toLowerCase()))
    return ctx.project;
  void joined;
  return ctx.project && tokens.length <= 4 ? ctx.project : ctx.project && /result|why|motivat|tech|stack|built|make/.test(raw.toLowerCase()) ? ctx.project : null;
}

interface Scored {
  intent: string;
  score: number;
}

function scoreIntents(tokens: string[], raw: string): Scored[] {
  const r = raw.toLowerCase();
  const has = (...ws: string[]) => ws.some((w) => tokens.includes(w) || r.includes(w));
  const out: Scored[] = [
    { intent: "PROJECT_MOTIVATION", score: has("why", "motivation", "reason", "built", "build", "make", "purpose") ? 3 : 0 },
    { intent: "PROJECT_TECH", score: has("stack", "tech", "technologies", "using", "built-with", "language", "framework") ? 3 : 0 },
    { intent: "RESEARCH_RESULT", score: has("result", "results", "metric", "metrics", "evaluation", "eval", "f1", "auc") ? 3 : 0 },
    { intent: "PROJECTS", score: has("project", "projects", "work", "built", "portfolio", "best", "top") ? 2 : 0 },
    { intent: "RESEARCH", score: has("research", "paper", "arxiv", "lsrep", "study", "experiment", "ice") && !has("result", "metric") ? 2 : 0 },
    { intent: "OSS", score: has("oss", "opensource", "contribution", "contributions", "prs", "upstream", "merged") ? 3 : 0 },
    { intent: "SKILLS", score: has("skill", "skills", "stack", "use", "know", "ml") && has("skill", "skills", "know", "using") ? 2 : has("skill", "skills") ? 3 : 0 },
    { intent: "EXPERIENCE", score: has("experience", "internship", "work-experience", "hackathon", "siam", "sih", "dipex", "team") ? 2 : 0 },
    { intent: "EDUCATION", score: has("education", "college", "cgpa", "degree", "study", "tcet", "university") ? 3 : 0 },
    { intent: "CONTACT", score: has("contact", "email", "hire", "reach", "linkedin") ? 3 : 0 },
    { intent: "RESUME", score: has("resume", "cv") ? 3 : 0 },
    { intent: "GITHUB", score: has("github", "repo", "repos", "stars") ? 2 : 0 },
    { intent: "CURRENT_WORK", score: has("now", "currently", "working", "current", "focus", "lately") ? 3 : 0 },
    { intent: "ABOUT", score: has("who", "about", "yourself", "introduce", "background") ? 3 : 0 },
    { intent: "HELP", score: has("help", "commands", "can-you", "what-can") ? 3 : 0 },
  ];
  return out.sort((a, b) => b.score - a.score);
}

const SUGGEST = {
  home: ["What are you working on?", "Tell me about ICE", "Show open-source contributions"],
  projects: ["Why did you build this?", "What stack does this use?", "Show me your ML work"],
  research: ["What were the results?", "What is LSREP?", "Show your experiments"],
  oss: ["What got merged upstream?", "Show open PRs"],
  about: ["Show your resume", "How do I contact you?"],
} as Record<string, string[]>;

export function answer(rawInput: string, ctx: AssistCtx): AssistAnswer {
  const input = rawInput.trim();
  const tokens = tokenize(input);
  const projectSlug = detectProject(tokens, input, ctx);
  const project = projectSlug ? getProject(projectSlug) : undefined;
  const [top] = scoreIntents(tokens, input);

  const where = ctx.project ? `~/projects/${ctx.project}` : ctx.workspace === "home" ? "~" : `~/${ctx.workspace}`;
  const steps = ["detecting context", `workspace ${where}`];

  const sug = SUGGEST[ctx.workspace] ?? SUGGEST.home;
  const done = (intent: string, extraSteps: string[], body: string[]): AssistAnswer => ({
    intent,
    steps: [...steps, ...extraSteps],
    body,
    suggestions: sug,
  });

  // Project-scoped answers win when an entity is present
  if (project) {
    steps.push(`searching ${project.path}`, "reading README + notes");
    if (top.intent === "PROJECT_MOTIVATION" || /why/.test(input.toLowerCase()))
      return done("PROJECT_MOTIVATION", [`◆ found ${project.evidence.length} artifacts`], [
        `${project.name} — why it exists:`,
        project.motivation ?? project.blurb,
        ...project.evidence.slice(0, 3).map((e) => `· ${e}`),
        `more: open ${project.path}`,
      ]);
    if (top.intent === "PROJECT_TECH")
      return done("PROJECT_TECH", ["◆ stack resolved"], [
        `${project.name} stack: ${project.stack.join(" · ")}`,
        `status: ${project.status} · period: ${project.period}`,
        `source: ${project.links.github}`,
      ]);
    if (top.intent === "RESEARCH_RESULT" && project.slug === "ice")
      return done("RESEARCH_RESULT", ["◆ matched LongMemEval diagnostic + controlled eval"], [
        "ICE v2 (frozen snapshot): 1,985 turns · 219 probes · 1,211 observations · 52 checkpoints.",
        "Reported with failure cases — settings where ICE trails pure vector-RAG are in the manuscript.",
        "Full detail: ~/research → ice-controlled.",
      ]);
    return done("PROJECT_DETAIL", [`◆ found ${project.evidence.length} artifacts`], [
      `${project.name} (${project.period})`,
      project.blurb,
      ...project.evidence.slice(0, 4).map((e) => `· ${e}`),
      `stack: ${project.stack.join(" · ")}`,
      `source: ${project.links.github}`,
    ]);
  }

  switch (top.score > 0 ? top.intent : "UNKNOWN") {
    case "PROJECTS":
    case "GITHUB": {
      const ml = tokens.includes("ml") || input.toLowerCase().includes("machine learning");
      const list = ml
        ? projects.filter((p) => ["ice", "nexus", "prompt-routing-classifier", "iis-mini", "micrograd-from-scratch"].includes(p.slug))
        : projects.filter((p) => p.flagship);
      return done(top.intent, [`searching ~/projects`, `◆ ${list.length} matches`], [
        ml ? "ML work, strongest first:" : "Flagship projects:",
        ...list.map((p) => `· ${p.slug} — ${p.blurb}`),
        "open any with: open <slug>",
      ]);
    }
    case "RESEARCH":
      return done("RESEARCH", ["searching ~/research/papers", "◆ 2 manuscripts"], [
        papers[0].title,
        `arXiv:${papers[0].id} — ${papers[0].url}`,
        papers[0].note,
        ...experiments.map((e) => `· ${e.slug}: ${e.name} (${e.date})`),
      ]);
    case "RESEARCH_RESULT":
      return done("RESEARCH_RESULT", ["searching ~/research/experiments", `◆ ${experiments.length} experiments`], [
        ...experiments.flatMap((e) => [
          `${e.name}:`,
          ...(e.metrics ? e.metrics.map((m) => `  ${m.label}: ${m.value}`) : ["  (qualitative — no invented numbers)"]),
          `  → ${e.result}`,
        ]),
      ]);
    case "OSS": {
      const merged = prs.filter((p) => p.state === "merged");
      const open = prs.filter((p) => p.state === "open");
      return done("OSS", ["searching ~/oss", `◆ ${merged.length} merged · ${open.length} open`], [
        ossNote,
        "merged:",
        ...merged.map((p) => `· ${p.repo}: ${p.title} (${p.url})`),
        "open:",
        ...open.map((p) => `· ${p.repo}: ${p.title}`),
      ]);
    }
    case "SKILLS":
      return done("SKILLS", ["reading ~/about/stack.toml", "◆ evidence-linked"], [
        "No percentage bars — every skill points at proof:",
        `· ML/NLP (Python, PyTorch, embeddings, RAG, eval) → ice, prompt-routing-classifier`,
        `· data/backend (FastAPI, Postgres+pgvector, Docker, pytest) → ice, timetable-generator`,
        `· algorithms/systems (OR-Tools CP-SAT, graphs, TCP/UDP, Linux) → timetable-generator, DS-Practice`,
        `· currently learning: Rust`,
      ]);
    case "EXPERIENCE":
      return done("EXPERIENCE", ["reading ~/about/timeline.log", "◆ team work labeled"], [
        "Smart India Hackathon 2025 (CivicResolve, team of 6): cleared two institute rounds; I positioned vs CPGRAMS, wrote the technical docs, led the pitch.",
        "DIPEX 2026: MMR regional → Maharashtra-Goa state final; threat model + infra cost model; grew team 2 → 6.",
        "Research Cell TCET: TCP/IP models, two student hackathons. CyberPeace Foundation trainee (Jan 2025).",
        "NEXUS + RapidRail + IIS-mini: see ~/projects (team lanes labeled).",
      ]);
    case "EDUCATION":
      return done("EDUCATION", ["reading ~/about/README.md", "◆ 1 record"], [
        `${profile.education.degree}, ${profile.education.school} — expected ${profile.education.expected}.`,
        `CGPA ${profile.education.cgpa} (as stated in resume).`,
      ]);
    case "CONTACT":
      return done("CONTACT", ["reading ~/contact.json", "◆ 4 channels"], [
        `github: ${profile.links.github}`,
        `linkedin: ${profile.links.linkedin}`,
        `email: 18deepnar@gmail.com`,
        `x: ${profile.links.x}`,
      ]);
    case "RESUME":
      return done("RESUME", ["reading ~/about/resume.md", "◆ structured"], [
        "Deepesh Sonar — B.E. Computer Engineering, TCET Mumbai (2028) · CGPA 9.53/10.",
        "Flagships: ICE · NEXUS (merged) · Presentation Forge · timetable-generator · prompt-routing-classifier.",
        "Merged OSS: ModelDock #221/#222 · semantic-router #3288 · MNE #14283 · CivicResolve #1.",
        "Full readable view: workspace 5 (profile) or `open resume.md`.",
      ]);
    case "CURRENT_WORK":
      return done("CURRENT_WORK", ["reading ~/about/now.md", "◆ current"], [
        "now: ICE follow-up evaluation, LSREP out there (arXiv 2609.16730), open PRs under review (MNE #14287, graphiti #1772).",
      ]);
    case "ABOUT":
      return done("ABOUT", ["reading ~/about/README.md", "◆ identity"], [
        `${profile.name} (${profile.handle}) — ${profile.tagline}`,
        ...profile.aboutLong.slice(0, 2),
      ]);
    case "HELP":
      return done("HELP", ["reading ~/help", "◆ indexed"], [
        "Ask me things like:",
        "· “tell me about ICE” / “why did you build NEXUS?”",
        "· “show me your ML work” / “what got merged upstream?”",
        "· “what were the results?” (uses your current workspace)",
        "· or use the terminal: help · ls · open · ask · neofetch",
      ]);
    default:
      return {
        intent: "UNKNOWN",
        steps: [...steps, "searching index", "◆ no indexed answer"],
        body: [
          "I don't have an indexed answer for that yet — I'm a local intent engine, not an LLM, and I won't invent one.",
          "try:",
          ...sug.map((s) => `· “${s}”`),
        ],
        suggestions: sug,
      };
  }
}
