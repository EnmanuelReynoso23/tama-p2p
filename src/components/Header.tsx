import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { usePetStore } from '../store/usePetStore';
import { useP2PStore } from '../store/useP2PStore';
import { lifeStageFromAge } from '../game/careScore';
import { EGG_DURATION_MS } from '../game/constants';

interface Props {
  onOpenSettings: () => void;
  onOpenP2P?: () => void;
}

/**
 * App header: editable pet name, age ("Day N · Stage"), sound toggle, P2P, settings gear.
 */
export default function Header({ onOpenSettings, onOpenP2P }: Props) {
  const name = usePetStore((s) => s.name);
  const birthTs = usePetStore((s) => s.birthTs);
  const hatched = usePetStore((s) => s.hatched);
  const setName = usePetStore((s) => s.setName);
  const soundOn = usePetStore((s) => s.settings.soundOn);
  const setSound = usePetStore((s) => s.setSoundOn);
  const isP2PConnected = useP2PStore((s) => s.isConnected);
  const p2pPeers = useP2PStore((s) => s.peers);

  const stage = hatched
    ? lifeStageFromAge(birthTs, Date.now(), EGG_DURATION_MS)
    : 'egg';
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
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mb-4 flex items-center justify-between gap-3 px-2 sm:px-1"
    >
      {/* Left: editable name + age */}
      <div className="flex items-center gap-2 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            maxLength={16}
            aria-label="Rename pet"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') {
                setDraft(name);
                setEditing(false);
              }
            }}
            className="w-32 rounded-md border border-[#2b2138]/15 bg-white/80 px-2 py-1 font-pixel text-[10px] sm:text-xs text-[#2b2138] outline-none focus:ring-2 focus:ring-[#f7a8c4]"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
            type="button"
            className="font-pixel text-[11px] sm:text-sm text-[#2b2138] hover:text-[#80344a] transition underline-offset-4 hover:underline decoration-dotted decoration-[#f4b8c0] decoration-2 max-w-[40vw] truncate"
            title="Click to rename pet"
            aria-label={`Rename pet "${name}"`}
          >
            {name}
          </button>
        )}
        <div className="hidden sm:block h-3 w-px bg-[#2b2138]/15" />
        <div className="font-pixel text-[9px] sm:text-[10px] text-[#6b4a80] whitespace-nowrap">
          {hatched ? `Day ${ageDays + 1} · ${capitalize(stage)}` : 'In egg…'}
        </div>
      </div>

      {/* Right: P2P + sound toggle + settings gear */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {onOpenP2P && (
          <div className="relative">
            <IconBtn
              onClick={onOpenP2P}
              ariaLabel="Conexion P2P con amigos"
            >
              <NetworkIcon className="w-4 h-4" />
            </IconBtn>
            {isP2PConnected && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 text-[8px] text-white font-bold items-center justify-center">
                  {p2pPeers.length}
                </span>
              </span>
            )}
          </div>
        )}
        <IconBtn
          onClick={() => setSound(!soundOn)}
          ariaLabel={soundOn ? 'Sound effects on — click to mute' : 'Sound effects off — click to unmute'}
        >
          {soundOn ? <SoundOnIcon className="w-4 h-4" /> : <SoundOffIcon className="w-4 h-4" />}
        </IconBtn>
        <IconBtn
          onClick={onOpenSettings}
          ariaLabel="Open settings and dev tools"
        >
          <GearIcon className="w-4 h-4" />
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
      className="group relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#2b2138]/10 bg-[#fffaf2] text-[#2b2138] shadow-sm transition active:translate-y-px hover:bg-[#ffe8d0]"
    >
      {children}
    </button>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type I = { className?: string };

function NetworkIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M8.5 16.5a6 6 0 0 1 7 0" />
      <circle cx="12" cy="20" r="1" />
    </svg>
  );
}

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
