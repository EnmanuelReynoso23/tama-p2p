import { useEffect, useRef } from 'react';

/**
 * Tiny metadata describing a sprite animation (frames + frame time).
 * We use a simple shape so any stage's `{animations}` object can be plugged in.
 */
export interface AnimationDef {
  readonly frames: readonly (readonly string[])[];
  readonly frameTime: number;
}

export interface AnimationDriverState {
  /** Current frame index within the animation. */
  frame: number;
  /** Seconds remaining on the current frame before advancing. */
  timer: number;
}

/**
 * Advances a frame counter given elapsed dt.
 * Pure function — the caller owns state refs.
 * Loop behaviour: wraps around. For one-shot (play N times) see
 * `advanceAnimationOnce` below.
 */
export function advanceAnimation(
  def: AnimationDef,
  state: AnimationDriverState,
  dt: number,
): AnimationDriverState {
  let { frame, timer } = state;
  timer += dt;
  while (timer >= def.frameTime) {
    timer -= def.frameTime;
    frame = (frame + 1) % def.frames.length;
  }
  return { frame, timer };
}

/**
 * Advances a frame counter but stops on the last frame (one-shot).
 * Returns `{ done: true }` once the final frame has finished displaying.
 * Play count = how many full passes to make before done.
 */
export function advanceAnimationOnce(
  def: AnimationDef,
  state: AnimationDriverState & { passes?: number; playCount?: number },
  dt: number,
): { state: AnimationDriverState & { passes: number }; done: boolean } {
  const playCount = state.playCount ?? 1;
  let passes = state.passes ?? 0;
  let { frame, timer } = state;
  timer += dt;
  while (timer >= def.frameTime) {
    timer -= def.frameTime;
    frame++;
    if (frame >= def.frames.length) {
      frame = 0;
      passes++;
      if (passes >= playCount) {
        return {
          state: {
            frame: Math.max(0, def.frames.length - 1),
            timer: 0,
            passes,
          },
          done: true,
        };
      }
    }
  }
  return { state: { frame, timer, passes }, done: false };
}

/**
 * React hook wrapper: drives a looping animation via a state ref.
 * The caller still calls `tick(dt)` themselves inside their game loop,
 * and reads `stateRef.current.frame`.
 */
export function useAnimationLoop(def: AnimationDef) {
  const stateRef = useRef<AnimationDriverState>({ frame: 0, timer: 0 });
  const defRef = useRef(def);
  useEffect(() => {
    defRef.current = def;
  }, [def]);

  const tick = (dt: number) => {
    stateRef.current = advanceAnimation(defRef.current, stateRef.current, dt);
  };

  return { stateRef, tick };
}
