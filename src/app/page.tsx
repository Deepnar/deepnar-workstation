"use client";

import { useEffect } from "react";
import { useShell, hydratePrefs, type WorkspaceId } from "@/lib/store";
import { findNode } from "@/vfs/vfs";
import { SystemRoot, useAmbience } from "@/system/System";
import { sound } from "@/audio/engine";

const NUMS: WorkspaceId[] = ["home", "projects", "research", "git", "profile"];

function ensureApp() {
  const s = useShell.getState();
  if (s.phase !== "app") {
    try {
      localStorage.setItem("deepnar-seen", "1");
    } catch {
      /* private mode */
    }
    s.setPhase("app");
  }
}

export default function Page() {
  useAmbience();
  const motion = useShell((s) => s.settings.motion);

  useEffect(() => {
    try {
      document.documentElement.dataset.motion = motion ? "on" : "off";
    } catch {
      /* private mode */
    }
  }, [motion]);

  useEffect(() => {
    hydratePrefs();
    // deep links: ?open=~/projects/ice/README.md or #/projects/ice
    try {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.replace(/^#\/?/, "");
      const target = params.get("open") ?? (hash ? `~/home/deepnar/${hash}`.replace("~/home", "~") : null);
      if (target) {
        const path = target.startsWith("~") ? target.replace(/^~/, "/home/deepnar") : target;
        const node = findNode(path) ?? findNode(`/home/deepnar/${path.replace(/^\//, "")}`);
        if (node) {
          localStorage.setItem("deepnar-seen", "1");
          const s = useShell.getState();
          s.setPhase("app");
          s.openFile(node.path, node.kind);
          return;
        }
      }
      if (!localStorage.getItem("deepnar-seen")) return; // first visit → boot
      useShell.getState().setPhase("greeter");
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
      const s = useShell.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ensureApp(); s.toggle("paletteOpen"); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") { e.preventDefault(); ensureApp(); s.toggle("paletteOpen"); return; }
      if (e.key === "`" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ensureApp(); s.toggle("terminalOpen"); return; }
      if (e.key === "Escape") {
        if (s.paletteOpen) s.toggle("paletteOpen");
        else if (s.contactOpen) s.toggle("contactOpen");
        else if (s.settingsOpen) s.toggle("settingsOpen");
        else if (s.helpOpen) s.toggle("helpOpen");
        else if (s.overviewOpen) s.toggle("overviewOpen");
        else if (s.aiOpen && window.matchMedia("(max-width: 1023px)").matches) s.toggle("aiOpen");
        return;
      }
      if (typing || s.phase === "boot" || s.phase === "greeter") return;
      if (s.paletteOpen || s.overviewOpen || s.contactOpen || s.settingsOpen || s.helpOpen) return;
      if (/^[1-5]$/.test(e.key)) {
        ensureApp();
        const w = NUMS[Number(e.key) - 1];
        sound.tick(1);
        useShell.getState().go(w);
        return;
      }
      if (e.key === "?") { ensureApp(); s.toggle("helpOpen"); return; }
      if (e.key === "/") { e.preventDefault(); ensureApp(); if (!s.aiOpen) s.toggle("aiOpen"); return; }
      if (e.key === ":") {
        e.preventDefault();
        ensureApp();
        if (!s.terminalOpen) s.toggle("terminalOpen");
        setTimeout(() => document.querySelector<HTMLInputElement>('[aria-label="terminal input"]')?.focus(), 60);
        return;
      }
      // home quick actions (single keys, dashboard only)
      if (s.phase === "app" && s.workspace === "home" && !typing) {
        const map: Record<string, () => void> = {
          f: () => s.toggle("paletteOpen"),
          p: () => s.go("projects"),
          r: () => s.go("research"),
          o: () => s.go("git"),
          v: () => s.openFile("/home/deepnar/resume.pdf", "pdf"),
          a: () => s.go("profile"),
        };
        if (map[e.key]) {
          sound.select();
          map[e.key]();
          return;
        }
      }
      // optional vim keys
      if (s.settings.vimKeys && !typing && s.phase === "app") {
        const main = document.getElementById("main");
        if (e.key === "j") main?.scrollBy({ top: 60 });
        else if (e.key === "k") main?.scrollBy({ top: -60 });
        else if (e.key === "G") main?.scrollTo({ top: main.scrollHeight });
        else if (e.key === "g") {
          const now = Date.now();
          const last = (window as unknown as { __gg?: number }).__gg ?? 0;
          (window as unknown as { __gg?: number }).__gg = now;
          if (now - last < 400) main?.scrollTo({ top: 0 });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="h-dvh">
      <SystemRoot />
    </div>
  );
}
