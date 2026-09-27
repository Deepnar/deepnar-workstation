"use client";

// SIGNAL — a quiet constellation. Each star is a real project;
// click one to open it in the workstation. Hover for the one-liner.
import { useState } from "react";
import { useShell } from "@/lib/store";
import { projects } from "@/content/projects";
import { HOME } from "@/vfs/vfs";
import { sound } from "@/audio/engine";

const STARS = [
  { slug: "ice", x: 50, y: 34, r: 5 },
  { slug: "presentation-forge", x: 30, y: 52, r: 3.5 },
  { slug: "timetable-generator", x: 68, y: 55, r: 3.5 },
  { slug: "prompt-routing-classifier", x: 22, y: 30, r: 3 },
  { slug: "nexus", x: 76, y: 30, r: 3.5 },
  { slug: "civicresolve", x: 60, y: 74, r: 3 },
  { slug: "rapidrail", x: 40, y: 72, r: 3 },
  { slug: "iis-mini", x: 82, y: 62, r: 2.5 },
];

const LINKS: [string, string][] = [
  ["prompt-routing-classifier", "ice"],
  ["ice", "presentation-forge"],
  ["ice", "nexus"],
  ["timetable-generator", "rapidrail"],
  ["nexus", "iis-mini"],
  ["civicresolve", "rapidrail"],
];

const posOf = (slug: string) => STARS.find((s) => s.slug === slug)!;

export function Constellation() {
  const [hover, setHover] = useState<string | null>(null);
  const open = (slug: string) => {
    const p = projects.find((x) => x.slug === slug);
    if (!p) return;
    const s = useShell.getState();
    const bucket = p.bucket === "projects" ? "projects" : `projects/${p.bucket}`;
    s.openFile(`${HOME}/${bucket}/${p.slug}/README.md`, "markdown");
    s.setDesktopWs(1);
    s.setPhase("app");
    sound.fileOpen();
  };
  const hovered = projects.find((p) => p.slug === hover);
  return (
    <div className="h-full flex flex-col min-h-0" aria-label="project constellation">
      <div className="px-4 py-2 text-[12.5px] border-b shrink-0" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        <span className="font-bold" style={{ color: "var(--fg)" }}>SIGNAL</span>
        <span className="ml-2">the work, as a sky — click a star to open it</span>
      </div>
      <div className="flex-1 min-h-0 relative">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
          {LINKS.map(([a, b]) => {
            const A = posOf(a), B = posOf(b);
            return <line key={`${a}-${b}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="var(--border)" strokeWidth="0.25" opacity="0.8" />;
          })}
          {STARS.map((st) => (
            <g key={st.slug}>
              <circle cx={st.x} cy={st.y} r={st.r + 2.5} fill="transparent" />
              <circle
                cx={st.x} cy={st.y} r={hover === st.slug ? st.r + 0.8 : st.r}
                fill={hover === st.slug ? "var(--accent-soft)" : "var(--fg)"}
                opacity={hover === st.slug ? 1 : 0.85}
                className="constellation-twinkle cursor-pointer"
                style={{ animationDelay: `${st.x % 5}s` }}
                onMouseEnter={() => setHover(st.slug)}
                onMouseLeave={() => setHover(null)}
                onClick={() => open(st.slug)}
              >
                <title>{st.slug}</title>
              </circle>
              <text x={st.x} y={st.y + st.r + 3.4} textAnchor="middle" fontSize="2.6"
                fill={hover === st.slug ? "var(--accent-soft)" : "var(--muted)"}>
                {st.slug}
              </text>
            </g>
          ))}
        </svg>
        <div className="absolute bottom-3 inset-x-0 text-center text-[12.5px] px-6 h-10" aria-live="polite" style={{ color: "var(--icy)" }}>
          {hovered ? `${hovered.name} — ${hovered.blurb}` : "hover a star · click to open the README"}
        </div>
      </div>
    </div>
  );
}
