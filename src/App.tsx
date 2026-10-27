import { useEffect, useRef, useState } from 'react';
import { moodOf } from '../core/animo.js';
import { petFrames } from '../core/sprites.js';
import CompanionView from './components/CompanionView';
import HabitsCard from './components/HabitsCard';
import AIChatModal from './components/AIChatModal';
import Header from './components/Header';
import Toasts from './components/Toasts';
import SettingsPanel from './components/SettingsPanel';
import FriendsView from './components/FriendsView';
import StreakHero from './components/StreakHero';
import InstallBanner from './components/InstallBanner';
import BottomNav, { type Tab } from './components/BottomNav';
import MachineMode from './components/machine/MachineMode';
import { useP2PStore } from './store/useP2PStore';
import { useHabitStore } from './store/useHabitStore';
import { usePetStore, type PetEventKind } from './store/usePetStore';
import { consumeInviteFromUrl, readAppMode } from './network/invite';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { spriteCanvas } from './sprites/draw';
import * as sfx from './sounds/sfx';

// Se leen una vez al arrancar, antes de pintar (tambien limpia la URL).
const INVITE_CODE = typeof window !== 'undefined' ? consumeInviteFromUrl() : null;
const APP_MODE = typeof window !== 'undefined' ? readAppMode() : 'phone';

