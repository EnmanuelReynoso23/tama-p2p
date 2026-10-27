import { useState } from 'react';
import { usePetStore } from '../store/usePetStore';
import { setSfxEnabled, unlockAudio } from '../sounds/sfx';

interface Props {
  onOpenSettings: () => void;
}

const days = (ms: number) => Math.floor(ms / 86_400_000);

/** Nombre de la mascota (se toca para cambiarlo), edad, sonido y ajustes. */
export default function Header({ onOpenSettings }: Props) {
  const name = usePetStore((s) => s.name);
  const birthTs = usePetStore((s) => s.birthTs);
  const soundOn = usePetStore((s) => s.settings.soundOn);
  const setName = usePetStore((s) => s.setName);
  const setSoundOn = usePetStore((s) => s.setSoundOn);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const age = days(Date.now() - birthTs);

  const save = () => {
    setName(draft);
    setEditing(false);
  };

  return (
    <header className="flex items-center justify-between gap-3 px-1">
      <div className="flex min-w-0 items-center gap-2">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              autoFocus
              value={draft}
              maxLength={16}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={save}
              aria-label="Nombre de tu mascota"
              className="min-h-[44px] w-36 rounded-xl border-2 border-ink bg-white px-2 font-pixel text-[12px] text-ink outline-none"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
            aria-label={`${name}. Cambiar nombre`}
            className="min-h-[44px] max-w-[44vw] truncate text-left font-pixel text-[14px] text-ink"
          >
            {name}
          </button>
        )}
        <span className="whitespace-nowrap text-xs font-bold text-lilac">{age === 1 ? '1 día' : `${age} días`}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            unlockAudio();
            setSfxEnabled(!soundOn);
            setSoundOn(!soundOn);
          }}
          aria-label={soundOn ? 'Silenciar sonidos' : 'Activar sonidos'}
          aria-pressed={soundOn}
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border-2 border-ink bg-paper px-3 text-xs font-extrabold text-ink"
        >
          {soundOn ? 'Sonido' : 'Mudo'}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Ajustes"
          className="inline-flex h-11 items-center justify-center rounded-full border-2 border-ink bg-paper px-3 text-xs font-extrabold text-ink"
        >
          Ajustes
        </button>
      </div>
    </header>
  );
}
