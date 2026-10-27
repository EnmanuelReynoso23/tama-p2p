import { useEffect, useState } from 'react';
import { usePetStore } from '../store/usePetStore';
import { useHabitStore } from '../store/useHabitStore';
import { TIME_SPEEDS } from '../game/constants';
import { createHandoffPackage, verifyAndParseHandoff } from '../network/handoff';
import QrCode from './QrCode';

interface Props {
  open: boolean;
  onClose: () => void;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[13px] font-extrabold text-ink">{label}</h3>
      {children}
    </section>
  );
}

const btn = 'min-h-[44px] rounded-xl border-2 border-ink px-3 text-[12px] font-extrabold text-ink active:translate-y-px';

/** Ajustes: reloj de prueba, noche, pasar la partida a otro equipo y reiniciar. */
export default function SettingsPanel({ open, onClose }: Props) {
  const timeSpeed = usePetStore((s) => s.settings.timeSpeed);
  const forceNight = usePetStore((s) => s.settings.forceNight);
  const petName = usePetStore((s) => s.name);
  const [handoffPayload, setHandoffPayload] = useState<string | null>(null);
  const [importDraft, setImportDraft] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmReset(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const pet = usePetStore.getState;

  const handleExport = async () => {
    const habits = useHabitStore.getState();
    const pkg = await createHandoffPackage(pet(), {
      habits: habits.habits,
      completedDays: habits.completedDays,
      frozenDays: habits.frozenDays,
      freezesAvailable: habits.freezesAvailable,
    });
    setHandoffPayload(pkg);
  };

  const handleImport = async () => {
    if (!importDraft.trim()) return;
    setImportStatus('Verificando la firma...');
    const res = await verifyAndParseHandoff(importDraft.trim());
    if (!res.ok) {
      setImportStatus(`Error: ${res.error}`);
      return;
    }
    const d = res.data;
    pet().importHandoff(d.pet as Parameters<ReturnType<typeof pet>['importHandoff']>[0]);
    useHabitStore.getState().importHandoff(d.habits);
    setImportStatus(`Partida de ${d.pet.name} importada.`);
    setImportDraft('');
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ajustes"
        className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-[3px] border-ink bg-cream p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] sm:rounded-3xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-pixel text-[13px] text-ink">Ajustes</h2>
          <button type="button" onClick={onClose} className={`${btn} bg-paper`}>
            Cerrar
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <Section label="Pasar la partida a otro equipo">
            <p className="text-[12px] leading-snug text-ink">
              Lleva tu mascota y tus hábitos a otro teléfono, a la computadora o a la maquinita. El código va firmado
              para que nadie lo cambie en el camino.
            </p>
            <button type="button" onClick={handleExport} className={`${btn} bg-white`}>
              Crear código QR
            </button>
            {handoffPayload && (
              <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-ink/20 bg-white p-3">
                <QrCode value={handoffPayload} size={180} label="Código QR con tu partida de Animo" />
                <p className="text-center text-[11px] text-ink/80">Escanéalo con el otro equipo o copia el código.</p>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(handoffPayload).then(
                      () => setImportStatus('Código copiado.'),
                      () => setImportStatus('No se pudo copiar; mantén pulsado el código para copiarlo.'),
                    );
                  }}
                  className={`${btn} bg-cream`}
                >
                  Copiar código
                </button>
              </div>
            )}
            <label className="text-[12px] font-bold text-ink" htmlFor="import-code">
              Traer una partida
            </label>
            <textarea
              id="import-code"
              value={importDraft}
              onChange={(e) => setImportDraft(e.target.value)}
              placeholder="Pega aquí el código animo://handoff#..."
              rows={2}
              className="w-full resize-none rounded-lg border-2 border-ink/40 bg-white p-2 font-mono text-[11px]"
            />
            <button type="button" onClick={handleImport} className={`${btn} bg-ink text-white`}>
              Verificar e importar
            </button>
            {importStatus && <p className="text-center text-[12px] font-bold text-ink">{importStatus}</p>}
          </Section>

          <Section label="Pantalla">
            <button
              type="button"
              aria-pressed={forceNight}
              onClick={() => pet().setForceNight(!forceNight)}
              className={`${btn} ${forceNight ? 'bg-[#e5e0f5]' : 'bg-white'}`}
            >
              {forceNight ? 'Noche siempre: sí' : 'Noche siempre: no'}
            </button>
          </Section>

          <Section label="Velocidad del reloj (para probar)">
            <div className="grid grid-cols-4 gap-2">
              {TIME_SPEEDS.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={timeSpeed === v}
                  onClick={() => pet().setTimeSpeed(v)}
                  className={`${btn} ${timeSpeed === v ? 'bg-leaf-soft' : 'bg-white'}`}
                >
                  x{v}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => pet().devSkipStage()} className={`${btn} bg-white`}>
                Crecer
              </button>
              <button type="button" onClick={() => pet().devSetAllStats(100)} className={`${btn} bg-white`}>
                Todo lleno
              </button>
              <button type="button" onClick={() => pet().devSetAllStats(15)} className={`${btn} bg-white`}>
                Todo bajo
              </button>
            </div>
          </Section>

          <Section label="Empezar de nuevo">
            {confirmReset ? (
              <div className="flex flex-col gap-2 rounded-xl border-2 border-[#c0392b] bg-[#ffe6e2] p-3">
                <p className="text-[12px] font-bold text-ink">
                  Se borra {petName} y vuelve a salir un huevo. Tus hábitos y rachas se quedan. ¿Seguro?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setConfirmReset(false)} className={`${btn} bg-white`}>
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      pet().resetPet();
                      setConfirmReset(false);
                      onClose();
                    }}
                    className={`${btn} bg-[#c0392b] text-white`}
                  >
                    Sí, borrar
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmReset(true)} className={`${btn} bg-white`}>
                Nueva mascota
              </button>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
