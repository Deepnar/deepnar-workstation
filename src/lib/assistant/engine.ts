// Deterministic conversational agent — no LLM, no key, no server.
// normalize → entities (aliases/fuzzy) → intent → context → compose
// from the same content + VFS the rest of the workstation reads.
import { profile } from "@/content/profile";
import { projects, getProject, dirOf } from "@/content/projects";
import { paper, researchEval } from "@/content/research";
import { prs, ossNote } from "@/content/oss";
import { notable } from "@/content/about";
import { HOME } from "@/vfs/vfs";
import { normalize, pick, V, PROFANE } from "./language";

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
  return s.toLowerCase().replace(/[^a-z0-9\s+\-#/]/g, " ").split(/\s+/).filter((t) => t && !STOP.has(t) && !PROFANE.has(t));
}

// entity → aliases. resolution: exact alias ⊂ raw, else fuzzy token overlap.
const ENTITIES: { id: string; aliases: string[] }[] = [
  { id: "ice", aliases: ["ice", "infinite context engine", "memory", "long-term memory", "long term memory", "memory project", "conversation memory", "memory layer", "memory architecture"] },
  { id: "presentation-forge", aliases: ["presentation forge", "forge", "slides", "pptx", "deck", "presentation"] },
  { id: "timetable-generator", aliases: ["timetable", "scheduling", "scheduler"] },
  { id: "prompt-routing-classifier", aliases: ["prompt routing", "routing classifier", "classifier", "router"] },
  { id: "nexus", aliases: ["nexus", "fraud", "fraud detection", "transactions"] },
  { id: "civicresolve", aliases: ["civicresolve", "civic", "sih", "dipex", "civeserve"] },
  { id: "rapidrail", aliases: ["rapidrail", "rail", "train", "ticketing"] },
  { id: "iis-mini", aliases: ["iis", "iis-mini"] },
  { id: "notable", aliases: ["notable", "accomplishments", "achievements", "awards", "competitions", "competition", "hackathon", "hackathons", "trophy", "certificates", "certificate", "certifications", "credentials"] },
  { id: "skills", aliases: ["skills", "skill", "tech stack", "technologies", "tools", "languages", "toolchain"] },
  { id: "education", aliases: ["education", "college", "degree", "university", "cgpa", "gpa", "studying", "school", "tcet", "graduation", "coursework"] },
  { id: "experience", aliases: ["experience", "internship", "internships", "work experience", "cyberpeace", "deloitte", "forage", "research cell", "csi", "nep sarthi", "iste", "organizations", "leadership"] },
  { id: "github", aliases: ["github", "github profile", "stars", "repositories", "repos"] },
  { id: "deepnar-workstation", aliases: ["workstation", "portfolio site", "this site", "this portfolio"] },
  { id: "orien-config", aliases: ["orien-config", "orien", "dotfiles", "chezmoi", "hyprland", "linux", "linux setup", "arch", "workstation config"] },
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

/** fuzzy tolerance scales with token length — short tokens get d≤1
    ("where" must never match "hire") */
function fuzzyLimit(t: string): number {
  return t.length >= 6 ? 2 : 1;
}

function detectEntity(raw: string, tokens: string[], ctx: AgentCtx): { id: string | null; trace: string } {
  const r = raw.toLowerCase();
  for (const e of ENTITIES) {
    for (const a of e.aliases) {
      if (a.includes(" ") ? r.includes(a) : tokens.includes(a)) return { id: e.id, trace: `entity ${e.id} via alias “${a}”` };
    }
  }
  // fuzzy: best alias within scaled edit distance on single tokens
  let best: { id: string; alias: string; d: number } | null = null;
  for (const t of tokens) {
    if (t.length < 4) continue;
    const lim = fuzzyLimit(t);
    for (const e of ENTITIES)
      for (const a of e.aliases) {
        if (a.includes(" ")) continue;
        const d = levenshtein(t, a);
        if (d <= lim && (!best || d < best.d)) best = { id: e.id, alias: a, d };
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

/** all entities mentioned, in order — exact AND fuzzy (same tolerance as
    detectEntity), so intent fallbacks see what entity resolution saw */
function detectAllEntities(raw: string, tokens: string[]): string[] {
  const r = raw.toLowerCase();
  const found: { id: string; at: number }[] = [];
  for (const e of ENTITIES) {
    let at = -1;
    for (const a of e.aliases) {
      const exact = a.includes(" ") ? r.indexOf(a) : tokens.includes(a) ? r.indexOf(a) : -1;
      if (exact >= 0) { at = exact; break; }
    }
    if (at < 0) {
      for (const t of tokens) {
        if (t.length < 4) continue;
        const lim = fuzzyLimit(t);
        for (const a of e.aliases) {
          if (a.includes(" ")) continue;
          if (levenshtein(t, a) <= lim) { at = r.indexOf(t); break; }
        }
        if (at >= 0) break;
      }
    }
    if (at >= 0) found.push({ id: e.id, at });
  }
  return [...new Map(found.sort((x, y) => x.at - y.at).map((f) => [f.id, f.id])).keys()];
}

type Intent =
  | "greeting" | "help" | "capabilities" | "whoami-agent" | "whois" | "thanks" | "praise"
  | "tour" | "interesting" | "whatis-site" | "are-you-ai" | "how-work" | "goodbye"
  | "project" | "why" | "stack" | "results" | "research" | "oss" | "oss-detail"
  | "projects-list" | "ml-list" | "contact" | "resume" | "open" | "theme" | "pet" | "terminal" | "unknown"
  | "compare" | "education" | "experience" | "competitions" | "skills" | "download" | "location" | "github" | "hostile";

function detectIntent(r: string, tokens: string[], hasEntity: boolean, allEntities: string[], ctx: AgentCtx): Intent {
  // single words match whole tokens (regex \b on raw text, so STOP-stripped
  // words like "why"/"show"/"do" still count) without firing inside longer
  // words ("cat" must not match "publications"); multi-word phrases match substrings.
  const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const has = (...ws: string[]) => ws.some((w) => (w.includes(" ") ? r.includes(w) : new RegExp(`\\b${esc(w)}\\b`).test(r)));
  // greetings — stretched slang already collapsed by normalize()
  if (/^(hi|hey|hello|yo|sup|howdy|namaste|morning|evening|afternoon)\b/.test(r) || /\bgood (morning|evening|afternoon)\b/.test(r) || /^what is up$/.test(r) || ["hi", "hey", "hello", "yo", "sup", "morning", "evening", "afternoon"].includes(r)) return "greeting";
  if (/^(thanks|thank you|thx|ty|dhanyavad|shukriya)\b/.test(r)) return "thanks";
  if (/^(bye|goodbye|see you|later|alvida|chalta hu|good ?night)\b/.test(r)) return "goodbye";
  if (/\b(cool|nice|awesome|great|neat|sweet|mast|badhiya)\b/.test(r) && tokens.length <= 3) return "praise";
  // compare needs two entities (or entity + conversation memory)
  if (/\b(vs|versus|compare|comparison|difference between|differ|better|relation between|how related|how.*related|connected)\b/.test(r)) return "compare";
  if (has("who are you", "who-are") || (has("who") && !hasEntity)) return "whoami-agent";
  if (has("who is", "who-is") || has("deepesh", "deepnar", "yourself", "about you", "introduce", "about him") || r === "about") return "whois";
  if (has("are you", "real ai", "llm", "chatgpt", "model", "gpt", "bot", "robot")) return "are-you-ai";
  if (has("how do you work", "how-work", "how work") || (has("how") && has("work"))) return "how-work";
  if (has("help") || r.includes("what can you")) return "help";
  if (has("capabilities", "what do") && has("do")) return "capabilities";
  if (has("where am i", "current location", "current file", "this file", "this folder", "this directory", "what am i", "looking at") || (r.includes("what is this") && ctx.cwd !== HOME)) return "location";
  if (has("show me around", "tour", "where should i start", "where start", "start")) return "tour";
  if (has("interesting", "cool stuff", "worth")) return "interesting";
  if (has("what is this", "this website", "this site", "what is deepnar", "look like linux", "why linux", "looks like")) return "whatis-site";
  if (/open source|opensource/.test(r)) return "oss";
  // "where did he study / where has he worked" are background questions, not navigation
  const backgroundWhere = /\bwhere (did|has|does)\b/.test(r) && !/terminal|paper|research|resume|\bcv\b|contact|github/.test(r);
  if ((has("open", "show", "take me", "go to", "navigate") || (/\b(open|launch|start|bring up|where)\b/.test(r) && !backgroundWhere)) && !/projects|portfolio/.test(r)) {
    if (has("terminal", "shell", "console")) return "terminal";
    if (has("paper") || has("research")) return "research";
    return "open";
  }
  if (has("download", "downloading", "get the", "save the")) return "download";
  if (has("dark mode", "light mode", "theme")) return "theme";
  if (has("pet", "creature", "companion", "hide pet", "pry", "cat")) return "pet";
  if (has("education", "college", "degree", "university", "cgpa", "studying", "study", "studied", "coursework", "graduate", "masters") && !/case study/.test(r)) return "education";
  if (has("experience", "internship", "internships", "worked", "cyberpeace", "deloitte", "forage", "research cell", "leadership", "organizations", "worked at") || /\bwhere has he\b/.test(r)) return "experience";
  if (has("competition", "competitions", "hackathon", "hackathons", "sih", "dipex", "multicon", "won", "win", "finalist", "prize", "award", "awards")) {
    // project-specific event questions stay on the project; general ones go to the record
    if (allEntities.includes("civicresolve") && allEntities.length === 1 && /civicresolve|civic|civeserve/.test(r)) return "project";
    return "competitions";
  }
  if (has("skills", "skill") || (allEntities.includes("skills") && !allEntities.some((e) => getProject(e)))) return "skills";
  if (has("github") && !has("oss", "opensource", "contribution", "merged", "upstream")) return "github";
  if (has("why", "motivation", "reason", "purpose") && (has("built", "build", "make", "exist") || hasEntity)) return "why";
  if (has("stack", "tech", "technologies", "language", "framework", "built with", "built-with", "using", "use")) return "stack";
  if (has("result", "results", "metric", "metrics", "evaluation", "eval", "f1", "auc", "score", "scores", "numbers", "accuracy")) return "results";
  if (has("paper", "arxiv", "lsrep", "research", "publication", "study")) return "research";
  if (has("mne", "modeldock", "graphiti", "semantic-router", "openverifiable", "archi", "architecture", "civicresolve pr", "pr #")) return "oss-detail";
  if (has("oss", "opensource", "contribution", "contributions", "prs", "upstream", "merged", "open source")) return "oss";
  if (has("contact", "email", "hire", "reach", "linkedin")) return "contact";
  if (has("resume", "cv")) return "resume";
  if (has("python") && has("use", "using", "projects")) return "ml-list";
  if (has("certificate", "certificates", "certifications", "credentials") || allEntities.includes("notable")) return "competitions";
  if (has("project", "projects", "work", "built", "portfolio", "best", "ml")) return "projects-list";
  // entity-kind fallback: a bare recognized entity routes to its shelf
  if (allEntities.includes("research")) return "research";
  if (allEntities.includes("oss")) return "oss";
  if (allEntities.includes("contact")) return "contact";
  if (allEntities.includes("github")) return "github";
  if (allEntities.includes("resume")) return "resume";
  if (allEntities.includes("education")) return "education";
  if (allEntities.includes("experience")) return "experience";
  if (allEntities.includes("skills")) return "skills";
  return hasEntity ? "project" : "unknown";
}

const pathFor = (entity: string): string | null => {
  const p = getProject(entity);
  if (p) return `${dirOf(p)}/README.md`;
  if (entity === "research") return `${HOME}/research/lsrep-ice/README.md`;
  if (entity === "oss") return `${HOME}/oss/repositories.md`;
  if (entity === "about") return `${HOME}/about/README.md`;
  if (entity === "notable" || entity === "education" || entity === "experience") return `${HOME}/about/notable.md`;
  if (entity === "skills") return `${HOME}/about/README.md`;
  if (entity === "contact" || entity === "github") return `${HOME}/contact.json`;
  if (entity === "resume") return `${HOME}/resume.pdf`;
  return null;
};

export function answer(rawInput: string, ctx: AgentCtx): AgentAnswer {
  const norm = normalize(rawInput.trim());
  const input = norm.text;
  const r = norm.text;
  const tokens = tokenize(input);
  const allEntities = detectAllEntities(r, tokens);
  const { id: entity, trace: entityTrace } = detectEntity(r, tokens, ctx);
  let intent = detectIntent(r, tokens, !!entity, allEntities, ctx);
  // pure hostility with no recognizable request → calm pool, no lecture.
  // (profanity seasoning a REAL request was already stripped from tokens.)
  const SMALLTALK_ONLY = new Set(["unknown", "greeting", "praise", "whatis-site", "whoami-agent", "tour", "help"]);
  if (norm.hostileWords && (intent === "unknown" || (!entity && SMALLTALK_ONLY.has(intent)))) intent = "hostile";
  const trace = [entityTrace, `intent ${intent}`, norm.casual ? "profanity stripped, request routed" : "clean"];
  const src = entity ? pathFor(entity) : null;

  const small = (body: string[], actions: AgentAction[] = []): AgentAnswer =>
    ({ intent, entity, smalltalk: true, body, sources: [], actions, trace });

  const projectsListAnswer = (): AgentAnswer => {
    const main = projects.filter((p) => p.kind !== "practice");
    return {
      intent, entity, smalltalk: false,
      body: ["the main story is small on purpose:", ...main.map((p) => `· ${p.slug} — ${p.blurb}`), "plus a practice shelf: micrograd, gradient-descent, wine-quality, titanic, DS-Practice and more — one-liners under ~/projects/practice."],
      sources: [`${HOME}/projects`],
      actions: [{ label: "browse projects", run: "open projects" }],
      trace,
    };
  };

  switch (intent) {
    case "hostile": {
      const pool = norm.hinglish && Math.random() < 0.5 ? V.hostileHi : V.hostile;
      const [line] = pick(pool);
      return small([line, "projects, research, resume — or ask me to open something."], [
        { label: "ICE", run: "open ice" }, { label: "tour", run: "tour" },
      ]);
    }
    case "greeting":
      return small(pick(V.greeting));
    case "thanks":
      return small([pick(V.thanks)]);
    case "praise":
      return small(["thanks — Deepesh built the thing, I just index it. want the tour?"], [{ label: "tour", run: "tour" }]);
    case "goodbye":
      return small([pick(V.farewell)]);
    case "whoami-agent": {
      const [line] = pick(V.whoami);
      return small([line, "ask “how do you work?” if you want the honest internals."], [{ label: "how it works", run: "how do you work?" }]);
    }
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
        "more of the human: ~/about/README.md. the compressed version: resume.pdf.",
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
    case "compare": {
      const cands = allEntities.filter((e) => getProject(e) || e === "research" || e === "oss");
      const pair = [...cands];
      if (pair.length === 1 && ctx.lastEntity && ctx.lastEntity !== pair[0]
        && (getProject(ctx.lastEntity) || ["research", "oss"].includes(ctx.lastEntity))) pair.unshift(ctx.lastEntity);
      if (pair.length < 2) {
        const sug = entity ? ` I have “${entity}” — name a second thing to compare it with.` : " name two projects and I'll lay them side by side.";
        return small([`compare what with what?${sug}`, "try “ICE vs timetable-generator” or “how is LSREP related to ICE?”"]);
      }
      const describe = (id: string): string => {
        const p = getProject(id);
        if (p) return `· ${p.name} (${p.domain}${p.modifier ? ` · ${p.modifier}` : ""}) — ${p.blurb}`;
        if (id === "research") return `· LSREP — ${paper.title}`;
        return `· upstream OSS — ${ossNote}`;
      };
      const [a, b] = pair;
      const pa = getProject(a), pb = getProject(b);
      const shared = pa && pb ? pa.stack.filter((s) => pb.stack.includes(s)) : [];
      return {
        intent, entity: a, smalltalk: false,
        body: [
          `${a} × ${b} — both indexed, here's the honest shape:`,
          describe(a), describe(b),
          shared.length ? `shared ground: ${shared.join(" · ")}.` : "different stacks, different problems — the overlap is Deepesh, not the tech.",
          "numbers live in each project's evidence section, not here.",
        ],
        sources: [pathFor(a), pathFor(b)].filter((s): s is string => !!s),
        actions: [{ label: `open ${a}`, run: `open ${a}` }, { label: `open ${b}`, run: `open ${b}` }],
        trace,
      };
    }
    case "education":
      return {
        intent, entity: "education", smalltalk: false,
        body: [
          `B.E. computer engineering, TCET Mumbai — expected 2028 · CGPA ${profile.education.cgpa}.`,
          "coursework leans math + systems: discrete structures, data structures, algorithms, operating systems, networks, databases.",
          "preparing for graduate study; open to research and startup internships.",
        ],
        sources: [`${HOME}/about/README.md`, `${HOME}/resume.pdf`],
        actions: [{ label: "about file", run: "open about" }, { label: "resume", run: "open resume" }],
        trace,
      };
    case "experience":
      return {
        intent, entity: "experience", smalltalk: false,
        body: [
          "experience + organizations, compressed:",
          "· cyberpeace foundation — internship trainee, jan 2025 (remote): security awareness, OSINT, cyber law/policy",
          "· deloitte data-analytics simulation (forage), jun 2025",
          "· research cell (TCET) technical team · CSI creative committee (119 hrs) · NEP sarthi + magazine editorial · ISTE member",
          "full record with dates lives in notable.md.",
        ],
        sources: [`${HOME}/about/notable.md`],
        actions: [{ label: "open record", run: "open notable" }],
        trace,
      };
    case "competitions":
      return {
        intent, entity: "notable", smalltalk: false,
        body: [
          "competitions + presentations on record:",
          "· DIPEX 2026 — state-final exhibitor (civeserve working model, team of six) — certificate viewable in the record",
          "· SIH 2025 — past two institute rounds (civic-reporting platform, team of six)",
          "· pixel over paper — multicon 2024, top-25 live presentation (led team of four)",
          "· github achievement badges (quickdraw, YOLO, galaxy brain, pull shark ×2, pair extraordinaire) are on home",
        ],
        sources: [`${HOME}/about/notable.md`],
        actions: [{ label: "open record", run: "open notable" }, { label: "civicresolve", run: "open civicresolve" }],
        trace,
      };
    case "skills":
      return {
        intent, entity: "skills", smalltalk: false,
        body: [
          "no percentage bars — every tool points at proof:",
          "· ML/NLP (python, pytorch, embeddings, RAG, eval) → ice, prompt-routing-classifier",
          "· data/backend (fastapi, postgres+pgvector, docker) → ice, timetable-generator",
          "· algorithms/systems (OR-tools CP-SAT, graphs, linux) → timetable-generator, DS-Practice",
          "· tooling (typescript, next.js, chezmoi, hyprland) → this workstation, orien-config",
        ],
        sources: [`${HOME}/about/README.md`, `${HOME}/projects/ice/README.md`],
        actions: [{ label: "open ICE", run: "open ice" }],
        trace,
      };
    case "download":
      if (entity === "resume" || /resume|cv/.test(r))
        return {
          intent: "resume", entity: "resume", smalltalk: false,
          body: ["sanitized public CV — downloading the actual PDF now.", "one page, email + links only, no private details."],
          sources: [`${HOME}/resume.pdf`],
          actions: [{ label: "download ↓", run: "download resume" }],
          trace,
        };
      return small(["download what? the resume is the one downloadable artifact here."], [{ label: "resume", run: "download resume" }]);
    case "location": {
      const cwd = ctx.cwd;
      const proj = projects.find((p) => cwd === dirOf(p) || cwd.startsWith(dirOf(p) + "/"));
      if (proj)
        return {
          intent, entity: proj.slug, smalltalk: false,
          body: [`you're inside ${proj.name} — ${proj.blurb}`, `stack: ${proj.stack.join(" · ")}`, "ask “why was it built?” or “show the evidence” for more."],
          sources: [`${dirOf(proj)}/README.md`],
          actions: [{ label: `open ${proj.slug}`, run: `open ${proj.slug}` }],
          trace,
        };
      return small([`you're at ${cwd.replace(HOME, "~")} — ${cwd === HOME ? "the workstation root. projects/, research/, oss/, about/ live here." : "browse with the file tree, or ask me to open something specific."} try “where should I start?”`]);
    }
    case "github":
      return {
        intent, entity: "github", smalltalk: false,
        body: [`github.com/Deepnar — 34 repos, merged upstream work, full history visualized on home.`, "merged PRs live under ~/oss; the human behind the commits under ~/about."],
        sources: [`${HOME}/oss/repositories.md`, `${HOME}/contact.json`],
        actions: [{ label: "open OSS", run: "open oss" }],
        trace,
      };
    case "open": {
      if (!entity)
        return small(["open what? try “open ICE”, “open the paper”, or “open oss”."],
        );
      if (entity === "notable") {
        // explicit "open" → the file; vaguer "show me achievements" → the summary
        if (/\bopen\b/.test(r))
          return { intent, entity, smalltalk: false, body: ["opening the record — competitions, orgs, credentials."], sources: [`${HOME}/about/notable.md`], actions: [{ label: "open notable", run: "open notable" }], trace };
        return answer("competitions", ctx);
      }
      if (entity === "contact") return answer("contact", ctx);
      if (entity === "resume") return answer("resume", ctx);
      if (entity === "github") return answer("github", ctx);
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
        sources: list.map((p) => `${dirOf(p)}/README.md`),
        actions: [{ label: "open ICE", run: "open ice" }],
        trace,
      };
    }
    case "projects-list":
      return projectsListAnswer();
    case "why":
    case "project": {
      const p = entity ? getProject(entity) : null;
      if (!p) {
        // entity resolved to a non-project shelf (research/oss/…) — answer the shelf, never recurse
        if (entity === "research") return answer("show me the paper", ctx);
        if (entity === "oss") return answer("open source", ctx);
        if (entity === "notable" || entity === "education" || entity === "experience") return answer("competitions", ctx);
        return projectsListAnswer();
      }
      const body = intent === "why"
        ? [`${p.name} — why it exists:`, p.motivation ?? p.blurb, ...p.evidence.slice(0, 3).map((e) => `· ${e}`)]
        : [`${p.name} (${p.period})`, p.blurb, ...(p.lane ? ["my lane:", ...p.lane.map((l) => `· ${l}`)] : []), ...p.evidence.slice(0, 3).map((e) => `· ${e}`), `stack: ${p.stack.join(" · ")}`];
      return {
        intent, entity, smalltalk: false, body,
        sources: [`${dirOf(p)}/README.md`],
        actions: [{ label: `open ${p.slug}`, run: `open ${p.slug}` }],
        trace,
      };
    }
    default: {
      // honest unknown: never invent. Offer near-miss entities when fuzzy finds any.
      const near: string[] = [];
      for (const t of tokens) {
        if (t.length < 4) continue;
        for (const e of ENTITIES)
          for (const a of e.aliases) {
            if (!a.includes(" ") && levenshtein(t, a) === 3 && !near.includes(e.id) && !allEntities.includes(e.id)) near.push(e.id);
          }
        if (near.length >= 3) break;
      }
      const hint = near.length ? ` did you mean ${near.slice(0, 3).join(", ")}?` : "";
      return {
        intent: "unknown", entity, smalltalk: false,
        body: [pick(V.unknownLead) + hint, "I know: projects, the paper, upstream contributions, stack, resume, contact."],
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
}
