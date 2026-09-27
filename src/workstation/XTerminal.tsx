"use client";

// Real terminal frontend (xterm) over the safe VFS interpreter.
// No shell, no machine execution — commands run against the VFS.
// Each session owns cwd + history + scrollback; all tab instances stay
// mounted (hidden when inactive) so scrollback survives switching.
import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { useShell } from "@/lib/store";
import { execCommand, type TermLine } from "@/lib/terminal";
import { findNode, listDir, resolvePath, shortPath } from "@/vfs/vfs";
import { sound } from "@/audio/engine";

const COMMANDS = ["help", "ls", "tree", "cd", "pwd", "cat", "open", "find", "grep", ":e", ":bd", "whoami", "hostname", "uname", "man", "neofetch", "btop", "fortune", "nvim", "sudo", "theme", "resume", "contact", "github", "home", "projects", "research", "oss", "about", "download", "history", "clear", "c", "ask", "pet", "radio", "exit"];

function themeOpts(dark: boolean) {
  return dark
    ? { background: "#0d0f14", foreground: "#c9d1e3", cursor: "#8fa3ff", selectionBackground: "#2a3352" }
    : { background: "#f4f2ec", foreground: "#2a2d3a", cursor: "#4653b0", selectionBackground: "#d7dbf2" };
}

const KIND_COLOR: Record<TermLine["kind"], string> = {
  cmd: "\x1b[1;37m",
  out: "\x1b[0m",
  err: "\x1b[31m",
  ok: "\x1b[32m",
  dim: "\x1b[2m",
};

