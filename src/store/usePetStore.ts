import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import {
  caress,
  catchUp,
  cheer,
  clean,
  createPet,
  feed,
  giveMedicine,
  moodOf,
  play,
  revivePet,
  STAGE_STARTS,
  toggleSleep,
  type Mood,
  type Pet,
  type Refusal,
} from '../../core/animo.js';
import { STAGE_LABEL } from '../game/labels';
import { TIME_SPEEDS, type AdultVariant, type LifeStage, type Stats, type TimeSpeed } from '../game/constants';
import { useHabitStore } from './useHabitStore';

/**
 * Estado de la mascota en la app. Las reglas viven en core/animo.js (las mismas
 * que usa la maquinita); aqui solo se guardan, se avisan y se suenan.
 */

export interface Settings {
  readonly soundOn: boolean;
  readonly timeSpeed: TimeSpeed;
  readonly forceNight: boolean;
}

export type PetPersisted = Pet & { readonly settings: Settings };

export interface Toast {
  readonly id: number;
  readonly title: string;
  readonly body: string;
  readonly tone: 'info' | 'warn' | 'good';
}
export type WelcomeToast = Toast;

/** Lo ultimo que paso, para que la pantalla y el sonido reaccionen. */
export type PetEventKind =
  | 'meal'
  | 'snack'
  | 'play'
  | 'clean'
  | 'medicine'
  | 'sleep'
  | 'wake'
  | 'caress'
  | 'refuse'
  | 'hatch'
  | 'evolve';
export interface PetEvent {
  readonly kind: PetEventKind;
  readonly at: number;
}

type Outcome = { ok: true } | { ok: false; reason: Refusal };

export interface PetState extends PetPersisted {
  readonly toasts: Toast[];
  readonly lastEvent: PetEvent | null;
  readonly storageUnavailable: boolean;

  tick(now: number): void;
  runCatchUp(now: number): void;

  feed(kind: 'meal' | 'snack'): Outcome;
  play(): Outcome;
  cleanNow(): Outcome;
  toggleSleepToggle(): Outcome;
  giveMedicineNow(): Outcome;
  petStrokeNow(): { granted: number };
  /** Premio por cumplir un hábito. */
  cheerNow(): void;

  setName(name: string): void;
  resetPet(name?: string): void;
  importHandoff(pet: Partial<Pet>): void;

  setTimeSpeed(speed: TimeSpeed): void;
  setSoundOn(v: boolean): void;
  setForceNight(v: boolean): void;

  devSetAllStats(to: number): void;
  devSetSick(v: boolean): void;
  devSkipStage(): void;

  pushToast(toast: Omit<Toast, 'id'>): void;
  dismissToast(id: number): void;
}

const STORAGE_KEY = 'animo-v2';
const LEGACY_KEY = 'animo-v1';
const DEFAULT_SETTINGS: Settings = { soundOn: true, timeSpeed: 1, forceNight: false };

const REFUSAL_TEXT: Record<Refusal, string> = {
  asleep: 'Está dormida. Déjala descansar o despiértala.',
  egg: 'Todavía es un huevo.',
  full: 'Está llena.',
  cooldown: 'Espera un momento.',
  tired: 'Está muy cansada para jugar.',
  clean: 'Ya está limpia.',
  not_sick: 'No está enferma.',
};

let toastSeq = 1;
const now = () => Date.now();

/** localStorage que no rompe la app en modo privado ni sin espacio. */
let storageFailed = false;
const safeStorage: StateStorage = {
  getItem(key) {
    try {
      const v = localStorage.getItem(key);
      if (v !== null || key !== STORAGE_KEY) return v;
      // Primera vez con la version nueva: se trae la partida de la anterior.
      const old = localStorage.getItem(LEGACY_KEY);
      if (!old) return null;
      const parsed = JSON.parse(old);
      const legacy = parsed && parsed.state ? parsed.state : parsed;
      return JSON.stringify({ state: { ...revivePet(legacy, now()), settings: readSettings(legacy?.settings) }, version: 0 });
    } catch {
      storageFailed = true;
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      storageFailed = true;
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nada que hacer */
    }
  },
};

