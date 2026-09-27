import { profile } from "@/content/profile";
import { projects, getProject } from "@/content/projects";
import { papers, experiments, researchTimeline } from "@/content/research";
import { prs } from "@/content/oss";
import type { WorkspaceId } from "@/lib/store";
import { answer, type AssistCtx } from "@/lib/assistant/engine";

export interface TermLine {
  kind: "cmd" | "out" | "err" | "agent" | "dim";
  text: string;
  /** cwd at execution time (history lines) */
  cwd?: string;
}

export interface TermEffect {
  go?: WorkspaceId;
  project?: string | null;
  theme?: "dark" | "light";
  clear?: boolean;
  toggle?: "aiOpen" | "explorerOpen" | "overviewOpen" | "paletteOpen";
  openUrl?: string;
}

export interface TermCtx {
  cwd: string;
  workspace: WorkspaceId;
  project: string | null;
  history: string[];
}

const DIRS: Record<string, string[]> = {
  "~": ["projects", "research", "oss", "about", "notes", "contact.json", "resume.md", "ai"],
  "~/projects": [...projects.map((p) => p.slug), "archive"],
  "~/research": ["papers", "experiments", "timeline.log"],
  "~/oss": ["merged", "open"],
  "~/about": ["README.md", "now.md", "stack.toml", "timeline.log"],
  "~/notes": ["lab-notes.md"],
  "~/contact": ["contact.json"],
  "~/ai": ["session"],
};

const ALIAS: Record<string, string> = {
  ll: "ls",
  "..": "cd ..",
  pf: "open presentation-forge",
  gh: "github",
  ":q": "exit",
  ":help": "help",
};

function resolve(cwd: string, arg?: string): string {
  if (!arg || arg === "~") return "~";
  if (arg === ".") return cwd;
  if (arg === "..") {
    if (cwd === "~") return "~";
    const parts = cwd.split("/");
    parts.pop();
    return parts.join("/") || "~";
  }
  if (arg.startsWith("~/")) return arg.replace(/\/$/, "");
  if (arg.startsWith("~")) return arg;
  return cwd === "~" ? `~/${arg}` : `${cwd}/${arg}`;
}

const KNOWN = new Set([
  "help", "ls", "cd", "pwd", "tree", "open", "cat", "find", "grep",
  "projects", "research", "oss", "about", "resume", "contact", "github",
  "whoami", "neofetch", "theme", "history", "clear", "ask",
  "vim", "nvim", "vi", "emacs", "sudo", "exit", "rm", "fortune", "cowsay",
]);

const FORTUNES = [
  "“Retrieval quality is governed by what you leave out.” — ICE notes",
  "“Separate didn’t-work from wasn’t-actually-tested.” — lab rule #1",
  "“A window is a buffer, not a memory.” — ICE motivation",
  "“If it matches baseline, the write-up should say exactly that.” — lab rule #2",
];

export function complete(cwd: string, fragment: string): string[] {
  const parts = fragment.split(" ");
  const last = parts[parts.length - 1] ?? "";
  const pool =
    parts.length > 1
      ? [...(DIRS[cwd] ?? []), ...projects.map((p) => p.slug), "ice", "nexus"]
      : [...KNOWN, ...projects.map((p) => p.slug)];
  return [...new Set(pool)].filter((c) => c.startsWith(last) && c !== last);
}

