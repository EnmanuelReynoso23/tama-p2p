import { describe, it, expect } from 'vitest';
import {
  applyStatDelta,
  clampStat,
  decayStats,
  lowestNonHealthStat,
  makeStats,
  roundStat,
  setStat,
  type Stats,
} from './stats';

describe('stats', () => {
  it('clampStat pins to [0, 100] (no rounding)', () => {
    expect(clampStat(-5)).toBe(0);
    expect(clampStat(150)).toBe(100);
    expect(clampStat(42.78)).toBe(42.78); // kept as-is
    expect(roundStat(42.78)).toBe(42.8); // display rounding handled separately
  });

  it('makeStats fills defaults and clamps', () => {
    const s = makeStats({ hunger: 120, health: -1 });
    expect(s.hunger).toBe(100);
    expect(s.health).toBe(0);
    expect(s.happiness).toBe(85);
  });

  it('applyStatDelta adds & clamps', () => {
    const s: Stats = {
      hunger: 90,
      happiness: 60,
      energy: 10,
      hygiene: 10,
      health: 100,
    };
    const next = applyStatDelta(s, { hunger: 20, energy: -20 });
    expect(next.hunger).toBe(100); // clamped up
    expect(next.energy).toBe(0); // clamped down
    expect(next.hygiene).toBe(10); // unchanged
  });

  it('setStat overrides cleanly', () => {
    const s = makeStats();
    expect(setStat(s, 'hygiene', 100).hygiene).toBe(100);
    expect(setStat(s, 'health', -99).health).toBe(0);
  });

  it('decayStats applies awake hourly rates', () => {
    const s = makeStats({
      hunger: 90,
      happiness: 90,
      energy: 90,
      hygiene: 90,
      health: 100,
    });
    // 1h awake: hunger -6, happiness -4, energy -3, hygiene -3, health stable (all > 50 +2)
    const r = decayStats(s, 1, { isAsleep: false, isSick: false });
    expect(r.hunger).toBe(84);
    expect(r.happiness).toBe(86);
    expect(r.energy).toBe(87);
    expect(r.hygiene).toBe(87);
    expect(r.health).toBe(100); // +2 capped at 100
  });

  it('decayStats applies sleep rates (energy recovers, hunger slower)', () => {
    const s = makeStats({
      hunger: 90,
      happiness: 90,
      energy: 40,
      hygiene: 90,
      health: 100,
    });
    const r = decayStats(s, 1, { isAsleep: true, isSick: false });
    expect(r.hunger).toBe(88); // -2
    expect(r.happiness).toBe(89); // -1
    expect(r.energy).toBe(52); // +12
    expect(r.hygiene).toBe(89); // -1
  });

  it('decayStats drops health when any stat < 20', () => {
    const s = makeStats({
      hunger: 10,
      happiness: 90,
      energy: 90,
      hygiene: 90,
      health: 100,
    });
    const r = decayStats(s, 1, { isAsleep: false, isSick: false });
    expect(r.health).toBe(95); // -5
  });

  it('decayStats sick blocks health recovery above baseline', () => {
    const s = makeStats({
      hunger: 80,
      happiness: 80,
      energy: 80,
      hygiene: 80,
      health: 50,
    });
    const healthy = decayStats(s, 1, { isAsleep: false, isSick: false });
    const sick = decayStats(s, 1, { isAsleep: false, isSick: true });
    expect(healthy.health).toBe(52); // +2 recovery
    expect(sick.health).toBe(50); // no recovery when sick
  });

  it('lowestNonHealthStat breaks ties by fixed priority', () => {
    const s = makeStats({
      hunger: 25,
      happiness: 25,
      hygiene: 25,
      energy: 25,
      health: 100,
    });
    expect(lowestNonHealthStat(s).name).toBe('hunger');
    const s2 = makeStats({
      hunger: 90,
      happiness: 25,
      hygiene: 10,
      energy: 25,
      health: 100,
    });
    expect(lowestNonHealthStat(s2).name).toBe('hygiene');
  });
});
