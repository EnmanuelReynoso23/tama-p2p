import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PetCanvas from '../PetCanvas';
import FlameIcon from '../FlameIcon';
import MiniPet from '../MiniPet';
import QrCode from '../QrCode';
import { usePetStore } from '../../store/usePetStore';
import { useHabitStore } from '../../store/useHabitStore';
import { friendDisplayName, useOnlineFriendIds, useP2PStore } from '../../store/useP2PStore';
import { friendStreak, streakStatus } from '../../game/streak';
import { STAGE_LABEL } from '../../game/labels';
import { useToday } from '../../hooks/useToday';
import { buildInviteUrl } from '../../network/invite';
import { sfxButton } from '../../sounds/sfx';

/**
 * Raspberry Pi "maquinita" mode (open with ?modo=maquina).
 *
 * Three physical buttons, classic Tamagotchi style (GPIO → keyboard keys):
 *   A  → next option        (also →, ↓, Tab)
 *   S  → OK / select        (also Enter, Space)
 *   D  → back / cancel      (also Esc, Backspace, ←)
 *
 * Everything is reachable with those three keys, the focused option is shown
 * big and high-contrast, and an optional Spanish voice reads it aloud.
 */

type Screen = 'home' | 'habits' | 'friends' | 'stats';
type MenuId = 'feed' | 'play' | 'clean' | 'sleep' | 'medicine' | 'habits' | 'friends' | 'stats';

const VOICE_KEY = 'tama-voice';

