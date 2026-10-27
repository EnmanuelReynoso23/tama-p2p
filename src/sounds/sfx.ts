/**
 * Sonidos de Animo hechos con Web Audio (sin archivos).
 *
 * iPhone y Android no dejan sonar nada hasta que la persona toca la pantalla:
 * el contexto se crea y se "despierta" en el primer toque (unlockAudio).
 */

type Note = { f: number; d: number; type?: OscillatorType; slide?: number; gap?: number };

let ctx: AudioContext | null = null;
let enabled = true;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Llamar desde un toque o clic. En iOS ademas suena un silencio corto para abrir el audio. */
export function unlockAudio(): void {
  const a = audio();
  if (!a) return;
  if (a.state === 'suspended') void a.resume().catch(() => {});
  try {
    const buf = a.createBuffer(1, 1, 22050);
    const src = a.createBufferSource();
    src.buffer = buf;
    src.connect(a.destination);
    src.start(0);
  } catch {
    /* sin audio */
  }
}

export function setSfxEnabled(v: boolean): void {
  enabled = v;
}

function play(notes: Note[], volume = 0.12): void {
  if (!enabled) return;
  const a = audio();
  if (!a || a.state !== 'running') return;
  let t = a.currentTime + 0.01;
  for (const n of notes) {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = n.type ?? 'square';
    osc.frequency.setValueAtTime(n.f, t);
    if (n.slide) osc.frequency.exponentialRampToValueAtTime(n.slide, t + n.d);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + n.d);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + n.d + 0.02);
    t += n.d + (n.gap ?? 0.01);
  }
}

export const sfxButton = () => play([{ f: 660, d: 0.04 }], 0.06);
export const sfxFeed = () => play([{ f: 392, d: 0.06 }, { f: 523, d: 0.06 }, { f: 659, d: 0.09 }]);
export const sfxSnack = () => play([{ f: 784, d: 0.05 }, { f: 988, d: 0.07 }]);
export const sfxPlay = () => play([{ f: 523, d: 0.05 }, { f: 784, d: 0.05 }, { f: 659, d: 0.05 }, { f: 1047, d: 0.1 }]);
export const sfxClean = () => play([{ f: 1200, d: 0.18, type: 'triangle', slide: 300 }], 0.1);
export const sfxMedicine = () => play([{ f: 330, d: 0.08, type: 'triangle' }, { f: 440, d: 0.12, type: 'triangle' }]);
export const sfxSleep = () => play([{ f: 523, d: 0.12, type: 'sine' }, { f: 392, d: 0.18, type: 'sine' }]);
export const sfxWake = () => play([{ f: 392, d: 0.08, type: 'sine' }, { f: 659, d: 0.12, type: 'sine' }]);
export const sfxCaress = () => play([{ f: 880, d: 0.05, type: 'sine' }, { f: 1175, d: 0.07, type: 'sine' }], 0.08);
export const sfxRefuse = () => play([{ f: 220, d: 0.09 }, { f: 165, d: 0.12 }], 0.1);
export const sfxHatch = () => play([{ f: 262, d: 0.06 }, { f: 330, d: 0.06 }, { f: 392, d: 0.06 }, { f: 523, d: 0.16 }]);
export const sfxEvolve = () =>
  play([{ f: 392, d: 0.07 }, { f: 494, d: 0.07 }, { f: 587, d: 0.07 }, { f: 784, d: 0.07 }, { f: 988, d: 0.2 }]);
export const sfxToast = () => play([{ f: 988, d: 0.04, type: 'triangle' }], 0.05);
