"use client";

// RepoMetaRail — generated repository facts beside a project buffer.
// Prose stays durable in the README; stars, releases, tags, pushes live
// here, read from src/generated/github.json (sync-time `gh`, never live).
import { useState } from "react";
import gh from "@/generated/github.json";

export interface RepoMeta {
  repo: string; fork: boolean; upstream: string | null;
  stars: number; forks: number; language: string | null; license: string | null;
  topics: string[]; created: string; pushed: string; homepage: string | null;
  archived: boolean; tags: number | null; release: string | null; url: string;
}

const REPOS = (gh as unknown as { repos?: Record<string, RepoMeta> }).repos ?? {};

export const metaFor = (repo?: string): RepoMeta | null =>
  repo ? REPOS[repo] ?? null : null;

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-[3px] text-[12px]">
      <span className="shrink-0" style={{ color: "var(--muted)" }}>{k}</span>
      <span className="text-right truncate" style={{ color: "var(--fg-dim)" }}>{v}</span>
    </div>
  );
}

export function RepoMetaRail({ repo, isPrivate }: { repo?: string; isPrivate?: boolean }) {
  const [open, setOpen] = useState(true);
  const meta = metaFor(repo);
  if (isPrivate)
    return (
      <aside aria-label="repository metadata" className="text-[12px] px-3 py-2 border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        private source — described here, no public repo button.
      </aside>
    );
  if (!meta) return null;
  if (!open)
    return (
      <button aria-label="show repository metadata" onClick={() => setOpen(true)}
        className="px-2 py-1 border text-[11.5px]" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        repo meta →
      </button>
    );
  return (
    <aside aria-label="repository metadata" className="text-[12px] border px-3 py-2 space-y-0.5"
      style={{ borderColor: "var(--border)" }}>
      <button onClick={() => setOpen(false)} aria-label="hide repository metadata"
        className="w-full flex justify-between items-center text-[10.5px] uppercase tracking-[0.14em] pb-1"
        style={{ color: "var(--muted)" }}>
        <span>repo meta</span><span>←</span>
      </button>
      <Row k="★" v={meta.stars} />
      <Row k="⑂" v={meta.forks} />
      {meta.language && <Row k="lang" v={meta.language} />}
      {meta.license && <Row k="license" v={meta.license} />}
      {meta.release && <Row k="release" v={meta.release} />}
      {meta.tags != null && meta.tags > 0 && <Row k="tags" v={meta.tags} />}
      <Row k="pushed" v={meta.pushed || "—"} />
      <Row k="created" v={meta.created || "—"} />
      {meta.fork && meta.upstream && <Row k="fork of" v={meta.upstream.split("/")[1]} />}
      {meta.archived && <Row k="state" v="archived" />}
      {meta.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {meta.topics.slice(0, 5).map((t) => (
            <span key={t} className="px-1.5 py-px border text-[10.5px]" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>{t}</span>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1 pt-1.5">
        <a href={meta.url} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "var(--accent-soft)" }}>GitHub ↗</a>
        {meta.homepage && <a href={meta.homepage} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "var(--accent-soft)" }}>live demo ↗</a>}
      </div>
    </aside>
  );
}

/** compact badge strip for small screens — same facts, one line */
export function RepoMetaStrip({ repo, isPrivate }: { repo?: string; isPrivate?: boolean }) {
  const meta = metaFor(repo);
  if (isPrivate)
    return <div className="text-[11.5px]" style={{ color: "var(--muted)" }}>private source</div>;
  if (!meta) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px]" style={{ color: "var(--muted)" }} aria-label="repository metadata">
      <span>★ {meta.stars}</span>
      {meta.language && <span>{meta.language}</span>}
      {meta.license && <span>{meta.license}</span>}
      {meta.release && <span>{meta.release}</span>}
      <span>pushed {meta.pushed || "—"}</span>
      <a href={meta.url} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "var(--accent-soft)" }}>GitHub ↗</a>
    </div>
  );
}
