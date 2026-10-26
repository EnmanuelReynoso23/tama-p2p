import { describe, it, expect } from 'vitest';
import {
  deriveMood,
  feedMeal,
  feedSnack,
  giveMedicine,
  petStroke,
  play,
  clean as actClean,
} from './actions';
import { makeStats } from './stats';

describe('actions', () => {
  it('feedMeal +30 hunger / -5 hygiene, refuses when full', () => {
    const s = makeStats({ hunger: 50, hygiene: 80 });
    const r = feedMeal(s);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.stats.hunger).toBe(80);
      expect(r.stats.hygiene).toBe(75);
    }
    const full = makeStats({ hunger: 100 });
    const fullR = feedMeal(full);
    expect(fullR.ok).toBe(false);
    if (!fullR.ok) expect(fullR.reason).toBe('too_full');
  });

  it('feedSnack has a health cost', () => {
    const s = makeStats({ hunger: 50, happiness: 50, health: 100 });
    const r = feedSnack(s);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.stats.hunger).toBe(60);
      expect(r.stats.happiness).toBe(60);
      expect(r.stats.health).toBe(98);
    }
  });

  it('play refuses when too tired', () => {
    const tired = makeStats({ energy: 5 });
    const r = play(tired);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('too_tired');

    const awake = makeStats({ energy: 80, happiness: 50, hunger: 80 });
    const ok = play(awake, 15); // bonus happiness for good mini-game
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.stats.energy).toBe(65); // -15
      expect(ok.stats.hunger).toBe(75); // -5
      expect(ok.stats.happiness).toBe(90); // +25 base + 15 bonus
    }
  });

  it('clean pins hygiene to 100, refuses when already clean', () => {
    const s = makeStats({ hygiene: 40 });
    expect(actClean(s).ok).toBe(true);
    if (actClean(s).ok) expect((actClean(s) as Extract<ReturnType<typeof actClean>, { ok: true }>).stats.hygiene).toBe(100);
    const s2 = makeStats({ hygiene: 100 });
    expect(actClean(s2).ok).toBe(false);
  });

  it('giveMedicine only works when sick', () => {
    const well = makeStats({ health: 100, happiness: 80 });
    expect(giveMedicine(well, false).ok).toBe(false);
    const sick = makeStats({ health: 0, happiness: 80 });
    const r = giveMedicine(sick, true);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.isSick).toBe(false);
      expect(r.stats.happiness).toBe(70); // -10
      expect(r.stats.health).toBeGreaterThanOrEqual(30); // minimum rebound
    }
  });

  it('petStroke applies +2/ stroke and hourly cap', () => {
    const s = makeStats({ happiness: 50 });
    const a = petStroke(s, 0);
    expect(a.ok).toBe(true);
    if (a.ok) {
      expect(a.happinessGranted).toBe(2);
      expect(a.stats.happiness).toBe(52);
    }
    const full = petStroke(s, 19); // 19 already earned, cap 20
    expect(full.ok).toBe(true);
    if (full.ok) expect(full.happinessGranted).toBe(1);
    const over = petStroke(s, 20);
    expect(over.ok).toBe(false);
  });

  it('deriveMood picks sleeping/sick first, then lowest stat < 30', () => {
    const s = makeStats();
    expect(deriveMood(s, { isAsleep: true, isSick: false }).kind).toBe('sleeping');
    expect(deriveMood(s, { isAsleep: false, isSick: true }).kind).toBe('sick');
    const low = makeStats({ hunger: 10, hygiene: 90, happiness: 90, energy: 90 });
    expect(deriveMood(low, { isAsleep: false, isSick: false }).kind).toBe('hungry');
    const dirty = makeStats({ hunger: 80, hygiene: 15, happiness: 90, energy: 90 });
    expect(deriveMood(dirty, { isAsleep: false, isSick: false }).kind).toBe('dirty');
  });
});
