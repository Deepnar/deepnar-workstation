"use client";

// Companion. Click it — it reacts. Hover — it peeks. Leave it alone —
// it naps. Bigger than before, and every state is a real interaction.
import { useEffect, useRef, useState } from "react";
import { useShell } from "@/lib/store";
import { sound } from "@/audio/engine";

const SPOTS = ["0px", "90px", "180px"];

const QUIPS = [
  "compiled without warnings.",
  "idle process. still on payroll.",
  "psst — try: ask why did you build ICE?",
  "I live in the statusline. rent-free.",
  "all systems nominal.",
  "the oss lanes are worth a look. just saying.",
  "I only eat properly indexed queries.",
];

export function Pet({ anchor }: { anchor: "desktop" | "status" }) {
  const { petOn, petMood, petAnchor, settings, notify } = useShell();
  const [blink, setBlink] = useState(false);
  const [spot, setSpot] = useState(0);
  const [asleep, setAsleep] = useState(false);
  const [jump, setJump] = useState(0);
  const [pets, setPets] = useState(0);
  const idleRef = useRef(0);
  const coolRef = useRef(0);

  useEffect(() => {
    if (!petOn || typeof document === "undefined") return;
    const wake = () => {
      idleRef.current = Date.now();
      setAsleep(false);
    };
    const onVis = () => {
      if (!document.hidden) wake();
    };
    window.addEventListener("mousemove", wake, { passive: true });
    window.addEventListener("keydown", wake);
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(() => {
      if (Date.now() - idleRef.current > 45000) setAsleep(true);
    }, 5000);
    idleRef.current = Date.now();
    return () => {
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, [petOn]);

  useEffect(() => {
    if (!petOn || !settings.motion || typeof document === "undefined" || anchor !== "desktop") return;
    const t = setInterval(() => {
      if (document.hidden) return;
      if (Math.random() < 0.4) setSpot((s) => (s + 1 + Math.floor(Math.random() * 2)) % SPOTS.length);
    }, 18000);
    return () => clearInterval(t);
  }, [petOn, settings.motion, anchor]);

  useEffect(() => {
    const t = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 4200);
    return () => clearInterval(t);
  }, []);

  if (!petOn || petAnchor !== anchor) return null;

  const sleeping = asleep || petMood === "sleep";
  const body = sleeping ? "var(--muted)" : petMood === "thinking" ? "var(--icy)" : petMood === "alert" ? "var(--warm)" : "var(--accent-soft)";

  const poke = () => {
    const now = Date.now();
    if (now - coolRef.current < 1200) return;
    coolRef.current = now;
    const s = useShell.getState();
    setJump((j) => j + 1);
    setPets((p) => p + 1);
    setAsleep(false);
    sound.pet();
    s.setPetMood("alert");
    setTimeout(() => useShell.getState().setPetMood("idle"), 1400);
    if (Math.random() < 0.45) s.notify(QUIPS[Math.floor(Math.random() * QUIPS.length)]);
  };

  const dims = anchor === "desktop" ? { w: 84, h: 60 } : { w: 26, h: 18 };
  const eyes = anchor === "desktop"
    ? (<><rect x="26" y="27" width="4.5" height="4.5" fill="#0b0c11" /><rect x="35" y="27" width="4.5" height="4.5" fill="#0b0c11" /></>)
    : (<><rect x="8" y="8.5" width="1.8" height="1.8" fill="#0b0c11" /><rect x="11.5" y="8.5" width="1.8" height="1.8" fill="#0b0c11" /></>);

  const svg = anchor === "desktop" ? (
    <svg width={dims.w} height={dims.h} viewBox="0 0 64 46" key={jump} className={jump ? "pet-jump" : undefined}>
      <ellipse cx="32" cy="42" rx="17" ry="2.5" fill="var(--border)" opacity="0.7" />
      <rect x="14" y="20" width="36" height="20" rx="10" fill={body} opacity="0.94" />
      <rect x={petMood === "peek" ? "21" : "8"} y="8" width="9" height="16" rx="4.5" fill={body} opacity="0.94" />
      <rect x="47" y="8" width="9" height="16" rx="4.5" fill={body} opacity="0.94" />
      {!sleeping && !blink && eyes}
      {sleeping && (<><text x="52" y="14" fontSize="11" fill="var(--muted)">z</text><text x="57" y="7" fontSize="8" fill="var(--muted)">z</text></>)}
      {petMood === "alert" && (<rect x="29" y="3" width="7" height="3" rx="1.5" fill="var(--warm)" />)}
      {pets >= 5 && !sleeping && (<rect x="29" y="33" width="8" height="3" rx="1.5" fill="#0b0c11" opacity="0.7" />)}
    </svg>
  ) : (
    <svg width={dims.w} height={dims.h} viewBox="0 0 20 14" key={jump} className={jump ? "pet-jump" : undefined}>
      <rect x="4" y="6" width="12" height="7" rx="3.5" fill={body} opacity="0.94" />
      <rect x={petMood === "peek" ? "6" : "2"} y="2" width="3" height="5" rx="1.5" fill={body} opacity="0.94" />
      <rect x="15" y="2" width="3" height="5" rx="1.5" fill={body} opacity="0.94" />
      {!sleeping && !blink && eyes}
      {sleeping && (<text x="16" y="5" fontSize="5" fill="var(--muted)">z</text>)}
    </svg>
  );

  const inner = anchor === "desktop" ? (
    <div className="transition-all duration-700 cursor-pointer hover:scale-105" style={{ transform: `translateX(-${SPOTS[spot]})` }}>{svg}</div>
  ) : (
    <span className="inline-flex items-center cursor-pointer">{svg}</span>
  );

  return (
    <button
      onClick={poke}
      onMouseEnter={() => useShell.getState().setPetMood("peek")}
      onMouseLeave={() => useShell.getState().setPetMood("idle")}
      title={sleeping ? "companion (sleeping — click to wake)" : `companion (petted ${pets}× — click)`}
      aria-label="interact with companion"
      className={anchor === "status" ? "px-1.5 shrink-0" : "p-1"}
      style={{ transform: petMood === "thinking" && anchor === "status" ? "translateY(-1px)" : "none" }}
    >
      {inner}
    </button>
  );
}
