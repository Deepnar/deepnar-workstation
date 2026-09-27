"use client";

import { useEffect } from "react";
import { useShell } from "@/lib/store";

/** tiny terminal companion. rests on the statusline; sleeps when idle. */
export function Pet() {
  const { petMood, setPetMood } = useShell();

  useEffect(() => {
    if (petMood !== "idle") return;
    const id = setTimeout(() => setPetMood("sleep"), 25000);
    return () => clearTimeout(id);
  }, [petMood, setPetMood]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setPetMood("sleep");
      else setPetMood("idle");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [setPetMood]);

  const eye = petMood === "sleep" ? "var(--muted)" : petMood === "alert" ? "var(--warm)" : petMood === "thinking" ? "var(--icy)" : "var(--accent)";
  return (
    <span className="flex items-center gap-1 select-none" title={`companion: ${petMood}`} aria-label={`companion ${petMood}`}>
      {petMood === "sleep" ? (
        <span className="pet-zzz text-[10px]" style={{ color: "var(--muted)" }}><span>z</span><span>z</span><span>z</span></span>
      ) : petMood === "thinking" ? (
        <span className="text-[10px]" style={{ color: "var(--icy)" }}>…</span>
      ) : null}
      <svg width="26" height="16" viewBox="0 0 26 16" className={petMood === "sleep" ? "" : "pet-bob"} aria-hidden>
        <rect x="4" y="6" width="18" height="8" rx="3" fill="none" stroke="var(--muted)" strokeWidth="1.4" />
        <rect x="6" y="2" width="4" height="5" rx="1" fill="none" stroke="var(--muted)" strokeWidth="1.4" />
        <rect x="16" y="2" width="4" height="5" rx="1" fill="none" stroke="var(--muted)" strokeWidth="1.4" />
        <rect x="23" y="4" width="2" height="5" rx="1" fill="none" stroke="var(--muted)" strokeWidth="1.2" />
        {petMood === "sleep" ? (
          <>
            <line x1="9" y1="10" x2="11" y2="10" stroke="var(--muted)" strokeWidth="1.2" />
            <line x1="15" y1="10" x2="17" y2="10" stroke="var(--muted)" strokeWidth="1.2" />
          </>
        ) : (
          <>
            <rect x="9" y="9" width="2.4" height="2.4" rx="0.6" fill={eye} />
            <rect x="14.6" y="9" width="2.4" height="2.4" rx="0.6" fill={eye} />
          </>
        )}
      </svg>
    </span>
  );
}
