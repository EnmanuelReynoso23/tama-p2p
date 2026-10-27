export type Tab = 'pet' | 'habits' | 'friends';

interface Props {
  tab: Tab;
  onChange: (tab: Tab) => void;
  habitsLeft: number;
  friendsOnline: number;
}

const ITEMS: Array<{ id: Tab; label: string; icon: (p: { className?: string }) => JSX.Element }> = [
  { id: 'pet', label: 'Mascota', icon: PawIcon },
  { id: 'habits', label: 'Hábitos', icon: CheckIcon },
  { id: 'friends', label: 'Amigos', icon: HeartsIcon },
];

/** Thumb-reachable tab bar, respects the iPhone home-indicator safe area. */
export default function BottomNav({ tab, onChange, habitsLeft, friendsOnline }: Props) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-ink bg-paper/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          const badge = id === 'habits' ? habitsLeft : id === 'friends' ? friendsOnline : 0;
          const badgeText =
            id === 'habits' && badge > 0
              ? `, ${badge} pendientes`
              : id === 'friends' && badge > 0
                ? `, ${badge} en línea`
                : '';
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={active ? 'page' : undefined}
                aria-label={`${label}${badgeText}`}
                className={`relative flex w-full min-h-[64px] flex-col items-center justify-center gap-1 text-[13px] font-extrabold transition ${
                  active ? 'text-ink' : 'text-ink/60'
                }`}
              >
                <span
                  className={`grid h-8 w-14 place-items-center rounded-full transition ${
                    active ? 'bg-blush border-2 border-ink' : 'border-2 border-transparent'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
                {badge > 0 && (
                  <span
                    aria-hidden
                    className={`absolute top-1.5 right-[calc(50%-30px)] grid h-5 min-w-[20px] place-items-center rounded-full border-2 border-paper px-1 text-[11px] font-black text-white ${
                      id === 'friends' ? 'bg-emerald-600' : 'bg-flame-text'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type I = { className?: string };

function PawIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <ellipse cx="6" cy="10" rx="2.2" ry="2.8" />
      <ellipse cx="18" cy="10" rx="2.2" ry="2.8" />
      <ellipse cx="9.5" cy="5.5" rx="2.1" ry="2.7" />
      <ellipse cx="14.5" cy="5.5" rx="2.1" ry="2.7" />
      <path d="M12 11c-3 0-6 4.5-6 7 0 2 1.7 3 3.5 3 1.2 0 1.6-.6 2.5-.6s1.3.6 2.5.6c1.8 0 3.5-1 3.5-3 0-2.5-3-7-6-7z" />
    </svg>
  );
}

function CheckIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8 12.5l3 3 5-6" />
    </svg>
  );
}

function HeartsIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M9 20s-6.5-4.1-6.5-8.6C2.5 8.9 4.3 7 6.5 7c1.2 0 2 .6 2.5 1.3C9.5 7.6 10.3 7 11.5 7c2.2 0 4 1.9 4 4.4C15.5 15.9 9 20 9 20z" />
      <path d="M16.5 4c.8 0 1.4.4 1.8.9.4-.5 1-.9 1.8-.9 1.5 0 2.4 1.3 2.4 2.8 0 2.8-4.2 5.2-4.2 5.2s-1.1-.6-2.2-1.6" opacity=".6" />
    </svg>
  );
}
