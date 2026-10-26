import { useEffect, useMemo, useRef } from 'react';
import { useGameLoop } from '../hooks/useGameLoop';
import { useCursor } from '../hooks/useCursor';
import { advanceAnimation } from '../hooks/useAnimation';
import type { AnimationDriverState } from '../hooks/useAnimation';
import { renderSprite } from '../sprites/renderSprite';
import { PALETTE } from '../sprites/palette';
import { eyeHappy, eyeSleep } from '../sprites/effects';
import { usePetCurrentAnim } from '../store/usePetActor';
import type { PetAnim } from '../machines/petMachine';
import { usePetStore } from '../store/usePetStore';
import { drawBackground } from '../scene/background';
import type { SceneOpts } from '../scene/background';
import { ParticleSystem } from '../particles/ParticleSystem';
import type { LifeStage, AdultVariant } from '../game/constants';
import {
  EGG_FRAME_W, EGG_FRAME_H, eggAnimations, eggEyeSlots,
} from '../sprites/egg';
import {
  BABY_FRAME_W, BABY_FRAME_H, babyAnimations, babyEyeSlots,
  type BabyAnimationName,
} from '../sprites/baby';
import {
  CHILD_FRAME_W, CHILD_FRAME_H, childAnimations, childEyeSlots,
  type ChildAnimationName,
} from '../sprites/child';
import {
  TEEN_FRAME_W, TEEN_FRAME_H, teenAnimations, teenEyeSlots,
  type TeenAnimationName,
} from '../sprites/teen';
import {
  RADIANT_FRAME_W, RADIANT_FRAME_H, radiantAnimations, radiantEyeSlots,
  type RadiantAnimationName,
} from '../sprites/adult-radiant';
import {
  CHILL_FRAME_W, CHILL_FRAME_H, chillAnimations, chillEyeSlots,
  type ChillAnimationName,
} from '../sprites/adult-chill';
import {
  SCRUFFY_FRAME_W, SCRUFFY_FRAME_H, scruffyAnimations, scruffyEyeSlots,
  type ScruffyAnimationName,
} from '../sprites/adult-scruffy';

const CANVAS_W = 256;
const CANVAS_H = 192;
const SPRITE_SCALE = 5;

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number): number { return Math.min(hi, Math.max(lo, v)); }
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* Stage sprite bundle: captures frame dims / animations / eyeSlots for any stage. */
type StageAnimName =
  | BabyAnimationName | ChildAnimationName | TeenAnimationName
  | RadiantAnimationName | ChillAnimationName | ScruffyAnimationName
  | 'wobble' | 'crack1' | 'crack2' | 'hatching_hatched';

interface StageBundle {
  readonly frameW: number;
  readonly frameH: number;
  readonly animations: { readonly [k: string]: { readonly frames: readonly (readonly string[])[]; readonly frameTime: number } };
  readonly eyeSlots: readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number }[];
}

function resolveAnimName(anim: PetAnim, hatchProgress?: number): StageAnimName {
  if (anim === 'evolving') return 'happy';
  if (anim === 'hatching_wobble') return 'wobble';
  if (anim === 'hatching_crack') {
    if (hatchProgress !== undefined && hatchProgress < 0.86) return 'crack1';
    return 'crack2';
  }
  if (anim === 'hatching_hatched') return 'hatching_hatched';
  return anim as StageAnimName;
}

function bundleFor(stage: LifeStage, variant: AdultVariant | null): StageBundle {
  if (stage === 'egg') {
    return {
      frameW: EGG_FRAME_W, frameH: EGG_FRAME_H,
      animations: eggAnimations,
      eyeSlots: eggEyeSlots,
    };
  }
  if (stage === 'baby') {
    return {
      frameW: BABY_FRAME_W, frameH: BABY_FRAME_H,
      animations: babyAnimations as unknown as StageBundle['animations'],
      eyeSlots: babyEyeSlots,
    };
  }
  if (stage === 'child') {
    return {
      frameW: CHILD_FRAME_W, frameH: CHILD_FRAME_H,
      animations: childAnimations as unknown as StageBundle['animations'],
      eyeSlots: childEyeSlots,
    };
  }
  if (stage === 'teen') {
    return {
      frameW: TEEN_FRAME_W, frameH: TEEN_FRAME_H,
      animations: teenAnimations as unknown as StageBundle['animations'],
      eyeSlots: teenEyeSlots,
    };
  }
  // adult
  if (variant === 'radiant') {
    return {
      frameW: RADIANT_FRAME_W, frameH: RADIANT_FRAME_H,
      animations: radiantAnimations as unknown as StageBundle['animations'],
      eyeSlots: radiantEyeSlots,
    };
  }
  if (variant === 'scruffy') {
    return {
      frameW: SCRUFFY_FRAME_W, frameH: SCRUFFY_FRAME_H,
      animations: scruffyAnimations as unknown as StageBundle['animations'],
      eyeSlots: scruffyEyeSlots,
    };
  }
  // Chill fallback (most common)
  return {
    frameW: CHILL_FRAME_W, frameH: CHILL_FRAME_H,
    animations: chillAnimations as unknown as StageBundle['animations'],
    eyeSlots: chillEyeSlots,
  };
}

