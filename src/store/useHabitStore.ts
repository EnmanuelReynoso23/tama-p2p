import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  bestStreak as computeBest,
  currentStreak as computeCurrent,
  dayKey,
  daysFromLegacy,
  markDay,
  normalizeDays,
  unmarkDay,
} from '../game/streak';

export interface DailyHabit {
  id: string;
  title: string;
  category: 'focus' | 'health' | 'mind' | 'custom';
  completed: boolean;
}

export interface HabitStoreState {
  /** Local day ("YYYY-MM-DD") the `completed` flags belong to. */
  habitsDay: string;
  habits: DailyHabit[];
  /** Days where every habit was completed — the source of truth for streaks. */
  completedDays: string[];
  /** Cached from completedDays so components can subscribe cheaply. */
  currentStreak: number;
  bestStreak: number;

  // Acciones
  toggleHabit: (id: string) => void;
  addHabit: (title: string, category?: DailyHabit['category']) => void;
  deleteHabit: (id: string) => void;
  checkAndResetDay: () => void;
}

const DEFAULT_HABITS: DailyHabit[] = [
  { id: 'h-1', title: 'Tomar 1L de agua', category: 'health', completed: false },
  { id: 'h-2', title: 'Sesion de enfoque (25 min)', category: 'focus', completed: false },
  { id: 'h-3', title: 'Anotar 1 logro del dia', category: 'mind', completed: false },
  { id: 'h-4', title: 'Descansar la vista y estirar', category: 'health', completed: false },
];

function allDone(habits: readonly DailyHabit[]): boolean {
  return habits.length > 0 && habits.every((h) => h.completed);
}

/** Recompute today's entry in the history + cached streak numbers. */
function withStreak(
  habits: DailyHabit[],
  prev: Pick<HabitStoreState, 'completedDays' | 'bestStreak'>,
  today: string,
) {
  const completedDays = allDone(habits)
    ? markDay(prev.completedDays, today)
    : unmarkDay(prev.completedDays, today);
  const current = computeCurrent(completedDays, today);
  return {
    habits,
    completedDays,
    currentStreak: current,
    // History is capped, so never let the record go down.
    bestStreak: Math.max(prev.bestStreak, computeBest(completedDays)),
  };
}

export const useHabitStore = create<HabitStoreState>()(
  persist(
    (set, get) => ({
      habitsDay: dayKey(),
      habits: DEFAULT_HABITS,
      completedDays: [],
      currentStreak: 0,
      bestStreak: 0,

      toggleHabit: (id: string) => {
        get().checkAndResetDay();
        const today = dayKey();
        const habits = get().habits.map((h) =>
          h.id === id ? { ...h, completed: !h.completed } : h,
        );
        set(withStreak(habits, get(), today));
      },

      addHabit: (title: string, category: DailyHabit['category'] = 'custom') => {
        if (!title.trim()) return;
        get().checkAndResetDay();
        const newHabit: DailyHabit = {
          id: 'h-' + Date.now().toString(36),
          title: title.trim().slice(0, 60),
          category,
          completed: false,
        };
        set(withStreak([...get().habits, newHabit], get(), dayKey()));
      },

      deleteHabit: (id: string) => {
        get().checkAndResetDay();
        set(withStreak(get().habits.filter((h) => h.id !== id), get(), dayKey()));
      },

      checkAndResetDay: () => {
        const today = dayKey();
        const { habitsDay, completedDays } = get();
        if (habitsDay === today) {
          // Still refresh the cached counter: it can drop at midnight.
          const current = computeCurrent(completedDays, today);
          if (current !== get().currentStreak) set({ currentStreak: current });
          return;
        }
        set({
          habitsDay: today,
          habits: get().habits.map((h) => ({ ...h, completed: false })),
          currentStreak: computeCurrent(completedDays, today),
        });
      },
    }),
    {
      name: 'tamagotchi-habits-storage',
      version: 2,
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) {
          const legacyDays = daysFromLegacy(
            Number(old.currentStreak) || 0,
            typeof old.lastActiveDate === 'string' ? old.lastActiveDate : undefined,
          );
          const today = dayKey();
          return {
            habits: Array.isArray(old.habits) ? (old.habits as DailyHabit[]) : DEFAULT_HABITS,
            habitsDay: typeof old.lastActiveDate === 'string' ? old.lastActiveDate : today,
            completedDays: legacyDays,
            currentStreak: computeCurrent(legacyDays, today),
            bestStreak: Math.max(computeBest(legacyDays), Number(old.bestStreak) || 0),
          } as Partial<HabitStoreState>;
        }
        return { ...old, completedDays: normalizeDays((old.completedDays as string[]) ?? []) } as Partial<HabitStoreState>;
      },
      onRehydrateStorage: () => (state) => {
        state?.checkAndResetDay();
      },
    },
  ),
);
