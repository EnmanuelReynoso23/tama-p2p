const WEEKDAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function weekday(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getDay();
}

interface Props {
  /** Oldest → today. `friend` omitted = single-player strip. */
  week: Array<{ day: string; me: boolean; friend?: boolean }>;
  friendName?: string;
}

/**
 * Last 7 days. Solo: filled = done. With a friend: full flame = both,
 * half = only one of you, empty = nobody. Each day has a spoken label.
 */
export default function WeekStrip({ week, friendName }: Props) {
  const duo = friendName !== undefined;
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label={duo ? `Últimos 7 días con ${friendName}` : 'Tus últimos 7 días'}>
      {week.map((d, i) => {
        const wd = weekday(d.day);
        const isToday = i === week.length - 1;
        const both = duo ? d.me && d.friend : d.me;
        const one = duo && !both && (d.me || d.friend);
        const spoken = duo
          ? both
            ? 'los dos completaron'
            : d.me
              ? 'solo tú completaste'
              : d.friend
                ? `solo ${friendName} completó`
                : 'nadie completó'
          : d.me
            ? 'completado'
            : 'sin completar';
        return (
          <li key={d.day} className="flex flex-col items-center gap-1">
            <span className={`text-[11px] font-bold ${isToday ? 'text-ink' : 'text-ink/60'}`} aria-hidden>
              {WEEKDAYS[wd]}
            </span>
            <span
              className={`grid h-8 w-8 place-items-center rounded-full border-2 text-sm ${
                both
                  ? 'border-flame-text bg-flame text-white'
                  : one
                    ? 'border-flame-text bg-gradient-to-r from-flame from-50% to-white to-50%'
                    : 'border-ink/25 bg-white'
              } ${isToday ? 'ring-2 ring-offset-1 ring-lilac' : ''}`}
            >
              <span aria-hidden>{both ? '🔥' : ''}</span>
              <span className="sr-only">
                {isToday ? 'Hoy' : WEEKDAY_NAMES[wd]}: {spoken}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
