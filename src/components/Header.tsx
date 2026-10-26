import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { usePetStore } from '../store/usePetStore';
import { STAGE_LABEL } from '../game/labels';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface Props {
  onOpenSettings: () => void;
}

/**
 * App header: editable pet name, age ("Día N · Etapa"), sound toggle, settings gear.
 */
export default function Header({ onOpenSettings }: Props) {
  const name = usePetStore((s) => s.name);
  const birthTs = usePetStore((s) => s.birthTs);
  const hatched = usePetStore((s) => s.hatched);
  const setName = usePetStore((s) => s.setName);
  const soundOn = usePetStore((s) => s.settings.soundOn);
  const setSound = usePetStore((s) => s.setSoundOn);
  const storeStage = usePetStore((s) => s.stage);
  const reduced = usePrefersReducedMotion();

  const stage = hatched ? storeStage : 'egg';
  const ageDays = hatched ? Math.floor((Date.now() - birthTs) / (24 * 60 * 60 * 1000)) : 0;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = () => {
    const trimmed = draft.trim().slice(0, 16);
    if (trimmed) setName(trimmed);
    else setDraft(name);
    setEditing(false);
  };

  return (
    <motion.header
      initial={reduced ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex items-center justify-between gap-3 px-1"
    >
      {/* Left: editable name + age */}
      <div className="flex items-center gap-2 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            maxLength={16}
            aria-label="Nombre de tu mascota"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') {
                setDraft(name);
                setEditing(false);
              }
            }}
            className="w-36 min-h-[44px] rounded-xl border-2 border-ink bg-white px-2 font-pixel text-[12px] text-ink outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
            type="button"
            className="min-h-[44px] font-pixel text-[14px] text-ink underline-offset-4 decoration-dotted decoration-[#f4b8c0] decoration-2 hover:underline max-w-[44vw] truncate text-left"
            title="Toca para cambiar el nombre"
            aria-label={`${name}. Cambiar nombre`}
          >
            {name}
          </button>
        )}
        <div className="text-xs font-bold text-lilac whitespace-nowrap">
          {hatched ? `Día ${ageDays + 1} · ${STAGE_LABEL[stage]}` : 'En el huevo…'}
        </div>
      </div>

      {/* Right: sound toggle + settings gear */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <IconBtn
          onClick={() => setSound(!soundOn)}
          ariaLabel={soundOn ? 'Sonido activado. Tocar para silenciar' : 'Sonido apagado. Tocar para activar'}
        >
          {soundOn ? <SoundOnIcon className="w-5 h-5" /> : <SoundOffIcon className="w-5 h-5" />}
        </IconBtn>
        <IconBtn
          onClick={onOpenSettings}
          ariaLabel="Ajustes"
        >
          <GearIcon className="w-5 h-5" />
        </IconBtn>
      </div>
    </motion.header>
  );
}

/* ------------------------------------------------------------------ */

function IconBtn({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-paper text-ink transition active:translate-y-px hover:bg-[#ffe8d0]"
    >
      {children}
    </button>
  );
}

type I = { className?: string };

function SoundOnIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  );
}

function SoundOffIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

function GearIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
