import { PARTICLE_PALETTE } from './particleSprites';
import {
  heartSprite,
  crumbSprite,
  bubbleSprite,
  zzzSprite,
  sparkleSprite,
  stinkSprite,
  tearSprite,
  starSprite,
  butterflySprite,
} from './particleSprites';
import { renderSprite } from '../sprites/renderSprite';

/**
 * Kinds of particles in the engine — each kind maps to a sprite and default
 * lifetimes/scales/gravity.
 */
export type ParticleKind =
  | 'heart'
  | 'crumb'
  | 'bubble'
  | 'z'
  | 'sparkle'
  | 'stink'
  | 'tear'
  | 'star'
  | 'butterfly';

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  life: number; // seconds remaining
  maxLife: number;
  scale: number; // pixel scale factor (1 = 5px)
  rotation: number; // radians
  vr: number; // rotation/sec
  fadeOut: boolean; // if true, alpha fades to 0 as life→0
  alpha: number; // 0..1 override (multiplied with fadeOut factor)
  alive: boolean;
}

const MAX_PARTICLES = 224; // cap ~200 + 24 slack
const DEFAULT_SPRITE_SCALE = 2; // particles are tiny, scale 5x5 grids to ~10px on screen

const KIND_SPRITE: Record<ParticleKind, readonly string[]> = {
  heart: heartSprite,
  crumb: crumbSprite,
  bubble: bubbleSprite,
  z: zzzSprite,
  sparkle: sparkleSprite,
  stink: stinkSprite,
  tear: tearSprite,
  star: starSprite,
  butterfly: butterflySprite,
};

const KIND_SIZE: Record<ParticleKind, number> = {
  heart: 5,
  crumb: 5,
  bubble: 5,
  z: 5,
  sparkle: 5,
  stink: 5,
  tear: 5,
  star: 5,
  butterfly: 5,
};

/**
 * Pooled-capacity particle engine.
 *
 * Features:
 *  - single typed array pool
 *  - particle spawn w/ per-kind defaults (gravity, life, scale, fade)
 *  - update(dt) runs fixed per-particle physics + O(alive) walk
 *  - draw(ctx) renders each using cached renderSprite
 */
export class ParticleSystem {
  readonly particles: Particle[];
  private _firstFree = 0;

  constructor() {
    this.particles = new Array<Particle>(MAX_PARTICLES);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i] = {
        kind: 'sparkle',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: 0,
        maxLife: 1,
        scale: DEFAULT_SPRITE_SCALE,
        rotation: 0,
        vr: 0,
        fadeOut: true,
        alpha: 1,
        alive: false,
      };
    }
  }

  /** Remove all living particles immediately. Good for stage-reset. */
  clear() {
    for (let i = 0; i < this.particles.length; i++) this.particles[i].alive = false;
    this._firstFree = 0;
  }

  aliveCount(): number {
    let n = 0;
    for (const p of this.particles) if (p.alive) n++;
    return n;
  }

  /**
   * Spawn one particle. Returns the allocated slot so caller can tweak.
   * If the pool is exhausted, returns `null` (silently drops — no allocations).
   */
  spawn(
    kind: ParticleKind,
    x: number,
    y: number,
    opts: Partial<Particle> = {},
  ): Particle | null {
    const p = this.allocSlot();
    if (!p) return null;
    p.kind = kind;
    p.x = x; p.y = y;
    p.vx = 0; p.vy = 0;
    p.gravity = defaultGravityForKind(kind);
    p.life = defaultLifeForKind(kind);
    p.maxLife = p.life;
    p.scale = DEFAULT_SPRITE_SCALE;
    p.rotation = 0;
    p.vr = 0;
    p.fadeOut = kind !== 'bubble';
    p.alpha = 1;
    p.alive = true;
    Object.assign(p, opts);
    // sanity: maxLife tracks given life
    if (opts.life != null) p.maxLife = opts.life;
    return p;
  }

  /**
   * Run per-particle physics for dt seconds.
   */
  update(dt: number) {
    const ps = this.particles;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        if (i < this._firstFree) this._firstFree = i;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vr * dt;
      if (p.kind === 'butterfly') {
        // Gentle sinusoidal flutter
        const t = (p.maxLife - p.life) * 6;
        p.vx += Math.cos(t) * 10 * dt;
        p.vy -= 8 * dt; // float up
      }
      if (p.kind === 'stink') {
        // Sway upward
        const t = (p.maxLife - p.life) * 2;
        p.vx = Math.sin(t) * 10;
      }
    }
  }

  /**
   * Render all living particles onto `ctx` using the sprite renderer.
   * Particles are pixelated so rotation only applies for sparkle/star/butterfly
   * (others rendered axis-aligned to keep pixel-crisp look).
   */
  draw(ctx: CanvasRenderingContext2D) {
    const ps = this.particles;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      const lifeT = p.life / p.maxLife;
      const alpha = p.fadeOut ? p.alpha * Math.max(0, Math.min(1, lifeT * 1.4)) : p.alpha;
      if (alpha <= 0.02) continue;
      const sprite = KIND_SPRITE[p.kind];
      const size = KIND_SIZE[p.kind] * p.scale;
      const cx = Math.round(p.x - size / 2);
      const cy = Math.round(p.y - size / 2);

      const rotatable =
        p.kind === 'sparkle' ||
        p.kind === 'star' ||
        p.kind === 'butterfly';

      if (rotatable && Math.abs(p.rotation) > 0.0001) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;
        renderSprite(
          ctx,
          sprite,
          PARTICLE_PALETTE,
          -size / 2,
          -size / 2,
          p.scale,
        );
        ctx.restore();
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = alpha;
        renderSprite(ctx, sprite, PARTICLE_PALETTE, cx, cy, p.scale);
        ctx.globalAlpha = 1;
      }
    }
  }

  /* -------------------------------- internals ----------------------- */

  private allocSlot(): Particle | null {
    const ps = this.particles;
    // Start search from _firstFree (should be O(1) for sequential spawns).
    for (let i = this._firstFree; i < ps.length; i++) {
      if (!ps[i].alive) {
        this._firstFree = i + 1;
        return ps[i];
      }
    }
    // No slot found in tail; scan from 0 up to _firstFree as fallback.
    for (let i = 0; i < this._firstFree; i++) {
      if (!ps[i].alive) {
        this._firstFree = i + 1;
        return ps[i];
      }
    }
    return null;
  }
}

/* ------------------------------------------------------------------ */

function defaultGravityForKind(k: ParticleKind) {
  switch (k) {
    case 'crumb':
      return 80;
    case 'heart':
    case 'z':
    case 'bubble':
    case 'sparkle':
    case 'stink':
    case 'butterfly':
    case 'tear':
      return -30;
    case 'star':
      return -10;
    default:
      return 0;
  }
}
function defaultLifeForKind(k: ParticleKind) {
  switch (k) {
    case 'crumb': return 0.7;
    case 'heart': return 1.0;
    case 'bubble': return 1.4;
    case 'z': return 1.2;
    case 'sparkle': return 0.6;
    case 'stink': return 1.6;
    case 'tear': return 0.9;
    case 'star': return 0.9;
    case 'butterfly': return 5;
  }
}
