// Safe in-browser interpreter. Every fs command runs against the VFS —
// the same nodes Explorer, finder, buffers and the assistant read.
import { useShell, type WorkspaceId } from "@/lib/store";
import { HOME, ROOT, findNode, listDir, resolvePath, shortPath, searchVfs, type VNode } from "@/vfs/vfs";
import { answer } from "@/lib/assistant/engine";
import { sound } from "@/audio/engine";
import gh from "@/generated/github.json";

export interface TermLine {
  text: string;
  kind: "cmd" | "out" | "err" | "ok" | "dim";
  cwd?: string;
}

const BOOT_TIME = Date.now();
const FORTUNES = [
  "evaluate honestly; the failure case is the interesting part.",
  "memory is not storage. it is evolving state.",
  "read the log before you blame the model.",
  "small deterministic tools beat vague intelligent ones.",
];

function projectFromCwd(cwd: string): string | null {
  const m = cwd.match(/^\/home\/deepnar\/projects\/(?:labs\/|collaborations\/|archive\/)?([^/]+)/);
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

export function execCommand(raw: string, cwd: string): { lines: TermLine[]; cwd: string; clear?: boolean } {
  const s = useShell.getState();
  const out = (text: string, kind: TermLine["kind"] = "out"): TermLine => ({ text, kind });
  const input = raw.trim();
  if (!input) return { lines: [], cwd };
  const [cmd, ...rest] = input.split(/\s+/);
  const arg = rest.join(" ");

  const done = (lines: TermLine[], nextCwd = cwd) => {
    s.setPetMood("alert");
    setTimeout(() => useShell.getState().setPetMood("idle"), 1500);
    return { lines, cwd: nextCwd };
  };
  const ok = (lines: TermLine[], nextCwd = cwd) => {
    sound.success();
    return done(lines, nextCwd);
  };
  const bad = (text: string) => {
    sound.error();
    return done([out(text, "err")]);
  };

  switch (cmd) {
    case "help":
      return ok([
        out("fs:        ls · tree · cd · pwd · cat · open · find · grep"),
        out("buffers:   :e <path> · :bd · :bnext · :bprev"),
        out("go:        home · projects · research · git · profile · resume · contact · github"),
        out("system:    theme <dark|light> · neofetch · btop · history · clear"),
        out("agent:     ask <question>  (local index, offline)"),
        out("fun:       fortune · uname -a · man deepnar · pacman -Q · pet · radio"),
      ]);
    case "ls": {
      const target = resolvePath(cwd, rest[0]);
      const node = findNode(target);
      if (!node) return bad(`ls: no such file or directory: ${arg}`);
      if (node.kind !== "dir") return ok([out(node.name)]);
      return ok(listDir(target).map((n) => out(`${n.name}${n.kind === "dir" ? "/" : ""}`, n.kind === "dir" ? "ok" : "out")));
    }
    case "tree": {
      const target = resolvePath(cwd, rest[0]);
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
      s.setCwd(target);
      s.go(s.workspace, target);
      return ok([]);
    }
    case "pwd":
      return ok([out(shortPath(cwd))]);
    case "cat":
    case "open": {
      if (!arg) return bad(`usage: ${cmd} <path>`);
      if (arg === "resume.pdf" || arg.endsWith("resume.pdf")) {
        s.openFile(`${HOME}/resume.pdf`, "pdf");
        sound.fileOpen();
        return ok([out("opened ~/resume.pdf — [ open pdf ] [ download ↓ ]")]);
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
    case ":bnext":
      s.cycleBuffer(1);
      return ok(s.activeBuffer ? [out(`→ ${shortPath(s.activeBuffer)}`)] : [out("(no buffers)", "dim")]);
    case ":bprev":
      s.cycleBuffer(-1);
      return ok(s.activeBuffer ? [out(`→ ${shortPath(s.activeBuffer)}`)] : [out("(no buffers)", "dim")]);
    case "whoami":
      return ok([out("deepesh — deepnar@orien, guest session (read-only)")]);
    case "hostname":
      return ok([out("orien")]);
    case "uname":
      return ok([out("Linux orien 6.16-arch1-1-guest x86_64 · workstation-shell")]);
    case "man":
      if (arg === "deepnar") return ok([out("DEEPNAR(1) — builds memory systems, evaluates them honestly, merges upstream. see ~/projects/ice")]);
      return bad(`no manual entry for ${arg || "…"}`);
    case "pacman":
      return ok([out("python 3.12 · typescript 5 · rust (learning) · postgresql + pgvector · ollama · or-tools · docker")]);
    case "neofetch":
      return ok([
        out("deepnar@orien", "ok"),
        out("─────────────────", "dim"),
        out("OS: Arch (CachyOS) · guest session"),
        out("Shell: workstation-shell · Editor: nvim · Terminal: ghostty"),
        out(`Projects: 11 · Repos: ${gh.repoCount} · Merged↑: ${gh.mergedPRs} lifetime`),
        out("Research: LSREP (arXiv 2609.16730) · ICE v2 in revision"),
        out(`Uptime: ${Math.max(1, Math.round((Date.now() - BOOT_TIME) / 60000))} min · Theme: ${s.theme}`),
      ]);
    case "btop":
      return ok([
        out(`repos ${gh.repoCount} · merged↑ ${gh.mergedPRs} · open ${gh.openPRs} · synced ${gh.syncedAt}`, "ok"),
        out(`activity ${(gh.activityWeeks as number[]).slice(-8).join(" ")}`, "dim"),
        out(`buffers ${s.openBuffers.length} · workspace ${s.workspace} · cwd ${shortPath(s.cwd)}`, "dim"),
      ]);
    case "fortune":
      return ok([out(`❝ ${FORTUNES[Math.floor(Math.random() * FORTUNES.length)]} ❞`, "dim")]);
    case "nvim":
    case "vim":
      return ok([out("nvim is already everywhere here. try :e ~/projects/ice/README.md", "dim")]);
    case "sudo":
      if (arg === "hire deepnar") return ok([out("[sudo] verified: merged upstream 5×, papers on arXiv, evaluates honestly.", "ok"), out("proceed → open ~/contact.json", "ok")]);
      return bad("[sudo] guest session is read-only. nice try.");
    case "rm":
      return bad("rm: guest session is read-only. nothing was harmed.");
    case "exit":
      s.setPhase("desktop");
      s.setPetAnchor("desktop");
      sound.appClose();
      return ok([out("workstation minimized — back to desktop.", "dim")]);
    case "pet":
      s.setPet(!s.petOn);
      return ok([out(s.petOn ? "companion dismissed." : "companion summoned.", "dim")]);
    case "radio":
      s.setSettings({ ambient: !s.settings.ambient, sound: true });
      return ok([out(s.settings.ambient ? "ambient: off." : "ambient: on — quiet room tone. volume in settings.", "dim")]);
    case "theme":
      if (arg === "dark" || arg === "light") {
        s.setTheme(arg);
        sound.relay();
        s.notify(`theme → ${arg}`);
        return ok([out(`theme → ${arg}`)]);
      }
      return bad("usage: theme <dark|light>");
    case "resume":
      s.openFile(`${HOME}/resume.md`, "markdown");
      return ok([out("opened ~/resume.md — download the PDF from ~/resume.pdf")]);
    case "contact":
      s.toggle("contactOpen");
      return ok([out("contact panel opened.")]);
    case "github":
      s.go("git");
      return ok([out("→ workspace 4 · oss")]);
    case "home":
    case "projects":
    case "research":
    case "git":
    case "profile": {
      const map: Record<string, WorkspaceId> = { home: "home", projects: "projects", research: "research", git: "git", profile: "profile" };
      s.go(map[cmd]);
      sound.tick(1);
      return ok([]);
    }
    case "download":
      if (arg.includes("resume") || arg === "") {
        s.notify("resume downloaded");
        sound.download();
        return ok([out("resume.pdf → downloads (sanitized public CV)")]);
      }
      return bad("usage: download resume.pdf");
    case "history":
      return ok([out("(this shell keeps history with ↑↓ — session only)", "dim")]);
    case "clear":
      return { lines: [], cwd, clear: true };
    case "ask": {
      if (!arg) return bad("usage: ask <question> — e.g. ask why did you build ICE?");
      const a = answer(arg, { project: projectFromCwd(cwd), workspace: s.workspace, lastIntent: s.lastIntent });
      s.setLastIntent(a.intent);
      s.setPetMood("thinking");
      setTimeout(() => useShell.getState().setPetMood("idle"), 2200);
      const lines = [out(`◇ ctx ${shortPath(cwd)} · local-index`, "dim"), out(`◆ ${a.intent} · ${a.steps[a.steps.length - 1] ?? "indexed"}`, "dim"), ...a.body.map((b) => out(b))];
      return ok(lines);
    }
    default:
      if (!arg && ["..", "/"].includes(cmd)) return execCommand(`cd ${cmd}`, cwd);
      return bad(`command not found: ${cmd} — try help`);
  }
}

export { ROOT };