/* Pick a valid animation name for the current bundle. Falls back to 'idle'. */
function animForBundle(bundle: StageBundle, name: StageAnimName): string {
  if (bundle.animations[name as keyof typeof bundle.animations]) return name as string;
  // Fallback chain
  for (const alt of ['idle', 'wobble', 'happy'] as const) {
    if (bundle.animations[alt]) return alt;
  }
  return 'idle';
}

/* ------------------------------------------------------------------ */

export interface PetCanvasProps {
  scale?: number;
  blinkEvery?: number;
}

export default function PetCanvas({
  scale = SPRITE_SCALE,
  blinkEvery = 4,
}: PetCanvasProps) {
  const stateMachineAnim = usePetCurrentAnim();
  const isSick = usePetStore((s) => s.isSick);
  const isAsleep = usePetStore((s) => s.isAsleep);
  const hatched = usePetStore((s) => s.hatched);
  const forceNight = usePetStore((s) => s.settings.forceNight);
  const stage: LifeStage = usePetStore((s) => s.stage);
  const variant: AdultVariant | null = usePetStore((s) => s.adultVariant);
  const dirty = stateMachineAnim === 'dirty';

  const bundle = useMemo(() => bundleFor(stage, variant), [stage, variant]);
  const effectiveStage: LifeStage = hatched ? stage : 'egg';
  const displayBundle = hatched ? bundle : bundleFor('egg', null);

  const animName: PetAnim = (() => {
    if (!hatched) {
      const birthTs = usePetStore.getState().birthTs;
      const eggMs = Math.max(0, Date.now() - birthTs);
      const total = 60_000;
      const k = Math.min(1, eggMs / total);
      if (k < 0.66) return 'hatching_wobble';
      if (k < 1) return 'hatching_crack';
      return 'hatching_hatched';
    }
    return stateMachineAnim;
  })();
  void effectiveStage;

  const hatchProgress = (() => {
    if (hatched) return undefined;
    const birthTs = usePetStore.getState().birthTs;
    const eggMs = Math.max(0, Date.now() - birthTs);
    return Math.min(1, eggMs / 60_000);
  })();

  const resolvedAnim = resolveAnimName(animName, hatchProgress);
  const animKey = animForBundle(displayBundle, resolvedAnim);
  const animDef = displayBundle.animations[animKey] ?? displayBundle.animations['idle'] ?? displayBundle.animations['wobble'];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef({ x: -9999, y: -9999, speedX: 0, speedY: 0 });

  const animStateRef = useRef<AnimationDriverState>({ frame: 0, timer: 0 });
  const animStateBlinkRef = useRef<AnimationDriverState>({ frame: 0, timer: 0 });
  const blinkModeRef = useRef<{ active: boolean; cooldown: number }>({
    active: false,
    cooldown: 2 + Math.random() * blinkEvery,
  });

  const pupilRef = useRef({ lx: 0, ly: 0, rx: 0, ry: 0 });
  const leanRef = useRef({ x: 0 });
  const startleRef = useRef({ t: 0 });

  const particlesRef = useRef<ParticleSystem>(new ParticleSystem());
  const lastAnimRef = useRef<PetAnim>(animName);
  const intervalSpawnRef = useRef<{ eating?: number; sleeping?: number; dirty?: number; playing?: number }>({});

  // Night-mode blend strength driven by sleeping transitions:
  // 0 = natural light, 1 = full night. Eases 0↔1 over ~1.2s on sleep/wake edge.
  const sleepNightStrengthRef = useRef<number>(isAsleep ? 1 : 0);
  const lastIsAsleepRef = useRef<boolean>(isAsleep);
  // Tween descriptor: { from, to, startTimeMs, durationMs, kind }
  const sleepTweenRef = useRef<null | { from: number; to: number; startTime: number; duration: number }>(
    null,
  );

  useCursor(wrapRef, (s) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const sx = CANVAS_W / rect.width;
    const sy = CANVAS_H / rect.height;
    cursorRef.current.x = s.x * sx;
    cursorRef.current.y = s.y * sy;
    cursorRef.current.speedX = s.velocity.x * sx;
    cursorRef.current.speedY = s.velocity.y * sy;
    const petCx = CANVAS_W / 2;
    const petCy = 130;
    const nearX = Math.abs(cursorRef.current.x - petCx) < 90;
    const nearY = Math.abs(cursorRef.current.y - petCy) < 80;
    const speed = Math.hypot(cursorRef.current.speedX, cursorRef.current.speedY);
    if (nearX && nearY && speed > 700 && startleRef.current.t <= 0 && !isAsleep) {
      startleRef.current.t = 0.35;
    }
  });

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    cvs.width = CANVAS_W * dpr;
    cvs.height = CANVAS_H * dpr;
    const ctx = cvs.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      const itv = intervalSpawnRef.current;
      if (itv.eating) window.clearInterval(itv.eating);
      if (itv.sleeping) window.clearInterval(itv.sleeping);
      if (itv.dirty) window.clearInterval(itv.dirty);
      if (itv.playing) window.clearInterval(itv.playing);
    };
  }, []);

  // When the stage changes (via EVOLVE transient), fire particles on next onTick.
  const lastStageRef = useRef<LifeStage>(stage);
  if (lastStageRef.current !== stage) {
    lastStageRef.current = stage;
  }

  const petAnchor = useMemo(
    () => ({
      cx: CANVAS_W / 2,
      cy: 142,
      spriteW: displayBundle.frameW * scale,
      spriteH: displayBundle.frameH * scale,
    }),
    [scale, displayBundle.frameW, displayBundle.frameH],
  );

  useGameLoop(canvasRef, {
    onTick(dt) {
      // Sleep/wake edge detect → start night-blend tween + burst particles
      const prevWasAsleep = lastIsAsleepRef.current;
      const nowAsleep = isAsleep;
      if (prevWasAsleep !== nowAsleep) {
        lastIsAsleepRef.current = nowAsleep;
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const dur = reduced ? 0.35 : 1.2;
        sleepTweenRef.current = {
          from: sleepNightStrengthRef.current,
          to: nowAsleep ? 1 : 0,
          startTime: performance.now(),
          duration: dur * 1000,
        };
        const cx = petAnchor.cx;
        const cy = petAnchor.cy - 8 * scale;
        if (nowAsleep) {
          // Falling asleep: Z burst + bubble-like dim floaters
          for (let i = 0; i < (reduced ? 2 : 8); i++) {
            particlesRef.current.spawn('z',
              cx - 10 + (Math.random() - 0.5) * 30,
              cy - 30 - Math.random() * 30,
              {
                scale: 2,
                life: 1.1 + Math.random() * 0.6,
                vx: 6 + Math.random() * 4,
                vy: -14 - Math.random() * 12,
                gravity: -8,
              },
            );
          }
        } else {
          // Waking up: sparkle + heart burst (new day energy!)
          for (let i = 0; i < (reduced ? 2 : 22); i++) {
            const ang = Math.random() * Math.PI * 2;
            const sp = 20 + Math.random() * 70;
            particlesRef.current.spawn('sparkle',
              cx,
              cy - 20,
              {
                scale: 2,
                life: 0.5 + Math.random() * 0.5,
                vx: Math.cos(ang) * sp,
                vy: Math.sin(ang) * sp - 10,
                gravity: 20,
              },
            );
          }
          for (let i = 0; i < (reduced ? 1 : 3); i++) {
            particlesRef.current.spawn('heart',
              cx + (Math.random() - 0.5) * 20,
              cy + (Math.random() - 0.5) * 10,
              {
                scale: 2,
                life: 0.9 + Math.random() * 0.4,
                vx: (Math.random() - 0.5) * 20,
                vy: -45 - Math.random() * 20,
              },
            );
          }
        }
      }

      // Advance sleep-night blend tween (0↔1)
      if (sleepTweenRef.current) {
        const tw = sleepTweenRef.current;
        const now = performance.now();
        const t = clamp((now - tw.startTime) / tw.duration, 0, 1);
        const eased = easeInOutCubic(t);
        sleepNightStrengthRef.current = lerp(tw.from, tw.to, eased);
        if (t >= 1) sleepTweenRef.current = null;
      }

      animStateRef.current = advanceAnimation(animDef, animStateRef.current, dt);

      // Blink scheduler (idle, awake, stages with eyes)
      const hasEyes = displayBundle.eyeSlots.length >= 2;
      const doBlink = hasEyes && !isAsleep && animKey === 'idle';
      if (doBlink) {
        if (!blinkModeRef.current.active) {
          blinkModeRef.current.cooldown -= dt;
          if (blinkModeRef.current.cooldown <= 0) {
            blinkModeRef.current.active = true;
            animStateBlinkRef.current = { frame: 0, timer: 0 };
          }
        } else {
          const blinkDef = displayBundle.animations['blink'] ?? animDef;
          const r = advanceAnimation(blinkDef, animStateBlinkRef.current, dt);
          animStateBlinkRef.current = r;
          const total = (r.frame + 1) * blinkDef.frameTime + r.timer;
          if (total >= blinkDef.frameTime + 0.001) {
            blinkModeRef.current.active = false;
            blinkModeRef.current.cooldown =
              blinkEvery * 0.6 + Math.random() * blinkEvery;
          }
        }
      } else {
        blinkModeRef.current.active = false;
      }

      // Pupil target calc
      const cx = petAnchor.cx + leanRef.current.x;
      const cy = petAnchor.cy - displayBundle.frameH * scale * 0.5;
      let targetLx = 0, targetLy = 0, targetRx = 0, targetRy = 0;
      let maxDx = 0, maxDy = 0;
      if (displayBundle.eyeSlots.length >= 2) {
        const slotW = displayBundle.eyeSlots[0].w * scale;
        const slotH = displayBundle.eyeSlots[0].h * scale;
        maxDx = Math.max(0, (slotW - scale) * 0.45);
        maxDy = Math.max(0, (slotH - scale) * 0.45);
        if (cursorRef.current.x > 0 && cursorRef.current.y > 0 && !isAsleep) {
          for (let i = 0; i < 2; i++) {
            const slot = displayBundle.eyeSlots[i];
            if (!slot) continue;
            const eyeCx = cx + (slot.x - displayBundle.frameW / 2) * scale + (slot.w * scale) / 2;
            const eyeCy = cy + (slot.y - displayBundle.frameH / 2) * scale + (slot.h * scale) / 2;
            const dx = cursorRef.current.x - eyeCx;
            const dy = cursorRef.current.y - eyeCy;
            const len = Math.max(1, Math.hypot(dx, dy));
            const nx = dx / len, ny = dy / len;
            if (i === 0) { targetLx = nx * maxDx; targetLy = ny * maxDy; }
            else { targetRx = nx * maxDx; targetRy = ny * maxDy; }
          }
        }
      }
      const k = 1 - Math.exp(-dt * 10);
      pupilRef.current.lx = lerp(pupilRef.current.lx, targetLx, k);
      pupilRef.current.ly = lerp(pupilRef.current.ly, targetLy, k);
      pupilRef.current.rx = lerp(pupilRef.current.rx, targetRx, k);
      pupilRef.current.ry = lerp(pupilRef.current.ry, targetRy, k);
      void maxDx; void maxDy;

      // Lean
      let targetLean = 0;
      if (cursorRef.current.x > 0 && cursorRef.current.y > 0 && !isAsleep) {
        const petCx = petAnchor.cx;
        const distX = cursorRef.current.x - petCx;
        const distY = cursorRef.current.y - (petAnchor.cy - petAnchor.spriteH / 2);
        const dist = Math.hypot(distX, distY);
        if (dist < 110) targetLean = clamp(distX / 110, -1, 1) * 2.5;
      }
      leanRef.current.x = lerp(leanRef.current.x, targetLean, 1 - Math.exp(-dt * 6));

      // Startle
      if (startleRef.current.t > 0) {
        startleRef.current.t = Math.max(0, startleRef.current.t - dt);
      }

      particlesRef.current.update(dt);

      if (lastAnimRef.current !== animName) {
        const oldAnim = lastAnimRef.current;
        onEnterAnimation(animName, oldAnim, particlesRef.current, petAnchor, scale);
        stopIntervalSpawns(intervalSpawnRef.current);
        lastAnimRef.current = animName;
      }

      ensureIntervalSpawns(
        intervalSpawnRef.current,
        animName,
        particlesRef.current,
        petAnchor,
        scale,
      );
    },

    onRender(ctx) {
      const reducedMotion =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const frames = animDef.frames;
      const frameIdx = animStateRef.current.frame % frames.length;
      const blinkDef = displayBundle.animations['blink'] ?? animDef;
      const useBlinkFrame =
        blinkModeRef.current.active &&
        (animKey === 'idle' || animKey === 'wobble') &&
        !isAsleep &&
        displayBundle.eyeSlots.length >= 2;
      const currentBodyFrame = useBlinkFrame
        ? (blinkDef.frames[animStateBlinkRef.current.frame % blinkDef.frames.length] ?? frames[frameIdx])
        : frames[frameIdx];
      const breathingBob =
        Math.sin(performance.now() / 1000 * 2) * (reducedMotion ? 0.5 : 1.2);

      const sleepNightStrength = sleepNightStrengthRef.current;

      // Pet dims slightly as they fall asleep / just wake (looks like a screen-loading fade)
      // 0 = fully awake full-brightness, peak 0.2 around sleepNightStrength=0.5
      const petDim = Math.sin(Math.min(1, sleepNightStrength) * Math.PI) * 0.22;

      // === Scene (BG) ===
      const sceneOpts: SceneOpts = { forceNight, sleepingNightStrength: sleepNightStrength };
      drawBackground(ctx, CANVAS_W, CANVAS_H, sceneOpts);

      // === Pet placement ===
      let petX = petAnchor.cx - (displayBundle.frameW * scale) / 2 + leanRef.current.x;
      let petY = petAnchor.cy - displayBundle.frameH * scale + breathingBob;
      if (startleRef.current.t > 0) {
        const p = 1 - startleRef.current.t / 0.35;
        const arc = Math.sin(p * Math.PI) * 10;
        petY -= arc;
      }
      petX = Math.round(petX);
      petY = Math.round(petY);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      const shadowSquash = startleRef.current.t > 0 ? 0.7 : 1;
      ctx.ellipse(
        petAnchor.cx + leanRef.current.x,
        162,
        (displayBundle.frameW * scale * 0.35) * shadowSquash,
        4 * shadowSquash,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Particles under pet
      particlesRef.current.draw(ctx);

      // === Tints & body ===
      let tint: string | undefined;
      if (isSick) tint = 'rgba(120,180,100,0.30)';
      else if (dirty) tint = 'rgba(150,110,70,0.25)';
      const evolving = animName === 'evolving';
      const flashT = evolving ? (Math.sin(performance.now() / 80) + 1) / 2 : 0;

      renderSprite(ctx, currentBodyFrame, PALETTE, petX, petY, scale, tint);

      // Dim pet during mid-transition of sleep/wake (screen-loading fade effect)
      if (petDim > 0.01) {
        ctx.save();
        ctx.globalAlpha = petDim;
        ctx.fillStyle = '#000000';
        ctx.fillRect(petX, petY, displayBundle.frameW * scale, displayBundle.frameH * scale);
        ctx.restore();
      }

      if (evolving) {
        ctx.fillStyle = `rgba(255,255,255,${0.2 + flashT * 0.6})`;
        ctx.fillRect(petX, petY, displayBundle.frameW * scale, displayBundle.frameH * scale);
        if (Math.random() < 0.4) {
          particlesRef.current.spawn('sparkle',
            petX + Math.random() * displayBundle.frameW * scale,
            petY + Math.random() * displayBundle.frameH * scale,
            { scale: 2, life: 0.4 + Math.random() * 0.4, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20 },
          );
        }
      }
      if (!hatched && animName.startsWith('hatching_') && Math.random() < 0.14) {
        particlesRef.current.spawn('sparkle',
          petX + Math.random() * displayBundle.frameW * scale,
          petY + Math.random() * displayBundle.frameH * scale * 0.5,
          { scale: 2, life: 0.45 + Math.random() * 0.35, vx: (Math.random() - 0.5) * 15, vy: -15 },
        );
      }

      // === Eye overlay (only for non-egg stages) ===
      if (displayBundle.eyeSlots.length >= 2 && stage !== 'egg') {
        const drawEyeOverlay =
          animKey === 'idle' || animKey === 'eating' || animKey === 'hungry' ||
          animKey === 'clean' || animKey === 'playing' || animKey === 'wobble';
        if (drawEyeOverlay && !blinkModeRef.current.active && !isAsleep) {
          for (let i = 0; i < 2; i++) {
            const slot = displayBundle.eyeSlots[i];
            if (!slot) continue;
            const ex = petX + slot.x * scale;
            const ey = petY + slot.y * scale;
            const w = slot.w * scale;
            const h = slot.h * scale + scale;
            ctx.fillStyle = '#2b2138';
            ctx.fillRect(ex, ey, w + scale, h);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex + 1, ey + 1, w + scale - 2, h - 2);
            const pupOff = i === 0
              ? { x: pupilRef.current.lx, y: pupilRef.current.ly }
              : { x: pupilRef.current.rx, y: pupilRef.current.ry };
            const px = ex + (w - scale) / 2 + pupOff.x;
            const py = ey + (h - scale) / 2 + pupOff.y;
            ctx.fillStyle = '#2b2138';
            ctx.fillRect(Math.round(px), Math.round(py), Math.max(1, scale), Math.max(1, scale));
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(Math.round(px) + 1, Math.round(py), 1, 1);
          }
        } else if (animKey === 'happy' || animKey === 'pet') {
          for (let i = 0; i < 2; i++) {
            const slot = displayBundle.eyeSlots[i];
            if (!slot) continue;
            const ex = petX + slot.x * scale;
            const ey = petY + slot.y * scale;
            renderSprite(ctx, eyeHappy, PALETTE, ex - 1, ey, Math.max(1, scale - 1));
          }
          if (animKey === 'pet') {
            const slot = displayBundle.eyeSlots[0];
            const rightSlot = displayBundle.eyeSlots[1];
            if (slot && rightSlot) {
              ctx.fillStyle = 'rgba(247,168,196,0.6)';
              const cy = petY + (slot.y + 2) * scale;
              ctx.fillRect(petX + Math.min(slot.x, rightSlot.x) * scale - scale, cy, 2 * scale, scale);
              ctx.fillRect(petX + Math.max(slot.x, rightSlot.x) * scale + 2 * scale, cy, 2 * scale, scale);
            }
          }
        } else if (animKey === 'sleeping' || isAsleep) {
          for (let i = 0; i < 2; i++) {
            const slot = displayBundle.eyeSlots[i];
            if (!slot) continue;
            const ex = petX + slot.x * scale;
            const ey = petY + slot.y * scale;
            renderSprite(ctx, eyeSleep, PALETTE, ex - 1, ey, Math.max(1, scale - 1));
          }
        }
      }

      // Sad tear
      if (animKey === 'sad') {
        const tearY = (performance.now() / 20) % (6 * scale);
        const leftEye = displayBundle.eyeSlots[0];
        ctx.fillStyle = '#7ec8e3';
        ctx.fillRect(
          petX + (leftEye ? leftEye.x * scale : 4 * scale),
          petY + (leftEye ? (leftEye.y + leftEye.h + 1) * scale : 9 * scale) + tearY,
          scale,
          scale,
        );
      }
    },
  });

  return (
    <div
      ref={wrapRef}
      className="lcd-screen rounded-2xl bg-[#e8e3c0] shadow-screen overflow-hidden touch-none"
      style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ imageRendering: 'pixelated' }}
        aria-label="Pixel Pet screen showing your virtual pet"
        role="img"
      />
    </div>
  );
}

