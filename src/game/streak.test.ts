import { describe, expect, it } from 'vitest';
import {
  bestStreak,
  currentStreak,
  dayKey,
  daysFromLegacy,
  friendStreak,
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
});

describe('currentStreak', () => {
  const today = '2026-10-26';

  it('counts consecutive days ending today', () => {
    expect(currentStreak(['2026-10-24', '2026-10-25', '2026-10-26'], today)).toBe(3);
  });

  it('keeps the streak alive if only yesterday is done (at risk)', () => {
    expect(currentStreak(['2026-10-24', '2026-10-25'], today)).toBe(2);
    expect(streakStatus(['2026-10-24', '2026-10-25'], today)).toBe('at-risk');
  });

  it('breaks after a missed day', () => {
    expect(currentStreak(['2026-10-23', '2026-10-24'], today)).toBe(0);
    expect(streakStatus(['2026-10-23', '2026-10-24'], today)).toBe('none');
  });

  it('status is done when today is in the history', () => {
    expect(streakStatus([today], today)).toBe('done');
  });
});

describe('bestStreak', () => {
  it('finds the longest run', () => {
    expect(
      bestStreak(['2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07']),
    ).toBe(3);
    expect(bestStreak([])).toBe(0);
  });
});

describe('friend streak', () => {
  const today = '2026-10-26';
  const me = ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26'];
  const friend = ['2026-10-23', '2026-10-24', '2026-10-25'];

  it('intersects both histories', () => {
    expect(sharedDays(me, friend)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25']);
  });

  it('is at risk while the friend has not finished today', () => {
    const s = friendStreak(me, friend, today);
    expect(s.count).toBe(3);
    expect(s.status).toBe('at-risk');
    expect(s.meDoneToday).toBe(true);
    expect(s.friendDoneToday).toBe(false);
  });

  it('grows when both finish today', () => {
    const s = friendStreak(me, [...friend, today], today);
    expect(s.count).toBe(4);
    expect(s.status).toBe('done');
  });

  it('returns a 7-day strip ending today', () => {
    const s = friendStreak(me, friend, today);
    expect(s.week).toHaveLength(7);
    expect(s.week[6]).toEqual({ day: today, me: true, friend: false });
    expect(s.week[0].day).toBe('2026-10-20');
  });
});

describe('legacy migration', () => {
  it('rebuilds N consecutive days ending at lastActiveDate', () => {
    expect(daysFromLegacy(3, '2026-10-25')).toEqual(['2026-10-23', '2026-10-24', '2026-10-25']);
    expect(daysFromLegacy(0, '2026-10-25')).toEqual([]);
    expect(daysFromLegacy(2, undefined)).toEqual([]);
  });
});
