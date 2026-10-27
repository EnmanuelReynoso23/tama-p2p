import { beforeEach, describe, expect, it, vi } from 'vitest';

const H = 3_600_000;

// Node trae su propio localStorage vacio que tapa el de jsdom: se usa uno en memoria.
const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
});

async function freshStore() {
  vi.resetModules();
  const mod = await import('./usePetStore');
  await mod.usePetStore.persist.rehydrate();
  return mod.usePetStore;
}

describe('usePetStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('empieza con un huevo que nace con el reloj', async () => {
    const store = await freshStore();
    expect(store.getState().hatched).toBe(false);
    store.getState().tick(Date.now() + 3 * 60_000);
    expect(store.getState().hatched).toBe(true);
    expect(store.getState().toasts.some((t) => t.title === 'Nació')).toBe(true);
    expect(store.getState().lastEvent?.kind).toBe('hatch');
  });

  it('trae la partida guardada por la version anterior', async () => {
    const now = Date.now();
    localStorage.setItem(
      'animo-v1',
      JSON.stringify({
        state: {
          name: 'Mochi',
          birthTs: now - 3 * 24 * H,
          lastUpdated: now,
          stage: 'teen',
          hatched: true,
          adultVariant: null,
          stats: { hunger: 40, happiness: 50, energy: 60, hygiene: 70, health: 90 },
          settings: { soundOn: false, timeSpeed: 60 },
          careSamples: [],
        },
        version: 2,
      }),
    );
    const s = (await freshStore()).getState();
    expect(s.name).toBe('Mochi');
    expect(s.stage).toBe('teen');
    expect(s.stats.hunger).toBe(40);
    expect(s.settings.soundOn).toBe(false);
    expect(s.settings.timeSpeed).toBe(60);
  });

  it('las acciones avisan cuando la mascota no quiere', async () => {
    const store = await freshStore();
    store.getState().tick(Date.now() + 3 * 60_000);
    const r = store.getState().giveMedicineNow();
    expect(r).toEqual({ ok: false, reason: 'not_sick' });
    expect(store.getState().lastEvent?.kind).toBe('refuse');
    store.getState().devSetAllStats(10);
    expect(store.getState().feed('meal').ok).toBe(true);
    expect(store.getState().lastEvent?.kind).toBe('meal');
  });

  it('guarda solo los datos de la mascota y los ajustes', async () => {
    const store = await freshStore();
    store.getState().pushToast({ title: 'a', body: 'b', tone: 'info' });
    const saved = JSON.parse(localStorage.getItem('animo-v2') ?? '{}');
    expect(saved.state.toasts).toBeUndefined();
    expect(saved.state.lastEvent).toBeUndefined();
    expect(saved.state.settings).toBeDefined();
    expect(saved.state.stats).toBeDefined();
  });

  it('importar una partida no cobra el tiempo del viaje', async () => {
    const store = await freshStore();
    store.getState().importHandoff({
      name: 'Kiwi',
      stage: 'child',
      hatched: true,
      birthTs: Date.now() - 24 * H,
      stats: { hunger: 70, happiness: 70, energy: 70, hygiene: 70, health: 70 },
    });
    const s = store.getState();
    expect(s.name).toBe('Kiwi');
    expect(s.stage).toBe('child');
    store.getState().tick(Date.now());
    expect(store.getState().stats.hunger).toBeCloseTo(70, 0);
  });
});
