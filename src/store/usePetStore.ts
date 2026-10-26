import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type LooseEvent = { readonly type: string } & { readonly [k: string]: unknown };
let _machineEventSink: ((e: LooseEvent) => void) | null = null;
export function setMachineEventSink(sink: ((e: LooseEvent) => void) | null): void {
  _machineEventSink = sink;
}
function _sendMachine(type: string, extra: Record<string, unknown> = {}): void {
  if (_machineEventSink) _machineEventSink({ type, ...extra });
}
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  DEFAULT_SETTINGS,
  STAT_MAX,
  type AdultVariant,
  type LifeStage,
  type TimeSpeed,
  EGG_DURATION_MS,
} from '../game/constants';
import {
  applyStatDelta,
  decayStats,
  makeStats,
  setStat,
  type Stats,
} from '../game/stats';
import {
  addCareSample,
  adultVariantFromCareScore,
  averageCareScore,
  computeCareSample,
  lifeStageFromAge,
  type CareSample,
} from '../game/careScore';
import {
  catchUpOffline,
  offlineSummary,
  type OfflineSummaryContext,
} from '../game/offline';
import {
  clean as actClean,
  feedMeal as actFeedMeal,
  feedSnack as actFeedSnack,
  giveMedicine as actGiveMedicine,
  petStroke as actPetStroke,
  play as actPlay,
  toggleSleep as actToggleSleep,
} from '../game/actions';

/* ------------------------------------------------------------------- */
/*  Persisted shape                                                    */
/* ------------------------------------------------------------------- */

export interface PetPersisted {
  readonly version: number;
  readonly name: string;
  readonly birthTs: number;
  readonly lastUpdated: number;
  readonly stage: LifeStage;
  readonly adultVariant: AdultVariant | null;
  readonly stats: Stats;
  readonly isAsleep: boolean;
  readonly isSick: boolean;
  readonly hatched: boolean; // true once egg finishes -> baby
  readonly careSamples: CareSample[];
  readonly petHappinessHourly: { bucketMs: number; earned: number };
  readonly settings: {
    readonly soundOn: boolean;
    readonly timeSpeed: TimeSpeed;
    readonly showMachineDebug: boolean;
    readonly forceNight: boolean;
  };
  readonly cooldownsUntil: {
    readonly feedMeal: number;
    readonly feedSnack: number;
    readonly clean: number;
  };
}

export type CooldownName = 'feedMeal' | 'feedSnack' | 'clean';

/* ------------------------------------------------------------------- */
/*  Actions — thin wrappers over pure functions in src/game/           */
/* ------------------------------------------------------------------- */

export interface WelcomeToast {
  readonly id: number;
  readonly title: string;
  readonly body: string;
  readonly tone: 'info' | 'warn' | 'good';
}

export interface PetState extends PetPersisted {
  // Welcome toast queue (not persisted)
  readonly toasts: WelcomeToast[];
  readonly storageUnavailable: boolean;

  // Core lifecycle
  tick(now: number): void;
  runCatchUp(now: number): void;
  checkStageAdvancement(now: number): void;

  // Pet metadata
  setName(name: string): void;
  resetPet(name?: string): void;
  setHatched(): void;

  // Actions
  feed(kind: 'meal' | 'snack'):
    | { ok: true }
    | { ok: false; reason: 'too_full' | 'on_cooldown' };
  play(bonusHappiness?: number):
    | { ok: true }
    | { ok: false; reason: 'too_tired' };
  cleanNow(): { ok: true } | { ok: false; reason: 'on_cooldown' | 'already_clean' };
  toggleSleepToggle(): void;
  giveMedicineNow():
    | { ok: true }
    | { ok: false; reason: 'not_sick' };
  petStrokeNow(): { granted: number };
  evolveTo(stage: LifeStage): void;

  // Settings
  setTimeSpeed(speed: TimeSpeed): void;
  setSoundOn(v: boolean): void;
  setShowMachineDebug(v: boolean): void;
  setForceNight(v: boolean): void;

