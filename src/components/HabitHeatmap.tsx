import { useMemo } from 'react';
import { dayKey, shiftDay } from '../game/streak';

interface HabitHeatmapProps {
  completedDays: readonly string[];
  frozenDays: readonly string[];
  currentStreak: number;
  bestStreak: number;
  freezesAvailable: number;
}

const WEEKDAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function HabitHeatmap({
  completedDays,
  frozenDays,
  currentStreak,
  bestStreak,
  freezesAvailable,
}: HabitHeatmapProps) {
  const today = dayKey();

  const { cells, completionRate } = useMemo(() => {
    const doneSet = new Set(completedDays);
    const freezeSet = new Set(frozenDays);

    // Build the last 28 days ending with the upcoming end of week or today
    const days: Array<{
      key: string;
      label: string;
      isDone: boolean;
      isFrozen: boolean;
      isToday: boolean;
    }> = [];

    let activeCount = 0;
    for (let i = 27; i >= 0; i--) {
      const k = shiftDay(today, -i);
      const isDone = doneSet.has(k);
      const isFrozen = freezeSet.has(k);
      if (isDone || isFrozen) activeCount++;
      days.push({
        key: k,
        label: k.slice(5),
        isDone,
        isFrozen,
        isToday: k === today,
      });
    }

    const rate = Math.round((activeCount / 28) * 100);
    return { cells: days, completionRate: rate };
  }, [completedDays, frozenDays, today]);

  return (
    <section aria-label="Constancia y calendario mensual" className="rounded-3xl border-[3px] border-ink bg-white/95 p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink/70">
          Actividad mensual (últimos 28 días)
        </h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-ink/20 bg-cream text-ink">
          {completionRate}% constancia
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
        {WEEKDAY_HEADERS.map((h, i) => (
          <span key={i} className="text-[10px] font-extrabold text-ink/40">
            {h}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label="Dias de actividad">
        {cells.map((c) => {
          let bgClass = 'bg-[#f4efe6] text-ink/40 border-dashed border-ink/20';
          let title = `${c.key}: Sin actividad`;

          if (c.isDone) {
            bgClass = 'bg-[#2b2138] text-white border-solid border-[#2b2138] font-black';
            title = `${c.key}: Habitos completados`;
          } else if (c.isFrozen) {
            bgClass = 'bg-[#7fd1ae] text-[#133c2a] border-solid border-[#2b2138] font-black';
            title = `${c.key}: Día protegido con comodín`;
          } else if (c.isToday) {
            bgClass = 'bg-amber-100 text-amber-900 border-solid border-amber-600 animate-pulse font-bold';
            title = `${c.key}: Hoy (pendiente)`;
          }

          return (
            <div
              key={c.key}
              title={title}
              aria-label={title}
              className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-[10px] select-none transition-transform active:scale-95 ${bgClass}`}
            >
              <span>{c.key.split('-')[2]}</span>
            </div>
          );
        })}
      </div>

      {/* Legend & quick indicators */}
      <div className="mt-3.5 pt-3 border-t border-ink/10 flex items-center justify-between text-[11px] font-semibold text-ink/70">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#2b2138] border border-ink/30" /> Hecho
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#7fd1ae] border border-ink/30" /> Protegido
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-600" /> Hoy
          </span>
        </div>
        <div className="flex items-center gap-2 font-extrabold text-ink">
          <span>Racha: {currentStreak}d</span>
          <span>·</span>
          <span>Record: {bestStreak}d</span>
          {freezesAvailable > 0 && (
            <>
              <span>·</span>
              <span className="text-[#133c2a] bg-[#7fd1ae]/40 px-1.5 py-0.5 rounded">
                {freezesAvailable} P
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
