import {
  CLEAN_HYGIENE_SET,
  MEAL_EFFECT,
  MEDICINE_EFFECT,
  PET_HAPPINESS_MAX_PER_HOUR,
  PET_HAPPINESS_PER_STROKE,
  PLAY_BASE_EFFECT,
  SNACK_EFFECT,
  TOO_TIRED_TO_PLAY,
  type StatName,
} from './constants';
import {
  applyStatDelta,
  lowestNonHealthStat,
  makeStats,
  setStat,
  type Stats,
} from './stats';

/**
 * All "action" functions are pure:
 *   - they take current state + params
 *   - return { ok: true, nextStats, event, ... } OR
 *           { ok: false, reason: string }
 *
 * The UI layer wraps them in Zustand actions and the XState machine uses
 * the returned `reason` for guards.
 */

export type ActionOk<T extends object = object> = { ok: true } & {
  stats: Stats;
} & T;
export type ActionErr = { ok: false; reason: string };
export type ActionResult<T extends object = object> = ActionOk<T> | ActionErr;

/* ------------------------- helpers --------------------------- */

function ok<T extends object>(
  stats: Stats,
  extras: T = {} as T,
): ActionResult<T> {
  return { ok: true, stats, ...extras } as ActionResult<T>;
}
function err(reason: string): ActionErr {
  return { ok: false, reason };
}

/* ------------------------- actions --------------------------- */

export function feedMeal(stats: Stats): ActionResult {
  if (stats.hunger >= 99) {
    return err('too_full');
  }
  return ok(applyStatDelta(stats, MEAL_EFFECT));
}

export function feedSnack(stats: Stats): ActionResult {
  if (stats.hunger >= 99) {
    return err('too_full');
  }
  return ok(applyStatDelta(stats, SNACK_EFFECT));
}

/**
 * Play — the base effect of the game (happiness +25 / energy -15 / hunger -5).
 * Bonus happiness from a good mini-game score is added by the caller.
 * Refuses when energy < TOO_TIRED_TO_PLAY so sleepy pet yawns instead.
 */
export function play(stats: Stats, bonusHappiness = 0): ActionResult {
  if (stats.energy < TOO_TIRED_TO_PLAY) {
    return err('too_tired');
  }
  const base = applyStatDelta(stats, PLAY_BASE_EFFECT);
  const total =
    bonusHappiness > 0
      ? applyStatDelta(base, { happiness: bonusHappiness })
      : base;
  return ok(total, { bonusHappiness });
}

export function clean(stats: Stats): ActionResult {
  if (stats.hygiene >= 99) return err('already_clean');
  return ok(setStat(stats, 'hygiene', CLEAN_HYGIENE_SET));
}

/**
 * Toggle sleep/wake. State is outside Stats object; caller manages the flag.
 * Returns the next isAsleep flag in a tuple.
 */
export function toggleSleep(isAsleep: boolean): { isAsleep: boolean } {
  return { isAsleep: !isAsleep };
}

/**
 * Give medicine. Only works while sick; cures it and saddens a little.
 * Takes stats + sick flag, returns both.
 */
export function giveMedicine(
  stats: Stats,
  isSick: boolean,
): ActionResult<{ wasSick: boolean; isSick: boolean }> {
  if (!isSick) return err('not_sick');
  const nextStats = applyStatDelta(stats, MEDICINE_EFFECT);
  // Medicine gives a little health boost so the pet gets a chance to rebound.
  return ok(setStat(nextStats, 'health', Math.max(30, nextStats.health)), {
    wasSick: true,
    isSick: false,
  });
}

/**
 * Petting: one stroke = +2 happiness, capped at +20 per calendar hour.
 * Caller must pass `earnedThisHour` (sum of happiness already awarded via
 * petting in the rolling 60-minute window). Returns the amount *actually*
 * awarded so caller can accumulate it.
 */
export function petStroke(
  stats: Stats,
  earnedThisHour: number,
): ActionResult<{ happinessGranted: number }> {
  const allowed = Math.max(
    0,
    Math.min(
      PET_HAPPINESS_PER_STROKE,
      PET_HAPPINESS_MAX_PER_HOUR - earnedThisHour,
    ),
  );
  if (allowed <= 0) {
    return err('hourly_cap_reached');
  }
  return ok(applyStatDelta(stats, { happiness: allowed }), {
    happinessGranted: allowed,
  });
}

/* ------------------------- derivations ----------------------- */

export interface PetMood {
  kind:
    | 'great'
    | 'good'
    | 'hungry'
    | 'sad'
    | 'tired'
    | 'dirty'
    | 'sick'
    | 'sleeping'
    | 'neutral';
  label: string;
}

/**
 * Which mood animation should we show? Combines sick/sleeping flags first,
 * then the lowest non-health stat if it's below 30, else overall vibes.
 *
 * Pure so easy to test; the XState idle substate uses exactly this rule
 * (plus a small random chance for a happy twitch when overall > 70 avg).
 */
export function deriveMood(
  stats: Stats,
  flags: { isAsleep: boolean; isSick: boolean },
): PetMood {
  if (flags.isAsleep) return { kind: 'sleeping', label: 'sleeping' };
  if (flags.isSick) return { kind: 'sick', label: 'feeling sick' };
  const lowest = lowestNonHealthStat(stats);
  if (lowest.value < 30) {
    switch (lowest.name) {
      case 'hunger':
        return { kind: 'hungry', label: 'hungry' };
      case 'hygiene':
        return { kind: 'dirty', label: 'dirty' };
      case 'happiness':
        return { kind: 'sad', label: 'sad' };
      case 'energy':
        return { kind: 'tired', label: 'tired' };
    }
  }
  const avg =
    (stats.hunger + stats.happiness + stats.energy + stats.hygiene) / 4;
  if (avg >= 85) return { kind: 'great', label: 'very happy' };
  if (avg >= 65) return { kind: 'good', label: 'content' };
  return { kind: 'neutral', label: 'okay' };
}

// Used by store hydrate tests; re-export here for central API
export { makeStats };
export type { StatName };
