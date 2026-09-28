import { dirOf, projects } from "@/content/projects";
import { useShell } from "@/lib/store";
import { findNode } from "@/vfs/vfs";
import { sound } from "@/audio/engine";

/** resolve a VFS path to its project root badge (files inherit project context) */
export function badgeForPath(path: string): { domain: string; modifier?: string } | null {
  let p = path;
  for (let i = 0; i < 6; i++) {
    const hit = projects.find((pr) => dirOf(pr) === p);
    if (hit) return { domain: hit.domain, modifier: hit.modifier };
    const slash = p.lastIndexOf("/");
    if (slash <= 0) return null;
    p = p.slice(0, slash);
  }
  return null;
}

const DOMAIN_COLOR: Record<string, string> = {
  "AI/ML": "var(--icy)",
  RESEARCH: "var(--accent-soft)",
  SOFTWARE: "var(--fg-dim)",
  SYSTEMS: "var(--muted)",
};

/** tiny monospace domain badge — filenames stay dominant */
export function DomainBadge({ domain, modifier }: { domain: string; modifier?: string }) {
  return (
    <span
      className="shrink-0 font-mono text-[9px] leading-none px-1 py-[2px] border"
      style={{ borderColor: "var(--border)", color: DOMAIN_COLOR[domain] ?? "var(--muted)" }}
      title={modifier ? `${domain} · ${modifier}` : domain}
    >
      {domain}{modifier ? ` · ${modifier}` : ""}
    </span>
  );
}

export function PathBadge({ path }: { path: string }) {
  const b = badgeForPath(path);
  if (!b) return null;
  return <DomainBadge domain={b.domain} modifier={b.modifier} />;
}

/** scroll to a `## ` anchor inside an open markdown buffer */
export function gotoNotable(target: string) {
  const { openFile } = useShell.getState();
  const n = findNode("/home/deepnar/about/notable.md");
  if (!n) return;
  sound.fileOpen();
  openFile(n.path, n.kind);
  setTimeout(() => {
    document.getElementById(`notable-${target}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, 120);
}

/** recognition badges on project headers → jump into notable.md */
export function RecognitionBadges({ items }: { items: { name: string; stage?: string; year?: number; target?: string }[] }) {
  if (!items.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1.5 items-center">
      {items.map((r) => (
        <button
          key={r.name}
          className="font-mono text-[9.5px] px-1.5 py-[3px] border hover:underline"
          style={{ borderColor: "var(--border)", color: "var(--warm)", background: "transparent" }}
          title={r.stage ?? r.name}
          onClick={() => { if (r.target) gotoNotable(r.target); }}
        >
          {r.name}
        </button>
      ))}
    </span>
  );
}
