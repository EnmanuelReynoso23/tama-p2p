import { useState } from 'react';
import { motion } from 'framer-motion';
import { isHabitScheduledToday, useHabitStore } from '../store/useHabitStore';
import { usePetStore } from '../store/usePetStore';
import { useP2PStore } from '../store/useP2PStore';
import { shiftDay } from '../game/streak';
import { useToday } from '../hooks/useToday';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { vibrate, HAPTIC_PATTERNS } from '../utils/haptics';
import WeekStrip from './WeekStrip';
import HabitHeatmap from './HabitHeatmap';

type FrequencyOption = 'all' | 'workdays' | 'weekend';

const FREQUENCY_DAYS: Record<FrequencyOption, number[] | undefined> = {
  all: undefined,
  workdays: [1, 2, 3, 4, 5],
  weekend: [0, 6],
};

const FREQUENCY_LABEL: Record<FrequencyOption, string> = {
  all: 'Todos los días',
  workdays: 'Lun a Vie',
  weekend: 'Fin de semana',
};

/** "Habitos" tab: today's checklist, frequency scheduler, and monthly heatmap. */
export default function HabitsCard() {
  const habits = useHabitStore((s) => s.habits);
  const completedDays = useHabitStore((s) => s.completedDays);
  const frozenDays = useHabitStore((s) => s.frozenDays);
  const freezesAvailable = useHabitStore((s) => s.freezesAvailable);
  const currentStreak = useHabitStore((s) => s.currentStreak);
  const bestStreak = useHabitStore((s) => s.bestStreak);
  const toggleHabit = useHabitStore((s) => s.toggleHabit);
  const addHabit = useHabitStore((s) => s.addHabit);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);
  const cheerNow = usePetStore((s) => s.cheerNow);
  const pushToast = usePetStore((s) => s.pushToast);
  const syncCurrentPet = useP2PStore((s) => s.syncCurrentPet);
  const today = useToday();
  const reduced = usePrefersReducedMotion();

  const [newTitle, setNewTitle] = useState('');
  const [frequency, setFrequency] = useState<FrequencyOption>('all');

  // Filter habits active today
  const dueHabits = habits.filter((h) => isHabitScheduledToday(h));
  const completedDueCount = dueHabits.filter((h) => h.completed).length;
  const progress = dueHabits.length > 0 ? Math.round((completedDueCount / dueHabits.length) * 100) : 0;

  const daySet = new Set(completedDays);
  const freezeSet = new Set(frozenDays);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = shiftDay(today, i - 6);
    return {
      day,
      me: daySet.has(day),
      meFrozen: freezeSet.has(day),
    };
  });

  const handleToggle = (id: string) => {
    const wasAllDone = dueHabits.length > 0 && dueHabits.every((h) => h.completed);
    vibrate(HAPTIC_PATTERNS.toggle);
    toggleHabit(id);
    if (useHabitStore.getState().habits.find((h) => h.id === id)?.completed) cheerNow();

    const nextHabits = useHabitStore.getState().habits;
    const nextDue = nextHabits.filter((h) => isHabitScheduledToday(h));
    const nowAllDone = nextDue.length > 0 && nextDue.every((h) => h.completed);

    if (!wasAllDone && nowAllDone) {
      vibrate(HAPTIC_PATTERNS.streakDone);
      const streak = useHabitStore.getState().currentStreak;
      pushToast({
        title: 'Racha asegurada',
        body: `Llevas ${streak} ${streak === 1 ? 'día' : 'días'} de racha. Tu mascota está radiante.`,
        tone: 'good',
      });
    }
    syncCurrentPet();
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    vibrate(HAPTIC_PATTERNS.tap);
    addHabit(newTitle.trim(), 'custom', FREQUENCY_DAYS[frequency]);
    setNewTitle('');
    setFrequency('all');
    syncCurrentPet();
  };

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-labelledby="habits-title"
        className="rounded-3xl border-[3px] border-ink bg-paper p-4 shadow-[0_6px_0_#2b2138]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="habits-title" className="font-pixel text-[13px] text-ink">
            Habitos de hoy
          </h2>
          <span className="text-sm font-extrabold text-ink" aria-hidden>
            {completedDueCount}/{dueHabits.length}
          </span>
        </div>

        <div className="mt-3">
          <div
            role="progressbar"
            aria-label="Progreso de hoy"
            aria-valuemin={0}
            aria-valuemax={dueHabits.length}
            aria-valuenow={completedDueCount}
            aria-valuetext={`${completedDueCount} de ${dueHabits.length} hábitos programados completados`}
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
              ? 'Todo listo por hoy. La racha está a salvo.'
              : 'Completa los hábitos programados para mantener la racha.'}
          </p>
        </div>

        <ul className="mt-4 flex flex-col gap-2">
          {habits.map((h) => {
            const isDue = isHabitScheduledToday(h);
            return (
              <li key={h.id} className="flex items-stretch gap-2">
                <label
                  className={`flex flex-1 min-h-[52px] cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-ink px-3 py-2 transition ${
                    !isDue
                      ? 'bg-gray-100/80 opacity-70 border-dashed'
                      : h.completed
                        ? 'bg-mint'
                        : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      disabled={!isDue}
                      checked={h.completed}
                      onChange={() => handleToggle(h.id)}
                      className="h-6 w-6 shrink-0 cursor-pointer accent-[#2b2138]"
                    />
                    <div className="min-w-0">
                      <span
                        className={`text-[15px] block truncate leading-snug ${
                          !isDue
                            ? 'text-ink/50'
                            : h.completed
                              ? 'text-ink/70 line-through'
                              : 'font-bold text-ink'
                        }`}
                      >
                        {h.title}
                      </span>
                    </div>
                  </div>

                  {!isDue && (
                    <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide rounded-full px-2 py-0.5 bg-ink/10 text-ink/60">
                      Descanso
                    </span>
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => {
                    vibrate(HAPTIC_PATTERNS.tap);
                    deleteHabit(h.id);
                    syncCurrentPet();
                  }}
                  aria-label={`Eliminar hábito: ${h.title}`}
                  className="grid w-11 shrink-0 place-items-center rounded-2xl border-2 border-ink/20 bg-white text-ink/60 hover:text-red-700 hover:border-red-700 active:scale-95"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Formulario nuevo habito con frecuencia */}
        <form onSubmit={handleAdd} className="mt-4 border-t-2 border-dashed border-ink/15 pt-3">
          <div className="flex gap-2">
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
              className="min-w-0 flex-1 min-h-[46px] rounded-xl border-2 border-ink bg-white px-3 text-sm text-ink outline-none"
            />
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="min-h-[46px] rounded-xl border-2 border-ink bg-mint px-4 text-sm font-extrabold text-ink active:translate-y-px disabled:opacity-50"
            >
              Añadir
            </button>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto text-xs font-bold text-ink/70">
            <span className="text-[11px] text-ink/50 uppercase tracking-wider">Frecuencia:</span>
            {(['all', 'workdays', 'weekend'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFrequency(opt)}
                className={`rounded-lg px-2.5 py-1 text-xs border transition ${
                  frequency === opt
                    ? 'border-ink bg-ink text-white font-extrabold'
                    : 'border-ink/20 bg-white text-ink/70'
                }`}
              >
                {FREQUENCY_LABEL[opt]}
              </button>
            ))}
          </div>
        </form>

        <div className="mt-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-lilac">Tu semana</h3>
          <WeekStrip week={week} />
        </div>
      </section>

      {/* Heatmap mensual de actividad */}
      <HabitHeatmap
        completedDays={completedDays}
        frozenDays={frozenDays}
        currentStreak={currentStreak}
        bestStreak={bestStreak}
        freezesAvailable={freezesAvailable}
      />
    </div>
  );
}