export function runCommand(rawInput: string, ctx: TermCtx): { lines: TermLine[]; effect?: TermEffect; cwd?: string } {
  let input = rawInput.trim();
  if (!input) return { lines: [] };
  if (ALIAS[input]) input = ALIAS[input];
  const [cmd, ...rest] = input.split(/\s+/);
  const arg = rest.join(" ");
  const out = (text: string): TermLine => ({ kind: "out", text });
  const dim = (text: string): TermLine => ({ kind: "dim", text });
  const err = (text: string): TermLine => ({ kind: "err", text });

  // Natural language → assistant (deterministic, local)
  if (!KNOWN.has(cmd)) {
    if (input.includes(" ") || input.endsWith("?")) {
      const a = answer(input, { project: ctx.project, workspace: ctx.workspace, lastIntent: null });
      return {
        lines: [
          { kind: "agent", text: `◇ ${a.steps.join("  →  ")}` },
          ...a.body.map((t) => ({ kind: "out" as const, text: t })),
        ],
      };
    }
    return { lines: [err(`${cmd}: command not found — try \`help\` or ask a question like “tell me about ICE”`)] };
  }

  switch (cmd) {
    case "help":
      return {
        lines: [
          out("commands:  ls  cd  pwd  tree  open  cat  find  grep  ask"),
          out("           projects  research  oss  about  resume  contact  github"),
          out("           whoami  neofetch  theme [dark|light]  history  clear"),
          dim("keys: ↑↓ history · tab complete · ctrl+k palette · 1-8 workspaces"),
          dim("tip: plain English works too — try “why did you build ICE?”"),
        ],
      };
    case "pwd":
      return { lines: [out(ctx.cwd)] };
    case "whoami":
      return { lines: [out("deepnar — Deepesh Sonar. computer engineering, mumbai. builds systems, then tries to break his own claims about them.")] };
    case "ls": {
      const target = resolve(ctx.cwd, rest[0]);
      if (target.startsWith("~/projects/")) {
        const slug = target.split("/")[2];
        const p = getProject(slug);
        if (!p) return { lines: [err(`ls: ${rest[0]}: no such project`)] };
        return { lines: [out("README.md  architecture  experiments  links")] };
      }
      const entries = DIRS[target];
      if (!entries) return { lines: [err(`ls: ${rest[0] ?? ""}: no such directory`)] };
      return { lines: [out(entries.join("   "))] };
    }
    case "cd": {
      const target = resolve(ctx.cwd, rest[0]);
      if (target === "~") return { cwd: "~", lines: [], effect: { go: "home", project: null } };
      const m = target.match(/^~\/projects\/([\w-]+)$/);
      if (m && getProject(m[1])) return { cwd: target, lines: [], effect: { go: "projects", project: m[1] } };
      const ws = target.replace("~/", "") as WorkspaceId;
      if (["projects", "research", "oss", "about", "notes", "contact", "ai"].includes(ws))
        return { cwd: target, lines: [], effect: { go: ws, project: null } };
      if (DIRS[target]) return { cwd: target, lines: [] };
      return { lines: [err(`cd: ${rest[0] ?? ""}: no such directory`)] };
    }
    case "tree": {
      const lines = ["~", "├── projects/  (" + projects.length + " — ice nexus presentation-forge timetable-generator …)", "├── research/  (papers experiments timeline.log)", "├── oss/  (merged open)", "├── about/  (README now stack timeline)", "├── contact.json", "└── resume.md"];
      return { lines: lines.map(out) };
    }
    case "open": {
      if (!arg) return { lines: [err("open: what? try `open ice` or `open research`")] };
      const p = getProject(arg);
      if (p) return { cwd: p.path, lines: [dim(`opening ${p.path}`)], effect: { go: "projects", project: p.slug } };
      const ws = arg as WorkspaceId;
      if (["projects", "research", "oss", "about", "notes", "contact", "ai", "home"].includes(ws))
        return { lines: [dim(`opening ~/${ws}`)], effect: { go: ws === "home" ? "home" : ws, project: null } };
      if (arg === "resume.md" || arg === "resume") return { lines: [], effect: { go: "about", project: null } };
      if (arg === "contact.json") return { lines: [], effect: { go: "contact", project: null } };
      if (arg === "github") return { lines: [], effect: { openUrl: profile.links.github } };
      return { lines: [err(`open: ${arg}: nothing opens by that name`)] };
    }
    case "cat": {
      if (!arg) return { lines: [err("cat: what?")] };
      const f = arg.split("/").pop() ?? "";
      if (f === "contact.json")
        return {
          lines: [
            out("{"),
            out(`  "github": "${profile.links.github}",`),
            out(`  "linkedin": "${profile.links.linkedin}",`),
            out(`  "email": "18deepnar@gmail.com",`),
            out(`  "x": "${profile.links.x}"`),
            out("}"),
          ],
        };
      if (f === "stack.toml")
        return { lines: [out("[stack]"), ...profile.stack.map((s) => out(`lang_or_tool = "${s}"`))] };
      if (f === "README.md" || f === "README") return { lines: profile.aboutLong.slice(0, 2).map(out) };
      if (f === "now.md")
        return { lines: [out("now: ICE follow-up eval · LSREP (arXiv 2609.16730) · merged OSS (ModelDock ×2, semantic-router, MNE #14283) · internship hunt for Dec 2026 window")] };
      if (f === "timeline.log") return { lines: researchTimeline.map((t) => out(`${t.date}  ${t.event}`)) };
      if (f === "resume.md" || f === "resume") return { lines: [out("see ~/about — full resume view. `open about`")] };
      if (f === "lab-notes.md") return { lines: [out("lab rule #1: separate didn't-work from wasn't-tested."), out("lab rule #2: precise results over impressive ones.")] };
      return { lines: [err(`cat: ${arg}: no such file (try \`ls\`)`)] };
    }
    case "find":
      if (!arg) return { lines: [err("find: what?")] };
      else {
        const hits = projects.filter((p) => p.slug.includes(arg) || p.name.toLowerCase().includes(arg)).map((p) => p.path);
        const extra = ["~/research", "~/oss", "~/about"].filter((p) => p.includes(arg));
        const all = [...hits, ...extra];
        return { lines: all.length ? all.map(out) : [dim(`find: ${arg}: no matches`)] };
      }
    case "grep": {
      if (!arg) return { lines: [err("grep: what?")] };
      const hits: TermLine[] = [];
      for (const p of projects)
        if ((p.blurb + p.evidence.join(" ") + p.stack.join(" ")).toLowerCase().includes(arg.toLowerCase()))
          hits.push(out(`${p.path}: ${p.blurb.slice(0, 90)}…`));
      for (const e of experiments)
        if ((e.name + e.result).toLowerCase(). includes(arg.toLowerCase())) hits.push(out(`~/research/experiments/${e.slug}: ${e.name}`));
      return { lines: hits.length ? hits : [dim(`grep: ${arg}: no matches in indexed content`)] };
    }
    case "projects":
      return { lines: [out("flagships:"), ...projects.filter((p) => p.flagship).map((p) => out(`  ${p.slug} — ${p.blurb.slice(0, 80)}…`)), dim("`open <slug>` for the full workspace · archive lives under ~/projects")], effect: { go: "projects", project: ctx.project } };
    case "research":
      return { lines: [out(papers[0].title), dim(`arXiv:${papers[0].id} · ${papers[0].url}`), ...experiments.map((e) => out(`  ${e.slug} — ${e.name} (${e.date})`))], effect: { go: "research", project: null } };
    case "oss": {
      const merged = prs.filter((p) => p.state === "merged").length;
      const open = prs.filter((p) => p.state === "open").length;
      return { lines: [out(`${merged} merged · ${open} open — ModelDock ×2, semantic-router, MNE #14283 merged; MNE #14287, graphiti #1772 open`), dim("`open oss` for the lazygit view")], effect: { go: "oss", project: null } };
    }
    case "about":
      return { lines: profile.aboutLong.slice(0, 1).map(out), effect: { go: "about", project: null } };
    case "resume":
      return {
        lines: [
          out("Deepesh Sonar — B.E. Computer Engineering, TCET Mumbai (2028) · CGPA 9.53/10"),
          out("ICE · NEXUS (merged) · Presentation Forge · timetable-generator · prompt-routing-classifier"),
          out("OSS merged: ModelDock #221/#222 · semantic-router #3288 · MNE #14283 · CivicResolve #1"),
          dim("full view: `open about`"),
        ],
      };
    case "contact":
      return {
        lines: [
          out(`github   ${profile.links.github}`),
          out(`linkedin ${profile.links.linkedin}`),
          out(`email    18deepnar@gmail.com`),
          out(`x        ${profile.links.x}`),
        ],
      };
    case "github":
      return { lines: [dim("opening github.com/Deepnar…")], effect: { openUrl: profile.links.github } };
    case "neofetch":
      return {
        lines: [
          out("deepnar@nexus"),
          out("-----------------"),
          out(`OS: deepnar.dev (workstation)   Shell: portfolio-sh   Editor: ${profile.status.editor}`),
          out(`Interests: ${profile.interests.join(", ")}`),
          out(`Projects: ${projects.length} (${projects.filter((p) => p.flagship).length} flagship)   Public repos: 34   OSS: ${prs.filter((p) => p.state === "merged").length} merged / ${prs.filter((p) => p.state === "open").length} open`),
          out(`Research: LSREP (arXiv 2609.16730) + ICE v2 manuscript`),
          out("Uptime: this tab"),
        ],
      };
    case "theme":
      if (arg === "dark" || arg === "light") return { lines: [dim(`theme → ${arg}`)], effect: { theme: arg } };
      return { lines: [err("theme: use `theme dark` or `theme light`")] };
    case "history":
      return { lines: ctx.history.length ? ctx.history.map((h, i) => dim(`${i + 1}  ${h}`)) : [dim("no history yet")] };
    case "clear":
      return { lines: [], effect: { clear: true } };
    case "ask": {
      if (!arg) return { lines: [err("ask: about what? e.g. `ask why did you build ICE?`")] };
      const a = answer(arg, { project: ctx.project, workspace: ctx.workspace, lastIntent: null });
      return { lines: [{ kind: "agent", text: `◇ ${a.steps.join("  →  ")}` }, ...a.body.map((t) => ({ kind: "out" as const, text: t }))] };
    }
    case "vim":
    case "nvim":
    case "vi":
      return { lines: [dim("you're already inside the next best thing. `:q` won't save you here.")] };
    case "emacs":
      return { lines: [err("emacs: not installed (and at this point, a lifestyle choice).")] };
    case "sudo":
      if (arg === "hire deepnar") return { lines: [out("✓ permission granted. references: merged PRs, a manuscript, and 1,985 evaluated turns."), dim("next step: email 18deepnar@gmail.com — humans still do the hiring.")] };
      return { lines: [err(`sudo: ${arg || "nothing"}: this user is not in the sudoers file. this incident will be reported (to the pet).`)] };
    case "exit":
      return { lines: [dim("there is no escape. this is a browser tab.")] };
    case "rm":
      return { lines: [err("rm: nice try. the workstation is immutable — unlike your shell history.")] };
    case "fortune":
      return { lines: [dim(FORTUNES[Math.floor(Math.random() * FORTUNES.length)])] };
    case "cowsay":
      return { lines: [out(`< ${(arg || "moo").slice(0, 60)} >`), out("        \\   ^__^"), out("         \\  (oo)\\_______"), out("            (__)\\       )\\/\\"), out("                ||----w |"), out("                ||     ||")] };
    default:
      return { lines: [err(`${cmd}: unhandled — try \`help\``)] };
  }
}

export type { AssistCtx };
