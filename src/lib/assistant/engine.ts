// Deterministic conversational agent — no LLM, no key, no server.
// normalize → entities (aliases/fuzzy) → intent → context → compose
// from the same content + VFS the rest of the workstation reads.
import { profile } from "@/content/profile";
import { projects, getProject } from "@/content/projects";
import { paper, researchEval } from "@/content/research";
import { prs, ossNote } from "@/content/oss";
import { HOME } from "@/vfs/vfs";

export interface AgentCtx {
  cwd: string;
  lastEntity: string | null;
  lastIntent: string | null;
}

export interface AgentAction {
  label: string;
  run: string;
}

export interface AgentAnswer {
  intent: string;
  entity: string | null;
  smalltalk: boolean;
  body: string[];
  sources: string[];
  actions: AgentAction[];
  trace: string[];
}

const STOP = new Set("what,whats,does,doing,did,do,are,is,the,a,an,of,to,for,you,your,me,my,i,how,why,tell,show,give,about,and,or,any,have,has,had,been,there,with,that,this,it,in,on,as,at,by,his,he,its,it's,im,hey,hello,hi,please,kindly".split(","));

export function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s+\-#/]/g, " ").split(/\s+/).filter((t) => t && !STOP.has(t));
}

// entity → aliases. resolution: exact alias ⊂ raw, else fuzzy token overlap.
const ENTITIES: { id: string; aliases: string[] }[] = [
  { id: "ice", aliases: ["ice", "infinite context engine", "memory project", "conversation memory", "memory layer"] },
  { id: "presentation-forge", aliases: ["presentation forge", "forge", "slides", "pptx", "deck", "presentation"] },
  { id: "timetable-generator", aliases: ["timetable", "scheduling", "scheduler"] },
  { id: "prompt-routing-classifier", aliases: ["prompt routing", "routing classifier", "classifier", "router"] },
  { id: "nexus", aliases: ["nexus", "fraud", "fraud detection", "transactions"] },
  { id: "civicresolve", aliases: ["civicresolve", "civic", "sih"] },
  { id: "rapidrail", aliases: ["rapidrail", "rail", "train", "ticketing"] },
  { id: "iis-mini", aliases: ["iis", "iis-mini"] },
  { id: "research", aliases: ["lsrep", "paper", "arxiv", "research", "publication", "manuscript"] },
  { id: "oss", aliases: ["oss", "open source", "opensource", "contributions", "prs", "pull requests", "upstream", "merged"] },
  { id: "mne", aliases: ["mne", "mne-python", "sklearn"] },
  { id: "resume", aliases: ["resume", "cv"] },
  { id: "contact", aliases: ["contact", "email", "hire", "reach", "linkedin"] },
  { id: "about", aliases: ["deepesh", "deepnar", "yourself", "who"] },
  { id: "practice", aliases: ["practice", "small", "experiments", "learning builds"] },
];

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

function detectEntity(raw: string, tokens: string[], ctx: AgentCtx): { id: string | null; trace: string } {
  const r = raw.toLowerCase();
  for (const e of ENTITIES) {
    for (const a of e.aliases) {
      if (a.includes(" ") ? r.includes(a) : tokens.includes(a)) return { id: e.id, trace: `entity ${e.id} via alias “${a}”` };
    }
  }
  // fuzzy: best alias within edit distance 2 on single tokens
  let best: { id: string; alias: string; d: number } | null = null;
  for (const t of tokens) {
    if (t.length < 4) continue;
    for (const e of ENTITIES)
      for (const a of e.aliases) {
        if (a.includes(" ")) continue;
        const d = levenshtein(t, a);
        if (d <= 2 && (!best || d < best.d)) best = { id: e.id, alias: a, d };
      }
  }
  if (best) return { id: best.id, trace: `entity ${best.id} via fuzzy “${best.alias}” (d=${best.d})` };
  // follow-up reference: it / that / the paper / his stack
  if (/^(it|that|this)\b/.test(r) || /\b(it|that one|the paper|his stack|this project|this repo|here)\b/.test(r)) {
    if (ctx.lastEntity) return { id: ctx.lastEntity, trace: `entity ${ctx.lastEntity} via conversation context` };
  }
  // inherit short follow-ups like “what stack does it use?”
  if (ctx.lastEntity && tokens.length <= 5 && /stack|result|why|built|tech|eval|paper|role/.test(r))
    return { id: ctx.lastEntity, trace: `entity ${ctx.lastEntity} via short follow-up` };
  return { id: null, trace: "no entity matched" };
}

