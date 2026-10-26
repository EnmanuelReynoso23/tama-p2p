import { useEffect, useRef } from 'react';

/**
 * A single rAF loop driving a canvas.
 * The provided `tick(dtSec)` is called with a fixed timestep (default 1/60 s),
 * decoupled from rendering to keep game logic steady regardless of frame rate.
 * Pauses automatically when the tab is hidden.
 */
export function useGameLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options: {
    onTick?: (dtSec: number) => void;
    onRender?: (ctx: CanvasRenderingContext2D, alpha: number) => void;
    fixedTimestep?: number;
    maxFrameTime?: number;
  },
) {
  const { onTick, onRender, fixedTimestep = 1 / 60, maxFrameTime = 0.25 } = options;

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  const onTickRef = useRef(onTick);
  const onRenderRef = useRef(onRender);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);
  useEffect(() => {
    onRenderRef.current = onRender;
  }, [onRender]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const step = (time: number) => {
      if (!running) return;

      if (!lastRef.current) lastRef.current = time;
      let frame = (time - lastRef.current) / 1000;
      lastRef.current = time;
      if (frame > maxFrameTime) frame = maxFrameTime;

      accRef.current += frame;
      while (accRef.current >= fixedTimestep) {
        onTickRef.current?.(fixedTimestep);
        accRef.current -= fixedTimestep;
      }

      const alpha = accRef.current / fixedTimestep;
      onRenderRef.current?.(ctx, alpha);

      rafRef.current = requestAnimationFrame(step);
    };

    const onVis = () => {
      if (document.hidden) {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        lastRef.current = 0;
      } else if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    rafRef.current = requestAnimationFrame(step);

    return () => {
      running = false;
      document.removeEventListener('visibilitychange', onVis);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [canvasRef, fixedTimestep, maxFrameTime]);
}
