import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DailyHabit {
  id: string;
  title: string;
  category: 'focus' | 'health' | 'mind' | 'custom';
  completed: boolean;
}

export interface HabitStoreState {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  habits: DailyHabit[];
  sharedStreak: number;
  friendCompletedToday: boolean;

  // Acciones
  toggleHabit: (id: string) => void;
  addHabit: (title: string, category?: DailyHabit['category']) => void;
  deleteHabit: (id: string) => void;
  checkAndResetDay: () => void;
  setFriendStatus: (completed: boolean, remoteStreak: number) => void;
}

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

const DEFAULT_HABITS: DailyHabit[] = [
  { id: 'h-1', title: 'Tomar 1L de agua', category: 'health', completed: false },
  { id: 'h-2', title: 'Sesion de enfoque (25 min)', category: 'focus', completed: false },
  { id: 'h-3', title: 'Anotar 1 logro del dia', category: 'mind', completed: false },
  { id: 'h-4', title: 'Descansar la vista y estirar', category: 'health', completed: false },
];

export const useHabitStore = create<HabitStoreState>()(
  persist(
    (set, get) => ({
      currentStreak: 1,
      bestStreak: 1,
      lastActiveDate: getTodayString(),
      habits: DEFAULT_HABITS,
      sharedStreak: 1,
      friendCompletedToday: false,

      toggleHabit: (id: string) => {
        const today = getTodayString();
        const state = get();
        state.checkAndResetDay();

        const updatedHabits = get().habits.map((h) =>
          h.id === id ? { ...h, completed: !h.completed } : h
        );

        const allCompleted = updatedHabits.length > 0 && updatedHabits.every((h) => h.completed);
        let newStreak = get().currentStreak;
        let newBest = get().bestStreak;

        // Si hoy se completaron todos y ayer estaba activo
        if (allCompleted && get().lastActiveDate !== today) {
          if (get().lastActiveDate === getYesterdayString()) {
            newStreak += 1;
          } else {
            newStreak = 1;
          }
          if (newStreak > newBest) newBest = newStreak;
        }

        set({
          habits: updatedHabits,
          currentStreak: newStreak,
          bestStreak: newBest,
          lastActiveDate: today,
        });
      },

      addHabit: (title: string, category: DailyHabit['category'] = 'custom') => {
        if (!title.trim()) return;
        const newHabit: DailyHabit = {
          id: 'h-' + Date.now().toString(36),
          title: title.trim(),
          category,
          completed: false,
        };
        set((state) => ({
          habits: [...state.habits, newHabit],
        }));
      },

      deleteHabit: (id: string) => {
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
        }));
      },

      checkAndResetDay: () => {
        const today = getTodayString();
        const yesterday = getYesterdayString();
        const { lastActiveDate, currentStreak } = get();

        if (lastActiveDate !== today) {
          // Si ha pasado mas de un dia sin actividad, la racha se reinicia a 0
          const brokeStreak = lastActiveDate !== yesterday && lastActiveDate !== '';
          set({
            habits: get().habits.map((h) => ({ ...h, completed: false })),
            currentStreak: brokeStreak ? 0 : currentStreak,
            friendCompletedToday: false,
          });
        }
      },

      setFriendStatus: (completed: boolean, remoteStreak: number) => {
        set((state) => {
          const myAllDone = state.habits.length > 0 && state.habits.every((h) => h.completed);
          const bothDone = myAllDone && completed;
          return {
            friendCompletedToday: completed,
            sharedStreak: bothDone ? Math.max(state.currentStreak, remoteStreak) : state.sharedStreak,
          };
        });
      },
    }),
    {
      name: 'tamagotchi-habits-storage',
    }
  )
);
