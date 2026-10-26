import {
  OFFLINE_MAX_HOURS,
  OFFLINE_STEP_MINUTES,
} from './constants';
import { clampStat, decayStats, type Stats } from './stats';

/**
 * Offline catch-up simulation.
 *
 * Given lastStats, elapsedMs since last update, and sleep/sick flags, we
 * step forward in 1-minute quanta applying the decay rules.
 *
 * Why a fixed step loop instead of a single multiply? Because:
 *   - Health penalty/recovery depends on thresholds crossed *during* the
 *     interval. If hunger slides from 40 → 15 over 4 hours, the penalty
 *     only applies for the last portion of the interval.
 *   - Sleeping/waking transitions mid-window (we don't currently know when
 *     the user would have toggled it, but we keep a single flag; the step
 *     loop still ensures correct quantised accumulation for whatever
 *     isAsleep is set to.)
 *
 * The 72-hour cap keeps the work bounded. Total steps per call is at
 * most 72 * 60 = 4320 per load — cheap.
 *
 * Pure: returns { stats: Stats, hoursSimulated }.
 */

export interface OfflineOptions {
  isAsleep: boolean;
  isSick: boolean;
  maxHours?: number;
  stepMinutes?: number;
}

export function catchUpOffline(
  lastStats: Stats,
  elapsedMs: number,
  opts: OfflineOptions,
): { stats: Stats; hoursSimulated: number; stepsRan: number } {
  const maxHours = opts.maxHours ?? OFFLINE_MAX_HOURS;
  const stepMinutes = opts.stepMinutes ?? OFFLINE_STEP_MINUTES;

  let simMs = Math.max(0, Math.min(elapsedMs, maxHours * 60 * 60 * 1000));
  const stepMs = stepMinutes * 60 * 1000;
  const hoursPerStep = stepMs / (60 * 60 * 1000);

  // Copy values (clamp but don't round yet — rounding kills small-step accumulation)
  let stats: Stats = {
    hunger: clampStat(lastStats.hunger),
    happiness: clampStat(lastStats.happiness),
    energy: clampStat(lastStats.energy),
    hygiene: clampStat(lastStats.hygiene),
    health: clampStat(lastStats.health),
  };
  let steps = 0;
  while (simMs >= stepMs) {
    simMs -= stepMs;
    stats = decayStats(stats, hoursPerStep, opts);
    steps++;
  }
  // Remaining fractional step
  if (simMs > 0) {
    const hoursFrac = simMs / (60 * 60 * 1000);
    stats = decayStats(stats, hoursFrac, opts);
    steps++;
  }

  // `initialSimMs` is the capped total we *planned* to simulate (before loop
  // reduced simMs); report that minus any leftover that didn't fit a step.
  const initialSimMs = Math.max(
    0,
    Math.min(elapsedMs, maxHours * 60 * 60 * 1000),
  );
  const leftoverMs = simMs >= stepMs ? 0 : simMs;
  const hoursSimulated = (initialSimMs - leftoverMs) / (60 * 60 * 1000);
  return { stats, hoursSimulated, stepsRan: steps };
}

/**
 * Summarise what happened during offline time — natural language blurb
 * for the welcome-back toast. "Mochi slept for 7 hours and is hungry now."
 */
export interface OfflineSummaryContext {
  name: string;
  hours: number;
  before: Stats;
  after: Stats;
  wasAsleep: boolean;
  becameSick: boolean;
}

export function offlineSummary(ctx: OfflineSummaryContext): string {
  const { name, hours, before, after, wasAsleep, becameSick } = ctx;
  const roundH = Math.max(0.1, Math.round(hours * 10) / 10);
  const timePhrase =
    roundH >= 1 ? `${roundH} hour${roundH === 1 ? '' : 's'}` : `a little while`;

  const parts: string[] = [];
  if (wasAsleep) {
    parts.push(`${name} slept for ${timePhrase}`);
  } else {
    parts.push(`${name} was alone for ${timePhrase}`);
  }

  if (becameSick) parts.push(`and got sick`);
  else if (after.hunger < before.hunger - 10 && after.hunger < 50)
    parts.push(`and is hungry now`);
  else if (after.happiness < before.happiness - 10 && after.happiness < 50)
    parts.push(`and missed you`);
  else if (after.hygiene < before.hygiene - 10 && after.hygiene < 50)
    parts.push(`and needs a bath`);
  else if (after.energy > before.energy + 10) parts.push(`and rested well`);
  else parts.push(`and is doing fine`);

  return parts.join(' ') + '.';
}
