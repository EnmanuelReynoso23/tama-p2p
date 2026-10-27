import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  bestStreak as computeBest,
  currentStreak as computeCurrent,
  dayKey,
  daysFromLegacy,
  isHabitDue,
  markDay,
  normalizeDays,
  shiftDay,
  unmarkDay,
} from '../game/streak';

export interface DailyHabit {
  id: string;
  title: string;
  category: 'focus' | 'health' | 'mind' | 'custom';
  completed: boolean;
  /** Days of week (0=Dom, 1=Lun, ..., 6=Sab). Undefined or empty = every day. */
  daysOfWeek?: number[];
}

export interface HabitStoreState {
  /** Local day ("YYYY-MM-DD") the `completed` flags belong to. */
  habitsDay: string;
  habits: DailyHabit[];
  /** Days where every scheduled habit was completed. */
  completedDays: string[];
  /** Days protected with a streak freeze (comodin). */
  frozenDays: string[];
  /** Available freeze tokens (max 2). */
  freezesAvailable: number;
  /** Cached from completedDays and frozenDays. */
  currentStreak: number;
  bestStreak: number;

  // Acciones
  toggleHabit: (id: string) => void;
  addHabit: (title: string, category?: DailyHabit['category'], daysOfWeek?: number[]) => void;
  deleteHabit: (id: string) => void;
  useFreezeForToday: () => boolean;
  checkAndResetDay: () => void;
  importHandoff: (data: {
    habits?: DailyHabit[];
    completedDays?: string[];
    frozenDays?: string[];
    freezesAvailable?: number;
  }) => void;
}

const DEFAULT_HABITS: DailyHabit[] = [
  { id: 'h-1', title: 'Tomar 1L de agua', category: 'health', completed: false },
  { id: 'h-2', title: 'Sesión de enfoque (25 min)', category: 'focus', completed: false },
  { id: 'h-3', title: 'Anotar 1 logro del día', category: 'mind', completed: false },
  { id: 'h-4', title: 'Descansar la vista y estirar', category: 'health', completed: false },
];

export function isHabitScheduledToday(h: DailyHabit, date: Date = new Date()): boolean {
  return isHabitDue(h.daysOfWeek, date);
}

function allScheduledDone(habits: readonly DailyHabit[], date: Date = new Date()): boolean {
  const due = habits.filter((h) => isHabitScheduledToday(h, date));
  if (due.length === 0) return habits.length > 0;
  return due.every((h) => h.completed);
}

/** Recompute today's entry in history + cached streak numbers. */
function withStreak(
  habits: DailyHabit[],
  prev: Pick<HabitStoreState, 'completedDays' | 'frozenDays' | 'bestStreak' | 'freezesAvailable'>,
  today: string,
) {
  const isDone = allScheduledDone(habits);
  const completedDays = isDone
    ? markDay(prev.completedDays, today)
    : unmarkDay(prev.completedDays, today);

  const current = computeCurrent(completedDays, today, prev.frozenDays);
  const best = Math.max(prev.bestStreak, computeBest(completedDays, prev.frozenDays));

  // Award +1 freeze token every 7-day milestone up to max 2
  let freezes = prev.freezesAvailable;
  if (current > 0 && current % 7 === 0 && freezes < 2) {
    freezes = Math.min(2, freezes + 1);
  }

  return {
    habits,
    completedDays,
    currentStreak: current,
    bestStreak: best,
    freezesAvailable: freezes,
  };
}