  // Dev helpers (not persisted / only apply in-memory for a demo)
  devSetAllStats(to: number): void;
  devSetSick(v: boolean): void;
  devAdvanceBirth(byMs: number): void;

  // Toasts
  pushToast(toast: Omit<WelcomeToast, 'id'>): void;
  dismissToast(id: number): void;
}

/* ------------------------------------------------------------------- */
/*  Helpers                                                            */
/* ------------------------------------------------------------------- */

function nowMs(): number {
  return Date.now();
}

function pushCareSampleOnInterval(state: PetState, now: number): PetState {
  // Sample once every 5 minutes (real-time) so the 2-week window is ~4k entries max.
  const last = state.careSamples[state.careSamples.length - 1]?.at ?? 0;
  const need = now - last >= 5 * 60 * 1000;
  if (!need) return state;
  const sample = computeCareSample(state.stats, now);
  return { ...state, careSamples: addCareSample(state.careSamples, sample) };
}

function recomputeStage(state: PetState, now: number): PetState {
  const next = lifeStageFromAge(state.birthTs, now, EGG_DURATION_MS);
  if (next === state.stage) return state;
  let variant = state.adultVariant;
  if (next === 'adult' && !variant) {
    variant = adultVariantFromCareScore(averageCareScore(state.careSamples));
  }
  return { ...state, stage: next, adultVariant: variant };
}

function setCooldown(state: PetState, name: CooldownName, seconds: number) {
  const until = nowMs() + seconds * 1000;
  return { ...state, cooldownsUntil: { ...state.cooldownsUntil, [name]: until } };
}

function addToast(state: PetState, t: Omit<WelcomeToast, 'id'>): PetState {
  const id = (state.toasts[state.toasts.length - 1]?.id ?? 0) + 1;
  return { ...state, toasts: [...state.toasts, { ...t, id }].slice(-5) };
}

/* ------------------------------------------------------------------- */
/*  Migrations                                                         */
/* ------------------------------------------------------------------- */

function migrateFromAny(
  _version: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any,
): PetPersisted {
  // Future migrations would branch on `version`. For v1 initial state we
  // simply coerce shape toward the default, substituting anything invalid.
  const now = nowMs();
  const defaultSettings = {
    soundOn: state?.settings?.soundOn ?? DEFAULT_SETTINGS.soundOn,
    timeSpeed: state?.settings?.timeSpeed ?? DEFAULT_SETTINGS.timeSpeed,
    showMachineDebug:
      state?.settings?.showMachineDebug ?? DEFAULT_SETTINGS.showMachineDebug,
    forceNight:
      state?.settings?.forceNight ?? DEFAULT_SETTINGS.forceNight,
  };
  const base: PetPersisted = {
    version: STORAGE_VERSION,
    name: state?.name ?? 'Mochi',
    birthTs: state?.birthTs ?? now,
    lastUpdated: state?.lastUpdated ?? now,
    stage: state?.stage && state.stage !== 'egg' ? state.stage : 'child',
    adultVariant: state?.adultVariant ?? null,
    stats: makeStats(state?.stats),
    isAsleep: state?.isAsleep ?? false,
    isSick: false,
    hatched: true,
    careSamples: Array.isArray(state?.careSamples) ? state.careSamples : [],
    petHappinessHourly: state?.petHappinessHourly ?? {
      bucketMs: 0,
      earned: 0,
    },
    settings: defaultSettings,
    cooldownsUntil: {
      feedMeal: state?.cooldownsUntil?.feedMeal ?? 0,
      feedSnack: state?.cooldownsUntil?.feedSnack ?? 0,
      clean: state?.cooldownsUntil?.clean ?? 0,
    },
  };
  // Ensure the version field always tracks current STORAGE_VERSION
  // (TypeScript strict makes the literal readonly; widen via assign then return)
  const widened = { ...base, version: STORAGE_VERSION } as PetPersisted;
  return widened;
}

