"use client";

// Themed cursor: the dotted orbit-ring. Static orientation (rings don't
// turn), center hotspot so pointing is exact, slightly larger than native.
// Gets out of the way (native I-beam) over text inputs + terminals.
import { useEffect, useRef } from "react";

const TEXT_SEL = "input, textarea, [contenteditable], .xterm, .xterm *, iframe";

export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return; // touch: skip
    const el = ref.current;
    if (!el) return;
    let raf = 0, x = -100, y = -100;
    let visible = false;
    const show = (on: boolean) => {
      if (on === visible) return;
      visible = on;
      el.style.opacity = on ? "1" : "0";
      document.documentElement.classList.toggle("custom-cursor", on);
    };
    const onMove = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest?.(TEXT_SEL)) { show(false); return; }
      show(true);
      x = e.clientX;
      y = e.clientY;
    };
    const onLeave = () => show(false);
    const loop = () => {
      // exact: the ring center IS the pointer, no lag, pointing stays true
      el.style.transform = `translate(${x}px, ${y}px)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("custom-cursor");
    };
  }, []);
  return (
    <div ref={ref} aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] opacity-0"
      style={{ marginLeft: -17, marginTop: -17 }}>
      <svg width="34" height="34" viewBox="0 0 34 34">
        {/* dotted orbit: 20 dots */}
        <circle cx="17" cy="17" r="13.5" fill="none" stroke="#4a55a2" strokeWidth="2.6"
          strokeLinecap="round" strokeDasharray="0.1 4.14" />
        {/* open inner ring, gap at bottom-right */}
        <circle cx="17" cy="17" r="7" fill="none" stroke="#1a1c26" strokeWidth="3"
          strokeLinecap="round" strokeDasharray="36 8" strokeDashoffset="10" />
        {/* exact center point */}
        <circle cx="17" cy="17" r="1.6" fill="#1a1c26" />
      </svg>
    </div>
  );
}
