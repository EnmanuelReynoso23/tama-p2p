import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
});
// jsdom no dibuja en canvas: se avisa "sin contexto" y la app debe seguir.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(url: string) {
  window.history.replaceState(null, '', url);
  vi.resetModules();
  const { default: App } = await import('./App');
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<App />));
  return { el, root };
}

describe('App', () => {
  it('abre en el telefono con la mascota y sus botones', async () => {
    mem.clear();
    const { el, root } = await mount('/');
    expect(el.textContent).toContain('Brote');
    expect(el.textContent).toContain('Ajustes');
    const { usePetStore } = await import('./store/usePetStore');
    await act(async () => usePetStore.getState().devSkipStage());
    expect(el.textContent).toContain('Comer');
    expect(el.textContent).toContain('Bañar');
    await act(async () => root.unmount());
  });

  it('abre en modo maquinita', async () => {
    mem.clear();
    const { el, root } = await mount('/?modo=maquina');
    expect(el.querySelector('.machine')).not.toBeNull();
    await act(async () => root.unmount());
  });
});
