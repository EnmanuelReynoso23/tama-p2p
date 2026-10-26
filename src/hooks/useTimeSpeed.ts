import { useEffect, useRef } from 'react';
import { usePetStore } from '../store/usePetStore';

/**
 * Hooks the Zustand pet store into the browser:
 *   - runs offline catch-up once on mount
 *   - calls `store.tick(now)` once per real second (wall clock, not rAF)
 *   - saves state on visibilitychange / beforeunload (zustand persist does most
 *     of this automatically, but we also trigger a flush for safety)
 *
 * The setting `timeSpeed` multiplies *simulated time per real second*. So
 * timeSpeed=600 → 1 real second = 10 simulated minutes → full pet life cycle
 * visible in minutes during a demo.
 */
export function useTimeSpeed(): { now: number } {
  const nowRef = useRef<number>(Date.now());

  useEffect(() => {
    // Offline catch-up once on mount
    usePetStore.getState().runCatchUp(Date.now());

    // 1-second wall-clock ticker. We use setInterval so `tick` is called even
    // if the rAF loop is paused (tab hidden, etc.) — stat decay should keep
    // happening whenever the page is open.
    const id = window.setInterval(() => {
      if (!document.hidden) {
        const now = Date.now();
        nowRef.current = now;
        usePetStore.getState().tick(now);
      }
    }, 1000);

    const onVis = () => {
      if (!document.hidden) {
        // When returning to tab, treat idle period as mini-offline catch-up
        // (tick would also cover this but runCatchUp gives the toast.)
        usePetStore.getState().runCatchUp(Date.now());
      }
    };

    const onBeforeUnload = () => {
      // Zustand persist middleware already saves on every change; this is
      // just an explicit final flush since some browsers kill tabs early.
      usePetStore.getState().tick(Date.now());
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  return { now: nowRef.current };
}