export const useHabitStore = create<HabitStoreState>()(
  persist(
    (set, get) => ({
      habitsDay: dayKey(),
      habits: DEFAULT_HABITS,
      completedDays: [],
      frozenDays: [],
      freezesAvailable: 1,
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

      addHabit: (
        title: string,
        category: DailyHabit['category'] = 'custom',
        daysOfWeek?: number[],
      ) => {
        if (!title.trim()) return;
        get().checkAndResetDay();
        const newHabit: DailyHabit = {
          id: 'h-' + Date.now().toString(36),
          title: title.trim().slice(0, 60),
          category,
          completed: false,
          daysOfWeek: daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : undefined,
        };
        set(withStreak([...get().habits, newHabit], get(), dayKey()));
      },

      deleteHabit: (id: string) => {
        get().checkAndResetDay();
        set(withStreak(get().habits.filter((h) => h.id !== id), get(), dayKey()));
      },

      useFreezeForToday: () => {
        get().checkAndResetDay();
        const { freezesAvailable, frozenDays, completedDays } = get();
        const today = dayKey();
        if (freezesAvailable <= 0 || frozenDays.includes(today) || completedDays.includes(today)) {
          return false;
        }

        const nextFrozen = markDay(frozenDays, today);
        const current = computeCurrent(completedDays, today, nextFrozen);
        set({
          freezesAvailable: freezesAvailable - 1,
          frozenDays: nextFrozen,
          currentStreak: current,
          bestStreak: Math.max(get().bestStreak, computeBest(completedDays, nextFrozen)),
        });
        return true;
      },

      checkAndResetDay: () => {
        const today = dayKey();
        const { habitsDay, completedDays, frozenDays, freezesAvailable, habits } = get();

        if (habitsDay === today) {
          const current = computeCurrent(completedDays, today, frozenDays);
          if (current !== get().currentStreak) set({ currentStreak: current });
          return;
        }

        // The day rolled over. Check if yesterday needed a streak freeze save.
        const yesterday = shiftDay(today, -1);
        let updatedFrozen = frozenDays;
        let updatedFreezes = freezesAvailable;

        // If yesterday was habitsDay, missed completion, but had an active streak and a freeze was available:
        if (
          habitsDay === yesterday &&
          !completedDays.includes(yesterday) &&
          !frozenDays.includes(yesterday)
        ) {
          const streakEndingDayBefore = computeCurrent(completedDays, shiftDay(yesterday, -1), frozenDays);
          if (streakEndingDayBefore >= 1 && updatedFreezes > 0) {
            // Auto-consume freeze to protect the streak
            updatedFrozen = markDay(updatedFrozen, yesterday);
            updatedFreezes = Math.max(0, updatedFreezes - 1);
          }
        }

        const nextCurrent = computeCurrent(completedDays, today, updatedFrozen);
        set({
          habitsDay: today,
          habits: habits.map((h) => ({ ...h, completed: false })),
          frozenDays: updatedFrozen,
          freezesAvailable: updatedFreezes,
          currentStreak: nextCurrent,
        });
      },

      importHandoff: (data) => {
        const today = dayKey();
        const completed = data.completedDays ?? get().completedDays;
        const frozen = data.frozenDays ?? get().frozenDays;
        const current = computeCurrent(completed, today, frozen);
        const best = Math.max(get().bestStreak, computeBest(completed, frozen));
        set({
          habits: data.habits ?? get().habits,
          completedDays: completed,
          frozenDays: frozen,
          freezesAvailable: data.freezesAvailable ?? get().freezesAvailable,
          currentStreak: current,
          bestStreak: best,
        });
      },
    }),
    {
      name: 'tamagotchi-habits-storage',
      version: 3,
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Record<string, unknown>;
        const today = dayKey();

        if (version < 2) {
          const legacyDays = daysFromLegacy(
            Number(old.currentStreak) || 0,
            typeof old.lastActiveDate === 'string' ? old.lastActiveDate : undefined,
          );
          return {
            habits: Array.isArray(old.habits) ? (old.habits as DailyHabit[]) : DEFAULT_HABITS,
            habitsDay: typeof old.lastActiveDate === 'string' ? old.lastActiveDate : today,
            completedDays: legacyDays,
            frozenDays: [],
            freezesAvailable: 1,
            currentStreak: computeCurrent(legacyDays, today),
            bestStreak: Math.max(computeBest(legacyDays), Number(old.bestStreak) || 0),
          } as Partial<HabitStoreState>;
        }

        if (version < 3) {
          const comp = normalizeDays((old.completedDays as string[]) ?? []);
          return {
            ...old,
            completedDays: comp,
            frozenDays: normalizeDays((old.frozenDays as string[]) ?? []),
            freezesAvailable: typeof old.freezesAvailable === 'number' ? old.freezesAvailable : 1,
            currentStreak: computeCurrent(comp, today, (old.frozenDays as string[]) ?? []),
          } as Partial<HabitStoreState>;
        }

        return old as Partial<HabitStoreState>;
      },
      onRehydrateStorage: () => (state) => {
        state?.checkAndResetDay();
      },
    },
  ),
);
