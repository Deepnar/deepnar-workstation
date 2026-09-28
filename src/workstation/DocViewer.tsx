"use client";

import { useState } from "react";
import { sound } from "@/audio/engine";

/* ── reusable workstation document viewer ──
   ONE presentation system for public evidence, not four ad-hoc embeds:
   - pdf: native rendering (searchable, accessible) via iframe with the
     browser toolbar hidden (#toolbar=0); our own thin toolbar owns
     zoom / fit / download / open-original. Page nav via #page=.
   - image: proper zoom + fit surface (no pretending images are PDFs).
   - external artifacts: deliberate "open ↗" (arXiv paper, etc.).
   Used by: evidence PDFs + images, research manuscript + deck. */

export function DocViewer({ src, title, kind, pages = 1, caption, downloadName }: {
  src: string;
  title: string;
  kind: "pdf" | "image";
  pages?: number;
  caption?: string[];
  downloadName?: string;
}) {
  const [zoom, setZoom] = useState(100);
  const [fit, setFit] = useState<"width" | null>("width");
  const [page, setPage] = useState(1);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const step = (d: number) => {
    setFit(null);
    setZoom((z) => Math.min(200, Math.max(50, z + d)));
    sound.tick(d > 0 ? 1 : -1);
  };
  const cycleFit = () => {
    setFit((f) => (f === "width" ? null : "width"));
    if (fit !== "width") setZoom(100);
    sound.toggle();
  };
  const gotoPage = (p: number) => {
    setPage(Math.min(pages, Math.max(1, p)));
    sound.tick(p > page ? 1 : -1);
  };

  return (
    <div className="space-y-2 max-w-3xl">
      {caption?.map((l, i) => (
        <div key={i} className="text-[12px]" style={{ color: "var(--muted)" }}>{l}</div>
      ))}
      <div
        tabIndex={0}
        role="document"
        aria-label={title}
        className="border outline-none"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        onKeyDown={(e) => {
          if (e.key === "+" || e.key === "=") step(25);
          else if (e.key === "-") step(-25);
          else if (e.key === "0") { setZoom(100); setFit("width"); }
          else if (e.key === "f") cycleFit();
          else if (e.key === "ArrowRight" && pages > 1) gotoPage(page + 1);
          else if (e.key === "ArrowLeft" && pages > 1) gotoPage(page - 1);
          else return;
          e.preventDefault();
        }}
      >
        <div className="flex items-center gap-1 px-2 py-1 border-b text-[11.5px] flex-wrap" style={{ borderColor: "var(--border)" }}>
          <span className="truncate mr-auto" style={{ color: "var(--fg-dim)" }}>{title}</span>
          <button className="px-1.5 py-0.5 border" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }} onClick={() => step(-25)} title="zoom out (-)">−</button>
          <span className="w-11 text-center tabular-nums" style={{ color: "var(--muted)" }}>{zoom}%</span>
          <button className="px-1.5 py-0.5 border" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }} onClick={() => step(25)} title="zoom in (+)">+</button>
          <button className="px-1.5 py-0.5 border" style={{ borderColor: "var(--border)", color: fit ? "var(--accent-soft)" : "var(--muted)" }} onClick={cycleFit} title="fit width (f)">fit</button>
          {pages > 1 && (
            <>
              <button className="px-1.5 py-0.5 border" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }} onClick={() => gotoPage(page - 1)} title="previous page (←)">‹</button>
              <span className="tabular-nums" style={{ color: "var(--muted)" }}>{page}/{pages}</span>
              <button className="px-1.5 py-0.5 border" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }} onClick={() => gotoPage(page + 1)} title="next page (→)">›</button>
            </>
          )}
          {downloadName && (
            <a href={src} download={downloadName} className="px-1.5 py-0.5 border"
              style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}
              onClick={() => { sound.download(); }}>
              download ↓
            </a>
          )}
          <a href={src} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 border"
            style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }} title="open original in a new tab">
            open ↗
          </a>
        </div>
        {!ready && !failed && (
          <div className="px-3 py-8 text-[12px]" style={{ color: "var(--muted)" }}>loading document…</div>
        )}
        {failed ? (
          <div className="px-3 py-8 text-[12.5px] space-y-2" style={{ color: "var(--fg-dim)" }}>
            <div>couldn't render inline — the original still opens fine.</div>
            <a href={src} target="_blank" rel="noreferrer" className="px-2 py-1 border text-[12px] inline-block"
              style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}>open original ↗</a>
          </div>
        ) : kind === "pdf" ? (
          <iframe
            title={title}
            src={`${src}#toolbar=0&navpanes=0&page=${page}&zoom=${fit ? "page-width" : zoom}`}
            className={ready ? "w-full border-0" : "hidden"}
            style={{ height: "62vh", background: "#fff" }}
            onLoad={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        ) : (
          <div className={`overflow-auto ${fit ? "" : "cursor-zoom-in"}`} style={{ maxHeight: "62vh" }}
            onClick={() => { if (!fit) { setZoom((z) => (z >= 150 ? 100 : 150)); } }}>
            <img
              src={src} alt={title}
              style={{ width: fit ? "100%" : `${zoom}%`, maxWidth: "none", background: "#fff" }}
              onLoad={() => setReady(true)}
              onError={() => setFailed(true)}
            />
          </div>
        )}
      </div>
      <div className="text-[11px]" style={{ color: "var(--muted)" }}>keys when focused: + − 0 fit(f){pages > 1 ? " · ← → pages" : ""}</div>
    </div>
  );
}
