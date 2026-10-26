import { describe, it, expect } from 'vitest';
import { catchUpOffline, offlineSummary } from './offline';
import { makeStats } from './stats';

describe('offline catch-up', () => {
  it('does nothing for 0 elapsed time', () => {
    const s = makeStats();
    const r = catchUpOffline(s, 0, { isAsleep: false, isSick: false });
    expect(r.hoursSimulated).toBe(0);
    expect(r.stepsRan).toBe(0);
    expect(r.stats).toEqual(s);
  });

  it('applies awake decay for 2 hours correctly (stepwise vs direct match)', () => {
    const s = makeStats({
      hunger: 90,
      happiness: 90,
      energy: 90,
      hygiene: 90,
      health: 100,
    });
    const twoHours = 2 * 60 * 60 * 1000;
    const r = catchUpOffline(s, twoHours, { isAsleep: false, isSick: false });
    // Awake rates per hr: hunger-6, happiness-4, energy-3, hygiene-3
    expect(r.stats.hunger).toBeCloseTo(78, 0);
    expect(r.stats.happiness).toBeCloseTo(82, 0);
    expect(r.stats.energy).toBeCloseTo(84, 0);
    expect(r.stats.hygiene).toBeCloseTo(84, 0);
    // Health: all stats stayed above 50 the whole 2h → +4, capped at 100
    expect(r.stats.health).toBeCloseTo(100, 0);
    expect(r.hoursSimulated).toBeCloseTo(2, 3);
  });

  it('caps offline time at 72h', () => {
    const s = makeStats({
      hunger: 90,
      happiness: 90,
      energy: 90,
      hygiene: 90,
      health: 100,
    });
    const tenDays = 10 * 24 * 60 * 60 * 1000;
    const r = catchUpOffline(s, tenDays, { isAsleep: false, isSick: false });
    expect(r.hoursSimulated).toBeCloseTo(72, 3);
    // 72 * -6 = -432 hunger; clamped to 0
    expect(r.stats.hunger).toBe(0);
  });

  it('quantised step loop correctly triggers health penalty after crossing <20', () => {
    // Start 30 hunger. Awake hr rate -6 → takes (30-20)/6 ≈ 1.667h to cross 20.
    // In the remaining ~0.333h of hour 2, the health penalty applies fractionally.
    const s = makeStats({
      hunger: 30,
      happiness: 90,
      energy: 90,
      hygiene: 90,
      health: 100,
    });
    const r = catchUpOffline(s, 2 * 60 * 60 * 1000, {
      isAsleep: false,
      isSick: false,
    });
    expect(r.stats.hunger).toBeCloseTo(18, 0);
    // Health is no longer 100 because part of the time hunger was <20.
    expect(r.stats.health).toBeLessThan(100);
  });

  it('sleeping rate recovers energy during offline hours', () => {
    const s = makeStats({ energy: 20, hunger: 90 });
    const r = catchUpOffline(s, 3 * 60 * 60 * 1000, {
      isAsleep: true,
      isSick: false,
    });
    expect(r.stats.energy).toBeCloseTo(56, 0); // +36
  });

  it('offlineSummary gives a nice human sentence', () => {
    const before = makeStats({ hunger: 90 });
    const after = makeStats({ hunger: 30 });
    const msg = offlineSummary({
      name: 'Mochi',
      hours: 7,
      before,
      after,
      wasAsleep: true,
      becameSick: false,
    });
    expect(msg).toContain('slept for 7 hours');
    expect(msg).toContain('hungry');
  });
});