/* ------------------------------------------------------------------- */
/*  Storage wrapper (try/catch; friendly in-memory fallback)           */
/* ------------------------------------------------------------------- */

let storageUnavailableGlobal = false;

const safeStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      storageUnavailableGlobal = true;
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      storageUnavailableGlobal = true;
    }
  },
  removeItem(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      storageUnavailableGlobal = true;
    }
  },
};

/* ------------------------------------------------------------------- */
/*  Initial state factory (reused by resetPet)                         */
/* ------------------------------------------------------------------- */

function createInitialPet(name = 'Mochi', birthOverride?: number): PetPersisted {
  const birthTs = birthOverride ?? nowMs();
  return {
    version: STORAGE_VERSION,
    name,
    birthTs,
    lastUpdated: birthTs,
    stage: 'child',
    adultVariant: null,
    stats: makeStats({
      hunger: STAT_MAX,
      happiness: STAT_MAX,
      energy: STAT_MAX,
      hygiene: STAT_MAX,
      health: STAT_MAX,
    }),
    isAsleep: false,
    isSick: false,
    hatched: true,
    careSamples: [],
    petHappinessHourly: { bucketMs: 0, earned: 0 },
    settings: { ...DEFAULT_SETTINGS },
    cooldownsUntil: { feedMeal: 0, feedSnack: 0, clean: 0 },
  };
}

/* ------------------------------------------------------------------- */
/*  Store                                                              */
/* ------------------------------------------------------------------- */

