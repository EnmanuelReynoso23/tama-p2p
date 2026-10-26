import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import CompanionView from './components/CompanionView';
import HabitsCard from './components/HabitsCard';
import AIChatModal from './components/AIChatModal';
import Header from './components/Header';
import Toasts from './components/Toasts';
import SettingsPanel from './components/SettingsPanel';
import P2PPanel from './components/P2PPanel';
import { useP2PStore } from './store/useP2PStore';
import { PetActorProvider, usePetActorCtx } from './store/usePetActor';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { useTimeSpeed } from './hooks/useTimeSpeed';
import { usePetStore } from './store/usePetStore';
import { STAT_MAX } from './game/constants';
import {
  setSfxEnabled,
  sfxClean,
  sfxCatchBerry,
  sfxEvolve,
  sfxFeed,
  sfxHatch,
  sfxHungry,
  sfxPlayEnd,
  sfxPlayStart,
  sfxRefuse,
  sfxSleep,
  sfxToast,
  sfxWake,
} from './sounds/sfx';

let _openBerries: (() => void) | null = null;
export function openBerryGame(): void {
  _openBerries?.();
}
// Silence unused import (BerryGame reads via closure, but TypeScript may flag sfxPlayStart/sfxPlayEnd/sfxCatchBerry indirectly used)
void sfxPlayStart;

/**
 * Global keyboard shortcuts: F / P / C / S → Feed / Play / Clean / Sleep.
 * Only triggers when the user is not typing inside an input/textarea.
 */
function KeyboardShortcuts() {
  const { send } = usePetActorCtx();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return; // let combo shortcuts pass through
      const s = usePetStore.getState();
      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          if (s.isAsleep) { sfxRefuse(); break; }
          // Meal by default (player can pick snack via the popover click)
          send({ type: 'FEED', kind: 'meal' });
          sfxFeed();
          break;
        case 'p':
          e.preventDefault();
          openBerryGame();
          break;
        case 'c':
          e.preventDefault();
          if (s.cooldownsUntil.clean > Date.now() || s.stats.hygiene >= STAT_MAX - 0.1) { sfxRefuse(); break; }
          send({ type: 'CLEAN' });
          sfxClean();
          break;
        case 's':
          e.preventDefault();
          send({ type: 'SLEEP_CLICK' });
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [send]);
  return null;
}

/**
 * Ctrl/Cmd+Alt+D toggles the machine debug overlay anywhere in the app.
 */
function DebugToggleShortcut() {
  const show = usePetStore((s) => s.settings.showMachineDebug);
  const set = usePetStore((s) => s.setShowMachineDebug);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'd') return;
      const mod = e.ctrlKey || e.metaKey || e.altKey;
      if (!mod) return;
      e.preventDefault();
      set(!show);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, set]);
  return null;
}

function AppInner() {
  useTimeSpeed();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [p2pOpen, setP2pOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <div className="w-full max-w-sm">
        <Header
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenP2P={() => setP2pOpen(true)}
        />
        <CompanionView onOpenChat={() => setChatOpen(true)} />
        <HabitsCard />
        <div className="h-12 sm:h-6" aria-hidden />
      </div>

      {/* Screen-reader live region: accessible toasts / status */}
      <A11yLiveRegion />

      <Toasts />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {p2pOpen && <P2PPanel onClose={() => setP2pOpen(false)} />}
      {chatOpen && <AIChatModal onClose={() => setChatOpen(false)} />}
      <P2PSyncSubscriber />
      <KeyboardShortcuts />
      <DebugToggleShortcut />
      <SfxSubscriber />
      <TitleFaviconSubscriber />
      <BerryGameManager />
    </>
  );
}

