import { describe, expect, it } from 'vitest';
import { parseGift, parseInteraction, parsePetSync } from './protocol';

describe('parsePetSync', () => {
  it('rejects non-objects and messages without playerId', () => {
    expect(parsePetSync(null)).toBeNull();
    expect(parsePetSync('hola')).toBeNull();
    expect(parsePetSync({ name: 'Mochi' })).toBeNull();
  });

  it('clamps numbers, trims strings and filters day keys', () => {
    const p = parsePetSync({
      playerId: 'abc',
      name: '  Super-long-pet-name-that-goes-on  ',
      hunger: 999,
      happiness: -5,
      energy: 'lots',
      stage: 'dragon',
      completedDays: ['2026-10-25', 'nope', 42, '2026-10-24'],
      isAsleep: 'yes',
    });
    expect(p).not.toBeNull();
    expect(p!.name).toHaveLength(16);
    expect(p!.hunger).toBe(100);
    expect(p!.happiness).toBe(0);
    expect(p!.energy).toBe(0);
    expect(p!.stage).toBe('baby');
    expect(p!.isAsleep).toBe(false);
    expect(p!.completedDays).toEqual(['2026-10-24', '2026-10-25']);
  });
});

describe('parseGift / parseInteraction', () => {
  it('only accepts known kinds', () => {
    expect(parseGift({ kind: 'bomb' })).toBeNull();
    expect(parseGift({ kind: 'berry', senderName: 'Ana' })?.senderName).toBe('Ana');
    expect(parseInteraction({ action: 'hack' })).toBeNull();
    expect(parseInteraction({ action: 'cheer' })?.senderName).toBe('Un amigo');
  });
});
