import { describe, it, expect } from 'vitest';
import { createHandoffPackage, verifyAndParseHandoff, HANDOFF_PREFIX } from './handoff';
import type { PetPersisted } from '../store/usePetStore';
import { createPet } from '../../core/animo.js';

const dummyPet: PetPersisted = {
  ...createPet('Mochi', 1700000000000),
  lastUpdated: 1700000005000,
  stage: 'child',
  hatched: true,
  stats: {
    hunger: 80,
    happiness: 90,
    energy: 70,
    hygiene: 85,
    health: 100,
  },
  settings: { soundOn: false, timeSpeed: 1, forceNight: false },
};

const dummyHabits = {
  habits: [
    { id: 'h1', title: 'Agua', category: 'health' as const, completed: true },
  ],
  completedDays: ['2026-10-25', '2026-10-26'],
  frozenDays: [],
  freezesAvailable: 1,
};

describe('Pet Handoff & Transfer Cryptography', () => {
  it('creates and verifies a valid signed handoff package', async () => {
    const pkg = await createHandoffPackage(dummyPet, dummyHabits);
    expect(pkg.startsWith(HANDOFF_PREFIX)).toBe(true);

    const result = await verifyAndParseHandoff(pkg);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.pet.name).toBe('Mochi');
      expect(result.data.pet.stage).toBe('child');
      expect(result.data.habits.completedDays).toEqual(['2026-10-25', '2026-10-26']);
      expect(result.data.pubKey).toBeDefined();
      expect(result.data.sig).toBeDefined();
    }
  });

  it('rejects a forged or tampered handoff package', async () => {
    const pkg = await createHandoffPackage(dummyPet, dummyHabits);
    const raw = pkg.slice(HANDOFF_PREFIX.length);
    const jsonStr = decodeURIComponent(escape(atob(raw)));
    const parsed = JSON.parse(jsonStr);

    // Tamper with pet stats
    parsed.pet.stats.health = 10;
    const tamperedBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(parsed))));
    const tamperedPkg = `${HANDOFF_PREFIX}${tamperedBase64}`;

    const result = await verifyAndParseHandoff(tamperedPkg);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Firma digital invalida');
    }
  });

  it('rejects malformed base64 or invalid json', async () => {
    const result = await verifyAndParseHandoff('animo://handoff#invalid-base-64');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('invalido');
    }
  });
});
