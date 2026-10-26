import { useEffect, useRef } from 'react';
import { bundleFor } from './PetCanvas';
import { renderSprite } from '../sprites/renderSprite';
import { PALETTE } from '../sprites/palette';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import type { AdultVariant, LifeStage } from '../game/constants';

interface Props {
  stage: LifeStage;
  variant: AdultVariant | null;
  mood?: 'idle' | 'sleeping' | 'sick' | 'happy';
  /** CSS pixel size of the square canvas. */
  size?: number;
  /** Draw mirrored so it "faces" your own pet (visit mode). */
  flip?: boolean;
  /** Accessible name; empty string = decorative. */
  label: string;
}

/**
 * Small animated portrait of any pet (yours or a friend's) using the same
 * pixel sprites as the main screen. Static when reduced motion is on.
 */
export default function MiniPet({ stage, variant, mood = 'idle', size = 64, flip = false, label }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const bundle = bundleFor(stage, variant);
    const animName = stage === 'egg' ? 'idle' : mood;
    const anim =
      bundle.animations[animName] ?? bundle.animations.idle ?? Object.values(bundle.animations)[0];
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    cvs.width = Math.round(size * dpr);
    cvs.height = Math.round(size * dpr);
    const scale = Math.max(1, Math.floor((size * dpr) / Math.max(bundle.frameW, bundle.frameH)));
    const x = Math.round((cvs.width - bundle.frameW * scale) / 2);
    const y = Math.round((cvs.height - bundle.frameH * scale) / 2);

    let frame = 0;
    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.imageSmoothingEnabled = false;
      if (flip) {
        ctx.translate(cvs.width, 0);
        ctx.scale(-1, 1);
      }
      renderSprite(ctx, anim.frames[frame % anim.frames.length], PALETTE, x, y, scale);
    };
    draw();
    if (reduced || anim.frames.length < 2) return;
    const id = window.setInterval(() => {
      frame++;
      draw();
    }, Math.max(150, anim.frameTime * 1000));
    return () => window.clearInterval(id);
  }, [stage, variant, mood, size, flip, reduced]);

  return (
    <canvas
      ref={ref}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    />
  );
}