type Intent =
  | "greeting" | "help" | "capabilities" | "whoami-agent" | "whois" | "thanks" | "praise"
  | "tour" | "interesting" | "whatis-site" | "are-you-ai" | "how-work" | "goodbye"
  | "project" | "why" | "stack" | "results" | "research" | "oss" | "oss-detail"
  | "projects-list" | "ml-list" | "contact" | "resume" | "open" | "theme" | "pet" | "terminal" | "unknown";

function detectIntent(r: string, tokens: string[], hasEntity: boolean): Intent {
  const has = (...ws: string[]) => ws.some((w) => tokens.includes(w) || r.includes(w));
  if (/^(hi|hey|hello|yo|sup|hii+)\b/.test(r) || r === "hi" || r === "hello") return "greeting";
  if (/^(thanks|thank you|thx|ty)\b/.test(r)) return "thanks";
  if (/^(bye|goodbye|see you|later)\b/.test(r)) return "goodbye";
  if (/\b(cool|nice|awesome|great|neat|sweet)\b/.test(r) && tokens.length <= 3) return "praise";
  if (has("are-you-ai", "are you", "real ai", "llm", "chatgpt", "model")) return "are-you-ai";
  if (has("how do you work", "how-work", "how work") || (has("how") && has("work"))) return "how-work";
  if (has("help") || r.includes("what can you")) return "help";
  if (has("capabilities", "what do") && has("do")) return "capabilities";
  if (has("who are you", "who-are") || (has("who") && !hasEntity)) return "whoami-agent";
  if (has("who is", "who-is") || has("deepesh", "deepnar", "yourself", "about you", "introduce")) return "whois";
  if (has("show me around", "tour", "where should i start", "where start", "start")) return "tour";
  if (has("interesting", "cool stuff", "worth")) return "interesting";
  if (has("what is this", "this website", "this site", "what is deepnar")) return "whatis-site";
  if (has("open", "show", "take me", "go to", "navigate", "download")) {
    if (has("download") || has("resume", "cv")) return "resume";
    if (has("terminal", "shell", "console")) return "terminal";
    if (has("paper") || has("research")) return "research";
    return "open";
  }
  if (has("dark mode", "light mode", "theme")) return "theme";
  if (has("pet", "creature", "companion", "hide pet")) return "pet";
  if (has("why", "motivation", "reason", "purpose") && (has("built", "build", "make", "exist") || hasEntity)) return "why";
  if (has("stack", "tech", "technologies", "language", "framework", "built with", "built-with", "using", "use")) return "stack";
  if (has("result", "results", "metric", "metrics", "evaluation", "eval", "f1", "auc", "score", "numbers")) return "results";
  if (has("paper", "arxiv", "lsrep", "research", "publication", "study")) return "research";
  if (has("mne", "modeldock", "graphiti", "semantic-router", "openverifiable", "archi", "civicresolve pr", "pr #", "pr#")) return "oss-detail";
  if (has("oss", "opensource", "contribution", "contributions", "prs", "upstream", "merged", "open source")) return "oss";
  if (has("contact", "email", "hire", "reach", "linkedin")) return "contact";
  if (has("resume", "cv")) return "resume";
  if (has("python") && has("use", "using", "projects")) return "ml-list";
  if (has("project", "projects", "work", "built", "portfolio", "best", "ml")) return "projects-list";
  return hasEntity ? "project" : "unknown";
}

const pathFor = (entity: string): string | null => {
  const p = getProject(entity);
  if (p) {
    const bucket = p.bucket === "projects" ? "projects" : `projects/${p.bucket}`;
    return `${HOME}/${bucket}/${p.slug}/README.md`;
  }
  if (entity === "research") return `${HOME}/research/lsrep-ice/README.md`;
  if (entity === "oss") return `${HOME}/oss/repositories.md`;
  if (entity === "about") return `${HOME}/about/README.md`;
  if (entity === "contact") return `${HOME}/contact.json`;
  if (entity === "resume") return `${HOME}/resume.pdf`;
  return null;
};

