/* ------------------------------------------------------------------ */
/*  Web Audio SFX — 8-bit chiptune-style code-generated SFX (no files). */
/* ------------------------------------------------------------------ */

let _ctx: AudioContext | null = null;
let _enabled = true;

export function setSfxEnabled(v: boolean): void {
  _enabled = v;
}

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_enabled) return null;
  if (!_ctx) {
    try {
      const AC = (window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext);
      if (!AC) return null;
      _ctx = new AC();
    } catch {
      return null;
    }
  }
  if (_ctx && _ctx.state === 'suspended') {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  dur: number;
  vol?: number;
  slideTo?: number;
  delay?: number;
  lfoHz?: number;
  lfoDepth?: number;
}

function tone(opts: ToneOpts): void {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? 'square';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, opts.slideTo),
      t0 + opts.dur,
    );
  }
  if (opts.lfoHz !== undefined && opts.lfoDepth !== undefined) {
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(opts.lfoHz, t0);
    lfoGain.gain.setValueAtTime(opts.lfoDepth, t0);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + opts.dur + 0.01);
  }
  const peak = opts.vol ?? 0.08;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.02);
}

function noise(dur: number, vol = 0.06, filterFreq = 1200, delay = 0): void {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(filterFreq, t0);
  filter.Q.value = 0.6;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/* -------- individual SFX -------- */

export function sfxFeed(): void {
  tone({ freq: 523, type: 'square', dur: 0.08, vol: 0.07 });
  tone({ freq: 784, type: 'square', dur: 0.12, vol: 0.06, delay: 0.07 });
  noise(0.06, 0.04, 800, 0.04);
}

export function sfxSnack(): void {
  tone({ freq: 880, type: 'triangle', dur: 0.07, vol: 0.06 });
  tone({ freq: 1175, type: 'triangle', dur: 0.09, vol: 0.05, delay: 0.06 });
}

export function sfxRefuse(): void {
  tone({ freq: 220, type: 'square', dur: 0.16, vol: 0.08, slideTo: 110 });
}

export function sfxPlayStart(): void {
  tone({ freq: 440, type: 'square', dur: 0.08, vol: 0.06 });
  tone({ freq: 660, type: 'square', dur: 0.08, vol: 0.06, delay: 0.07 });
  tone({ freq: 880, type: 'square', dur: 0.1, vol: 0.06, delay: 0.14 });
}

export function sfxCatchBerry(scoreDelta: number): void {
  const base = 660 + Math.min(6, scoreDelta) * 60;
  tone({ freq: base, type: 'square', dur: 0.06, vol: 0.05 });
  tone({ freq: base * 1.5, type: 'triangle', dur: 0.05, vol: 0.04, delay: 0.04 });
}

export function sfxPlayEnd(finalScore: number): void {
  if (finalScore <= 0) {
    tone({ freq: 330, type: 'sawtooth', dur: 0.2, vol: 0.06, slideTo: 165 });
    return;
  }
  const notes = finalScore >= 5
    ? [523, 659, 784, 1047]
    : finalScore >= 3
    ? [523, 659, 784]
    : [523, 659];
  notes.forEach((f, i) =>
    tone({ freq: f, type: 'square', dur: 0.1, vol: 0.06, delay: i * 0.09 }),
  );
}

export function sfxClean(): void {
  noise(0.25, 0.05, 2400);
  tone({ freq: 1200, type: 'sine', dur: 0.18, vol: 0.04, slideTo: 1800, lfoHz: 8, lfoDepth: 60 });
}

export function sfxSleep(): void {
  tone({ freq: 440, type: 'sine', dur: 0.45, vol: 0.05, slideTo: 220 });
  tone({ freq: 330, type: 'triangle', dur: 0.3, vol: 0.04, delay: 0.15, slideTo: 165 });
}

export function sfxWake(): void {
  tone({ freq: 330, type: 'triangle', dur: 0.1, vol: 0.06 });
  tone({ freq: 494, type: 'triangle', dur: 0.1, vol: 0.06, delay: 0.08 });
  tone({ freq: 659, type: 'triangle', dur: 0.14, vol: 0.06, delay: 0.16 });
}

export function sfxHatch(): void {
  tone({ freq: 440, type: 'square', dur: 0.08, vol: 0.08 });
  tone({ freq: 660, type: 'square', dur: 0.08, vol: 0.08, delay: 0.08 });
  noise(0.1, 0.05, 3200, 0.12);
  tone({ freq: 880, type: 'square', dur: 0.08, vol: 0.08, delay: 0.18 });
  tone({ freq: 1047, type: 'triangle', dur: 0.18, vol: 0.07, delay: 0.26 });
}

export function sfxEvolve(): void {
  for (let i = 0; i < 5; i++) {
    tone({
      freq: 400 + i * 160, type: 'square', dur: 0.09, vol: 0.05, delay: i * 0.06, lfoHz: 12, lfoDepth: 30,
    });
  }
  tone({ freq: 1760, type: 'triangle', dur: 0.3, vol: 0.06, delay: 0.35 });
}

export function sfxMedicine(): void {
  tone({ freq: 660, type: 'triangle', dur: 0.1, vol: 0.06 });
  tone({ freq: 990, type: 'triangle', dur: 0.14, vol: 0.06, delay: 0.09 });
  noise(0.08, 0.04, 900, 0.16);
}

export function sfxHungry(): void {
  tone({ freq: 220, type: 'square', dur: 0.18, vol: 0.06, slideTo: 165 });
  tone({ freq: 165, type: 'square', dur: 0.18, vol: 0.06, delay: 0.18, slideTo: 110 });
}

export function sfxToast(): void {
  tone({ freq: 880, type: 'square', dur: 0.04, vol: 0.05 });
  tone({ freq: 1175, type: 'square', dur: 0.06, vol: 0.05, delay: 0.04 });
}

export function sfxStroke(): void {
  tone({ freq: 1320, type: 'triangle', dur: 0.05, vol: 0.04 });
}

export function sfxButton(): void {
  tone({ freq: 660, type: 'square', dur: 0.03, vol: 0.04 });
}

export function sfxCooldown(): void {
  tone({ freq: 200, type: 'sine', dur: 0.06, vol: 0.04 });
}