/** Reloj de la mascota: se pone al dia al abrir y al volver, y avanza cada segundo. */
function PetClock() {
  useEffect(() => {
    const store = usePetStore.getState;
    store().runCatchUp(Date.now());
    const id = window.setInterval(() => {
      if (!document.hidden) store().tick(Date.now());
    }, 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') store().runCatchUp(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    // iOS y Android no dejan sonar nada hasta el primer toque.
    const unlock = () => sfx.unlockAudio();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
  return null;
}

const EVENT_SOUND: Record<PetEventKind, () => void> = {
  meal: sfx.sfxFeed,
  snack: sfx.sfxSnack,
  play: sfx.sfxPlay,
  clean: sfx.sfxClean,
  medicine: sfx.sfxMedicine,
  sleep: sfx.sfxSleep,
  wake: sfx.sfxWake,
  caress: sfx.sfxCaress,
  refuse: sfx.sfxRefuse,
  hatch: sfx.sfxHatch,
  evolve: sfx.sfxEvolve,
};

/** Sonido para cada cosa que pasa y para cada aviso nuevo. */
function SfxSubscriber() {
  const soundOn = usePetStore((s) => s.settings.soundOn);
  const lastEvent = usePetStore((s) => s.lastEvent);
  const toastCount = usePetStore((s) => s.toasts.length);
  const prevToasts = useRef(toastCount);
  useEffect(() => sfx.setSfxEnabled(soundOn), [soundOn]);
  useEffect(() => {
    if (lastEvent) EVENT_SOUND[lastEvent.kind]();
  }, [lastEvent]);
  useEffect(() => {
    if (toastCount > prevToasts.current && (!lastEvent || Date.now() - lastEvent.at > 400)) sfx.sfxToast();
    prevToasts.current = toastCount;
  }, [toastCount, lastEvent]);
  return null;
}

/** El icono de la pestana es la mascota con su cara de ahora. */
function TitleFavicon() {
  const name = usePetStore((s) => s.name);
  const mood = usePetStore((s) => moodOf(s));
  const stage = usePetStore((s) => (s.hatched ? s.stage : 'egg'));
  const form = usePetStore((s) => s.adultVariant);
  useEffect(() => {
    document.title = mood === 'sick' || mood === 'hungry' ? `${name} te necesita - Animo` : `${name} - Animo`;
    try {
      const src = spriteCanvas(petFrames(stage, form, mood)[0]);
      const big = document.createElement('canvas');
      big.width = big.height = 48;
      const ctx = big.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, 0, 0, 48, 48);
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.type = 'image/png';
      link.href = big.toDataURL('image/png');
    } catch {
      /* el icono es un detalle; si falla no pasa nada */
    }
  }, [name, mood, stage, form]);
  return null;
}

/** Teclas en la computadora: C comer, M merienda, J jugar, B banar, D dormir. */
function KeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = usePetStore.getState();
      const run: Record<string, () => unknown> = {
        c: () => s.feed('meal'),
        m: () => s.feed('snack'),
        j: () => s.play(),
        b: () => s.cleanNow(),
        d: () => s.toggleSleepToggle(),
      };
      const f = run[e.key.toLowerCase()];
      if (f) {
        e.preventDefault();
        f();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}

function P2PAutoConnect() {
  useEffect(() => {
    const p2p = useP2PStore.getState();
    if (INVITE_CODE) {
      p2p.joinRoom(INVITE_CODE);
      usePetStore.getState().pushToast({
        title: 'Te invitaron',
        body: 'Conectando con tu amigo… completen sus hábitos juntos para encender la racha.',
        tone: 'good',
      });
    } else if (p2p.autoConnect && p2p.roomId) {
      p2p.joinRoom(p2p.roomId);
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') useP2PStore.getState().syncCurrentPet();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  return null;
}

function P2PSyncSubscriber() {
  const isConnected = useP2PStore((s) => s.isConnected);
  const syncCurrentPet = useP2PStore((s) => s.syncCurrentPet);
  const stats = usePetStore((s) => s.stats);
  const isAsleep = usePetStore((s) => s.isAsleep);
  const name = usePetStore((s) => s.name);
  const stage = usePetStore((s) => s.stage);
  const completedDays = useHabitStore((s) => s.completedDays);
  const habits = useHabitStore((s) => s.habits);

  useEffect(() => {
    if (isConnected) {
      // El store limita los envios (uno cada pocos segundos como mucho).
      syncCurrentPet();
    }
  }, [isConnected, stats, isAsleep, name, stage, completedDays, habits, syncCurrentPet]);

  return null;
}

const MOOD_PHRASE: Record<string, (n: string) => string> = {
  egg: (n) => `${n} todavía es un huevo.`,
  sleep: (n) => `${n} está durmiendo.`,
  sick: (n) => `${n} está enferma: dale medicina.`,
  hungry: (n) => `${n} tiene hambre.`,
  dirty: (n) => `${n} necesita un baño.`,
  sad: (n) => `${n} está triste: juega con ella.`,
  tired: (n) => `${n} está cansada.`,
  happy: (n) => `${n} está feliz.`,
  ok: (n) => `${n} está bien.`,
};

/** Anuncia el estado a los lectores de pantalla, sin repetir a cada segundo. */
function A11yLiveRegion() {
  const name = usePetStore((s) => s.name);
  const mood = usePetStore((s) => moodOf(s));
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const id = window.setTimeout(() => setAnnounced(MOOD_PHRASE[mood](name)), 1500);
    return () => window.clearTimeout(id);
  }, [name, mood]);
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {announced}
    </div>
  );
}

function PhoneApp() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(INVITE_CODE ? 'friends' : 'pet');
  const habitsLeft = useHabitStore((s) => s.habits.filter((h) => !h.completed).length);
  const friendsOnline = useP2PStore((s) => new Set(Object.values(s.peerToPlayer)).size);
  const reduced = usePrefersReducedMotion();

  const changeTab = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <main className="min-h-[100dvh] w-full">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+104px)] pt-[calc(env(safe-area-inset-top)+12px)]">
        <Header onOpenSettings={() => setSettingsOpen(true)} />
        <InstallBanner />
        {tab !== 'friends' && <StreakHero onOpenFriends={() => changeTab('friends')} />}
        <div key={tab} className="tab-panel flex flex-col gap-4">
          {tab === 'pet' && <CompanionView onOpenChat={() => setChatOpen(true)} />}
          {tab === 'habits' && <HabitsCard />}
          {tab === 'friends' && <FriendsView />}
        </div>
      </div>
      <BottomNav tab={tab} onChange={changeTab} habitsLeft={habitsLeft} friendsOnline={friendsOnline} />
      <A11yLiveRegion />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {chatOpen && <AIChatModal onClose={() => setChatOpen(false)} />}
      <KeyboardShortcuts />
      <TitleFavicon />
    </main>
  );
}

export default function App() {
  return (
    <>
      {APP_MODE === 'machine' ? <MachineMode /> : <PhoneApp />}
      <PetClock />
      <P2PAutoConnect />
      <P2PSyncSubscriber />
      <SfxSubscriber />
      <Toasts />
    </>
  );
}
