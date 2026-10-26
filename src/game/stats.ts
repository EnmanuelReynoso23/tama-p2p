import {
  CRITICAL_BELOW,
  COMFORT_ABOVE,
  DECAY_AWAKE_PER_HR,
  DECAY_SLEEP_PER_HR,
  HEALTH_PENALTY_PER_HR_BELOW_20,
  HEALTH_RECOVERY_PER_HR_ABOVE_50,
  STAT_MAX,
  STAT_MIN,
  STAT_NAMES,
  type StatName,
} from './constants';

/**
 * Stats shape — plain data, no methods.
 */
export interface Stats {
  readonly hunger: number;
  readonly happiness: number;
  readonly energy: number;
  readonly hygiene: number;
  readonly health: number;
}

export function clampStat(v: number): number {
  // Clamp only; no rounding. Keep floating precision for small-step simulation
  // (e.g. 1-min offline decay of -0.05 must accumulate instead of truncating).
  if (!Number.isFinite(v)) return STAT_MIN;
  return Math.min(STAT_MAX, Math.max(STAT_MIN, v));
}

/** Round a stat's floating value to 1 decimal for UI / persistence. */
export function roundStat(v: number): number {
  return Math.round(clampStat(v) * 10) / 10;
}

export function roundStatsForDisplay(stats: Stats): Stats {
  const out = { ...stats };
  for (const k of STAT_NAMES) {
    (out as Record<StatName, number>)[k] = roundStat(stats[k]);
  }
  return out;
}

export function makeStats(partial?: Partial<Stats>): Stats {
  // Initial construction rounds to 1 decimal since inputs are conceptually
  // whole-percentage defaults; the float precision accrues only during sim.
  return {
    hunger: roundStat(partial?.hunger ?? 85),
    happiness: roundStat(partial?.happiness ?? 85),
    energy: roundStat(partial?.energy ?? 85),
    hygiene: roundStat(partial?.hygiene ?? 85),
    health: roundStat(partial?.health ?? 100),
  };
}

/**
 * Apply a partial delta to stats; values are added and clamped.
 * Pure function — returns a new Stats object.
 */
export function applyStatDelta(
  stats: Stats,
  delta: Partial<Record<StatName, number>>,
): Stats {
  const out: Stats = { ...stats };
  for (const name of STAT_NAMES) {
    const d = delta[name];
    if (d != null && Number.isFinite(d)) {
      (out as Record<StatName, number>)[name] = clampStat(stats[name] + d);
    }
  }
  return out;
}

/**
 * Set a stat to a flat value with clamping (e.g. Clean sets hygiene -> 100).
 */
export function setStat(stats: Stats, name: StatName, value: number): Stats {
  return { ...stats, [name]: clampStat(value) };
}

/**
 * Advance stats by `hoursHours` hours of elapsed time.
 * Pure — does not touch wall-clock. `isAsleep` and `isSick` drive behaviour.
 *
 * Health rules:
 *  - When ANY non-health stat < CRITICAL_BELOW: health drops by penalty rate.
 *  - When ALL stats > COMFORT_ABOVE: health recovers.
 *  - If the pet is sick AND no medicine given in this call, health stays put
 *    (sick does *not* accelerate the drop further; health 0 never kills.)
 */
export function decayStats(
  stats: Stats,
  elapsedHours: number,
  opts: { isAsleep: boolean; isSick: boolean },
): Stats {
  if (elapsedHours <= 0) return stats;

  const rates = opts.isAsleep ? DECAY_SLEEP_PER_HR : DECAY_AWAKE_PER_HR;
  let hunger = stats.hunger + rates.hunger * elapsedHours;
  let happiness = stats.happiness + rates.happiness * elapsedHours;
  let energy = stats.energy + rates.energy * elapsedHours;
  let hygiene = stats.hygiene + rates.hygiene * elapsedHours;

  // Health logic
  let health = stats.health;
  const nonHealthStats = [hunger, happiness, energy, hygiene];
  const anyBelow20 = nonHealthStats.some((v) => v < CRITICAL_BELOW);
  const allAbove50 = nonHealthStats.every((v) => v > COMFORT_ABOVE);

  if (anyBelow20) {
    health += HEALTH_PENALTY_PER_HR_BELOW_20 * elapsedHours;
  }
  if (allAbove50) {
    // Both can apply: low-but-not-all-below + all-above is impossible,
    // but keeping independent allows composition if thresholds change.
    health += HEALTH_RECOVERY_PER_HR_ABOVE_50 * elapsedHours;
  }

  // NOTE: Per spec, health 0 does NOT kill — it just pins the pet sick.
  // Callers are responsible for the sick-flag transition on health 0.
  if (opts.isSick) {
    // Sickness freezes health at its current low; no auto-recovery above.
    // Re-apply no extra penalty (friendly: no death, no extra damage),
    // but undo any recovery we just added since sickness prevents that.
    if (allAbove50) {
      health -= HEALTH_RECOVERY_PER_HR_ABOVE_50 * elapsedHours;
    }
  }

  return {
    hunger: clampStat(hunger),
    happiness: clampStat(happiness),
    energy: clampStat(energy),
    hygiene: clampStat(hygiene),
    health: clampStat(health),
  };
}

/**
 * Returns the name of the lowest non-health stat; used by mood selection.
 * Ties are broken by a fixed priority order: hunger > happiness > hygiene > energy.
 */
export function lowestNonHealthStat(stats: Stats): {
  name: Exclude<StatName, 'health'>;
  value: number;
} {
  const order: readonly Exclude<StatName, 'health'>[] = [
    'hunger',
    'happiness',
    'hygiene',
    'energy',
  ];
  let bestName: Exclude<StatName, 'health'> = 'hunger';
  let bestValue = Infinity;
  for (const n of order) {
    if (stats[n] < bestValue) {
      bestValue = stats[n];
      bestName = n;
    }
  }
  return { name: bestName, value: bestValue };
}
