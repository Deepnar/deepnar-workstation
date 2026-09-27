"use client";

import { useEffect } from "react";
import { useShell, hydratePrefs } from "@/lib/store";
import { findNode, HOME } from "@/vfs/vfs";
import { SystemRoot, useAmbience } from "@/system/System";
import { sound } from "@/audio/engine";

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

function focusTerminal() {
  setTimeout(() => {
    try {
      const boxes = [...document.querySelectorAll('[data-testid^="xterm-"]')];
      const visible = boxes.find((b) => (b as HTMLElement).offsetParent !== null);
      const area = (visible ?? boxes[0])?.querySelector(".xterm-helper-textarea") as HTMLElement | null;
      area?.focus?.();
    } catch {
      /* noop */
    }
  }, 80);
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
    // deep links: ?open=~/projects/ice/README.md
    try {
      const params = new URLSearchParams(window.location.search);
      const target = params.get("open");
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
      const inTerm = (t as HTMLElement).classList?.contains("xterm-helper-textarea");
      const s = useShell.getState();

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ensureApp(); s.toggle("paletteOpen"); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") { e.preventDefault(); ensureApp(); s.toggle("paletteOpen"); return; }
      if (e.key === "`" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        ensureApp();
        s.setDesktopWs(1);
        s.openDock("term");
        s.setMode("TERMINAL");
        focusTerminal();
        return;
      }
      // close active buffer / dock tab (browser may still claim this combo)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "w") {
        const st = useShell.getState();
        if (st.activeBuffer || (st.activeDock && !typing)) {
          e.preventDefault();
          e.stopPropagation();
          if (st.activeBuffer) { sound.fileClose(); st.closeBuffer(st.activeBuffer); }
          else if (st.activeDock) { sound.fileClose(); st.closeDock(st.activeDock); }
          return;
        }
      }
      // real desktop spaces — never hijack plain number typing
      if (e.altKey && ["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        s.setDesktopWs(Number(e.key) as 1 | 2 | 3);
        sound.tick(1);
        return;
      }
      if (e.key === "Escape") {
        if (inTerm) {
          (t as HTMLElement).blur();
          s.setMode("BROWSE");
          return;
        }
        if (s.paletteOpen) s.toggle("paletteOpen");
        else if (s.contactOpen) s.toggle("contactOpen");
        else if (s.settingsOpen) s.toggle("settingsOpen");
        else if (s.helpOpen) s.toggle("helpOpen");
        return;
      }
      if (typing || inTerm || s.phase === "boot" || s.phase === "greeter") return;
      if (s.paletteOpen || s.contactOpen || s.settingsOpen || s.helpOpen) return;
      if (e.key === "?") { ensureApp(); s.toggle("helpOpen"); return; }
      if (e.key === "/") {
        e.preventDefault();
        ensureApp();
        s.setDesktopWs(1);
        s.openDock("agent");
        s.setMode("AGENT");
        return;
      }
      if (e.key === ":") {
        e.preventDefault();
        ensureApp();
        s.setDesktopWs(1);
        s.openDock("term");
        s.setMode("TERMINAL");
        focusTerminal();
        return;
      }
      // home quick actions (single keys, dashboard only)
      if (s.phase === "app" && s.desktopWs === 1 && s.cwd === HOME && !s.activeBuffer && !typing) {
        const map: Record<string, () => void> = {
          f: () => s.toggle("paletteOpen"),
          p: () => s.navTo(`${HOME}/projects`),
          r: () => s.navTo(`${HOME}/research/lsrep-ice`),
          o: () => s.navTo(`${HOME}/oss`),
          v: () => s.openFile(`${HOME}/resume.pdf`, "pdf"),
          a: () => s.navTo(`${HOME}/about`),
          c: () => s.toggle("contactOpen"),
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