function readSettings(raw: unknown): Settings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  return {
    soundOn: typeof s.soundOn === 'boolean' ? s.soundOn : DEFAULT_SETTINGS.soundOn,
    timeSpeed: TIME_SPEEDS.includes(s.timeSpeed as TimeSpeed) ? (s.timeSpeed as TimeSpeed) : 1,
    forceNight: s.forceNight === true,
  };
}

function petOnly(s: PetState): Pet {
  return {
    version: s.version,
    name: s.name,
    birthTs: s.birthTs,
    lastUpdated: s.lastUpdated,
    ageMs: s.ageMs,
    stage: s.stage,
    adultVariant: s.adultVariant,
    hatched: s.hatched,
    stats: s.stats,
    isAsleep: s.isAsleep,
    isSick: s.isSick,
    poops: s.poops,
    digestMs: s.digestMs,
    careEma: s.careEma,
    careCarryMs: s.careCarryMs,
    caressHourStart: s.caressHourStart,
    caressCount: s.caressCount,
    cooldownsUntil: s.cooldownsUntil,
  };
}

const FORM_TEXT: Record<AdultVariant, string> = {
  radiant: 'le salió una flor. La cuidaste muy bien.',
  chill: 'ahora lleva una hoja de sombrero.',
  scruffy: 'creció con las hojas revueltas. Cuídala más.',
};

/** Avisos al cambiar de etapa o enfermarse. */
function noticesFor(before: Pet, after: Pet): Omit<Toast, 'id'>[] {
  const out: Omit<Toast, 'id'>[] = [];
  if (!before.hatched && after.hatched) out.push({ title: 'Nació', body: `${after.name} salió del huevo.`, tone: 'good' });
  else if (before.stage !== after.stage) {
    const body =
      after.stage === 'adult' && after.adultVariant
        ? `${after.name} ${FORM_TEXT[after.adultVariant]}`
        : `${after.name} ya es ${STAGE_LABEL[after.stage].toLowerCase()}.`;
    out.push({ title: 'Creció', body, tone: 'good' });
  }
  if (!before.isSick && after.isSick) out.push({ title: 'Enferma', body: `${after.name} necesita medicina.`, tone: 'warn' });
  return out;
}

function streakNow(): number {
  try {
    return useHabitStore.getState().currentStreak || 0;
  } catch {
    return 0;
  }
}

