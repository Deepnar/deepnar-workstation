"use client";

import { useEffect } from "react";
import { useShell, type WorkspaceId } from "@/lib/store";
import { workspaces } from "@/content/navigation";
import { TopBar, Explorer, Statusline, Overview, Help } from "@/components/Shell";
import { Terminal } from "@/components/Terminal";
import { Assistant } from "@/components/Assistant";
import { Palette } from "@/components/Palette";
import { Boot } from "@/components/Boot";
import { WorkspaceView } from "@/components/Views";

const NUMS = ["home", "projects", "research", "oss", "about", "notes", "contact", "ai"];

export default function Page() {
  const { go, toggle, aiOpen, booted } = useShell();

  // Hydrate persisted prefs after mount (kept out of SSR to avoid mismatch).
  useEffect(() => {
    const s = useShell.getState();
    try {
      if (document.documentElement.dataset.theme === "light") s.setTheme("light");
      if (localStorage.getItem("deepnar-pet") === "off") s.setPet(false);
      // Small screens: content first, terminal on demand (no stored pref → default closed).
      if (window.innerWidth < 768 && localStorage.getItem("deepnar-terminal") === null) s.toggle("terminalOpen");
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA";
      const s = useShell.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); s.toggle("paletteOpen"); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") { e.preventDefault(); s.toggle("paletteOpen"); return; }
      if (e.key === "`" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); s.toggle("terminalOpen"); return; }
      if (e.key === "Escape") {
        if (s.paletteOpen) s.toggle("paletteOpen");
        else if (s.overviewOpen) s.toggle("overviewOpen");
        else if (s.helpOpen) s.toggle("helpOpen");
        else if (s.aiOpen && window.matchMedia("(max-width: 1023px)").matches) s.toggle("aiOpen");
        return;
      }
      if (typing || !s.booted) return;
      if (/^[1-8]$/.test(e.key)) { go(NUMS[Number(e.key) - 1] as WorkspaceId); return; }
      if (e.key === "?") { s.toggle("helpOpen"); return; }
      if (e.key === "/") { e.preventDefault(); if (!s.aiOpen) s.toggle("aiOpen"); return; }
      if (e.key === ":") {
        e.preventDefault();
        if (!s.terminalOpen) s.toggle("terminalOpen");
        setTimeout(() => document.querySelector<HTMLInputElement>('[aria-label="terminal input"]')?.focus(), 50);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggle, aiOpen, booted]);

  void workspaces;
  return (
    <div className="h-dvh flex flex-col">
      <Boot />
      <TopBar />
      <div className="flex-1 flex gap-1.5 p-1.5 min-h-0">
        <Explorer />
        <main id="main" className="pane flex-1 min-w-0 p-3 sm:p-4 overflow-hidden" aria-label="workspace">
          <WorkspaceView />
        </main>
        {aiOpen && (
          <aside className="pane w-72 shrink-0 p-2.5 max-lg:fixed max-lg:right-2 max-lg:top-12 max-lg:bottom-24 max-lg:z-40 max-lg:w-80 overflow-hidden" aria-label="assistant pane">
            <button onClick={() => toggle("aiOpen")} className="lg:hidden float-right px-2 py-0.5 rounded text-[11px] cursor-pointer hover:bg-[var(--raised)]" style={{ color: "var(--muted)" }} aria-label="close assistant">esc ✕</button>
            <Assistant />
          </aside>
        )}
      </div>
      <div className="px-1.5 pb-1.5 shrink-0">
        <Terminal />
      </div>
      <Statusline />
      <Palette />
      <Overview />
      <Help />
    </div>
  );
}
