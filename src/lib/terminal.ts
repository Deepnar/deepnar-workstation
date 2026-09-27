// Safe in-browser interpreter. Every fs command runs against the VFS —
// the same nodes Explorer, finder, buffers and the agent read.
// Sessions own their cwd; the component passes it in and stores the result.
import { useShell } from "@/lib/store";
import { HOME, ROOT, findNode, listDir, resolvePath, shortPath, searchVfs, type VNode } from "@/vfs/vfs";
import { answer } from "@/lib/assistant/engine";
import { sound } from "@/audio/engine";
import gh from "@/generated/github.json";
import { projects } from "@/content/projects";

export interface TermLine {
  text: string;
  kind: "cmd" | "out" | "err" | "ok" | "dim";
  cwd?: string;
}

export interface TermAction {
  type: "download";
  url: string;
  filename: string;
}

const BOOT_TIME = Date.now();
const FORTUNES = [
  "evaluate honestly; the failure case is the interesting part.",
  "memory is not storage. it is evolving state.",
  "read the log before you blame the model.",
  "small deterministic tools beat vague intelligent ones.",
];

function projectFromCwd(cwd: string): string | null {
  const m = cwd.match(/^\/home\/deepnar\/projects\/(?:collaborations\/|practice\/)?([^/]+)/);
  return m ? m[1] : null;
}

function renderTree(node: VNode, prefix: string, depth: number, acc: string[]): void {
  if (depth < 0) return;
  const kids = node.children ?? [];
  kids.forEach((c, i) => {
    const last = i === kids.length - 1;
    acc.push(`${prefix}${last ? "└── " : "├── "}${c.name}${c.kind === "dir" ? "/" : ""}`);
    if (c.kind === "dir") renderTree(c, `${prefix}${last ? "    " : "│   "}`, depth - 1, acc);
  });
}

function flashFail() {
  const s = useShell.getState();
  s.setPetMode("failed");
  setTimeout(() => useShell.getState().setPetMode("idle"), 1500);
}

