const WEEKDAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function weekday(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getDay();
}

interface Props {
  /** Oldest -> today. `friend` omitted = single-player strip. */
  week: Array<{
    day: string;
    me: boolean;
    meFrozen?: boolean;
    friend?: boolean;
    friendFrozen?: boolean;
  }>;
  friendName?: string;
}

/**
 * Last 7 days.
 * Solo: filled = done, ice = protected, empty = missed.
 * With a friend: both = active, one = partial, protected = freeze badge.
 */
export default function WeekStrip({ week, friendName }: Props) {
  const duo = friendName !== undefined;
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label={duo ? `Últimos 7 días con ${friendName}` : 'Tus últimos 7 días'}>
      {week.map((d, i) => {
        const wd = weekday(d.day);
        const isToday = i === week.length - 1;

        const myActive = d.me || d.meFrozen;
        const friendActive = d.friend || d.friendFrozen;

        const both = duo ? myActive && friendActive : myActive;
        const one = duo && !both && (myActive || friendActive);
        const hasFrozen = d.meFrozen || d.friendFrozen;

        let bgClass = 'border-ink/25 bg-white';
        if (both) {
          bgClass = hasFrozen
            ? 'border-[#2b2138] bg-[#7fd1ae] text-[#133c2a]'
            : 'border-flame-text bg-flame text-white';
        } else if (one) {
          bgClass = 'border-flame-text bg-gradient-to-r from-flame from-50% to-white to-50%';
        } else if (d.meFrozen) {
          bgClass = 'border-[#2b2138] bg-[#7fd1ae] text-[#133c2a]';
        }

        const spoken = duo
          ? both
            ? 'los dos completaron o protegieron'
            : d.me
              ? 'solo tu completaste'
              : d.friend
                ? `solo ${friendName} completo`
                : 'nadie completo'
          : d.me
            ? 'completado'
            : d.meFrozen
              ? 'protegido con comodín'
              : 'sin completar';

        return (
          <li key={d.day} className="flex flex-col items-center gap-1">
            <span className={`text-[11px] font-bold ${isToday ? 'text-ink' : 'text-ink/60'}`} aria-hidden>
              {WEEKDAYS[wd]}
            </span>
            <span
              className={`grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-black ${bgClass} ${
                isToday ? 'ring-2 ring-offset-1 ring-lilac' : ''
              }`}
            >
              <span aria-hidden>
                {both ? (hasFrozen ? 'P' : 'ok') : d.meFrozen ? 'P' : ''}
              </span>
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