export function XTerminal({ sessionId, hidden }: { sessionId: string; hidden: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const inputRef = useRef("");
  const histIdxRef = useRef(-1);

  // create instance once per session mount
  useEffect(() => {
    const el = boxRef.current;
    if (!el || termRef.current) return;
    const st = useShell.getState();
    const dark = st.theme !== "light";
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: "block",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12.5,
      lineHeight: 1.25,
      scrollback: 500,
      theme: themeOpts(dark),
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(el);
    termRef.current = term;
    fitRef.current = fit;

    const writeLine = (l: TermLine) => {
      term.writeln(`${KIND_COLOR[l.kind]}${l.text}\x1b[0m`);
    };
    // replay record
    const sess = useShell.getState().terms[sessionId];
    for (const l of sess?.lines ?? []) writeLine(l);
    writePrompt(term, sess?.cwd ?? "/home/deepnar");

    term.onData((data) => handleData(data, sessionId, term, writeLine, inputRef, histIdxRef));
    term.onBinary(() => {});

    const onResize = () => {
      try {
        fit.fit();
      } catch {
        /* not visible yet */
      }
    };
    window.addEventListener("resize", onResize);
    // click-anywhere focuses
    const focus = () => term.focus();
    el.addEventListener("click", focus);
    // initial focus when visible
    if (!hidden) setTimeout(() => term.focus(), 50);
    return () => {
      window.removeEventListener("resize", onResize);
      el.removeEventListener("click", focus);
      term.dispose();
      termRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // theme follows
  const theme = useShell((s) => s.theme);
  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = themeOpts(theme !== "light");
  }, [theme]);

  // refit when tab becomes visible
  useEffect(() => {
    if (!hidden) {
      const t = setTimeout(() => {
        try {
          fitRef.current?.fit();
        } catch {
          /* noop */
        }
        termRef.current?.focus();
        termRef.current?.scrollToBottom();
      }, 30);
      return () => clearTimeout(t);
    }
  }, [hidden]);

  return <div ref={boxRef} className="h-full w-full min-h-0" style={{ display: hidden ? "none" : "block", padding: 8 }} data-testid={`xterm-${sessionId}`} />;
}

function promptParts(cwd: string): string {
  return `\x1b[36m╭─\x1b[0m \x1b[1;34mdeepnar@orien\x1b[0m \x1b[33m${shortPath(cwd)}\x1b[0m\r\n\x1b[36m╰─\x1b[0m \x1b[32m❯\x1b[0m `;
}

function writePrompt(term: XTerm, cwd: string) {
  term.write(promptParts(cwd));
}

function complete(input: string, cwd: string): string[] {
  const parts = input.split(/\s+/);
  const last = parts[parts.length - 1] ?? "";
  if (parts.length <= 1) return COMMANDS.filter((c) => c.startsWith(last));
  const base = last.includes("/") ? last.slice(0, last.lastIndexOf("/") + 1) : "";
  const frag = last.slice(base.length);
  const dirPath = resolvePath(cwd, base || ".");
  const node = findNode(dirPath);
  if (!node || node.kind !== "dir") return [];
  return listDir(dirPath)
    .filter((n) => n.name.startsWith(frag))
    .map((n) => base + n.name + (n.kind === "dir" ? "/" : ""));
}

function handleData(
  data: string, sessionId: string, term: XTerm,
  writeLine: (l: TermLine) => void,
  inputRef: React.MutableRefObject<string>,
  histIdxRef: React.MutableRefObject<number>,
) {
  const st = useShell.getState();
  const sess = st.terms[sessionId];
  if (!sess) return;
  const cwd = sess.cwd;

  const redraw = () => {
    term.write(`\r\x1b[K${promptParts(cwd)}${inputRef.current}`);
  };

  // Enter
  if (data === "\r") {
    const cmd = inputRef.current;
    term.write("\r\n");
    inputRef.current = "";
    histIdxRef.current = -1;
    if (!cmd.trim()) {
      writePrompt(term, cwd);
      return;
    }
    st.termAppend(sessionId, [{ text: `❯ ${cmd}`, kind: "cmd" }]);
    term.write(`\x1b[1;37m❯ ${cmd}\x1b[0m\r\n`);
    st.termHist(sessionId, cmd);
    const res = execCommand(cmd, cwd);
    if (res.clear) {
      term.clear();
      st.termClear(sessionId);
    } else {
      for (const l of res.lines) writeLine(l);
      st.termAppend(sessionId, res.lines);
    }
    if (res.cwd !== cwd) st.termSetCwd(sessionId, res.cwd);
    if (res.action?.type === "download") {
      try {
        const a = document.createElement("a");
        a.href = res.action.url;
        a.download = res.action.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch {
        /* toast already confirms */
      }
    }
    // follow browser or refresh prompt with the (maybe new) cwd
    const now = useShell.getState().terms[sessionId]?.cwd ?? res.cwd;
    writePrompt(term, now);
    term.scrollToBottom();
    return;
  }
  // Ctrl+C — cancel line
  if (data === "\x03") {
    term.write("^C\r\n");
    st.termAppend(sessionId, [{ text: `${inputRef.current}^C`, kind: "dim" }]);
    inputRef.current = "";
    histIdxRef.current = -1;
    writePrompt(term, cwd);
    return;
  }
  // Ctrl+L — clear screen
  if (data === "\x0c") {
    term.clear();
    st.termClear(sessionId);
    writePrompt(term, cwd);
    return;
  }
  // Backspace
  if (data === "\x7f") {
    if (inputRef.current.length > 0) {
      inputRef.current = inputRef.current.slice(0, -1);
      term.write("\b \b");
    }
    return;
  }
  // Up / Down history
  if (data === "\x1b[A" || data === "\x1b[B") {
    const h = useShell.getState().terms[sessionId]?.history ?? [];
    if (!h.length) return;
    if (data === "\x1b[A") histIdxRef.current = Math.min(h.length - 1, histIdxRef.current + 1);
    else histIdxRef.current = Math.max(-1, histIdxRef.current - 1);
    inputRef.current = histIdxRef.current === -1 ? "" : h[histIdxRef.current];
    redraw();
    return;
  }
  // Tab completion
  if (data === "\t") {
    const opts = complete(inputRef.current, cwd);
    if (opts.length === 1) {
      const parts = inputRef.current.split(/\s+/);
      parts[parts.length - 1] = opts[0];
      inputRef.current = parts.join(" ") + (opts[0].endsWith("/") ? "" : " ");
      redraw();
    } else if (opts.length > 1) {
      term.write(`\r\n\x1b[2m${opts.join("  ")}\x1b[0m\r\n`);
      redraw();
    } else sound.select();
    return;
  }
  // arrows left/right etc — ignore other escape sequences.
  // lone Escape blurs back to BROWSE (window handler is a fallback).
  if (data === "\x1b") {
    try {
      (term as unknown as { blur?: () => void }).blur?.();
    } catch {
      /* noop */
    }
    try {
      const ta = term.element?.querySelector(".xterm-helper-textarea") as HTMLElement | null;
      ta?.blur();
    } catch {
      /* noop */
    }
    useShell.getState().setMode("BROWSE");
    return;
  }
  if (data.startsWith("\x1b")) return;
  // printable
  inputRef.current += data;
  term.write(data);
}
