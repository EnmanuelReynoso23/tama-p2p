import { describe, it, expect } from 'vitest';
import {
  addCareSample,
  adultVariantFromCareScore,
  averageCareScore,
  computeCareSample,
  lifeStageFromAge,
} from './careScore';
import { makeStats } from './stats';
import { EGG_DURATION_MS, STAGE_DURATION_DAYS } from './constants';

const dayMs = 24 * 60 * 60 * 1000;

describe('careScore', () => {
  it('computeCareSample averages the 5 stats', () => {
    const s = makeStats({
      hunger: 100,
      happiness: 100,
      energy: 0,
      hygiene: 100,
      health: 100,
    });
    const c = computeCareSample(s, 1000);
    expect(c.score).toBe(80); // (100+100+0+100+100)/5 = 80
    expect(c.at).toBe(1000);
  });

  it('addCareSample prunes samples older than two weeks', () => {
    const now = 1_000_000_000;
    const old = computeCareSample(makeStats(), now - 20 * dayMs);
    const recent = computeCareSample(makeStats(), now - dayMs);
    const list = addCareSample([old], recent);
    expect(list.length).toBe(1);
    expect(list[0].at).toBe(recent.at);
  });

  it('averageCareScore defaults to 100 when empty', () => {
    expect(averageCareScore([])).toBe(100);
  });

  it('adultVariantFromCareScore uses configured cutoffs', () => {
    expect(adultVariantFromCareScore(95)).toBe('radiant');
    expect(adultVariantFromCareScore(80)).toBe('radiant');
    expect(adultVariantFromCareScore(70)).toBe('chill');
    expect(adultVariantFromCareScore(50)).toBe('chill');
    expect(adultVariantFromCareScore(40)).toBe('scruffy');
  });

  it('lifeStageFromAge progresses through egg/baby/child/teen/adult', () => {
    const birth = 0;
    expect(lifeStageFromAge(birth, 1_000, EGG_DURATION_MS)).toBe('egg');
    const babyStart = EGG_DURATION_MS + 1;
    expect(lifeStageFromAge(birth, babyStart, EGG_DURATION_MS)).toBe('baby');
    const childStart =
      EGG_DURATION_MS + STAGE_DURATION_DAYS.baby * dayMs + 100;
    expect(lifeStageFromAge(birth, childStart, EGG_DURATION_MS)).toBe('child');
    const teenStart =
      EGG_DURATION_MS +
      (STAGE_DURATION_DAYS.baby + STAGE_DURATION_DAYS.child) * dayMs +
      100;
    expect(lifeStageFromAge(birth, teenStart, EGG_DURATION_MS)).toBe('teen');
    const adultStart =
      EGG_DURATION_MS +
      (STAGE_DURATION_DAYS.baby +
        STAGE_DURATION_DAYS.child +
        STAGE_DURATION_DAYS.teen) *
        dayMs +
      100;
    expect(lifeStageFromAge(birth, adultStart, EGG_DURATION_MS)).toBe('adult');
  });
});
