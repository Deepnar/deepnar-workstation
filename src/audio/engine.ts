// Procedural UI audio. Web Audio only, no assets. OFF by default; every cue
// has a visual twin. Fail silent everywhere.
import { useShell } from "@/lib/store";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambientNodes: { stop: () => void } | null = null;

function ac(): AudioContext | null {
  try {
    if (!useShell.getState().settings.sound) return null;
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function vol(): number {
  return useShell.getState().settings.volume ?? 0.5;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.08, when = 0, slideTo?: number, pan = 0) {
  const c = ac();
  if (!c || !master) return;
  try {
    const t0 = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain * vol(), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
    let head: AudioNode = g;
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-0.6, Math.min(0.6, pan));
      g.connect(p);
      head = p;
    }
    o.connect(g);
    head.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  } catch {
    /* silent */
  }
}

function noise(dur: number, cutoff = 1800, gain = 0.05, when = 0) {
  const c = ac();
  if (!c || !master) return;
  try {
    const t0 = c.currentTime + when;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(gain * vol(), t0);
    g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
  } catch {
    /* silent */
  }
}

export const sound = {
  enter() { tone(196, 0.16, "sine", 0.07); tone(294, 0.2, "sine", 0.05, 0.09); },
  appOpen() { noise(0.07, 900, 0.09); tone(140, 0.12, "triangle", 0.09, 0.02); },
  appClose() { tone(140, 0.1, "triangle", 0.07); noise(0.06, 700, 0.06, 0.05); },
  tick(dir: 1 | -1 = 1) { tone(dir > 0 ? 660 : 520, 0.05, "sine", 0.045, 0, undefined, dir * 0.35); },
  fileOpen() { noise(0.03, 2400, 0.05); tone(880, 0.05, "sine", 0.04, 0.02); },
  fileClose() { tone(620, 0.06, "sine", 0.04); },
  palette() { tone(440, 0.07, "sine", 0.04, 0, 660); },
  select() { tone(740, 0.05, "sine", 0.05); },
  success() { tone(980, 0.06, "sine", 0.04); },
  error() { tone(160, 0.14, "sine", 0.09); },
  copy() { noise(0.03, 3000, 0.05); tone(1200, 0.05, "sine", 0.035, 0.03); },
  download() { tone(520, 0.1, "sine", 0.06, 0, 780); },
  notify() { tone(660, 0.12, "sine", 0.05); tone(880, 0.16, "sine", 0.045, 0.11); },
  relay() { noise(0.04, 1200, 0.1); tone(220, 0.06, "triangle", 0.06, 0.02); },
  pet() { tone(1180, 0.07, "sine", 0.03, 0, 1560); },
};

export const ambience = {
  start() {
    const c = ac();
    if (!c || !master || ambientNodes) return;
    try {
      const g = c.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.05 * vol(), c.currentTime + 1.2);
      const o1 = c.createOscillator();
      o1.type = "sine";
      o1.frequency.value = 55;
      const o2 = c.createOscillator();
      o2.type = "sine";
      o2.frequency.value = 82.5;
      const g2 = c.createGain();
      g2.gain.value = 0.4;
      o1.connect(g);
      o2.connect(g2);
      g2.connect(g);
      g.connect(master);
      o1.start();
      o2.start();
      let dead = false;
      ambientNodes = {
        stop: () => {
          if (dead) return;
          dead = true;
          try {
            g.gain.linearRampToValueAtTime(0, c.currentTime + 0.4);
            setTimeout(() => { try { o1.stop(); o2.stop(); } catch { /* noop */ } }, 600);
          } catch {
            /* noop */
          }
          ambientNodes = null;
        },
      };
    } catch {
      /* silent */
    }
  },
  stop() {
    ambientNodes?.stop();
  },
};

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    try {
      if (document.hidden) {
        ambience.stop();
        void ctx?.suspend();
      } else if (useShell.getState().settings.ambient && useShell.getState().settings.sound) {
        ambience.start();
      }
    } catch {
      /* silent */
    }
  });
}