function useVoice() {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(VOICE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggle = useCallback(() => {
    setOn((v) => {
      const next = !v;
      try {
        localStorage.setItem(VOICE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  const say = useCallback(
    (text: string, force = false) => {
      if ((!on && !force) || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-ES';
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    },
    [on],
  );
  return { on, toggle, say };
}

/** Keep the LCD awake while the pet is on screen. */
function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    const request = () => {
      if (document.visibilityState !== 'visible' || !nav.wakeLock) return;
      nav.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {});
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      void lock?.release().catch(() => {});
    };
  }, []);
}

export default function MachineMode() {
  useWakeLock();
  const voice = useVoice();
  const today = useToday();

  const name = usePetStore((s) => s.name);
  const stage = usePetStore((s) => s.stage);
  const hatched = usePetStore((s) => s.hatched);
  const stats = usePetStore((s) => s.stats);
  const isAsleep = usePetStore((s) => s.isAsleep);
  const isSick = usePetStore((s) => s.isSick);

  const habits = useHabitStore((s) => s.habits);
  const completedDays = useHabitStore((s) => s.completedDays);
  const streak = useHabitStore((s) => s.currentStreak);
  const toggleHabit = useHabitStore((s) => s.toggleHabit);

  const friends = useP2PStore((s) => s.friends);
  const roomId = useP2PStore((s) => s.roomId);
  const isConnected = useP2PStore((s) => s.isConnected);
  const sendInteraction = useP2PStore((s) => s.sendInteractionToPeers);
  const newRoom = useP2PStore((s) => s.newRoom);
  const joinRoom = useP2PStore((s) => s.joinRoom);
  const online = useOnlineFriendIds();

  const [screen, setScreen] = useState<Screen>('home');
  const [cursor, setCursor] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);

  const menu = useMemo(() => {
    const items: Array<{ id: MenuId; label: string }> = [
      { id: 'feed', label: 'Comer' },
      { id: 'play', label: 'Jugar' },
      { id: 'clean', label: 'Bañar' },
      { id: 'sleep', label: isAsleep ? 'Despertar' : 'Dormir' },
    ];
    if (isSick) items.push({ id: 'medicine', label: 'Medicina' });
    items.push(
      { id: 'habits', label: 'Hábitos' },
      { id: 'friends', label: 'Amigos' },
      { id: 'stats', label: 'Estado' },
    );
    return items;
  }, [isAsleep, isSick]);

  const friendList = useMemo(
    () => Object.values(friends).sort((a, b) => b.lastSeen - a.lastSeen),
    [friends],
  );

  // Number of focusable rows on each screen (stats: one "voice" toggle).
  const count =
    screen === 'home'
      ? menu.length
      : screen === 'habits'
        ? habits.length
        : screen === 'friends'
          ? Math.max(1, friendList.length)
          : 1;

  const notify = useCallback(
    (text: string) => {
      setFlash(text);
      voice.say(text);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlash(null), 1800);
    },
    [voice],
  );

  // Speak the focused option whenever it changes.
  const focusedLabel =
    screen === 'home'
      ? menu[cursor]?.label
      : screen === 'habits'
        ? habits[cursor]
          ? `${habits[cursor].title}, ${habits[cursor].completed ? 'hecho' : 'pendiente'}`
          : 'Sin hábitos'
        : screen === 'friends'
          ? friendList[cursor]
            ? friendDisplayName(friendList[cursor])
            : 'Escanea el código para invitar'
          : `Voz ${voice.on ? 'activada' : 'apagada'}`;
  useEffect(() => {
    if (focusedLabel) voice.say(focusedLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedLabel]);

  const runMenu = useCallback(
    (id: MenuId) => {
      const pet = usePetStore.getState();
      switch (id) {
        case 'feed':
          if (pet.feed('meal').ok) notify('Ñam ñam');
          break;
        case 'play':
          if (pet.play().ok) notify('A jugar');
          break;
        case 'clean':
          if (pet.cleanNow().ok) notify('Qué limpia');
          break;
        case 'sleep':
          if (pet.toggleSleepToggle().ok) notify(isAsleep ? 'Buenos días' : 'Buenas noches');
          break;
        case 'medicine':
          if (pet.giveMedicineNow().ok) notify('Medicina dada');
          break;
        case 'habits':
        case 'friends':
        case 'stats':
          sfxButton();
          setScreen(id);
          setCursor(0);
          if (id === 'friends' && !isConnected) {
            joinRoom(roomId || newRoom());
          }
          break;
      }
    },
    [isAsleep, notify, isConnected, joinRoom, roomId, newRoom],
  );

  const select = useCallback(() => {
    if (screen === 'home') {
      const item = menu[cursor];
      if (item) runMenu(item.id);
    } else if (screen === 'habits') {
      const h = habits[cursor];
      if (!h) return;
      toggleHabit(h.id);
      sfxButton();
      const all = useHabitStore.getState().habits.every((x) => x.completed);
      notify(all ? '¡Racha encendida!' : h.completed ? 'Desmarcado' : '¡Hecho!');
    } else if (screen === 'friends') {
      if (friendList.length === 0) return;
      sendInteraction('cheer');
      sfxButton();
      notify('Ánimos enviados');
    } else {
      voice.toggle();
      voice.say(voice.on ? 'Voz apagada' : 'Voz activada', true);
    }
  }, [screen, menu, cursor, runMenu, habits, toggleHabit, notify, friendList.length, sendInteraction, voice]);

  const back = useCallback(() => {
    if (screen !== 'home') {
      sfxButton();
      setScreen('home');
      setCursor(0);
    }
  }, [screen]);

  // Physical buttons (GPIO → keys) + keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowright' || k === 'arrowdown' || k === 'tab') {
        e.preventDefault();
        setCursor((c) => (c + 1) % count);
      } else if (k === 'arrowup') {
        e.preventDefault();
        setCursor((c) => (c - 1 + count) % count);
      } else if (k === 's' || k === 'enter' || k === ' ') {
        e.preventDefault();
        select();
      } else if (k === 'd' || k === 'escape' || k === 'backspace' || k === 'arrowleft') {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, select, back]);

  // Keep the cursor in range when lists change (e.g. medicine item disappears).
  useEffect(() => {
    if (cursor >= count) setCursor(0);
  }, [cursor, count]);

  const status = streakStatus(completedDays, today);
  const onlineCount = online.size;

  return (
    <main
      className="machine flex h-[100dvh] w-full cursor-none select-none flex-col overflow-hidden bg-[#17121f] text-white"
      aria-label={`Animo, modo máquina. ${name}`}
    >
      {/* Status bar */}
      <header className="flex items-center justify-between gap-2 px-[2vw] py-[1.2vh] text-[max(14px,3.2vh)] font-extrabold">
        <span className="truncate">
          {name} · {STAGE_LABEL[hatched ? stage : 'egg']}
        </span>
        <span className="flex items-center gap-[1.5vw]">
          <span className="flex items-center gap-1" aria-label={`Racha de ${streak} días`}>
            <FlameIcon status={status} className="h-[4.5vh] w-[4.5vh] min-h-[18px] min-w-[18px]" />
            {streak}
          </span>
          <span aria-label={`${onlineCount} amigos en línea`}>
            {onlineCount} en línea
          </span>
        </span>
      </header>

      <div className="relative min-h-0 flex-1 px-[2vw]">
        {screen === 'home' && (
          <div className="flex h-full items-center justify-center">
            <div className="aspect-[4/3] h-full max-h-full max-w-full overflow-hidden rounded-2xl border-4 border-white/80">
              <PetCanvas />
            </div>
          </div>
        )}

        {screen === 'habits' && (
          <MachineList
            title={`Hábitos de hoy · ${habits.filter((h) => h.completed).length}/${habits.length}`}
            items={habits.map((h) => ({
              key: h.id,
              text: h.title,
              right: h.completed ? 'Hecho' : 'Falta',
              done: h.completed,
            }))}
            cursor={cursor}
            empty="No hay hábitos. Añádelos desde el teléfono."
          />
        )}

        {screen === 'friends' && (
          <div className="flex h-full gap-[2vw]">
            <div className="min-w-0 flex-1">
              <MachineList
                title="Amigos y rachas"
                items={friendList.map((f) => {
                  const s = friendStreak(completedDays, f.pet.completedDays, today);
                  return {
                    key: f.playerId,
                    text: friendDisplayName(f),
                    right: `${s.count} días`,
                    done: s.status === 'done',
                    avatar: (
                      <MiniPet stage={f.pet.stage} variant={f.pet.adultVariant} size={36} flip label="" />
                    ),
                    dim: !online.has(f.playerId),
                  };
                })}
                cursor={cursor}
                empty="Escanea el QR con tu teléfono para conectarte."
              />
              {friendList.length > 0 && (
                <p className="mt-[1vh] text-[max(12px,2.6vh)] text-white/80">OK = enviar ánimos</p>
              )}
            </div>
            {roomId && (
              <div className="flex shrink-0 flex-col items-center justify-center gap-1">
                <QrCode value={buildInviteUrl(roomId)} size={150} label="Código QR para unirse desde el teléfono" />
                <span className="text-[max(11px,2.2vh)] text-white/80">Únete desde el teléfono</span>
              </div>
            )}
          </div>
        )}

        {screen === 'stats' && (
          <div className="flex h-full flex-col justify-center gap-[1.2vh] text-[max(14px,3.2vh)]">
            {(
              [
                ['Hambre', stats.hunger],
                ['Felicidad', stats.happiness],
                ['Energía', stats.energy],
                ['Higiene', stats.hygiene],
                ['Salud', stats.health],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="flex items-center gap-[2vw]">
                <span className="w-[28%] font-bold">{label}</span>
                <div className="h-[3vh] min-h-[10px] flex-1 overflow-hidden rounded-full border-2 border-white bg-white/10">
                  <div
                    className={`h-full ${v < 30 ? 'bg-red-400' : v < 60 ? 'bg-amber-300' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.round(v)}%` }}
                  />
                </div>
                <span className="w-[12%] text-right tabular-nums">{Math.round(v)}</span>
              </div>
            ))}
            <div
              className={`mt-[1vh] rounded-xl border-4 px-3 py-[1vh] font-extrabold ${
                cursor === 0 ? 'border-[#ffd166] bg-[#ffd166] text-[#17121f]' : 'border-white/40'
              }`}
            >
              Voz: {voice.on ? 'Sí' : 'No'} (OK para cambiar)
            </div>
          </div>
        )}

        {flash && (
          <div
            role="status"
            className="pointer-events-none absolute inset-x-[10%] bottom-[4%] rounded-2xl border-4 border-[#ffd166] bg-[#17121f]/95 py-[2vh] text-center text-[max(16px,4.5vh)] font-black"
          >
            {flash}
          </div>
        )}
      </div>

      {/* Menu row (home) or hint bar */}
      <footer className="px-[2vw] pb-[1.5vh] pt-[1vh]">
        {screen === 'home' ? (
          <>
            <ol className="flex justify-between gap-[1vw]" aria-label="Menú">
              {menu.map((m, i) => (
                <li
                  key={m.id}
                  aria-current={i === cursor ? 'true' : undefined}
                  className={`grid flex-1 place-items-center rounded-xl border-4 py-[0.8vh] text-[max(11px,2.6vh)] font-extrabold leading-none transition ${
                    i === cursor ? 'border-[#ffd166] bg-[#ffd166]/20 scale-110' : 'border-transparent opacity-70'
                  }`}
                >
                  <span>{m.label}</span>
                </li>
              ))}
            </ol>
            <p className="mt-[0.8vh] text-center text-[max(16px,4.2vh)] font-black tracking-wide text-[#ffd166]" aria-live="polite">
              {menu[cursor]?.label}
            </p>
          </>
        ) : null}
        <p className="mt-[0.5vh] flex justify-center gap-[4vw] text-[max(11px,2.4vh)] font-bold text-white/75" aria-hidden>
          <span>
            <Kbd>A</Kbd> siguiente
          </span>
          <span>
            <Kbd>S</Kbd> OK
          </span>
          <span>
            <Kbd>D</Kbd> atrás
          </span>
        </p>
      </footer>
    </main>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="mr-1 inline-grid h-[1.6em] w-[1.6em] place-items-center rounded-md border-2 border-white/70 font-black text-white">
      {children}
    </kbd>
  );
}