/* ======================= Particle spawn helpers ===================== */

function onEnterAnimation(
  now: PetAnim,
  _prev: PetAnim,
  ps: ParticleSystem,
  anchor: { cx: number; cy: number },
  scale: number,
) {
  const cx = anchor.cx;
  const cy = anchor.cy - 8 * scale;

  if (now === 'clean') {
    for (let i = 0; i < 16; i++) {
      ps.spawn('bubble',
        cx + (Math.random() - 0.5) * 30,
        cy + (Math.random() - 0.5) * 30,
        {
          scale: 2 + Math.floor(Math.random() * 2),
          life: 0.9 + Math.random() * 0.6,
          vx: (Math.random() - 0.5) * 12,
          vy: -20 - Math.random() * 20,
          gravity: -40,
        },
      );
    }
  }
  if (now === 'evolving' || now === 'hatching_hatched') {
    for (let i = 0; i < 30; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 30 + Math.random() * 60;
      ps.spawn('sparkle',
        cx, cy,
        {
          scale: 2,
          life: 0.6 + Math.random() * 0.5,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          gravity: -30,
        },
      );
    }
  }
  if (now === 'happy' || now === 'pet') {
    for (let i = 0; i < 3; i++) {
      ps.spawn('heart',
        cx + (Math.random() - 0.5) * 20,
        cy + (Math.random() - 0.5) * 10,
        {
          scale: 2,
          life: 0.7 + Math.random() * 0.4,
          vx: (Math.random() - 0.5) * 20,
          vy: -40 - Math.random() * 20,
        },
      );
    }
  }
  if (now === 'sad') {
    ps.spawn('tear', cx - 10, cy + 10, { scale: 2, life: 1, vy: 60, gravity: 100 });
    ps.spawn('tear', cx + 10, cy + 10, { scale: 2, life: 1.2, vy: 60, gravity: 100 });
  }
  if (now === 'playing') {
    for (let i = 0; i < 5; i++) {
      ps.spawn('star',
        cx + (Math.random() - 0.5) * 60,
        cy - 30 - Math.random() * 30,
        {
          scale: 2,
          life: 0.6 + Math.random() * 0.5,
          vr: (Math.random() - 0.5) * 6,
          gravity: 10,
        },
      );
    }
  }
}

