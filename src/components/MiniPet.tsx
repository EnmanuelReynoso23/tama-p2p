import { useEffect, useRef } from 'react';
import { frameMs, petFrames, SPRITE_SIZE } from '../../core/sprites.js';
import { spriteCanvas } from '../sprites/draw';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import type { AdultVariant, LifeStage } from '../game/constants';

interface Props {
  stage: LifeStage;
  variant: AdultVariant | null;
  mood?: 'idle' | 'sleeping' | 'sick' | 'happy';
  /** Tamano en pixeles CSS del cuadro. */
  size?: number;
  /** Dibujarla al reves (para que mire a tu mascota). */
  flip?: boolean;
  /** Nombre para lectores de pantalla; vacio = decorativa. */
  label: string;
}

const MOOD = { idle: 'ok', sleeping: 'sleep', sick: 'sick', happy: 'happy' } as const;

/** Retrato chico y animado de cualquier mascota (la tuya o la de un amigo). */
export default function MiniPet({ stage, variant, mood = 'idle', size = 64, flip = false, label }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const cvs = ref.current;
    const ctx = cvs?.getContext('2d');
    if (!cvs || !ctx) return;
    const m = stage === 'egg' ? 'egg' : MOOD[mood];
    const frames = petFrames(stage, variant, m);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    cvs.width = cvs.height = Math.round(size * dpr);
    const scale = Math.max(1, Math.floor(cvs.width / SPRITE_SIZE));
    const off = Math.round((cvs.width - SPRITE_SIZE * scale) / 2);
    let i = 0;
    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.imageSmoothingEnabled = false;
      if (flip) ctx.setTransform(-1, 0, 0, 1, cvs.width, 0);
      ctx.drawImage(spriteCanvas(frames[i % frames.length]), off, off, SPRITE_SIZE * scale, SPRITE_SIZE * scale);
    };
    draw();
    if (reduced) return;
    const id = window.setInterval(() => {
      i++;
      draw();
    }, frameMs(m));
    return () => window.clearInterval(id);
  }, [stage, variant, mood, size, flip, reduced]);

  return (
    <canvas
      ref={ref}
      className="pixelated"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      style={{ width: size, height: size }}
    />
  );
}
