import { useEffect, useRef } from 'react';
import { moodOf, STAGE_STARTS } from '../../core/animo.js';
import { frameMs, LEAFLET, petFrames, POOP, SPRITE_SIZE } from '../../core/sprites.js';
import { spriteCanvas } from '../sprites/draw';
import { usePetStore, type PetEventKind } from '../store/usePetStore';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/** Escena en pixeles logicos; se agranda entera para que se vea nitida. */
const W = 96;
const H = 72;
const GROUND = 60;
const PET = SPRITE_SIZE * 2;

type Particle = { kind: 'leaf' | 'bubble' | 'berry'; x: number; y: number; vx: number; vy: number; born: number; life: number };

function isNight(force: boolean): boolean {
  if (force) return true;
  const h = new Date().getHours();
  return h < 7 || h >= 19;
}

/**
 * Pantalla de la mascota: cielo, suelo, la mascota animada, sus cacas y
 * efectos cuando la cuidas. Todo lo lee del store en cada cuadro.
 */
export default function PetCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const cvs = ref.current;
    const ctx = cvs?.getContext('2d');
    if (!cvs || !ctx) return;

    let k = 1;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const cssW = cvs.clientWidth || W * 3;
      k = Math.max(1, Math.ceil((cssW * dpr) / W));
      cvs.width = W * k;
      cvs.height = H * k;
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(cvs);

    const particles: Particle[] = [];
    let lastEventAt = usePetStore.getState().lastEvent?.at ?? 0;
    let action: { kind: PetEventKind; at: number } | null = null;

    const spawn = (kind: Particle['kind'], n: number, t: number) => {
      for (let i = 0; i < n; i++)
        particles.push({
          kind,
          x: W / 2 - 10 + Math.random() * 20,
          y: kind === 'berry' ? 4 : GROUND - PET / 2,
          vx: kind === 'berry' ? 0 : (Math.random() - 0.5) * 14,
          vy: kind === 'berry' ? 60 : -18 - Math.random() * 14,
          born: t + i * 60,
          life: kind === 'berry' ? 650 : 1100,
        });
    };

    const px = (color: string, x: number, y: number, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    };

    let raf = 0;
    let lastDraw = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - lastDraw < (reduced ? 500 : 50)) return;
      lastDraw = t;
      const s = usePetStore.getState();
      const wall = Date.now();

      // Reacciona a lo ultimo que paso.
      const ev = s.lastEvent;
      if (ev && ev.at !== lastEventAt) {
        lastEventAt = ev.at;
        action = { kind: ev.kind, at: t };
        if (!reduced) {
          if (ev.kind === 'caress' || ev.kind === 'play' || ev.kind === 'hatch' || ev.kind === 'evolve')
            spawn('leaf', ev.kind === 'caress' ? 2 : 6, t);
          if (ev.kind === 'clean') spawn('bubble', 6, t);
          if (ev.kind === 'meal' || ev.kind === 'snack') spawn('berry', 1, t);
        }
      }
      const since = action ? t - action.at : Infinity;

      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.imageSmoothingEnabled = false;

      // Cielo y suelo. De noche el cielo es oscuro con luna (sin otros adornos).
      const night = isNight(s.settings.forceNight) || s.isAsleep;
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, night ? '#2e2a58' : '#bfe7fb');
      sky.addColorStop(1, night ? '#4d4682' : '#eaf8ff');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, GROUND);
      ctx.fillStyle = night ? '#f3efd2' : '#ffd45c';
      ctx.beginPath();
      ctx.arc(W - 14, 12, 6, 0, Math.PI * 2);
      ctx.fill();
      if (night) {
        ctx.fillStyle = '#2e2a58';
        ctx.beginPath();
        ctx.arc(W - 11, 10, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      px(night ? '#3f5e45' : '#b6e39b', 0, GROUND, W, H - GROUND);
      px(night ? '#557a5b' : '#d3f1bf', 0, GROUND, W, 2);
      for (let x = 3; x < W; x += 9) px(night ? '#355239' : '#93cc78', x, GROUND + 5 + (x % 4), 2, 1);

      // Mascota
      const mood = moodOf(s);
      const frames = petFrames(s.hatched ? s.stage : 'egg', s.adultVariant, mood);
      const idx = reduced ? 0 : Math.floor(wall / frameMs(mood)) % frames.length;
      let dx = 0;
      let dy = 0;
      if (action && since < 700) {
        const p = since / 700;
        if (action.kind === 'play' || action.kind === 'hatch' || action.kind === 'evolve')
          dy = -Math.round(Math.abs(Math.sin(p * Math.PI * 2)) * 8);
        else if (action.kind === 'refuse') dx = Math.round(Math.sin(p * Math.PI * 6) * 2);
        else if (action.kind === 'caress') dy = -Math.round(Math.sin(p * Math.PI) * 2);
      }
      const petX = (W - PET) / 2 + dx;
      const petY = GROUND - PET + 2 + dy;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(petX + 10, GROUND, PET - 20, 2);
      ctx.drawImage(spriteCanvas(frames[idx]), petX, petY, PET, PET);

      // Cacas a la derecha
      for (let i = 0; i < s.poops; i++) {
        const c = spriteCanvas(POOP);
        ctx.drawImage(c, W - 14 - (i % 2) * 9, GROUND - 6 - Math.floor(i / 2) * 7 + 2);
      }

      // Huevo: barra de cuanto falta para nacer.
      if (!s.hatched) {
        const p = Math.min(1, s.ageMs / STAGE_STARTS.baby);
        px('#2b2138', 20, H - 6, W - 40, 4);
        px('#fff3da', 21, H - 5, W - 42, 2);
        px('#4fb35f', 21, H - 5, Math.round((W - 42) * p), 2);
      }

      // Efectos
      for (let i = particles.length - 1; i >= 0; i--) {
        const q = particles[i];
        const age = t - q.born;
        if (age < 0) continue;
        if (age > q.life) {
          particles.splice(i, 1);
          continue;
        }
        const sec = age / 1000;
        const x = q.x + q.vx * sec;
        const y = q.y + q.vy * sec;
        ctx.globalAlpha = 1 - age / q.life;
        if (q.kind === 'leaf') ctx.drawImage(spriteCanvas(LEAFLET), x, y);
        else if (q.kind === 'bubble') {
          ctx.strokeStyle = '#7fb8e6';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, 2 + (i % 2), 0, Math.PI * 2);
          ctx.stroke();
        } else {
          px('#2b2138', x - 2, Math.min(y, GROUND - PET / 2) - 2, 5, 5);
          px('#d0435f', x - 1, Math.min(y, GROUND - PET / 2) - 1, 3, 3);
          px('#4fb35f', x, Math.min(y, GROUND - PET / 2) - 3, 1, 1);
        }
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [reduced]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pixelated block w-full"
      style={{ aspectRatio: `${W} / ${H}` }}
    />
  );
}
