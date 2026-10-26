import { useEffect, useRef } from 'react';

export interface CursorState {
  x: number;
  y: number;
  lastMove: number;
  velocity: { x: number; y: number };
  isDown: boolean;
}

/**
 * Tracks mouse/touch position within a target element, in element-relative px.
 * Also computes velocity (px per second) from the last two samples, and
 * tracks pointer down state for petting interactions.
 */
export function useCursor(
  targetRef: React.RefObject<HTMLElement | null>,
  onChange?: (state: CursorState) => void,
) {
  const stateRef = useRef<CursorState>({
    x: -9999,
    y: -9999,
    lastMove: 0,
    velocity: { x: 0, y: 0 },
    isDown: false,
  });
  const prevRef = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const toLocal = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const sampleVel = (x: number, y: number, now: number) => {
      const dt = Math.max(1, now - prevRef.current.t) / 1000;
      stateRef.current.velocity = {
        x: (x - prevRef.current.x) / dt,
        y: (y - prevRef.current.y) / dt,
      };
      prevRef.current = { x, y, t: now };
    };

    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const { x, y } = toLocal(e.clientX, e.clientY);
      sampleVel(x, y, now);
      stateRef.current.x = x;
      stateRef.current.y = y;
      stateRef.current.lastMove = now;
      onChangeRef.current?.(stateRef.current);
    };
    const onDown = (e: PointerEvent) => {
      const { x, y } = toLocal(e.clientX, e.clientY);
      stateRef.current.isDown = true;
      stateRef.current.x = x;
      stateRef.current.y = y;
      prevRef.current = { x, y, t: performance.now() };
      (e.target as Element).setPointerCapture?.(e.pointerId);
      onChangeRef.current?.(stateRef.current);
    };
    const onUp = () => {
      stateRef.current.isDown = false;
      onChangeRef.current?.(stateRef.current);
    };
    const onLeave = () => {
      stateRef.current.x = -9999;
      stateRef.current.y = -9999;
      onChangeRef.current?.(stateRef.current);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [targetRef]);

  return stateRef;
}