export const usePetStore = create<PetState>()(
  persist(
    (set, get) => ({
      /* --------- persisted defaults -------- */
      ...createInitialPet(),
      toasts: [],
      storageUnavailable: false,

      /* ---------- tick: called roughly once per real second by UI -------- */
      tick(now) {
        const state = get();
        const speedMul = state.settings.timeSpeed;
        const realDeltaMs = Math.max(0, Math.min(60_000, now - state.lastUpdated));
        const simulatedMs = realDeltaMs * speedMul;
        const hours = simulatedMs / (60 * 60 * 1000);
        let stats = decayStats(state.stats, hours, {
          isAsleep: state.isAsleep,
          isSick: state.isSick,
        });
        let isSick = state.isSick;
        if (stats.health <= 0 && !isSick) isSick = true;

        let next: PetState = {
          ...state,
          stats,
          isSick,
          lastUpdated: now,
        };
        next = pushCareSampleOnInterval(next, now);

        if (
          next.petHappinessHourly.bucketMs !== 0 &&
          now - next.petHappinessHourly.bucketMs > 60 * 60 * 1000
        ) {
          next = {
            ...next,
            petHappinessHourly: { bucketMs: 0, earned: 0 },
          };
        }

        set(next);
        // Stage advancement via XState transient (flash + particles)
        get().checkStageAdvancement(now);
      },

      checkStageAdvancement(now) {
        const state = get();
        const expected = lifeStageFromAge(state.birthTs, now, EGG_DURATION_MS);

        // Fix stale persisted state: hatched==false but stage >= baby (old 7b silent
        // recomputeStage behavior). Treat as pending hatch regardless of stage equality.
        const needsHatch =
          !state.hatched &&
          (expected !== 'egg' || state.stage !== 'egg');

        if (needsHatch) {
          // Hatch: set hatched + stage to baby in Zustand, push toast, tell machine.
          // Machine HATCHING_COMPLETE will set its own ctx.hatched + happy anim.
          const name = state.name;
          const variant = state.adultVariant;
          set({ hatched: true, stage: 'baby', adultVariant: variant });
          const hatchToast: Omit<WelcomeToast, 'id'> = {
            title: 'Hatched!',
            body: `Welcome baby ${name}! Say hello to your new Pixel Pet.`,
            tone: 'good',
          };
          get().pushToast(hatchToast);
          _sendMachine('HATCHING_COMPLETE');
          return;
        }

        if (expected === state.stage) return;

        if (state.hatched && state.stage !== 'adult') {
          // Baby→Child→Teen→Adult: route through EVOLVE transient for flash/particles.
          // doEvolve action will call bridge.evolveToNextStageOrNop → evolveTo(nextStage).
          _sendMachine('EVOLVE');
          return;
        }

        // Fallback: silent set (covers adult re-runs with new variant, etc.)
        if (expected !== state.stage) {
          const silent = recomputeStage(state, now);
          if (silent !== state) set(silent);
        }
      },

      runCatchUp(now) {
        const state = get();
        const elapsed = now - state.lastUpdated;
        if (elapsed < 15_000) {
          // No catch-up under 15 s; just tick normally.
          set({ storageUnavailable: storageUnavailableGlobal });
          return;
        }
        const { stats, hoursSimulated } = catchUpOffline(
          state.stats,
          elapsed * state.settings.timeSpeed,
          {
            isAsleep: state.isAsleep,
            isSick: state.isSick,
          },
        );
        let isSick = state.isSick;
        if (stats.health <= 0 && !isSick) isSick = true;
        let withStats: PetState = {
          ...state,
          stats,
          isSick,
          lastUpdated: now,
          storageUnavailable: storageUnavailableGlobal,
        };
        withStats = recomputeStage(withStats, now);
        // Add a care sample representing "end of offline"
        withStats = pushCareSampleOnInterval(withStats, now);

        const ctx: OfflineSummaryContext = {
          name: state.name,
          hours: hoursSimulated,
          before: state.stats,
          after: stats,
          wasAsleep: state.isAsleep,
          becameSick: isSick && !state.isSick,
        };
        const body = offlineSummary(ctx);
        const toast: Omit<WelcomeToast, 'id'> = {
          title: 'Welcome back!',
          body,
          tone: 'info',
        };
        set(addToast(withStats, toast));
      },

      /* ---------- meta ---------- */
      setName(name) {
        const s = name.trim() || get().name;
        set({ name: s.slice(0, 24) });
      },
      resetPet(name) {
        const fresh = createInitialPet(name ?? 'Mochi');
        set({ ...fresh, toasts: [], storageUnavailable: storageUnavailableGlobal });
      },
      setHatched() {
        set({ hatched: true, stage: 'baby' });
      },

      /* ---------- actions ---------- */
      feed(kind) {
        const state = get();
        const now = nowMs();
        const cdKey = kind === 'meal' ? 'feedMeal' : 'feedSnack';
        if (state.cooldownsUntil[cdKey] > now) return { ok: false as const, reason: 'on_cooldown' };
        const r =
          kind === 'meal' ? actFeedMeal(state.stats) : actFeedSnack(state.stats);
        if (!r.ok) return { ok: false as const, reason: r.reason as 'too_full' };
        let next: PetState = { ...state, stats: r.stats };
        next = setCooldown(next, cdKey, kind === 'meal' ? 10 : 10);
        next = pushCareSampleOnInterval(next, now);
        set(next);
        return { ok: true };
      },
      play(bonusHappiness) {
        const state = get();
        const r = actPlay(state.stats, bonusHappiness ?? 0);
        if (!r.ok) return { ok: false as const, reason: 'too_tired' };
        let next: PetState = { ...state, stats: r.stats };
        next = pushCareSampleOnInterval(next, nowMs());
        set(next);
        return { ok: true };
      },
      cleanNow() {
        const state = get();
        const now = nowMs();
        if (state.cooldownsUntil.clean > now) return { ok: false as const, reason: 'on_cooldown' };
        const r = actClean(state.stats);
        if (!r.ok) return { ok: false as const, reason: r.reason as 'already_clean' };
        let next: PetState = { ...state, stats: r.stats };
        next = setCooldown(next, 'clean', 5);
        next = pushCareSampleOnInterval(next, now);
        set(next);
        return { ok: true };
      },
      toggleSleepToggle() {
        const state = get();
        const toggled = actToggleSleep(state.isAsleep);
        set({ ...state, isAsleep: toggled.isAsleep });
      },
      giveMedicineNow() {
        const state = get();
        const r = actGiveMedicine(state.stats, state.isSick);
        if (!r.ok) return { ok: false as const, reason: 'not_sick' };
        let next: PetState = {
          ...state,
          stats: r.stats,
          isSick: r.isSick,
        };
        next = pushCareSampleOnInterval(next, nowMs());
        set(next);
        return { ok: true };
      },
      petStrokeNow() {
        const state = get();
        // Rolling 60-minute bucket
        let bucket = state.petHappinessHourly;
        const now = nowMs();
        if (now - bucket.bucketMs > 60 * 60 * 1000) {
          bucket = { bucketMs: now, earned: 0 };
        }
        const r = actPetStroke(state.stats, bucket.earned);
        if (!r.ok) return { granted: 0 };
        const nextBucket = {
          bucketMs: bucket.bucketMs || now,
          earned: bucket.earned + r.happinessGranted,
        };
        set({
          ...state,
          stats: r.stats,
          petHappinessHourly: nextBucket,
        });
        return { granted: r.happinessGranted };
      },
      evolveTo(stage) {
        const state = get();
        let variant = state.adultVariant;
        if (stage === 'adult' && !variant) {
          variant = adultVariantFromCareScore(averageCareScore(state.careSamples));
        }
        set({ stage, adultVariant: variant });
      },

      /* ---------- settings ---------- */
      setTimeSpeed(speed) {
        const s = get();
        set({ settings: { ...s.settings, timeSpeed: speed } });
      },
      setSoundOn(v) {
        const s = get();
        set({ settings: { ...s.settings, soundOn: v } });
      },
      setShowMachineDebug(v) {
        const s = get();
        set({ settings: { ...s.settings, showMachineDebug: v } });
      },
      setForceNight(v) {
        const s = get();
        set({ settings: { ...s.settings, forceNight: v } });
      },

      /* ---------- dev helpers ---------- */
      devSetAllStats(to) {
        const v = Math.min(STAT_MAX, Math.max(0, to));
        set({
          stats: {
            hunger: v,
            happiness: v,
            energy: v,
            hygiene: v,
            health: to > 100 ? 100 : v,
          },
        });
      },
      devSetSick(v) {
        set({
          isSick: v,
          stats: v ? setStat(get().stats, 'health', Math.min(get().stats.health, 10)) : get().stats,
        });
      },
      devAdvanceBirth(byMs) {
        const state = get();
        const birth = state.birthTs - byMs;
        // Only bump birthTs; let tick/checkStageAdvancement advance through
        // the XState machine so hatched flag, toasts, and evolve flashes run.
        const next: PetState = { ...state, birthTs: birth };
        set(next);
        // Immediately check advancement so hatch / evolve fires without waiting
        // for the next 1 s tick (feels instant for the "⚡ Skip next stage" button).
        get().checkStageAdvancement(nowMs());
      },

      /* ---------- toasts ---------- */
      pushToast(t) {
        set((s) => addToast(s, t));
      },
      dismissToast(id) {
        set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage<PetPersisted>(() => safeStorage),
      version: STORAGE_VERSION,
      migrate: (persistedState, version) => {
        return migrateFromAny(
          version,
          persistedState as unknown as PetPersisted,
        );
      },
      // Throttle saves to ~once per second to avoid hammering storage.
      partialize: (state) => {
        // Keep ephemeral UI state out of persist.
        const { toasts, storageUnavailable, ...pers } = state;
        void toasts;
        void storageUnavailable;
        return pers;
      },
    },
  ),
);

// Throttle: persist middleware saves on every state change; throttling is
// achieved cheaply via the `onRehydrateStorage` callback? Actually zustand
// persist by default saves on every state change — for a portfolio app the
// writes are small and infrequent. We also force-save on visibility change
// via the App component (Phase 5).

export type { WelcomeToast as Toast };
export const initialPetForTests = createInitialPet;
// expose applyStatDelta for pure convenience imports (not strictly needed)
export const _pure = { applyStatDelta, setStat };