export function execCommand(raw: string, cwd: string): { lines: TermLine[]; cwd: string; clear?: boolean; action?: TermAction } {
  const s = useShell.getState();
  const out = (text: string, kind: TermLine["kind"] = "out"): TermLine => ({ text, kind });
  const input = raw.trim();
  if (!input) return { lines: [], cwd };
  const [cmd, ...rest] = input.split(/\s+/);
  const arg = rest.join(" ");

  const done = (lines: TermLine[], nextCwd = cwd) => ({ lines, cwd: nextCwd });
  const ok = (lines: TermLine[], nextCwd = cwd) => {
    sound.success();
    return done(lines, nextCwd);
  };
  const bad = (text: string) => {
    sound.error();
    flashFail();
    return done([out(text, "err")]);
  };

  switch (cmd) {
    case "help":
      return ok([
        out("fs:        ls · tree · cd · pwd · cat · open · find · grep"),
        out("buffers:   :e <path> · :bd"),
        out("go:        home · projects · research · oss · about · resume · contact"),
        out("system:    neofetch · btop · history · clear (c)"),
        out("agent:     ask <question>  (local index, offline)"),
        out("fun:       fortune · uname -a · man deepnar · pet · radio"),
      ]);
    case "ls": {
      const target = resolvePath(cwd, rest[0] ?? ".");
      const node = findNode(target);
      if (!node) return bad(`ls: no such file or directory: ${arg}`);
      if (node.kind !== "dir") return ok([out(node.name)]);
      return ok(listDir(target).map((n) => out(`${n.name}${n.kind === "dir" ? "/" : ""}`, n.kind === "dir" ? "ok" : "out")));
    }
    case "tree": {
      const target = resolvePath(cwd, rest[0] ?? ".");
      const node = findNode(target);
      if (!node || node.kind !== "dir") return bad(`tree: ${arg || "."}: not a directory`);
      const acc: string[] = [shortPath(target)];
      renderTree(node, "", 2, acc);
      return ok(acc.map((t) => out(t, "dim")));
    }
    case "cd": {
      const target = resolvePath(cwd, rest[0]);
      const node = findNode(target);
      if (!node) return bad(`cd: no such directory: ${arg}`);
      if (node.kind !== "dir") return bad(`cd: not a directory: ${arg}`);
      s.navReplace(target); // main browser follows the active terminal (no history spam)
      return ok([], target);
    }
    case "pwd":
      return ok([out(shortPath(cwd))]);
    case "cat":
    case "open": {
      if (!arg) return bad(`usage: ${cmd} <path>`);
      if (arg === "resume.pdf" || arg.endsWith("resume.pdf")) {
        s.openFile(`${HOME}/resume.pdf`, "pdf");
        sound.fileOpen();
        return ok([out("opened ~/resume.pdf — [ open ] [ download ↓ ]")]);
      }
      const target = resolvePath(cwd, arg);
      const node = findNode(target);
      if (!node) return bad(`${cmd}: no such file: ${arg}`);
      if (cmd === "cat" && node.kind === "dir") return bad(`cat: ${arg}: is a directory`);
      s.openFile(target, node.kind);
      sound.fileOpen();
      if (cmd === "cat" && node.body) return ok(node.body.slice(0, 40).map((t) => out(t, "dim")));
      return ok([out(`opened ${shortPath(target)}`)]);
    }
    case "find": {
      const hits = searchVfs(arg).slice(0, 15);
      if (!hits.length) return ok([out("(no matches)", "dim")]);
      return ok(hits.map((n) => out(shortPath(n.path), "dim")));
    }
    case "grep": {
      if (!arg) return bad("usage: grep <pattern> [path]");
      const [pat, where] = rest;
      const scope = where ? resolvePath(cwd, where) : cwd;
      const root = findNode(scope);
      if (!root) return bad(`grep: no such path: ${where}`);
      const hits: string[] = [];
      const walk = (n: VNode) => {
        for (const [i, l] of (n.body ?? []).entries()) {
          if (l.toLowerCase().includes(pat.toLowerCase())) {
            hits.push(`${shortPath(n.path)}:${i + 1}:${l.trim().slice(0, 90)}`);
            if (hits.length > 15) return;
          }
        }
        for (const c of n.children ?? []) walk(c);
      };
      walk(root);
      return ok(hits.length ? hits.map((h) => out(h, "dim")) : [out("(no matches)", "dim")]);
    }
    case ":e":
      if (!arg) return bad("usage: :e <path>");
      return execCommand(`open ${arg}`, cwd);
    case ":bd": {
      const active = s.activeBuffer;
      if (!active) return bad("no buffers open");
      s.closeBuffer(active);
      sound.fileClose();
      return ok([out(`closed ${shortPath(active)}`)]);
    }
    case "whoami":
      return ok([out("deepesh — deepnar@orien, guest session")]);
    case "hostname":
      return ok([out("orien")]);
    case "uname":
      return ok([out("Linux orien 6.16-arch1-1-guest x86_64 · workstation-shell")]);
    case "man":
      if (arg === "deepnar") return ok([out("DEEPNAR(1) — builds memory systems, evaluates them honestly, merges upstream. see ~/projects/ice")]);
      return bad(`no manual entry for ${arg || "…"}`);
    case "neofetch": {
      const main = projects.filter((p) => p.kind !== "practice").length;
      return ok([
        out("deepnar@orien", "ok"),
        out("─────────────────", "dim"),
        out("OS: Arch (CachyOS) · guest session"),
        out("Shell: workstation-shell · Editor: nvim · Terminal: ghostty"),
        out(`Projects: ${main} · Repos: ${(gh as { repoCount: number }).repoCount} · Merged↑: ${(gh as { mergedPRs: number }).mergedPRs} lifetime`),
        out("Research: LSREP (arXiv 2609.16730)"),
        out(`Uptime: ${Math.max(1, Math.round((Date.now() - BOOT_TIME) / 60000))} min · Theme: light`),
      ]);
    }
    case "btop": {
      const cal = (gh as unknown as { calendar: { weeks: { date: string; count: number }[][] }; syncedAt: string }).calendar;
      const sums = cal.weeks.slice(-8).map((w) => w.reduce((a: number, d: { count: number }) => a + d.count, 0));
      return ok([
        out(`repos ${(gh as unknown as { repoCount: number }).repoCount} · synced ${cal ? (gh as unknown as { syncedAt: string }).syncedAt : ""}`, "ok"),
        out(`activity ${sums.join(" ")}`, "dim"),
        out(`buffers ${s.openBuffers.length} · cwd ${shortPath(s.cwd)}`, "dim"),
      ]);
    }
    case "fortune":
      return ok([out(`❝ ${FORTUNES[Math.floor(Math.random() * FORTUNES.length)]} ❞`, "dim")]);
    case "nvim":
    case "vim":
      return ok([out("nvim is already everywhere here. try :e ~/projects/ice/README.md", "dim")]);
    case "sudo":
      if (arg === "hire deepnar") return ok([out("[sudo] verified: merged upstream, paper on arXiv, evaluates honestly.", "ok"), out("proceed → open ~/contact.json", "ok")]);
      return bad("[sudo] guest session is read-only. nice try.");
    case "rm":
      return bad("rm: guest session is read-only. nothing was harmed.");
    case "exit":
      s.setPhase("desktop");
      sound.appClose();
      return ok([out("workstation minimized — back to desktop.", "dim")]);
    case "pet":
      s.setPet(!s.petOn);
      return ok([out(s.petOn ? "companion dismissed." : "companion summoned.", "dim")]);
    case "radio":
      s.setSettings({ ambient: !s.settings.ambient, sound: true });
      return ok([out(s.settings.ambient ? "ambient: off." : "ambient: on — quiet room tone. volume in settings.", "dim")]);
    case "theme":
      return ok([out("light only — the workstation retired dark mode.", "dim")]);
    case "resume":
      s.openFile(`${HOME}/resume.pdf`, "pdf");
      return ok([out("opened ~/resume.pdf")]);
    case "contact":
      s.toggle("contactOpen");
      return ok([out("contact panel opened.")]);
    case "github":
      s.navTo(`${HOME}/oss`);
      return ok([out("→ ~/oss")]);
    case "home":
      s.navTo(HOME);
      sound.nav();
      return ok([]);
    case "projects":
      s.navTo(`${HOME}/projects`);
      sound.nav();
      return ok([]);
    case "research":
      s.navTo(`${HOME}/research`);
      sound.nav();
      return ok([]);
    case "oss":
    case "git":
      s.navTo(`${HOME}/oss`);
      sound.nav();
      return ok([]);
    case "about":
    case "profile":
      s.navTo(`${HOME}/about`);
      sound.nav();
      return ok([]);
    case "download":
      if (arg.includes("resume") || arg === "") {
        s.notify("resume downloaded");
        sound.download();
        return { lines: [out("resume.pdf → downloads (sanitized public CV)")], cwd, action: { type: "download", url: "/resume/Deepesh_Sonar_Resume.pdf", filename: "Deepesh_Sonar_Resume.pdf" } };
      }
      return bad("usage: download resume.pdf");
    case "history":
      return ok([out("(this shell keeps history with ↑↓ — session only)", "dim")]);
    case "c":
    case "clear":
      return { lines: [], cwd, clear: true };
    case "assistant": {
      const m = arg.match(/^--debug\s+"?(.+?)"?$/);
      const q = (m ? m[1] : arg).trim();
      if (!q) return bad('usage: assistant --debug "<question>"');
      const a = answer(q, { cwd, lastEntity: s.lastEntity, lastIntent: s.lastIntent });
      s.setAssistantCtx(a.entity, a.intent);
      return ok([
        out(`intent:  ${a.intent}`, "dim"),
        out(`entity:  ${a.entity ?? "—"}`, "dim"),
        ...a.trace.map((t) => out(`trace:   ${t}`, "dim")),
        out(`sources: ${a.sources.join(", ") || "—"}`, "dim"),
        ...a.body.map((b) => out(b)),
      ]);
    }
    case "ask": {
      if (!arg) return bad("usage: ask <question> — e.g. ask why did you build ICE?");
      const a = answer(arg, { cwd, lastEntity: s.lastEntity, lastIntent: s.lastIntent });
      s.setAssistantCtx(a.entity, a.intent);
      s.setPetMode("thinking");
      setTimeout(() => useShell.getState().setPetMode("idle"), 2200);
      const lines = [out(`◆ ${a.intent}`, "dim"), ...a.body.map((b) => out(b))];
      return ok(lines);
    }
    default:
      if (!arg && ["..", "/"].includes(cmd)) return execCommand(`cd ${cmd}`, cwd);
      return bad(`command not found: ${cmd} — try help`);
  }
}

export { ROOT };
