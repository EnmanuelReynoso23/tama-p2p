import { describe, expect, it } from 'vitest';
import {
  bestStreak,
  currentStreak,
  dayKey,
  daysFromLegacy,
  effectiveDays,
  friendStreak,
  getActiveMilestones,
  getNextMilestone,
  isHabitDue,
  markDay,
  normalizeDays,
  sharedDays,
  shiftDay,
  streakStatus,
  unmarkDay,
  STREAK_HISTORY_DAYS,
} from './streak';

describe('day keys', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('shifts across month and year boundaries', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2025-12-31', 1)).toBe('2026-01-01');
    expect(shiftDay('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('history helpers', () => {
  it('normalizes: dedupes, sorts, drops junk and trims', () => {
    expect(normalizeDays(['2026-01-02', 'bad', '2026-01-01', '2026-01-02'])).toEqual([
      '2026-01-01',
      '2026-01-02',
    ]);
    const many = Array.from({ length: STREAK_HISTORY_DAYS + 10 }, (_, i) => shiftDay('2026-01-01', i));
    expect(normalizeDays(many)).toHaveLength(STREAK_HISTORY_DAYS);
  });

  it('mark / unmark a day', () => {
    const d = markDay(['2026-01-01'], '2026-01-02');
    expect(d).toEqual(['2026-01-01', '2026-01-02']);
    expect(unmarkDay(d, '2026-01-02')).toEqual(['2026-01-01']);
  });

  it('unifies completed and frozen days via effectiveDays', () => {
    const eff = effectiveDays(['2026-10-24', '2026-10-26'], ['2026-10-25']);
    expect(eff).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
  });
});

describe('currentStreak with frozen days', () => {
  const today = '2026-10-26';

  it('counts consecutive days ending today', () => {
    expect(currentStreak(['2026-10-24', '2026-10-25', '2026-10-26'], today)).toBe(3);
  });

  it('preserves streak across a frozen day', () => {
    const completed = ['2026-10-24', '2026-10-26'];
    const frozen = ['2026-10-25'];
    expect(currentStreak(completed, today, frozen)).toBe(3);
  });

  it('reports frozen status when today is frozen', () => {
    const completed = ['2026-10-24', '2026-10-25'];
    const frozen = [today];
    expect(streakStatus(completed, today, frozen)).toBe('frozen');
    expect(currentStreak(completed, today, frozen)).toBe(3);
  });

  it('keeps the streak alive if only yesterday is done (at risk)', () => {
    expect(currentStreak(['2026-10-24', '2026-10-25'], today)).toBe(2);
    expect(streakStatus(['2026-10-24', '2026-10-25'], today)).toBe('at-risk');
  });

  it('breaks after a missed unprotected day', () => {
    expect(currentStreak(['2026-10-23', '2026-10-24'], today)).toBe(0);
    expect(streakStatus(['2026-10-23', '2026-10-24'], today)).toBe('none');
  });

  it('status is done when today is in the history', () => {
    expect(streakStatus([today], today)).toBe('done');
  });
});

describe('bestStreak', () => {
  it('finds the longest run including frozen days', () => {
    expect(
      bestStreak(['2026-01-01', '2026-01-03'], ['2026-01-02']),
    ).toBe(3);
    expect(bestStreak([])).toBe(0);
  });
});

describe('friend streak with freezes', () => {
  const today = '2026-10-26';
  const me = ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-26'];
  const meFrozen = ['2026-10-25'];
  const friend = ['2026-10-23', '2026-10-24', '2026-10-25'];

  it('intersects both histories accounting for friend or personal freezes', () => {
    expect(sharedDays(me, friend, meFrozen, [])).toEqual(['2026-10-23', '2026-10-24', '2026-10-25']);
  });

  it('is at risk while friend has not finished or frozen today', () => {
    const s = friendStreak(me, friend, today, meFrozen, []);
    expect(s.count).toBe(3);
    expect(s.status).toBe('at-risk');
    expect(s.meDoneToday).toBe(true);
    expect(s.friendDoneToday).toBe(false);
  });

  it('returns a 7-day strip ending today with freeze flags', () => {
    const s = friendStreak(me, friend, today, meFrozen, []);
    expect(s.week).toHaveLength(7);
    expect(s.week[6]).toEqual({
      day: today,
      me: true,
      meFrozen: false,
      friend: false,
      friendFrozen: false,
    });
    expect(s.week[5]).toEqual({
      day: '2026-10-25',
      me: false,
      meFrozen: true,
      friend: true,
      friendFrozen: false,
    });
  });
});

describe('isHabitDue', () => {
  it('defaults to true if daysOfWeek is undefined or empty', () => {
    expect(isHabitDue(undefined)).toBe(true);
    expect(isHabitDue([])).toBe(true);
  });

  it('matches Sunday (0) and Monday (1)', () => {
    // 2026-10-26 is Monday (day 1)
    const monday = new Date(2026, 9, 26);
    expect(isHabitDue([1, 3, 5], monday)).toBe(true);
    expect(isHabitDue([2, 4], monday)).toBe(false);
  });
});

describe('milestones', () => {
  it('returns active and next milestone correctly', () => {
    expect(getActiveMilestones(0)).toHaveLength(0);
    expect(getActiveMilestones(7).map((m) => m.id)).toEqual(['bronze', 'silver']);
    expect(getNextMilestone(7)?.id).toBe('gold');
    expect(getNextMilestone(100)).toBeNull();
  });
});

describe('legacy migration', () => {
  it('rebuilds N consecutive days ending at lastActiveDate', () => {
    expect(daysFromLegacy(3, '2026-10-25')).toEqual(['2026-10-23', '2026-10-24', '2026-10-25']);
    expect(daysFromLegacy(0, '2026-10-25')).toEqual([]);
    expect(daysFromLegacy(2, undefined)).toEqual([]);
  });
});
