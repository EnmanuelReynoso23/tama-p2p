import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { usePetStore } from '../store/usePetStore';
import { usePetActorCtx } from '../store/usePetActor';
import { openBerryGame } from '../App';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import {
  sfxButton,
  sfxClean,
  sfxFeed,
  sfxMedicine,
  sfxRefuse,
  sfxSnack,
} from '../sounds/sfx';
import { ACTION_COOLDOWN, STAT_MAX, STAT_MIN } from '../game/constants';

/**
 * 4 main action buttons (Feed, Play, Clean, Sleep/Wake), a radial cooldown
 * fill, a popover to select Meal/Snack when clicking Feed, and a Medicine
 * button that only appears when sick with a gentle pulse.
 */
export default function ActionButtons() {
  const { send } = usePetActorCtx();
  const isAsleep = usePetStore((s) => s.isAsleep);
  const isSick = usePetStore((s) => s.isSick);
  const cooldowns = usePetStore((s) => s.cooldownsUntil);
  const giveMedicine = usePetStore((s) => s.giveMedicineNow);
  const stats = usePetStore((s) => s.stats);
  const reduced = usePrefersReducedMotion();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, []);

  const [feedOpen, setFeedOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target as Node)) setFeedOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  const mealLeft = cdPct(now, cooldowns.feedMeal, ACTION_COOLDOWN.feedMeal * 1000);
  const snackLeft = cdPct(now, cooldowns.feedSnack, ACTION_COOLDOWN.feedSnack * 1000);
  const cleanLeft = cdPct(now, cooldowns.clean, ACTION_COOLDOWN.clean * 1000);
  // Meal & snack share the same overall Feed button CD visually — take max
  const feedDisabled = mealLeft > 0 || snackLeft > 0 || isAsleep;
  const feedCdPct = Math.max(mealLeft, snackLeft);

  // Play guard: energy < 15 → refuse per spec.
  const playDisabled = stats.energy < 15;

  const onFeedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (feedDisabled) { sfxRefuse(); return; }
    sfxButton();
    setFeedOpen((v) => !v);
  };

  const pickFood = (kind: 'meal' | 'snack') => {
    send({ type: 'FEED', kind });
    if (kind === 'meal') sfxFeed();
    else sfxSnack();
    setFeedOpen(false);
  };

  return (
    <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3 px-1 relative">
      {/* FEED */}
      <div className="relative" ref={popoverRef}>
        <RoundButton
          label="Feed"
          icon={FeedIcon}
          onClick={onFeedClick}
          disabled={feedDisabled}
          cdPct={feedCdPct}
          ariaLabel={`Feed — press F. ${isAsleep ? 'Pet is asleep (do not disturb)' : feedDisabled ? 'on cooldown' : 'choose meal or snack'}`}
          hotkey="F"
        />
        <AnimatePresence>
          {feedOpen ? (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: reduced ? 0 : 0.14, ease: 'easeOut' }}
              className="absolute bottom-full left-1/2 z-20 mb-3 w-40 -translate-x-1/2 rounded-xl border border-[#2b2138]/15 bg-[#fffaf2] p-1 shadow-xl"
            >
              <PopItem
                onClick={() => pickFood('meal')}
                disabled={mealLeft > 0}
                leftPct={mealLeft}
              >
                <MealIcon className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="font-pixel text-[10px] text-[#2b2138]">Meal</span>
                  <span className="font-sans text-[9px] text-[#6b4a80]">Hunger +30</span>
                </div>
              </PopItem>
              <PopItem
                onClick={() => pickFood('snack')}
                disabled={snackLeft > 0}
                leftPct={snackLeft}
              >
                <SnackIcon className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="font-pixel text-[10px] text-[#2b2138]">Snack</span>
                  <span className="font-sans text-[9px] text-[#6b4a80]">Happy +10</span>
                </div>
              </PopItem>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* PLAY */}
      <RoundButton
        label="Play"
        icon={PlayIcon}
        onClick={() => {
          if (playDisabled || isAsleep) { sfxRefuse(); return; }
          sfxButton();
          openBerryGame();
        }}
        disabled={playDisabled || isAsleep}
        cdPct={0}
        ariaLabel={`Play — press P. ${playDisabled ? 'Pet is too tired (energy < 15)' : isAsleep ? 'Pet is asleep' : 'Start the berry mini-game'}`}
        hotkey="P"
      />

      {/* CLEAN */}
      <RoundButton
        label="Clean"
        icon={CleanIcon}
        onClick={() => {
          if (isAsleep) { sfxRefuse(); return; }
          if (cleanLeft > 0 || stats.hygiene >= STAT_MAX - 0.1) { sfxRefuse(); return; }
          send({ type: 'CLEAN' });
          sfxClean();
        }}
        disabled={cleanLeft > 0 || stats.hygiene >= STAT_MAX - 0.1 || isAsleep}
        cdPct={cleanLeft}
        ariaLabel={`Clean — press C. ${isAsleep ? 'Pet is asleep (do not disturb)' : cleanLeft > 0 ? 'on cooldown' : stats.hygiene >= STAT_MAX - 0.1 ? 'Pet is already clean' : 'Give the pet a bath'}`}
        hotkey="C"
      />

      {/* SLEEP / WAKE */}
      <RoundButton
        label={isAsleep ? 'Wake' : 'Sleep'}
        icon={isAsleep ? WakeIcon : SleepIcon}
        onClick={() => {
          sfxButton();
          send({ type: 'SLEEP_CLICK' });
        }}
        disabled={false}
        cdPct={0}
        ariaLabel={`${isAsleep ? 'Wake pet — 3 clicks needed' : 'Put pet to sleep'} — press S`}
        hotkey="S"
      />

      {/* MEDICINE button, visible only when sick */}
      <AnimatePresence>
        {isSick ? (
          <motion.button
            initial={reduced ? false : { opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 8 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: 'easeOut' }}
            whileHover={reduced ? undefined : { scale: 1.04 }}
            whileTap={reduced ? undefined : { scale: 0.96 }}
            onClick={() => {
              giveMedicine();
              send({ type: 'MEDICINE' });
              sfxMedicine();
            }}
            type="button"
            aria-label="Give Medicine (pet is sick)"
            className="chunky-btn absolute -top-14 right-0 h-12 w-12 rounded-full border-2 border-[#a0b080] bg-[#d6e8c0] text-[#3b6b43] shadow-btn-press font-pixel text-[9px] flex items-center justify-center gap-1"
            style={{ animation: 'pp-pulse 1.4s ease-in-out infinite' }}
          >
            <MedIcon className="w-4 h-4" />
            <span>MED</span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub components                                                     */
/* ------------------------------------------------------------------ */

interface BtnProps {
  label: string;
  icon: (p: { className?: string }) => JSX.Element;
  onClick: (e: React.MouseEvent) => void;
  disabled: boolean;
  cdPct: number; // 0..1 remaining
  ariaLabel: string;
  hotkey?: string;
}

function RoundButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  cdPct,
  ariaLabel,
  hotkey,
}: BtnProps) {
  const onCooldown = cdPct > 0;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      title={hotkey ? `${label} (${hotkey})` : label}
      className={[
        'chunky-btn group relative aspect-square flex flex-col items-center justify-center bg-[#f7a8c4] text-rose-900/80 select-none',
        disabled ? 'opacity-60 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {/* Radial cooldown fill (conic-gradient) */}
      {onCooldown ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[6%] rounded-full"
          style={{
            background: `conic-gradient(rgba(43,33,56,0.22) ${(1 - cdPct) * 360}deg, rgba(255,255,255,0.0) 0deg)`,
          }}
        />
      ) : null}

      <Icon className="w-5 h-5" />
      <span className="font-pixel text-[9px] sm:text-[10px] mt-0.5">{label}</span>
      {hotkey ? (
        <span className="sr-only">Keyboard shortcut: {hotkey}</span>
      ) : null}
    </button>
  );
}

