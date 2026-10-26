/**
 * Streak math — pure functions, no storage, no React.
 *
 * A streak is derived from a *history* of completed days instead of an
 * incremental counter. That makes it robust to: closing the app for days,
 * toggling a habit on/off, and friends that were never online at the same
 * time as you (they send their own history over P2P and we intersect it).
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
 * Current streak: consecutive completed days ending today — or ending
 * yesterday, because today is still "in play" (the streak is at risk, not
 * broken, until midnight).
 */
export function currentStreak(days: readonly string[], today: string): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = shiftDay(cursor, -1);
  }
  return n;
}

/** Longest run of consecutive days anywhere in the history. */
export function bestStreak(days: readonly string[]): number {
  const sorted = normalizeDays(days);
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
  /** Today is already done. */
  | 'done'
  /** Yesterday was done, today not yet — finish before midnight! */
  | 'at-risk'
  /** No active streak. */
  | 'none';

export function streakStatus(days: readonly string[], today: string): StreakStatus {
  const set = new Set(days);
  if (set.has(today)) return 'done';
  if (set.has(shiftDay(today, -1))) return 'at-risk';
  return 'none';
}

/** Days both people completed — the basis of a shared ("friend") streak. */
export function sharedDays(mine: readonly string[], theirs: readonly string[]): string[] {
  const other = new Set(theirs);
  return normalizeDays(mine.filter((d) => other.has(d)));
}

export interface FriendStreakSummary {
  /** Consecutive days you BOTH completed. */
  count: number;
  best: number;
  status: StreakStatus;
  meDoneToday: boolean;
  friendDoneToday: boolean;
  /** Last 7 days (oldest → today) with who completed each one. */
  week: Array<{ day: string; me: boolean; friend: boolean }>;
}

export function friendStreak(
  mine: readonly string[],
  theirs: readonly string[],
  today: string,
): FriendStreakSummary {
  const both = sharedDays(mine, theirs);
  const meSet = new Set(mine);
  const themSet = new Set(theirs);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = shiftDay(today, i - 6);
    return { day, me: meSet.has(day), friend: themSet.has(day) };
  });
  return {
    count: currentStreak(both, today),
    best: bestStreak(both),
    status: streakStatus(both, today),
    meDoneToday: meSet.has(today),
    friendDoneToday: themSet.has(today),
    week,
  };
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
