import { usePetStore } from '../store/usePetStore';

const VITALS = [
  { key: 'hunger', label: 'Hambre', emoji: '🍙' },
  { key: 'happiness', label: 'Felicidad', emoji: '💗' },
  { key: 'energy', label: 'Energía', emoji: '⚡' },
  { key: 'hygiene', label: 'Higiene', emoji: '🫧' },
  { key: 'health', label: 'Salud', emoji: '🩺' },
] as const;

function tone(v: number) {
  if (v < 30) return { bar: 'bg-red-500', word: 'crítica' };
  if (v < 60) return { bar: 'bg-amber-400', word: 'media' };
  return { bar: 'bg-emerald-500', word: 'buena' };
}

/** Compact 5-stat row. Colour is never the only signal: each bar has a spoken value. */
export default function VitalsRow() {
  const stats = usePetStore((s) => s.stats);
  return (
    <ul className="grid grid-cols-5 gap-2" aria-label="Estado de tu mascota">
      {VITALS.map(({ key, label, emoji }) => {
        const v = Math.round(stats[key]);
        const t = tone(v);
        return (
          <li key={key} className="flex flex-col items-center gap-1">
            <span aria-hidden className="text-lg leading-none">
              {emoji}
            </span>
            <div
              role="meter"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={v}
              aria-valuetext={`${v} de 100, ${t.word}`}
              className="h-2.5 w-full overflow-hidden rounded-full border-2 border-ink bg-white"
            >
              <div className={`h-full ${t.bar} ${v < 30 ? 'stat-critical' : ''}`} style={{ width: `${v}%` }} />
            </div>
            <span className="text-[11px] font-bold text-ink/80">{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
