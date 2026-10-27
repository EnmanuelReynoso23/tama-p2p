import { describe, expect, it } from 'vitest';
import { advance, createPet, STAGE_STARTS } from '../../core/animo.js';
import { MENU, Screen } from '../screen.js';

function fakePoco(width, height) {
  const calls = [];
  return {
    width,
    height,
    calls,
    makeColor: (r, g, b) => ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3),
    fillRectangle: (color, x, y, w, h) => calls.push({ color, x, y, w, h }),
    drawText: (text) => calls.push({ text }),
    getTextWidth: (text) => text.length * 8,
  };
}

describe('pantalla de la maquinita', () => {
  it('dibuja dentro de 240x240 sin salirse', () => {
    const poco = fakePoco(240, 240);
    const pet = advance(createPet('Brote', 0), STAGE_STARTS.teen);
    new Screen(poco, {}).draw(pet, { menu: 0, frame: 0 });
    const rects = poco.calls.filter((c) => 'w' in c);
    expect(rects.length).toBeGreaterThan(50);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(240);
      expect(r.y + r.h).toBeLessThanOrEqual(240);
    }
    expect(poco.calls.some((c) => c.text === MENU[0].label)).toBe(true);
  });

  it('tambien en el simulador (240x320) y con el huevo', () => {
    const poco = fakePoco(240, 320);
    new Screen(poco).draw(createPet('Brote', 0), { menu: 3, frame: 1 });
    expect(poco.calls.length).toBeGreaterThan(20);
  });

  it('muestra Despertar si esta dormida', () => {
    const poco = fakePoco(240, 240);
    const pet = { ...advance(createPet('Brote', 0), STAGE_STARTS.child), isAsleep: true };
    new Screen(poco, {}).draw(pet, { menu: MENU.findIndex((m) => m.id === 'sleep'), frame: 0 });
    expect(poco.calls.some((c) => c.text === 'Despertar')).toBe(true);
  });
});
