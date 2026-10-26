import {
  ADULT_VARIANT_CHILL_MIN,
  ADULT_VARIANT_RADIANT_MIN,
  STAGE_DURATION_DAYS,
  type AdultVariant,
  type LifeStage,
} from './constants';
import type { Stats } from './stats';

/**
 * Rolling care-score bookkeeping. We keep a small sliding time-series of
 * { at: ms, score: 0–100 } samples and average them to produce a care score
 * that decides the adult variant.
 *
 * A "care sample" is simply the average of all 5 stats at a point in time —
 * because the goal is just aggregate well-being over days.
 */

export interface CareSample {
  readonly at: number; // ms since epoch
  readonly score: number; // 0–100
}

const WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // two week window — more than enough

export function computeCareSample(stats: Stats, at: number): CareSample {
  const avg =
    (stats.hunger +
      stats.happiness +
      stats.energy +
      stats.hygiene +
      stats.health) /
    5;
  return { at, score: Math.round(avg * 10) / 10 };
}

export function addCareSample(
  samples: readonly CareSample[],
  sample: CareSample,
): CareSample[] {
  const cutoff = sample.at - WINDOW_MS;
  const pruned = samples.filter((s) => s.at >= cutoff);
  pruned.push(sample);
  return pruned;
}

export function averageCareScore(samples: readonly CareSample[]): number {
  if (samples.length === 0) return 100; // default to good before data accumulates
  const sum = samples.reduce((acc, s) => acc + s.score, 0);
  return Math.round((sum / samples.length) * 10) / 10;
}

export function adultVariantFromCareScore(avg: number): AdultVariant {
  if (avg >= ADULT_VARIANT_RADIANT_MIN) return 'radiant';
  if (avg >= ADULT_VARIANT_CHILL_MIN) return 'chill';
  return 'scruffy';
}

/**
 * Given birth timestamp and a `now` timestamp, figure out which life stage
 * the pet is in. `egg` exists only during the first 60s; after that the
 * hatching is assumed done and we step through day-counted stages.
 */
export function lifeStageFromAge(
  birthTs: number,
  now: number,
  eggDurationMs: number,
): LifeStage {
  const ageMs = Math.max(0, now - birthTs);
  if (ageMs < eggDurationMs) return 'egg';
  const days = (ageMs - eggDurationMs) / (24 * 60 * 60 * 1000);
  if (days < STAGE_DURATION_DAYS.baby) return 'baby';
  if (days < STAGE_DURATION_DAYS.baby + STAGE_DURATION_DAYS.child)
    return 'child';
  if (
    days <
    STAGE_DURATION_DAYS.baby +
      STAGE_DURATION_DAYS.child +
      STAGE_DURATION_DAYS.teen
  )
    return 'teen';
  return 'adult';
}

/**
 * The *next* stage transition boundary as an absolute timestamp.
 * Used by UI for debug "skip to next stage" and by the evolve logic.
 * Returns null when already adult.
 */
export function nextStageBoundary(
  birthTs: number,
  eggDurationMs: number,
): { stage: LifeStage; at: number } | null {
  const eggEnd = birthTs + eggDurationMs;
  const dayMs = 24 * 60 * 60 * 1000;
  const babyEnd = eggEnd + STAGE_DURATION_DAYS.baby * dayMs;
  const childEnd = babyEnd + STAGE_DURATION_DAYS.child * dayMs;
  const teenEnd = childEnd + STAGE_DURATION_DAYS.teen * dayMs;
  const now = Date.now();
  if (now < eggEnd) return { stage: 'baby', at: eggEnd };
  if (now < babyEnd) return { stage: 'child', at: babyEnd };
  if (now < childEnd) return { stage: 'teen', at: childEnd };
  if (now < teenEnd) return { stage: 'adult', at: teenEnd };
  return null;
}