export const usePetStore = create<PetState>()(
  persist(
    (set, get) => {
      const addToasts = (list: Omit<Toast, 'id'>[]) => {
        if (!list.length) return;
        set((s) => ({ toasts: [...s.toasts, ...list.map((t) => ({ ...t, id: toastSeq++ }))].slice(-4) }));
      };
      const event = (kind: PetEventKind) => set({ lastEvent: { kind, at: now() } });

      /** Pone el reloj al dia y aplica el cambio con sus avisos. */
      const advanceTo = (t: number) => {
        const s = get();
        const before = petOnly(s);
        const after = catchUp(before, t, { speed: s.settings.timeSpeed, streak: streakNow() });
        if (after === before) return;
        set(after);
        addToasts(noticesFor(before, after));
        if (!before.hatched && after.hatched) event('hatch');
        else if (before.stage !== after.stage) event('evolve');
      };

      /** Corre una accion del nucleo y avisa si la mascota no quiso. */
      const act = (run: (p: Pet, t: number) => { ok: boolean; pet: Pet; reason?: Refusal }, kind: PetEventKind): Outcome => {
        const t = now();
        advanceTo(t);
        const res = run(petOnly(get()), t);
        if (!res.ok) {
          const reason = res.reason as Refusal;
          event('refuse');
          addToasts([{ title: 'No quiere', body: REFUSAL_TEXT[reason], tone: 'info' }]);
          return { ok: false, reason };
        }
        set(res.pet);
        event(kind);
        return { ok: true };
      };

      return {
        ...createPet('Brote', now()),
        settings: DEFAULT_SETTINGS,
        toasts: [],
        lastEvent: null,
        storageUnavailable: false,

        tick(t) {
          advanceTo(t);
          if (storageFailed && !get().storageUnavailable) set({ storageUnavailable: true });
        },

        runCatchUp(t) {
          const s = get();
          const away = t - s.lastUpdated;
          const before = s.stats;
          advanceTo(t);
          if (away < 30 * 60 * 1000 || !get().hatched) return;
          const after = get().stats;
          const hours = Math.round(away / 3_600_000);
          const worst = (Object.keys(after) as (keyof Stats)[]).reduce((a, k) => (after[k] < after[a] ? k : a), 'hunger');
          const low = after[worst] < 35;
          addToasts([
            {
              title: 'Volviste',
              body:
                (hours >= 1 ? `Pasaron ${hours} h. ` : '') +
                (low ? `${get().name} te extrañó: revisa ${labelOf(worst)}.` : `${get().name} está bien.`),
              tone: low || after.health < before.health ? 'warn' : 'good',
            },
          ]);
        },

        feed(kind) {
          return act((p, t) => feed(p, kind, t), kind);
        },
        play() {
          return act((p, t) => play(p, t), 'play');
        },
        cleanNow() {
          return act((p, t) => clean(p, t), 'clean');
        },
        toggleSleepToggle() {
          const wasAsleep = get().isAsleep;
          return act((p) => toggleSleep(p), wasAsleep ? 'wake' : 'sleep');
        },
        giveMedicineNow() {
          return act((p) => giveMedicine(p), 'medicine');
        },
        petStrokeNow() {
          const t = now();
          const res = caress(petOnly(get()), t);
          if (res.granted > 0) {
            set(res.pet);
            event('caress');
          }
          return { granted: res.granted };
        },

        cheerNow() {
          const before = petOnly(get());
          const after = cheer(before, now());
          if (after === before) return;
          set(after);
          event('caress');
        },

        setName(name) {
          set({ name: revivePet({ name }, now()).name });
        },
        resetPet(name) {
          set({ ...createPet(name ?? get().name, now()), toasts: [], lastEvent: null });
        },
        importHandoff(pet) {
          const t = now();
          // Se recibe con el reloj de hoy: no se cobra el tiempo del viaje.
          const revived = revivePet({ ...petOnly(get()), ...pet, lastUpdated: t }, t);
          set(revived);
          event(revived.hatched ? 'evolve' : 'hatch');
        },

        setTimeSpeed(timeSpeed) {
          advanceTo(now());
          set((s) => ({ settings: { ...s.settings, timeSpeed } }));
        },
        setSoundOn(soundOn) {
          set((s) => ({ settings: { ...s.settings, soundOn } }));
        },
        setForceNight(forceNight) {
          set((s) => ({ settings: { ...s.settings, forceNight } }));
        },

        devSetAllStats(to) {
          const v = Math.max(0, Math.min(100, to));
          set({ stats: { hunger: v, happiness: v, energy: v, hygiene: v, health: v }, isSick: v < 30 });
        },
        devSetSick(isSick) {
          set({ isSick });
        },
        devSkipStage() {
          const s = get();
          const order: LifeStage[] = ['egg', 'baby', 'child', 'teen', 'adult'];
          const next = order[order.indexOf(s.stage) + 1];
          if (!next) return;
          const before = petOnly(s);
          set({ ageMs: STAGE_STARTS[next], lastUpdated: now() });
          // Un paso minimo para que el nucleo haga el cambio (y elija la forma adulta).
          const after = catchUp({ ...petOnly(get()), lastUpdated: now() - 1 }, now(), { streak: streakNow() });
          set(after);
          addToasts(noticesFor(before, after));
          event(before.hatched ? 'evolve' : 'hatch');
        },

        pushToast(t) {
          addToasts([t]);
        },
        dismissToast(id) {
          set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
        },
      };
    },
    {
      name: STORAGE_KEY,
      version: 0,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ ...petOnly(s), settings: s.settings }),
      merge: (persisted, current) => {
        const raw = (persisted ?? {}) as Partial<PetPersisted>;
        return { ...current, ...revivePet(raw, now()), settings: readSettings(raw.settings) };
      },
    },
  ),
);

const STAT_WORD: Record<keyof Stats, string> = {
  hunger: 'la comida',
  happiness: 'el ánimo',
  energy: 'el descanso',
  hygiene: 'la limpieza',
  health: 'la salud',
};
function labelOf(k: keyof Stats): string {
  return STAT_WORD[k];
}

/** Animo actual (para caras, textos e iconos). */
export function usePetMood(): Mood {
  return usePetStore((s) => moodOf(s));
}
