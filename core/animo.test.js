import { describe, expect, it } from 'vitest';
import {
  advance,
  caress,
  catchUp,
  cheer,
  clean,
  createPet,
  feed,
  formFor,
  giveMedicine,
  MAX_CATCH_UP_MS,
  moodOf,
  play,
  revivePet,
  STAGE_STARTS,
  stageForAge,
  toggleSleep,
} from './animo.js';
import { petFrames, POOP, PALETTE, SPRITE_SIZE, toRgb565 } from './sprites.js';

const T0 = 1_800_000_000_000;
const H = 3_600_000;
const hatched = () => advance(createPet('Brote', T0), STAGE_STARTS.baby + 1000);

describe('crecimiento', () => {
  it('nace a los 2 minutos y cambia de etapa por edad', () => {
    expect(stageForAge(0)).toBe('egg');
    expect(stageForAge(STAGE_STARTS.baby)).toBe('baby');
    expect(stageForAge(STAGE_STARTS.adult + 1)).toBe('adult');
    const p = hatched();
    expect(p.hatched).toBe(true);
    expect(p.stage).toBe('baby');
  });

  it('el huevo no pierde necesidades', () => {
    const p = advance(createPet('x', T0), 60_000);
    expect(p.hatched).toBe(false);
    expect(p.stats).toEqual(createPet('x', T0).stats);
  });

  it('la forma adulta sale del cuidado y la racha', () => {
    expect(formFor(80, 0)).toBe('radiant');
    expect(formFor(50, 0)).toBe('chill');
    expect(formFor(20, 0)).toBe('scruffy');
    expect(formFor(50, 7)).toBe('radiant');
    expect(formFor(20, 10)).toBe('chill');
  });

  it('llega a adulta con forma elegida', () => {
    const p = advance(hatched(), STAGE_STARTS.adult);
    expect(p.stage).toBe('adult');
    expect(['radiant', 'chill', 'scruffy']).toContain(p.adultVariant);
  });
});

describe('necesidades', () => {
  it('bajan despierta y la energia sube dormida', () => {
    const p = advance(hatched(), 2 * H);
    expect(p.stats.hunger).toBeLessThan(80);
    const s = toggleSleep(p).pet;
    const later = advance(s, H);
    expect(later.stats.energy).toBeGreaterThan(s.stats.energy);
  });

  it('se duerme sola sin energia y despierta llena', () => {
    let p = { ...hatched(), stats: { ...hatched().stats, energy: 4 } };
    p = advance(p, 5 * 60_000);
    expect(p.isAsleep).toBe(true);
    p = advance(p, 8 * H);
    expect(p.isAsleep).toBe(false);
  });

  it('se enferma si la descuidas y la medicina la cura', () => {
    const p = advance(hatched(), 30 * H);
    expect(p.isSick).toBe(true);
    const r = giveMedicine(p);
    expect(r.ok).toBe(true);
    expect(r.pet.isSick).toBe(false);
  });

  it('despues de comer sale una caca y banar la quita', () => {
    const fed = feed({ ...hatched(), stats: { ...hatched().stats, hunger: 30 } }, 'meal', T0);
    expect(fed.ok).toBe(true);
    const later = advance(fed.pet, 2 * H);
    expect(later.poops).toBe(1);
    const c = clean(later, T0 + 2 * H);
    expect(c.ok).toBe(true);
    expect(c.pet.poops).toBe(0);
  });

  it('la vuelta se simula hasta una semana', () => {
    const p = { ...hatched(), lastUpdated: T0 };
    const back = catchUp(p, T0 + 30 * 24 * H);
    expect(back.lastUpdated).toBe(T0 + 30 * 24 * H);
    expect(back.ageMs - p.ageMs).toBe(MAX_CATCH_UP_MS);
  });

  it('un reloj atrasado no rompe nada', () => {
    const p = { ...hatched(), lastUpdated: T0 + H };
    expect(catchUp(p, T0).lastUpdated).toBe(T0);
  });
});