function MachineList({
  title,
  items,
  cursor,
  empty,
}: {
  title: string;
  items: Array<{ key: string; text: string; right: string; done?: boolean; dim?: boolean; avatar?: JSX.Element }>;
  cursor: number;
  empty: string;
}) {
  const listRef = useRef<HTMLOListElement | null>(null);
  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-[1vh] text-[max(14px,3.4vh)] font-black text-[#ffd166]">{title}</h2>
      {items.length === 0 ? (
        <p className="text-[max(14px,3.2vh)] text-white/85">{empty}</p>
      ) : (
        <ol ref={listRef} className="flex min-h-0 flex-1 flex-col gap-[1vh] overflow-hidden">
          {items.map((it, i) => (
            <li
              key={it.key}
              aria-current={i === cursor ? 'true' : undefined}
              className={`flex items-center gap-[1.5vw] rounded-xl border-4 px-[1.5vw] py-[0.8vh] text-[max(14px,3.4vh)] font-bold ${
                i === cursor ? 'border-[#ffd166] bg-[#ffd166] text-[#17121f]' : 'border-white/25'
              } ${it.dim && i !== cursor ? 'opacity-60' : ''}`}
            >
              {it.avatar}
              <span className={`min-w-0 flex-1 truncate ${it.done && i !== cursor ? 'line-through opacity-80' : ''}`}>
                {it.text}
              </span>
              <span>{it.right}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