function stopIntervalSpawns(itvs: { eating?: number; sleeping?: number; dirty?: number; playing?: number }) {
  if (itvs.eating) { window.clearInterval(itvs.eating); delete itvs.eating; }
  if (itvs.sleeping) { window.clearInterval(itvs.sleeping); delete itvs.sleeping; }
  if (itvs.dirty) { window.clearInterval(itvs.dirty); delete itvs.dirty; }
  if (itvs.playing) { window.clearInterval(itvs.playing); delete itvs.playing; }
}

function ensureIntervalSpawns(
  itvs: { eating?: number; sleeping?: number; dirty?: number; playing?: number },
  anim: PetAnim,
  ps: ParticleSystem,
  anchor: { cx: number; cy: number },
  scale: number,
) {
  const cx = anchor.cx;
  const cy = anchor.cy - 8 * scale;
  if (anim === 'eating' && itvs.eating == null) {
    itvs.eating = window.setInterval(() => {
      for (let i = 0; i < 3; i++) {
        ps.spawn('crumb',
          cx + (Math.random() - 0.5) * 10,
          cy - 4 * scale,
          {
            scale: 2,
            life: 0.5 + Math.random() * 0.2,
            vx: (Math.random() - 0.5) * 20,
            vy: -40 - Math.random() * 30,
            gravity: 160,
          },
        );
      }
    }, 220);
  }
  if (anim === 'sleeping' && itvs.sleeping == null) {
    itvs.sleeping = window.setInterval(() => {
      ps.spawn('z',
        cx + 16 + (Math.random() - 0.5) * 8,
        cy - 14 * scale - Math.random() * 10,
        {
          scale: 2,
          life: 1.0 + Math.random() * 0.3,
          vx: 8,
          vy: -10,
          gravity: -10,
        },
      );
    }, 900);
  }
  if (anim === 'dirty' && itvs.dirty == null) {
    itvs.dirty = window.setInterval(() => {
      ps.spawn('stink',
        cx + (Math.random() - 0.5) * 20,
        cy - 8 * scale,
        {
          scale: 2,
          life: 1.3 + Math.random() * 0.4,
          vy: -14,
          vx: 0,
        },
      );
    }, 650);
  }
  if (anim === 'playing' && itvs.playing == null) {
    itvs.playing = window.setInterval(() => {
      ps.spawn('star',
        cx + (Math.random() - 0.5) * 40,
        cy - 30 - Math.random() * 20,
        {
          scale: 2,
          life: 0.5 + Math.random() * 0.5,
          vr: (Math.random() - 0.5) * 6,
          gravity: 10,
        },
      );
    }, 300);
  }
}
