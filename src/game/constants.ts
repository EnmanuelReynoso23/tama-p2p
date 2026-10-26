/**
 * Central game constants. Tunable values only — no imports.
 * All decay rates are per *real hour* of pet awake/sleep time.
 */

export const STORAGE_KEY = 'pixel-pet-v1';
export const STORAGE_VERSION = 2; // bumped from 1 when DEFAULT_SETTINGS.showMachineDebug default added

/* ------------------------------------------------------------------- */
/*  Stat definitions                                                   */
/* ------------------------------------------------------------------- */

export const STAT_MIN = 0;
export const STAT_MAX = 100;
export const STAT_START = 85;
export const STAT_HEALTH_START = 100;

export type StatName = 'hunger' | 'happiness' | 'energy' | 'hygiene' | 'health';

export const STAT_NAMES: readonly StatName[] = [
  'hunger',
  'happiness',
  'energy',
  'hygiene',
  'health',
] as const;

/* ------------------------------------------------------------------- */
/*  Decay per real hour                                                */
/* ------------------------------------------------------------------- */

// AWAKE: hunger −6, happiness −4, energy −3, hygiene −3
export const DECAY_AWAKE_PER_HR: Record<Exclude<StatName, 'health'>, number> = {
  hunger: -6,
  happiness: -4,
  energy: -3,
  hygiene: -3,
};

// SLEEPING: hunger −2, energy +12, others −1
export const DECAY_SLEEP_PER_HR: Record<Exclude<StatName, 'health'>, number> = {
  hunger: -2,
  happiness: -1,
  energy: +12,
  hygiene: -1,
};

// Health penalty when ANY stat < 20
export const HEALTH_PENALTY_PER_HR_BELOW_20 = -5;
// Health recovery when ALL stats > 50
export const HEALTH_RECOVERY_PER_HR_ABOVE_50 = +2;

/* ------------------------------------------------------------------- */
/*  Critical thresholds                                                */
/* ------------------------------------------------------------------- */

export const CRITICAL_BELOW = 20;
export const COMFORT_ABOVE = 50;
export const TOO_TIRED_TO_PLAY = 15;

/* ------------------------------------------------------------------- */
/*  Action effects + cooldowns (seconds)                               */
/* ------------------------------------------------------------------- */

export const ACTION_COOLDOWN = {
  feedMeal: 10,
  feedSnack: 10,
  play: 0, // play cooldown is "after game ends"; handled in UI
  clean: 5,
  medicine: 0,
} as const;

// Meal: Hunger +30, Hygiene -5
export const MEAL_EFFECT = { hunger: +30, hygiene: -5 } as const;
// Snack: Hunger +10, Happiness +10, Health -2
export const SNACK_EFFECT = { hunger: +10, happiness: +10, health: -2 } as const;
// Play (base): Happiness +25, Energy -15, Hunger -5
export const PLAY_BASE_EFFECT = {
  happiness: +25,
  energy: -15,
  hunger: -5,
} as const;
// Clean: Hygiene -> 100 (flat set)
export const CLEAN_HYGIENE_SET = 100;
// Medicine: cures sick + Happiness -10
export const MEDICINE_EFFECT = { happiness: -10 } as const;
// Petting happiness per stroke (applied up to max per hour)
export const PET_HAPPINESS_PER_STROKE = 2;
export const PET_HAPPINESS_MAX_PER_HOUR = 20;

/* ------------------------------------------------------------------- */
/*  Life stage transitions (real time since birth)                     */
/* ------------------------------------------------------------------- */

export const EGG_DURATION_MS = 60 * 1000; // 60 s real time before hatching
export const STAGE_DURATION_DAYS = {
  baby: 1, // day 0–1
  child: 2, // day 1–3
  teen: 3, // day 3–6
} as const;

export type LifeStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult';
export const LIFE_STAGES: readonly LifeStage[] = [
  'egg',
  'baby',
  'child',
  'teen',
  'adult',
] as const;

export type AdultVariant = 'radiant' | 'chill' | 'scruffy';

// Care score cutoffs for adult variant (0–100 average)
export const ADULT_VARIANT_RADIANT_MIN = 80;
export const ADULT_VARIANT_CHILL_MIN = 50; // below this = scruffy

/* ------------------------------------------------------------------- */
/*  Offline simulation caps                                            */
/* ------------------------------------------------------------------- */

export const OFFLINE_MAX_HOURS = 72;
export const OFFLINE_STEP_MINUTES = 1;

/* ------------------------------------------------------------------- */
/*  Settings                                                           */
/* ------------------------------------------------------------------- */

export type TimeSpeed = 1 | 10 | 60 | 600;
export const TIME_SPEEDS: readonly TimeSpeed[] = [1, 10, 60, 600] as const;

export const DEFAULT_SETTINGS = {
  soundOn: false, // muted by default per spec
  timeSpeed: 1 as TimeSpeed,
  // Phase 4 dev verification: default debug panel on. Revert for Phase 5.
  showMachineDebug: true,
  // Phase 6: dev-only toggle. Forces drawBackground to paint stars/night.
  forceNight: false,
} as const;
