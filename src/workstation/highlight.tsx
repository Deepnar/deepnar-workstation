"use client";

import type { VNode } from "@/vfs/vfs";
import { useShell } from "@/lib/store";
import { findNode } from "@/vfs/vfs";
import { sound } from "@/audio/engine";

function InternalLink({ target, label }: { target: string; label: string }) {
  const { openFile } = useShell();
  return (
    <button
      className="hover:underline"
      style={{ color: "var(--accent-soft)" }}
      onClick={() => { const n = findNode(target); if (n) { sound.fileOpen(); openFile(n.path, n.kind); } }}
    >
      {label} →
    </button>
  );
}

/* tiny static highlighters — json / toml / log / diff. No dependency. */

type Tok = { t: string; c?: string };

function lexJson(line: string): Tok[] {
  const out: Tok[] = [];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d[\d.]*)|(true|false|null)|([{}[\],:])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ t: line.slice(last, m.index) });
    if (m[1]) out.push({ t: m[1], c: m[2] ? "var(--icy)" : "var(--ok)" });
    else if (m[3]) out.push({ t: m[3], c: "var(--warm)" });
    else if (m[4]) out.push({ t: m[4], c: "var(--accent-soft)" });
    else out.push({ t: m[5], c: "var(--muted)" });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ t: line.slice(last) });
  return out;
}

function lexToml(line: string): Tok[] {
  const trim = line.trimStart();
  if (trim.startsWith("#")) return [{ t: line, c: "var(--muted)" }];
  const sec = trim.match(/^\[.*\]/);
  if (sec) return [{ t: line.slice(0, line.indexOf(sec[0])), }, { t: sec[0], c: "var(--accent-soft)" }];
  const eq = line.indexOf("=");
  if (eq > 0) {
    return [
      { t: line.slice(0, eq), c: "var(--icy)" },
      { t: "=", c: "var(--muted)" },
      ...lexJson(line.slice(eq + 1)),
    ];
  }
  return [{ t: line }];
}

function lexLog(line: string): Tok[] {
  if (/^(run|date|H:|setup:|artifact:|note|→)/.test(line)) {
    const i = line.search(/[:\s]/);
    return [{ t: line.slice(0, i), c: "var(--icy)" }, { t: line.slice(i) }];
  }
  if (/^\d{4}-/.test(line)) {
    const parts = line.split(/\s+/);
    return [{ t: parts[0] + " ", c: "var(--icy)" }, { t: parts[1] + " ", c: "var(--warm)" }, { t: parts.slice(2).join(" ") }];
  }
  if (line.startsWith("·") || line.startsWith("     ")) return [{ t: line, c: "var(--fg-dim)" }];
  return [{ t: line }];
}

function lexDiff(line: string): Tok[] {
  if (line.startsWith("+")) return [{ t: line, c: "var(--ok)" }];
  if (line.startsWith("-")) return [{ t: line, c: "var(--err)" }];
  if (line.startsWith("@")) return [{ t: line, c: "var(--icy)" }];
  return [{ t: line, c: "var(--muted)" }];
}

const LEX: Record<string, (l: string) => Tok[]> = { json: lexJson, toml: lexToml, log: lexLog, diff: lexDiff, code: lexJson };

export function Code({ lang, lines, numbers = true }: { lang: string; lines: string[]; numbers?: boolean }) {
  const lex = LEX[lang] ?? ((l: string) => [{ t: l }]);
  return (
    <pre className="text-[12.5px] leading-[1.7]" aria-label={`${lang} file`}>
      {lines.map((l, i) => (
        <div key={i} className="flex">
          {numbers && (
            <span className="w-8 shrink-0 text-right pr-3 select-none" style={{ color: "var(--muted)", opacity: 0.6 }}>
              {i + 1}
            </span>
          )}
          <code className="whitespace-pre-wrap break-words min-w-0" style={{ color: "var(--fg-dim)" }}>
            {lex(l).map((t, j) => (
              <span key={j} style={t.c ? { color: t.c } : undefined}>{t.t}</span>
            ))}
            {l === "" ? " " : ""}
          </code>
        </div>
      ))}
    </pre>
  );
}

/** minimal markdown → mono TUI (headings, rules, bullets, quotes, code spans) */
export function Markdown({ node }: { node: VNode }) {
  const lines = node.body ?? [];
  return (
    <div className="text-[13px] leading-[1.75] max-w-3xl">
      {lines.map((l, i) => {
        if (l.startsWith("## ")) return <div key={i} className="mt-4 mb-1 text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>{l.slice(3)}</div>;
        if (l.startsWith("@@")) return <div key={i} id={`notable-${l.slice(2).trim()}`} className="scroll-mt-4" />;
        if (l.startsWith("# ")) return <h3 key={i} className="text-[17px] font-bold mt-1 mb-2" style={{ color: "var(--fg)" }}>{l.slice(2)}</h3>;
        if (l === "") return <div key={i} className="h-2" />;
        if (l === "---" || /^─+$/.test(l)) return <div key={i} className="my-2 border-t" style={{ borderColor: "var(--border)" }} />;
        if (l.startsWith("· ") || l.startsWith("- ")) return <div key={i} className="flex gap-2" style={{ color: "var(--fg-dim)" }}><span style={{ color: "var(--icy)" }}>▸</span><span>{renderInline(l.slice(2))}</span></div>;
        if (l.startsWith("> ")) return <div key={i} className="pl-3 border-l-2 italic" style={{ borderColor: "var(--warm)", color: "var(--fg-dim)" }}>{renderInline(l.slice(2))}</div>;
        return <div key={i} style={{ color: "var(--fg-dim)" }}>{renderInline(l)}</div>;
      })}
    </div>
  );
}

function renderInline(l: string) {
  // [[/vfs/path|label]] → internal workstation link
  const parts = l.split(/(\[\[[^\]]+\]\]|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("[[") && p.endsWith("]]")) {
      const inner = p.slice(2, -2).split("|");
      const target = inner[0].trim();
      const label = (inner[1] ?? target).trim();
      return <InternalLink key={i} target={target} label={label} />;
    }
    if (p.startsWith("`"))
      return <code key={i} className="px-1 rounded" style={{ background: "var(--sel-bg)", color: "var(--accent-soft)" }}>{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}