function P2PSyncSubscriber() {
  const isConnected = useP2PStore((s) => s.isConnected);
  const syncCurrentPet = useP2PStore((s) => s.syncCurrentPet);
  const stats = usePetStore((s) => s.stats);
  const isAsleep = usePetStore((s) => s.isAsleep);
  const name = usePetStore((s) => s.name);

  useEffect(() => {
    if (isConnected) {
      syncCurrentPet();
    }
  }, [isConnected, stats, isAsleep, name, syncCurrentPet]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  SFX subscriber — keeps enabled flag in sync and fires passive SFX */
/* ------------------------------------------------------------------ */

function SfxSubscriber() {
  const { actor } = usePetActorCtx();
  const soundOn = usePetStore((s) => s.settings.soundOn);
  const toastCount = usePetStore((s) => s.toasts.length);

  useEffect(() => {
    setSfxEnabled(soundOn);
  }, [soundOn]);

  // Hatch (egg -> baby) and Evolve detection via store stage/hatched changes
  // + Asleep transitions (sleep/wake SFX via state transitions, not click)
  const prevStageRef = useRef<{ hatched: boolean; stage: string; asleep: boolean } | null>(null);
  useEffect(() => {
    const unsub = usePetStore.subscribe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state: any) => {
        const hatched = state.hatched as boolean;
        const stage = state.stage as string;
        const asleep = state.isAsleep as boolean;
        const prev = prevStageRef.current;
        if (!prev) {
          prevStageRef.current = { hatched, stage, asleep };
          return;
        }
        if (!prev.hatched && hatched) sfxHatch();
        else if (prev.hatched && prev.stage !== stage && prev.stage !== 'egg') sfxEvolve();
        if (prev.asleep !== asleep) {
          if (asleep) sfxSleep();
          else sfxWake();
        }
        prevStageRef.current = { hatched, stage, asleep };
      },
    );
    return unsub;
  }, []);

  // Refuse anim detection via machine context.currentAnim
  const lastAnimRef = useRef<string | null>(null);
  useEffect(() => {
    const sub = actor.subscribe((sn) => {
      const anim = sn.context?.currentAnim as string | undefined;
      if (anim && anim !== lastAnimRef.current && anim === 'refuse') sfxRefuse();
      lastAnimRef.current = anim ?? null;
    });
    return () => sub.unsubscribe();
  }, [actor]);

  // Toast notification SFX
  const prevToastCount = useRef(0);
  useEffect(() => {
    if (toastCount > prevToastCount.current) sfxToast();
    prevToastCount.current = toastCount;
  }, [toastCount]);

  // Low hunger warning SFX
  const warnedHungry = useRef(false);
  const hunger = usePetStore((s) => s.stats.hunger);
  useEffect(() => {
    if (hunger < 20 && !warnedHungry.current) {
      warnedHungry.current = true;
      sfxHungry();
    } else if (hunger >= 30) {
      warnedHungry.current = false;
    }
  }, [hunger]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  Tab title + favicon mood updater (Phase 8c)                       */
/* ------------------------------------------------------------------ */

function TitleFaviconSubscriber() {
  const { actor } = usePetActorCtx();
  const hatched = usePetStore((s) => s.hatched);
  const stage = usePetStore((s) => s.stage);
  const isAsleep = usePetStore((s) => s.isAsleep);
  const isSick = usePetStore((s) => s.isSick);
  const stats = usePetStore((s) => s.stats);

  const prevMoodKeyRef = useRef<string | null>(null);
  const faviconLinkRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    faviconLinkRef.current = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!faviconLinkRef.current) {
      const l = document.createElement('link');
      l.rel = 'icon';
      l.type = 'image/svg+xml';
      document.head.appendChild(l);
      faviconLinkRef.current = l;
    }
  }, []);

  const computeMood = (anim: string | null): { key: string; emoji: string; tint: string; bg: string; label: string } => {
    // Egg / hatching phases — override everything
    if (!hatched) {
      // Hatching sub-phases via stage string (egg never leaves unless hatch event)
      if (anim === 'hatching_hatched') return { key: 'hatching', emoji: '*' , tint: '#f6c453', bg: '#fff5dc', label: 'Hatching' };
      return { key: 'egg', emoji: 'o' , tint: '#fff1d9', bg: '#ffe0a8', label: 'Egg' };
    }
    // Sick — strong override
    if (isSick) return { key: 'sick', emoji: '+' , tint: '#8a6d80', bg: '#e7d8e3', label: 'Sick' };
    // Sleeping
    if (isAsleep || anim === 'sleeping' || anim === 'sleeping_on') return { key: 'sleeping', emoji: 'z' , tint: '#a4b7d6', bg: '#d7e1f3', label: 'Sleeping' };
    // Eating
    if (anim === 'eating') return { key: 'eating', emoji: '^' , tint: '#e49a6a', bg: '#ffe3c9', label: 'Eating' };
    // Playing / happy
    if (anim === 'happy' || anim === 'playing' || anim === 'clean' || anim === 'pet') return { key: 'happy', emoji: ':' , tint: '#7ab08c', bg: '#e0f4e2', label: 'Happy' };
    // Sad
    if (anim === 'sad' || anim === 'dirty' || anim === 'refuse') return { key: 'sad', emoji: ';' , tint: '#7a86a8', bg: '#dde2ed', label: 'Sad' };
    // Hungry
    if (anim === 'hungry' || stats.hunger < 30) return { key: 'hungry', emoji: '>' , tint: '#c79273', bg: '#f6dfd0', label: 'Hungry' };
    // Max stats (green / great mood) — all stats ≥ 80
    if (stats.hunger >= 80 && stats.happiness >= 80 && stats.energy >= 80 && stats.hygiene >= 80 && stats.health >= 80) {
      return { key: 'great', emoji: '<' , tint: '#6fc080', bg: '#d7f3d9', label: 'Great' };
    }
    return { key: 'happy', emoji: ':' , tint: '#7ab08c', bg: '#e0f4e2', label: 'Happy' };
  };

  const applyMood = (m: { key: string; emoji: string; tint: string; bg: string; label: string }) => {
    if (m.key === prevMoodKeyRef.current) return;
    prevMoodKeyRef.current = m.key;
    document.title = `Pixel Pet · ${m.emoji} ${m.label}`;
    if (!faviconLinkRef.current) return;
    // Pixelated 16×16 SVG favicon: pixel-style pet head with tinted body
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'>
  <rect width='16' height='16' fill='${m.bg}'/>
  <rect x='3' y='5' width='10' height='8' rx='1' fill='${m.tint}'/>
  <rect x='4' y='4' width='8' height='2' fill='${m.tint}'/>
  <rect x='5' y='7' width='2' height='2' fill='#1a1a1a'/>
  <rect x='9' y='7' width='2' height='2' fill='#1a1a1a'/>
  <rect x='7' y='10' width='2' height='1' fill='#1a1a1a'/>
  <rect x='6' y='9' width='1' height='1' fill='#e99fb4'/>
  <rect x='9' y='9' width='1' height='1' fill='#e99fb4'/>
</svg>`;
    faviconLinkRef.current.href = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  // Combine anim-based transitions + store prop changes. Recompute whenever store props change.
  const lastAnimRef = useRef<string | null>(null);
  useEffect(() => {
    const sub = actor.subscribe((sn) => {
      const anim = (sn.context?.currentAnim as string | undefined) ?? null;
      lastAnimRef.current = anim;
      applyMood(computeMood(anim));
    });
    applyMood(computeMood(lastAnimRef.current));
    return () => sub.unsubscribe();
  }, [actor, hatched, stage, isAsleep, isSick, stats.hunger, stats.happiness, stats.energy, stats.hygiene, stats.health]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  Berry mini-game manager / trigger / modal (Phase 8b)              */
/* ------------------------------------------------------------------ */

function BerryGameManager() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    _openBerries = () => setOpen((cur) => {
      if (cur) return cur; // don't reopen mid-game
      const s = usePetStore.getState();
      // Apply same guards as the PLAY event (energy>=15 + not asleep) before opening
      if (s.isAsleep) return cur;
      if (s.stats.energy < 15) return cur;
      return true;
    });
    return () => {
      if (_openBerries === (openBerryGame as unknown as () => void)) {
        _openBerries = null;
      }
    };
  }, []);
  void openBerryGame;

  return (
    <BerryGameModal
      open={open}
      onClose={(finalScore) => {
        setOpen(false);
        if (finalScore !== null) {
          usePetStore.getState().play(finalScore);
        }
      }}
    />
  );
}

const GAME_DURATION_MS = 15_000;
const BERRY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'] as const;
type BerryKind = (typeof BERRY_COLORS)[number];

interface Berry {
  id: number;
  x: number; // percent 0..100
  y: number; // percent 0..100 (grows down)
  vy: number; // percent per second
  color: BerryKind;
  points: number;
  dead?: boolean;
}

function BerryGameModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: (finalScore: number | null) => void;
}) {
  const [score, setScore] = useState(0);
  const [msLeft, setMsLeft] = useState(GAME_DURATION_MS);
  const [berries, setBerries] = useState<Berry[]>([]);
  const rafRef = useRef<number>(0);
  const spawnRef = useRef(0);
  const startTsRef = useRef(0);
  const lastTsRef = useRef(0);
  const idRef = useRef(1);

  useEffect(() => {
    if (!open) return;
    setScore(0);
    setMsLeft(GAME_DURATION_MS);
    setBerries([]);
    spawnRef.current = 0;
    startTsRef.current = performance.now();
    lastTsRef.current = startTsRef.current;

    const loop = (t: number) => {
      const t0 = startTsRef.current;
      const dt = Math.min(60, t - lastTsRef.current); // ms
      lastTsRef.current = t;
      const elapsed = t - t0;
      const remaining = Math.max(0, GAME_DURATION_MS - elapsed);
      setMsLeft(remaining);

      // Spawn new berries every 450 ms
      spawnRef.current += dt;
      if (spawnRef.current >= 450) {
        spawnRef.current = 0;
        const color = BERRY_COLORS[Math.floor(Math.random() * BERRY_COLORS.length)];
        setBerries((prev) => [
          ...prev,
          {
            id: idRef.current++,
            x: 6 + Math.random() * 88,
            y: -6,
            vy: 22 + Math.random() * 18, // percent per second
            color,
            points: color === '#eab308' ? 3 : color === '#a855f7' ? 2 : 1,
          },
        ]);
      }

      // Move berries
      setBerries((prev) =>
        prev
          .map((b) => ({ ...b, y: b.y + b.vy * (dt / 1000) }))
          .filter((b) => b.y < 110 && !b.dead),
      );

      if (remaining <= 0) {
        sfxPlayEnd(scoreRef.current);
        onClose(scoreRef.current);
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const scoreRef = useRef(0);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const reduced = usePrefersReducedMotion();
  const onBerry = (id: number, pts: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setBerries((prev) => prev.map((b) => (b.id === id ? { ...b, dead: true } : b)));
    setScore((s) => s + pts);
    sfxCatchBerry(pts);
  };

  const pct = msLeft / GAME_DURATION_MS;

  // Escape key closes the mini-game (dismiss early with partial score)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose(scoreRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Catch the berries mini-game"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        >
          <div aria-hidden className="absolute inset-0 bg-[#2b2138]/50 backdrop-blur-sm" onClick={() => onClose(null)} />
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.97 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 30 }}
            className="relative w-full max-w-md rounded-3xl bg-[#fffaf2] border-2 border-[#2b2138]/10 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#2b2138]/10">
              <div className="font-pixel text-[11px] text-[#2b2138]">CATCH BERRIES</div>
              <div className="flex items-center gap-3">
                <div className="font-pixel text-[10px] text-[#6b4a80]">
                  SCORE <span className="text-[#2b2138]">{score}</span>
                </div>
                <button
                  type="button"
                  aria-label="Close mini-game early"
                  onClick={() => onClose(scoreRef.current)}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-[#ffe8d0] transition"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#2b2138]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-4 pt-2 pb-1">
              <div className="h-2 w-full rounded-full bg-[#2b2138]/8 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-100"
                  style={{ width: `${Math.round(pct * 100)}%`, background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' }}
                />
              </div>
            </div>
            <div
              className="relative mx-3 mb-3 mt-1 h-64 sm:h-72 rounded-2xl bg-gradient-to-b from-[#cfe9ff] to-[#fce7f3] overflow-hidden select-none touch-none"
              aria-label="Berries are falling; click or tap each berry before they hit the ground."
            >
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#7dd3fc]/50 to-transparent" />
              {berries.filter(b => !b.dead).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onMouseDown={(e) => onBerry(b.id, b.points, e)}
                  onTouchStart={(e) => onBerry(b.id, b.points, e)}
                  aria-label={`Berry worth ${b.points} point${b.points === 1 ? '' : 's'}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-[0_3px_0_rgba(0,0,0,0.12)] active:scale-90 transition-transform cursor-pointer"
                  style={{
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                    background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.85) 0 18%, transparent 22%), ${b.color}`,
                  }}
                />
              ))}
            </div>
            <div className="px-4 pb-3 text-[10px] font-sans text-[#6b4a80]">
              Tap berries before they fall! Yellow = +3 · Purple = +2 · others +1.
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * Reads pet name + lowest stat mood, updates the sr-only a11y live region so
 * screen readers announce mood changes without visual UI being re-read.
 */
function A11yLiveRegion() {
  const name = usePetStore((s) => s.name);
  const stats = usePetStore((s) => s.stats);
  const isAsleep = usePetStore((s) => s.isAsleep);
  const isSick = usePetStore((s) => s.isSick);
  const [announced, setAnnounced] = useState('Pixel Pet ready.');

  useEffect(() => {
    // Build a friendly phrase; throttle changes by 1.5s to avoid chatter.
    let phrase: string;
    if (isAsleep) phrase = `${name} is sleeping.`;
    else if (isSick) phrase = `${name} feels sick — give medicine.`;
    else {
      const low = lowestName(stats);
      if (low.value < 30) phrase = `${name} looks ${low.label.toLowerCase()}.`;
      else if (low.value < 60) phrase = `${name} is doing okay.`;
      else phrase = `${name} is happy.`;
    }
    const id = window.setTimeout(() => setAnnounced(phrase), 1500);
    return () => window.clearTimeout(id);
  }, [name, stats.hunger, stats.happiness, stats.energy, stats.hygiene, stats.health, isAsleep, isSick]);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" id="a11y-live">
      {announced}
    </div>
  );
}

function lowestName(s: { hunger: number; happiness: number; energy: number; hygiene: number; health: number }) {
  const arr = [
    { label: 'Hungry', value: s.hunger },
    { label: 'Sad', value: s.happiness },
    { label: 'Tired', value: s.energy },
    { label: 'Dirty', value: s.hygiene },
  ];
  return arr.reduce((a, b) => (a.value <= b.value ? a : b));
}

export default function App() {
  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row items-start justify-center gap-6 p-4 sm:p-6 md:p-10">
      <PetActorProvider>
        <AppInner />
      </PetActorProvider>
    </main>
  );
}
