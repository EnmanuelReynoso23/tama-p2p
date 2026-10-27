import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

/**
 * "Instala Animo" card. Android/Chrome: one-tap native prompt.
 * iPhone/iPad (Safari has no prompt): short visual steps.
 */
export default function InstallBanner() {
  const { kind, install, dismiss } = useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);
  if (kind === 'none') return null;

  return (
    <aside
      aria-label="Instalar la app"
      className="rounded-3xl border-[3px] border-ink bg-[#e9e4ff] p-3 shadow-[0_4px_0_#2b2138]"
    >
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl border-2 border-ink" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-ink">Instala Animo</p>
          <p className="text-xs text-ink/80">Ábrela como app desde tu pantalla de inicio.</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="No mostrar más"
          className="grid h-11 w-11 place-items-center rounded-full text-ink/70"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {kind === 'native' ? (
        <button
          type="button"
          onClick={() => void install()}
          className="mt-3 w-full min-h-[48px] rounded-2xl border-2 border-ink bg-ink text-base font-extrabold text-white active:translate-y-px"
        >
          Instalar
        </button>
      ) : (
        <>
          <button
            type="button"
            aria-expanded={iosOpen}
            onClick={() => setIosOpen((v) => !v)}
            className="mt-3 w-full min-h-[48px] rounded-2xl border-2 border-ink bg-white text-base font-extrabold text-ink"
          >
            ¿Cómo la instalo en iPhone?
          </button>
          {iosOpen && (
            <ol className="mt-3 list-decimal space-y-1.5 pl-6 text-sm text-ink">
              <li>
                Toca <strong>Compartir</strong>{' '}
                <svg aria-hidden viewBox="0 0 12 14" className="inline-block h-4 w-4 align-[-2px]" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 1v8M3 4l3-3 3 3M2 7v6h8V7" />
                </svg>{' '}
                abajo en Safari.
              </li>
              <li>
                Elige <strong>Añadir a pantalla de inicio</strong>.
              </li>
              <li>
                Pulsa <strong>Añadir</strong>. ¡Listo!
              </li>
            </ol>
          )}
        </>
      )}
    </aside>
  );
}