export function answer(rawInput: string, ctx: AgentCtx): AgentAnswer {
  const input = rawInput.trim();
  const r = input.toLowerCase();
  const tokens = tokenize(input);
  const { id: entity, trace: entityTrace } = detectEntity(r, tokens, ctx);
  const intent = detectIntent(r, tokens, !!entity);
  const trace = [entityTrace, `intent ${intent}`];
  const src = entity ? pathFor(entity) : null;

  const small = (body: string[], actions: AgentAction[] = []): AgentAnswer =>
    ({ intent, entity, smalltalk: true, body, sources: [], actions, trace });

  switch (intent) {
    case "greeting":
      return small([
        "hey — I'm the local guide for Deepesh's workstation.",
        "I can explain projects, research and OSS work, or open things for you.",
        "try: “what is ICE?” · “show me the research” · “what got merged upstream?”",
      ]);
    case "thanks":
      return small(["anytime. the eval logs are honest, the pet is not — poke it and see."]);
    case "praise":
      return small(["thanks — Deepesh built the thing, I just index it. want the tour?"], [{ label: "tour", run: "tour" }]);
    case "goodbye":
      return small(["later. the workstation stays exactly where you left it."]);
    case "whoami-agent":
      return small([
        "I'm a tiny deterministic guide that lives in this workstation — intent matching, aliases, and a structured index of Deepesh's work. No LLM, no server, nothing leaves your browser.",
        "ask “how do you work?” if you want the honest internals.",
      ], [{ label: "how it works", run: "how do you work?" }]);
    case "are-you-ai":
      return small([
        "Not in the way you mean. I'm a classical expert system: token matching, synonyms, fuzzy lookup, conversation context — over a structured index of this portfolio.",
        "I understand the shape of Deepesh's work. I don't generate anything.",
      ]);
    case "how-work":
      return small([
        "normalize → entity aliases (fuzzy, edit-distance ≤ 2) → intent scoring → conversation context (last entity wins short follow-ups) → compose from the same content files the file browser reads.",
        "developers: run `assistant --debug \"<question>\"` in the terminal for the match trace.",
      ]);
    case "help":
    case "capabilities":
      return small([
        "I can:",
        "· explain any project, paper, or upstream contribution",
        "· answer follow-ups — “what stack does it use?” remembers what “it” is",
        "· open things, download the resume, switch theme, summon the terminal",
        "try: “open ICE” · “show me the paper” · “download your resume”",
      ], [
        { label: "open ICE", run: "open ice" },
        { label: "research", run: "show me the paper" },
        { label: "OSS", run: "what got merged upstream?" },
      ]);
    case "tour":
      return small([
        "start at ~/projects/ice — it's the main story. then ~/research/lsrep-ice for the paper, ~/oss for upstream work, ~/about for the human.",
        "everything opens with double-click or Enter; `:` jumps to the terminal.",
      ], [
        { label: "ICE", run: "open ice" },
        { label: "paper", run: "show me the paper" },
        { label: "OSS", run: "open oss" },
      ]);
    case "interesting":
      return small([
        "most visitors go: ICE (local-first memory) → the LSREP paper → the MNE-Python merge → the pet. in that order, roughly.",
      ], [{ label: "start: ICE", run: "open ice" }]);
    case "whatis-site":
      return small([
        "this is Deepesh Sonar's portfolio, disguised as his Linux workstation: a real file tree, real terminal sessions, a paper, upstream merges, and a creature that lives in the statusline.",
        "you're a guest. it's read-only. nothing here can break.",
      ]);
    case "whois":
      return small([
        `${profile.name} (${profile.handle}) — ${profile.tagline}`,
        ...profile.aboutLong.slice(0, 2),
        `${profile.education.degree}, ${profile.education.school} — expected ${profile.education.expected} · CGPA ${profile.education.cgpa}.`,
      ], [{ label: "about file", run: "open about" }, { label: "contact", run: "how can I contact Deepesh?" }]);
    case "contact":
      return {
        intent, entity, smalltalk: false,
        body: ["direct lines — the panel has copy buttons:", `github: ${profile.links.github}`, `linkedin: ${profile.links.linkedin}`, "email: 18deepnar@gmail.com", `x: ${profile.links.x}`, `orcid: ${profile.links.orcid}`],
        sources: [`${HOME}/contact.json`],
        actions: [{ label: "open contact", run: "contact" }],
        trace,
      };
    case "resume":
      return {
        intent, entity, smalltalk: false,
        body: ["sanitized public CV — one page, no private details:", "open it as a buffer, or download the actual PDF."],
        sources: [`${HOME}/resume.pdf`],
        actions: [{ label: "open resume", run: "open resume" }, { label: "download ↓", run: "download resume" }],
        trace,
      };
    case "theme":
      return small([
        r.includes("light") ? "light it is." : r.includes("dark") ? "back to the dark." : "theme toggled.",
      ], [{ label: "toggle theme", run: "theme" }]);
    case "pet":
      return small([
        r.includes("hide") || r.includes("off") ? "creature dismissed. the statusline feels emptier already." : "the creature lives in the statusline and roams the desktop. click it — it waves.",
      ], [{ label: "toggle pet", run: "pet" }]);
    case "terminal":
      return small(["terminal opening in the right dock — each tab keeps its own cwd and history."], [{ label: "open terminal", run: "terminal" }]);
    case "open": {
      if (!entity)
        return small(["open what? try “open ICE”, “open the paper”, or “open oss”."], [
          { label: "ICE", run: "open ice" }, { label: "paper", run: "show me the paper" },
        ]);
      if (entity === "contact") return answer("contact", ctx);
      if (entity === "resume") return answer("resume", ctx);
      const p = src ? [`opening ${src.replace(HOME, "~")}`] : ["opening."];
      return { intent, entity, smalltalk: false, body: p, sources: src ? [src] : [], actions: src ? [{ label: `open ${entity}`, run: `open ${entity}` }] : [], trace };
    }
    case "research":
      return {
        intent, entity: "research", smalltalk: false,
        body: [
          "one body of work, two halves: LSREP (the protocol) + ICE v2 (the audited architecture).",
          paper.title,
          `${paper.venue} · arXiv:${paper.id}`,
          paper.note,
          `eval: ${researchEval.metrics.map((m) => `${m.label} ${m.value}`).join(" · ")} — with candid failure cases.`,
        ],
        sources: [`${HOME}/research/lsrep-ice/README.md`, `${HOME}/research/lsrep-ice/details/evaluation.log`],
        actions: [{ label: "open paper", run: "open research" }, { label: "arXiv ↗", run: "arxiv" }],
        trace,
      };
    case "results": {
      if (entity && entity !== "research") {
        const p = getProject(entity);
        if (p && p.evidence.length)
          return { intent, entity, smalltalk: false, body: [`${p.name} — evidence:`, ...p.evidence.map((e) => `· ${e}`)], sources: src ? [src] : [], actions: src ? [{ label: `open ${p.slug}`, run: `open ${p.slug}` }] : [], trace };
      }
      return {
        intent, entity: "research", smalltalk: false,
        body: [
          "ICE v2 (frozen snapshot): 1,985 turns · 219 probes · 1,211 observations · 52 checkpoints.",
          "reported with failure cases — settings where ICE trails pure vector-RAG are in the manuscript.",
          "classifier that started it: topic F1 0.68 / intent F1 0.56 on 5,100 prompts, CPU-only.",
        ],
        sources: [`${HOME}/research/lsrep-ice/details/evaluation.log`, `${HOME}/projects/prompt-routing-classifier/details/evaluation.log`],
        actions: [{ label: "open eval log", run: "open research" }],
        trace,
      };
    }
    case "oss": {
      const merged = prs.filter((p) => p.state === "merged");
      const open = prs.filter((p) => p.state === "open");
      return {
        intent, entity: "oss", smalltalk: false,
        body: [ossNote, "merged:", ...merged.map((p) => `· ${p.repo}: ${p.title}`), "open:", ...open.map((p) => `· ${p.repo}: ${p.title}`)],
        sources: [`${HOME}/oss/repositories.md`],
        actions: [{ label: "open OSS", run: "open oss" }],
        trace,
      };
    }
    case "oss-detail": {
      const hit = prs.find((p) => r.includes(p.repo.split("/")[1].toLowerCase()) || tokens.some((t) => p.title.toLowerCase().includes(t) && t.length > 4));
      if (hit)
        return {
          intent, entity: "oss", smalltalk: false,
          body: [`${hit.repo} — ${hit.title}`, `${hit.state}. ${hit.note}`, hit.url],
          sources: [`${HOME}/oss/${hit.state}/${hit.repo.split("/")[1].toLowerCase()}-${hit.url.split("/").pop()}.md`],
          actions: [{ label: "open in OSS", run: "open oss" }],
          trace,
        };
      return answer("oss", ctx);
    }
    case "stack": {
      if (entity && getProject(entity)) {
        const p = getProject(entity)!;
        return { intent, entity, smalltalk: false, body: [`${p.name} stack: ${p.stack.join(" · ")}`, `status: ${p.status}`], sources: src ? [src] : [], actions: [], trace };
      }
      if (/python/.test(r))
        return {
          intent, entity, smalltalk: false,
          body: ["Python shows up where the work is ML-shaped:", "· ICE (FastAPI, PyTorch, pgvector) — the memory layer", "· NEXUS heads (XGBoost, scikit-learn) — fraud models", "· prompt-routing-classifier (sentence-transformers, sklearn) — the router", "· IIS-mini Person-1 lane — classical baselines"],
          sources: [`${HOME}/projects/ice/README.md`, `${HOME}/projects/collaborations/nexus/README.md`],
          actions: [{ label: "open ICE", run: "open ice" }],
          trace,
        };
      return {
        intent, entity, smalltalk: false,
        body: ["no percentage bars — every tool points at proof:", "· ML/NLP (Python, PyTorch, embeddings, RAG, eval) → ice, prompt-routing-classifier", "· data/backend (FastAPI, Postgres+pgvector, Docker) → ice, timetable-generator", "· algorithms/systems (OR-Tools CP-SAT, graphs, Linux) → timetable-generator, DS-Practice"],
        sources: [`${HOME}/about/README.md`, `${HOME}/projects/ice/README.md`],
        actions: [],
        trace,
      };
    }
    case "ml-list": {
      const list = projects.filter((p) => ["ice", "nexus", "prompt-routing-classifier", "iis-mini", "micrograd-from-scratch"].includes(p.slug));
      return {
        intent, entity, smalltalk: false,
        body: ["ML work, strongest first:", ...list.map((p) => `· ${p.slug} — ${p.blurb}`)],
        sources: list.map((p) => `${HOME}/projects/${p.bucket === "projects" ? "" : p.bucket + "/"}${p.slug}/README.md`),
        actions: [{ label: "open ICE", run: "open ice" }],
        trace,
      };
    }
    case "projects-list": {
      const main = projects.filter((p) => p.kind !== "practice");
      return {
        intent, entity, smalltalk: false,
        body: ["the main story is small on purpose:", ...main.map((p) => `· ${p.slug} — ${p.blurb}`), "plus a practice shelf: micrograd, gradient-descent, wine-quality, titanic, DS-Practice and more — one-liners under ~/projects/practice."],
        sources: [`${HOME}/projects`],
        actions: [{ label: "browse projects", run: "open projects" }],
        trace,
      };
    }
    case "why":
    case "project": {
      const p = entity ? getProject(entity) : null;
      if (!p) return answer("projects-list", ctx);
      const bucket = p.bucket === "projects" ? "projects" : `projects/${p.bucket}`;
      const body = intent === "why"
        ? [`${p.name} — why it exists:`, p.motivation ?? p.blurb, ...p.evidence.slice(0, 3).map((e) => `· ${e}`)]
        : [`${p.name} (${p.period})`, p.blurb, ...(p.lane ? ["my lane:", ...p.lane.map((l) => `· ${l}`)] : []), ...p.evidence.slice(0, 3).map((e) => `· ${e}`), `stack: ${p.stack.join(" · ")}`];
      return {
        intent, entity, smalltalk: false, body,
        sources: [`${HOME}/${bucket}/${p.slug}/README.md`],
        actions: [{ label: `open ${p.slug}`, run: `open ${p.slug}` }],
        trace,
      };
    }
    default:
      return {
        intent: "unknown", entity, smalltalk: false,
        body: ["I don't have that indexed — and I won't invent an answer.", "I know: projects, the paper, upstream contributions, stack, resume, contact."],
        sources: [],
        actions: [
          { label: "ICE", run: "open ice" },
          { label: "research", run: "show me the paper" },
          { label: "OSS", run: "what got merged upstream?" },
          { label: "about", run: "who is Deepesh?" },
        ],
        trace,
      };
  }
}
