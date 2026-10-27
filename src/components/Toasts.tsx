import { useEffect } from 'react';
import { usePetStore, type Toast } from '../store/usePetStore';

const TONE: Record<Toast['tone'], string> = {
  good: 'border-leaf-dark bg-leaf-soft',
  warn: 'border-[#c0392b] bg-[#ffe6e2]',
  info: 'border-ink bg-paper',
};

function Item({ t }: { t: Toast }) {
  const dismiss = usePetStore((s) => s.dismissToast);
  useEffect(() => {
    const id = window.setTimeout(() => dismiss(t.id), t.tone === 'warn' ? 6000 : 3500);
    return () => window.clearTimeout(id);
  }, [t.id, t.tone, dismiss]);
  return (
    <div role="status" className={`pointer-events-auto flex w-full items-start gap-2 rounded-2xl border-2 px-3 py-2 shadow-[0_3px_0_#2b2138] ${TONE[t.tone]}`}>
      <div className="min-w-0 flex-1 text-ink">
        <div className="text-[13px] font-extrabold leading-snug">{t.title}</div>
        <div className="text-[12px] leading-snug">{t.body}</div>
      </div>
      <button
        type="button"
        onClick={() => dismiss(t.id)}
        aria-label="Cerrar aviso"
        className="-mr-1 h-8 w-8 shrink-0 rounded-full text-sm font-black text-ink/70"
      >
        x
      </button>
    </div>
  );
}

/** Avisos cortos arriba de la pantalla. */
export default function Toasts() {
  const toasts = usePetStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+12px)] z-[70] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <Item key={t.id} t={t} />
      ))}
    </div>
  );
}
