/**
 * Streak math — pure functions, no storage, no React.
 *
 * A streak is derived from a *history* of completed days and frozen days
 * instead of an incremental counter. That makes it robust to: closing the app
 * for days, toggling a habit on/off, and friends that were never online at the
 * same time as you (they send their own history over P2P and we intersect it).
 *
 * Day keys are LOCAL calendar dates "YYYY-MM-DD" (not UTC), so a habit done
 * at 23:00 in Santo Domingo still counts for that day.
 */

/** How many completed days we keep (and send to friends). */
export const STREAK_HISTORY_DAYS = 60;

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Shift a day key by N calendar days (negative = past). DST-safe. */
export function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  // Noon avoids DST edge cases when adding days.
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  dt.setDate(dt.getDate() + delta);
  return dayKey(dt);
}

/** Sorted (ascending), unique, trimmed to the most recent STREAK_HISTORY_DAYS. */
export function normalizeDays(days: readonly string[]): string[] {
  const uniq = Array.from(new Set(days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))));
  uniq.sort();
  return uniq.slice(-STREAK_HISTORY_DAYS);
}

export function markDay(days: readonly string[], key: string): string[] {
  return normalizeDays([...days, key]);
}

export function unmarkDay(days: readonly string[], key: string): string[] {
  return days.filter((d) => d !== key);
}

/**
 * Combine completed days and frozen days into a unified effective list.
 */
export function effectiveDays(
  completedDays: readonly string[],
  frozenDays: readonly string[] = [],
): string[] {
  return normalizeDays([...completedDays, ...frozenDays]);
}

/**
 * Current streak: consecutive completed or frozen days ending today — or ending
 * yesterday, because today is still "in play" (the streak is at risk, not
 * broken, until midnight).
 */
export function currentStreak(
  days: readonly string[],
  today: string,
  frozenDays: readonly string[] = [],
): number {
  const eff = effectiveDays(days, frozenDays);
  const set = new Set(eff);
  let cursor = set.has(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = shiftDay(cursor, -1);
  }
  return n;
}

/** Longest run of consecutive days anywhere in the history. */
export function bestStreak(
  days: readonly string[],
  frozenDays: readonly string[] = [],
): number {
  const sorted = effectiveDays(days, frozenDays);
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev !== null && shiftDay(prev, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

export type StreakStatus =
  /** Today is completed with habits done. */
  | 'done'
  /** Today is protected with a streak freeze comodin. */
  | 'frozen'
  /** Yesterday was active, today not yet — finish before midnight! */
  | 'at-risk'
  /** No active streak. */
  | 'none';

export function streakStatus(
  days: readonly string[],
  today: string,
  frozenDays: readonly string[] = [],
): StreakStatus {
  const doneSet = new Set(days);
  const freezeSet = new Set(frozenDays);
  if (doneSet.has(today)) return 'done';
  if (freezeSet.has(today)) return 'frozen';

  const eff = effectiveDays(days, frozenDays);
  const effSet = new Set(eff);
  if (effSet.has(shiftDay(today, -1))) return 'at-risk';
  return 'none';
}

/** Days both people completed or protected — the basis of a shared ("friend") streak. */
export function sharedDays(
  mine: readonly string[],
  theirs: readonly string[],
  myFrozen: readonly string[] = [],
  theirFrozen: readonly string[] = [],
): string[] {
  const myEff = effectiveDays(mine, myFrozen);
  const otherEff = new Set(effectiveDays(theirs, theirFrozen));
  return normalizeDays(myEff.filter((d) => otherEff.has(d)));
}

export interface DayActivity {
  day: string;
  me: boolean;
  meFrozen: boolean;
  friend: boolean;
  friendFrozen: boolean;
}

export interface FriendStreakSummary {
  /** Consecutive days you BOTH completed or protected. */
  count: number;
  best: number;
  status: StreakStatus;
  meDoneToday: boolean;
  meFrozenToday: boolean;
  friendDoneToday: boolean;
  friendFrozenToday: boolean;
  /** Last 7 days (oldest → today) with who completed each one. */
  week: DayActivity[];
}

export function friendStreak(
  mine: readonly string[],
  theirs: readonly string[],
  today: string,
  myFrozen: readonly string[] = [],
  theirFrozen: readonly string[] = [],
): FriendStreakSummary {
  const both = sharedDays(mine, theirs, myFrozen, theirFrozen);
  const meSet = new Set(mine);
  const meFrSet = new Set(myFrozen);
  const themSet = new Set(theirs);
  const themFrSet = new Set(theirFrozen);

  const week: DayActivity[] = Array.from({ length: 7 }, (_, i) => {
    const day = shiftDay(today, i - 6);
    return {
      day,
      me: meSet.has(day),
      meFrozen: meFrSet.has(day),
      friend: themSet.has(day),
      friendFrozen: themFrSet.has(day),
    };
  });

  return {
    count: currentStreak(both, today),
    best: bestStreak(both),
    status: streakStatus(both, today),
    meDoneToday: meSet.has(today),
    meFrozenToday: meFrSet.has(today),
    friendDoneToday: themSet.has(today),
    friendFrozenToday: themFrSet.has(today),
    week,
  };
}

/** Check if a habit scheduled for specific days of week is due on date. */
export function isHabitDue(daysOfWeek?: readonly number[], date: Date = new Date()): boolean {
  if (!daysOfWeek || daysOfWeek.length === 0) return true;
  return daysOfWeek.includes(date.getDay());
}

/* ------------------------------------------------------------------- */
/*  Streak Milestones & Rewards                                        */
/* ------------------------------------------------------------------- */

export interface StreakMilestone {
  readonly days: number;
  readonly id: 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend';
  readonly name: string;
  readonly perk: string;
}

export const STREAK_MILESTONES: readonly StreakMilestone[] = [
  { days: 3, id: 'bronze', name: 'Iniciado', perk: 'Vitales decaen 15% mas lento' },
  { days: 7, id: 'silver', name: 'Constante', perk: 'Desbloqueo de bayas doradas y +1 comodin' },
  { days: 14, id: 'gold', name: 'Imparable', perk: 'Aura radiante en la mascota' },
  { days: 30, id: 'diamond', name: 'Maestro', perk: 'Corona dorada y vitales estables' },
  { days: 60, id: 'legend', name: 'Leyenda', perk: 'Emblema legendario y maximo respeto' },
];

export function getActiveMilestones(streak: number): StreakMilestone[] {
  return STREAK_MILESTONES.filter((m) => streak >= m.days);
}

export function getNextMilestone(streak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => streak < m.days) ?? null;
}

/**
 * Rebuild a history from the legacy counter-based store
 * ({ currentStreak, lastActiveDate }) so existing players keep their streak.
 */
export function daysFromLegacy(streak: number, lastActiveDate: string | undefined): string[] {
  if (!lastActiveDate || !/^\d{4}-\d{2}-\d{2}$/.test(lastActiveDate) || streak <= 0) return [];
  const n = Math.min(streak, STREAK_HISTORY_DAYS);
  return normalizeDays(Array.from({ length: n }, (_, i) => shiftDay(lastActiveDate, -i)));
}