describe('acciones', () => {
  it('rechaza lo que no corresponde', () => {
    expect(feed(createPet('x', T0), 'meal', T0)).toMatchObject({ ok: false, reason: 'egg' });
    const asleep = toggleSleep(hatched()).pet;
    expect(feed(asleep, 'meal', T0)).toMatchObject({ ok: false, reason: 'asleep' });
    expect(play({ ...hatched(), stats: { ...hatched().stats, energy: 5 } }, T0)).toMatchObject({ ok: false, reason: 'tired' });
    expect(giveMedicine(hatched())).toMatchObject({ ok: false, reason: 'not_sick' });
    const once = feed({ ...hatched(), stats: { ...hatched().stats, hunger: 10 } }, 'meal', T0);
    expect(feed(once.pet, 'meal', T0 + 1000)).toMatchObject({ ok: false, reason: 'cooldown' });
  });

  it('las caricias tienen tope por hora', () => {
    let p = hatched();
    let total = 0;
    for (let i = 0; i < 15; i++) {
      const r = caress(p, T0 + i * 1000);
      p = r.pet;
      total += r.granted;
    }
    expect(total).toBe(20);
    expect(caress(p, T0 + H + 1).granted).toBe(2);
  });

  it('el animo sigue a la necesidad mas urgente', () => {
    expect(moodOf(createPet('x', T0))).toBe('egg');
    expect(moodOf({ ...hatched(), stats: { ...hatched().stats, hunger: 10 } })).toBe('hungry');
    expect(moodOf(toggleSleep(hatched()).pet)).toBe('sleep');
  });
});

describe('guardado', () => {
  it('revive datos viejos o rotos sin fallar', () => {
    const p = revivePet({ name: '  Mochi  ', stage: 'teen', hatched: true, stats: { hunger: 'x', health: 500 } }, T0);
    expect(p.name).toBe('Mochi');
    expect(p.stage).toBe('teen');
    expect(p.stats.hunger).toBe(80);
    expect(p.stats.health).toBe(100);
    expect(revivePet(null, T0).stage).toBe('egg');
    expect(revivePet({ stage: 'adult', hatched: true }, T0).adultVariant).toBe('chill');
  });
});

describe('dibujos', () => {
  it('todas las combinaciones dan 2 cuadros de 24x24 con colores conocidos', () => {
    const stages = ['baby', 'child', 'teen', 'adult'];
    const moods = ['sleep', 'sick', 'hungry', 'dirty', 'sad', 'tired', 'happy', 'ok'];
    const valid = new RegExp('^[.' + Object.keys(PALETTE).join('') + ']+$');
    const all = [petFrames('egg', null, 'egg')];
    for (const s of stages) for (const f of [null, 'radiant', 'chill', 'scruffy']) for (const m of moods) all.push(petFrames(s, f, m));
    for (const frames of all) {
      expect(frames).toHaveLength(2);
      for (const fr of frames) {
        expect(fr).toHaveLength(SPRITE_SIZE);
        for (const row of fr) expect(row.length === SPRITE_SIZE && valid.test(row)).toBe(true);
      }
    }
    for (const row of POOP) for (const ch of row) expect(ch === '.' || ch in PALETTE).toBe(true);
  });

  it('las formas adultas se ven distintas', () => {
    const a = petFrames('adult', 'radiant', 'ok')[0].join('');
    const b = petFrames('adult', 'chill', 'ok')[0].join('');
    const c = petFrames('adult', 'scruffy', 'ok')[0].join('');
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it('convierte colores a RGB565', () => {
    expect(toRgb565('#ffffff')).toBe(0xffff);
    expect(toRgb565('#000000')).toBe(0);
    expect(toRgb565('#ff0000')).toBe(0xf800);
  });
});

describe('reloj que vuelve atras', () => {
  it('no deja esperas ni caricias bloqueadas', () => {
    const p = revivePet({ ...hatched(), cooldownsUntil: { meal: T0 + 1e9, snack: 0, clean: 0, play: 0 }, caressHourStart: T0 + 1e9 }, T0);
    expect(p.cooldownsUntil.meal).toBe(0);
    expect(p.caressHourStart).toBe(0);
  });
});

describe('premio por habito', () => {
  it('sube el animo y comparte el tope de las caricias', () => {
    const p = { ...hatched(), stats: { ...hatched().stats, happiness: 50 } };
    expect(cheer(p, T0).stats.happiness).toBe(56);
    let q = p;
    for (let i = 0; i < 12; i++) q = cheer(q, T0 + i);
    expect(cheer(q, T0 + 20)).toBe(q);
  });
});
