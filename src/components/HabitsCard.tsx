import { useState } from 'react';
import { motion } from 'framer-motion';
import { useHabitStore } from '../store/useHabitStore';
import { usePetStore } from '../store/usePetStore';
import { useP2PStore } from '../store/useP2PStore';
import { shiftDay } from '../game/streak';
import { useToday } from '../hooks/useToday';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import WeekStrip from './WeekStrip';

const CATEGORY_EMOJI = { focus: '🎯', health: '💧', mind: '🧠', custom: '⭐' } as const;

/** "Hábitos" tab: today's checklist. Completing all of them keeps the streak alive. */
export default function HabitsCard() {
  const habits = useHabitStore((s) => s.habits);
  const completedDays = useHabitStore((s) => s.completedDays);
  const toggleHabit = useHabitStore((s) => s.toggleHabit);
  const addHabit = useHabitStore((s) => s.addHabit);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);
  const petStrokeNow = usePetStore((s) => s.petStrokeNow);
  const pushToast = usePetStore((s) => s.pushToast);
  const syncCurrentPet = useP2PStore((s) => s.syncCurrentPet);
  const today = useToday();
  const reduced = usePrefersReducedMotion();

  const [newTitle, setNewTitle] = useState('');

  const completedCount = habits.filter((h) => h.completed).length;
  const progress = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;
  const daySet = new Set(completedDays);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = shiftDay(today, i - 6);
    return { day, me: daySet.has(day) };
  });

  const handleToggle = (id: string) => {
    const wasAllDone = habits.length > 0 && habits.every((h) => h.completed);
    toggleHabit(id);
    petStrokeNow();
    const nowAllDone = useHabitStore.getState().habits.every((h) => h.completed);
    if (!wasAllDone && nowAllDone) {
      const streak = useHabitStore.getState().currentStreak;
      pushToast({
        title: '¡Racha encendida! 🔥',
        body: `Llevas ${streak} ${streak === 1 ? 'día' : 'días'} de racha. ¡Tu mascota está feliz!`,
        tone: 'good',
      });
    }
    syncCurrentPet();
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addHabit(newTitle.trim(), 'custom');
    setNewTitle('');
    syncCurrentPet();
  };

  return (
    <section
      aria-labelledby="habits-title"
      className="rounded-3xl border-[3px] border-ink bg-paper p-4 shadow-[0_6px_0_#2b2138]"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="habits-title" className="font-pixel text-[13px] text-ink">
          Hábitos de hoy
        </h2>
        <span className="text-sm font-extrabold text-ink" aria-hidden>
          {completedCount}/{habits.length}
        </span>
      </div>

      <div className="mt-3">
        <div
          role="progressbar"
          aria-label="Progreso de hoy"
          aria-valuemin={0}
          aria-valuemax={habits.length}
          aria-valuenow={completedCount}
          aria-valuetext={`${completedCount} de ${habits.length} hábitos completados`}
          className="h-4 w-full rounded-full border-2 border-ink bg-white p-0.5"
        >
          <motion.div
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: reduced ? 0 : 0.3 }}
            className="h-full rounded-full bg-gradient-to-r from-[#ffd166] to-[#06d6a0]"
          />
        </div>
        <p className="mt-1.5 text-xs text-ink/75">
          {progress === 100
            ? '¡Todo listo por hoy! La racha está a salvo.'
            : 'Completa todos para mantener tu racha (y la de tus amigos).'}
        </p>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {habits.map((h) => (
          <li key={h.id} className="flex items-stretch gap-2">
            <label
              className={`flex flex-1 min-h-[52px] cursor-pointer items-center gap-3 rounded-2xl border-2 border-ink px-3 py-2 transition ${
                h.completed ? 'bg-mint' : 'bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={h.completed}
                onChange={() => handleToggle(h.id)}
                className="h-6 w-6 shrink-0 cursor-pointer accent-[#2b2138]"
              />
              <span aria-hidden className="text-lg leading-none">
                {CATEGORY_EMOJI[h.category]}
              </span>
              <span
                className={`text-[15px] leading-snug ${
                  h.completed ? 'text-ink/70 line-through' : 'font-bold text-ink'
                }`}
              >
                {h.title}
              </span>
            </label>
            <button
              type="button"
              onClick={() => {
                deleteHabit(h.id);
                syncCurrentPet();
              }}
              aria-label={`Eliminar hábito: ${h.title}`}
              className="grid w-11 shrink-0 place-items-center rounded-2xl border-2 border-ink/20 bg-white text-ink/60 hover:text-red-700 hover:border-red-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="mt-3 flex gap-2 border-t-2 border-dashed border-ink/15 pt-3">
        <label htmlFor="new-habit" className="sr-only">
          Nuevo hábito
        </label>
        <input
          id="new-habit"
          type="text"
          value={newTitle}
          maxLength={60}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nuevo hábito (ej: Meditar 5 min)"
          className="min-w-0 flex-1 min-h-[48px] rounded-xl border-2 border-ink bg-white px-3 text-base text-ink outline-none"
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="min-h-[48px] rounded-xl border-2 border-ink bg-mint px-4 text-sm font-extrabold text-ink active:translate-y-px disabled:opacity-50"
        >
          Añadir
        </button>
      </form>

      <div className="mt-5">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-lilac">Tu semana</h3>
        <WeekStrip week={week} />
      </div>
    </section>
  );
}
