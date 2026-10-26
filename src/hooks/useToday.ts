import { useEffect, useState } from 'react';
import { dayKey } from '../game/streak';
import { useHabitStore } from '../store/useHabitStore';

/**
 * Today's local day key, re-rendering when the date changes (checked every
 * 30 s and on focus — a PWA can stay open across midnight). Also rolls the
 * habit list over to the new day.
 */
export function useToday(): string {
  const [today, setToday] = useState(dayKey);
  useEffect(() => {
    const check = () => {
      const now = dayKey();
      setToday((prev) => {
        if (prev !== now) useHabitStore.getState().checkAndResetDay();
        return now;
      });
    };
    const id = window.setInterval(check, 30_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}
