"use client";

// Compositor notifications · contact flow · settings · help.
import { useState } from "react";
import { useShell } from "@/lib/store";
import { profile } from "@/content/profile";
import { sound, ambience } from "@/audio/engine";

export function Toasts({ fixed = false }: { fixed?: boolean }) {
  const { toasts, dismissToast } = useShell();
  if (!toasts.length) return null;
  return (
    <div className={`${fixed ? "fixed top-12 right-3 z-[65]" : "absolute top-12 right-3 z-30"} space-y-2 w-64`} role="status" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} onClick={() => dismissToast(t.id)}
          className="w-full text-left px-3 py-2 text-[12px] border toast-in"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--fg-dim)" }}>
          <span style={{ color: "var(--ok)" }}>● </span>{t.text}
        </button>
      ))}
    </div>
  );
}

export function Contact() {
  const { contactOpen, toggle, notify } = useShell();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  if (!contactOpen) return null;
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
    sound.copy();
    notify(`${label} copied`);
  };
  const rows: [string, string, string?][] = [
    ["github", "Deepnar", profile.links.github],
    ["linkedin", "Deepesh Sonar", profile.links.linkedin],
    ["email", "18deepnar@gmail.com", undefined],
    ["x", "DeepnarS", profile.links.x],
    ["orcid", "0009-0008-1762-4246", profile.links.orcid],
  ];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="contact">
      <div className="absolute inset-0" style={{ background: "rgba(3,4,8,0.6)" }} onClick={() => toggle("contactOpen")} />
      <div className="relative border w-full max-w-md p-5" style={{ background: "var(--surface)", borderColor: "var(--accent)" }}>
        <div className="text-[11px] uppercase tracking-[0.16em] mb-3" style={{ color: "var(--muted)" }}>contact</div>
        <div className="space-y-1 mb-4 text-[13px]">
          {rows.map(([k, v, url]) => (
            <div key={k} className="flex items-center gap-3 px-1 py-1">
              <span className="w-20 shrink-0" style={{ color: "var(--muted)" }}>{k}</span>
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="truncate hover:underline" style={{ color: "var(--icy)" }}>{v} ↗</a>
              ) : (
                <span className="truncate" style={{ color: "var(--fg)" }}>{v}</span>
              )}
              {k === "email" && (
                <button onClick={() => void copy(v, "email")} className="ml-auto text-[11.5px] px-2 py-0.5 border shrink-0" style={{ borderColor: "var(--border)", color: "var(--accent-soft)" }}>copy</button>
              )}
            </div>
          ))}
        </div>
        <div className="text-[11px] uppercase tracking-[0.16em] mb-2" style={{ color: "var(--muted)" }}>compose (opens your mail app)</div>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="subject" aria-label="email subject"
          className="w-full px-2.5 py-1.5 text-[12.5px] bg-transparent outline-none border mb-2" style={{ borderColor: "var(--border)", color: "var(--fg)" }} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="message" rows={3} aria-label="email message"
          className="w-full px-2.5 py-1.5 text-[12.5px] bg-transparent outline-none border mb-3 resize-none" style={{ borderColor: "var(--border)", color: "var(--fg)" }} />
        <div className="flex gap-2">
          <a className="px-4 py-1.5 text-[12.5px] border" style={{ borderColor: "var(--accent)", color: "var(--accent-soft)" }}
            href={`mailto:18deepnar@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>
            compose email →
          </a>
          <button onClick={() => toggle("contactOpen")} className="px-4 py-1.5 text-[12.5px]" style={{ color: "var(--muted)" }}>close</button>
        </div>
      </div>
    </div>
  );
}

export function Settings() {
  const { settingsOpen, toggle, settings, setSettings, petOn, setPet, setPhase, notify } = useShell();
  if (!settingsOpen) return null;
  const row = "flex items-center justify-between gap-4 py-1.5 text-[12.5px]";
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 p-4" role="dialog" aria-modal="true" aria-label="settings">
      <div className="absolute inset-0" style={{ background: "rgba(3,4,8,0.6)" }} onClick={() => toggle("settingsOpen")} />
      <div className="relative border w-full max-w-sm p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="text-[11px] uppercase tracking-[0.16em] mb-2" style={{ color: "var(--muted)" }}>settings</div>
        
        {([["motion", "motion + transitions"], ["vimKeys", "vim keys (j/k, gg/G, /)"], ["pet", "companion"], ["sound", "sound effects"], ["ambient", "ambient room tone"]] as const).map(([k, label]) => {
          const on = k === "pet" ? petOn : settings[k as keyof typeof settings];
          return (
            <div key={k} className={row}><span style={{ color: "var(--fg-dim)" }}>{label}</span>
              <button
                onClick={() => {
                  if (k === "pet") setPet(!petOn);
                  else {
                    const next = !settings[k as keyof typeof settings];
                    if (k === "sound" && next === false) ambience.stop();
                    setSettings({ [k]: next, ...(k === "ambient" && next ? { sound: true } : {}) });
                  }
                  sound.select();
                }}
                className="px-2.5 py-1 border text-[12px]" style={{ borderColor: on ? "var(--accent)" : "var(--border)", color: on ? "var(--accent-soft)" : "var(--muted)" }}>
                {on ? "on" : "off"}
              </button>
            </div>
          );
        })}
        <div className={row}><span style={{ color: "var(--fg-dim)" }}>volume</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.volume} aria-label="volume"
            onChange={(e) => setSettings({ volume: Number(e.target.value) })}
            className="w-32 accent-[var(--accent)]" />
        </div>
        <div className={row}><span style={{ color: "var(--fg-dim)" }}>companion roams desktop</span>
          <button
            onClick={() => { setSettings({ petRoam: !settings.petRoam }); sound.select(); }}
            className="px-2.5 py-1 border text-[12px]" style={{ borderColor: settings.petRoam ? "var(--accent)" : "var(--border)", color: settings.petRoam ? "var(--accent-soft)" : "var(--muted)" }}>
            {settings.petRoam ? "on" : "off"}
          </button>
        </div>
        <div className={row}><span style={{ color: "var(--fg-dim)" }}>companion size</span>
          <div className="flex gap-1">
            {([0.75, 1, 1.25] as const).map((s) => (
              <button key={s} onClick={() => { setSettings({ petSize: s }); sound.select(); }}
                className="px-2.5 py-1 border text-[12px]" style={{ borderColor: settings.petSize === s ? "var(--accent)" : "var(--border)", color: settings.petSize === s ? "var(--accent-soft)" : "var(--muted)" }}>
                {s === 0.75 ? "s" : s === 1 ? "m" : "l"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => { try { localStorage.removeItem("deepnar-seen"); } catch { /* noop */ } notify("boot will replay next visit"); toggle("settingsOpen"); setPhase("boot"); }}
            className="px-3 py-1.5 border text-[12px]" style={{ borderColor: "var(--border)", color: "var(--fg-dim)" }}>replay boot</button>
          <button onClick={() => toggle("settingsOpen")} className="px-3 py-1.5 text-[12px]" style={{ color: "var(--muted)" }}>close</button>
        </div>
      </div>
    </div>
  );
}

const KEYS: [string, string][] = [
  ["alt+1·2·3", "desktop spaces"],
  ["ctrl+k / ctrl+p", "finder"],
  ["ctrl+`", "terminal tab"],
  ["/", "agent tab"],
  ["?", "this help"],
  ["esc", "close / unfocus"],
  ["middle-click", "close tab"],
  ["↑↓ / tab", "terminal history / complete"],
  ["ctrl+l · c", "clear terminal"],
  ["j k h l · enter", "file browser"],
  ["f p r o v a c", "home quick actions"],
  [":e · :bd", "open · close buffer"],
];

export function Help() {
  const { helpOpen, toggle } = useShell();
  if (!helpOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="keybindings">
      <div className="absolute inset-0" style={{ background: "rgba(3,4,8,0.6)" }} onClick={() => toggle("helpOpen")} />
      <div className="relative border w-full max-w-sm p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="text-[11px] uppercase tracking-[0.16em] mb-3" style={{ color: "var(--muted)" }}>controls — mouse works everywhere</div>
        <div className="space-y-1.5 text-[12.5px]">
          {KEYS.map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <span className="w-36 shrink-0" style={{ color: "var(--icy)" }}>{k}</span>
              <span style={{ color: "var(--fg-dim)" }}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={() => toggle("helpOpen")} className="mt-4 px-4 py-1.5 text-[12.5px] border" style={{ borderColor: "var(--border)", color: "var(--fg-dim)" }}>close</button>
      </div>
    </div>
  );
}