function PopItem({
  onClick,
  disabled,
  leftPct,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  leftPct: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type="button"
      className={`relative w-full rounded-lg px-2 py-2 flex items-center gap-2 text-left transition ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#ffe8d0] active:translate-y-px'
      }`}
    >
      {children}
      {leftPct > 0 ? (
        <div
          aria-hidden
          className="absolute bottom-0 left-0 h-[2px] rounded-b-lg bg-[#f4b8c0]"
          style={{ width: `${(1 - leftPct) * 100}%` }}
        />
      ) : null}
    </button>
  );
}

/* Cooldown percent remaining (0..1) from now/until/durationMs */
function cdPct(now: number, until: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  const left = until - now;
  if (left <= 0) return 0;
  return Math.min(1, left / durationMs);
}

/* Avoid unused import warn */
void STAT_MIN;

/* ------------------------------------------------------------------ */
/*  Simple inline SVG icons (zero runtime cost, no dep files)          */
/* ------------------------------------------------------------------ */

type I = { className?: string };

function FeedIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11h10a5 5 0 0 1 0 10H3z" />
      <path d="M13 16a3 3 0 0 1 3 3" />
      <path d="M21 7c-1 3-3 5-6 5" />
    </svg>
  );
}
function PlayIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M7 5l12 7-12 7V5z" />
    </svg>
  );
}
function CleanIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16a4 4 0 0 1-.88-7.9 5 5 0 0 1 9.6-1.6A4.5 4.5 0 0 1 17.5 16H7z" />
      <path d="M7 16l-2 5h14l-2-5" />
    </svg>
  );
}
function SleepIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
function WakeIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
function MealIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M5 3h2v6a3 3 0 0 1-6 0V3h2v6a1 1 0 0 0 2 0V3zm6 0h2v18h-2V3zm4 0c0 4 3 5 3 9v9h-2V3c4 0 4 2 4 5 0 5-3 6-5 10h-2v-4c2-3 3-5 3-9h-2z" />
    </svg>
  );
}
function SnackIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 15l6-10 6 10" />
      <path d="M3 19h18l-1.5-4h-15z" />
      <circle cx="10" cy="17" r="0.5" fill="currentColor" />
      <circle cx="14" cy="17.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
function MedIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="7" width="16" height="14" rx="2" />
      <path d="M4 12h16" />
      <path d="M8 3h8" />
      <path d="M12 15v4M10 17h4" />
    </svg>
  );
}
