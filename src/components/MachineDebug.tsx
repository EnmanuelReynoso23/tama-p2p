import { motion, AnimatePresence } from 'framer-motion';
import { usePetActorCtx, usePetCurrentAnim, usePetStatePath } from '../store/usePetActor';
import { usePetStore } from '../store/usePetStore';

/**
 * Live state-machine debug overlay.
 *
 * Renders:
 *   - XState state path (e.g. "pet · alive · idle")
 *   - currentAnim chosen for the canvas renderer
 *   - Live-ish stat numbers (pulled every frame from zustand via actor.subscribe)
 *   - 5 shortcut event buttons (FEED/PLAY/CLEAN/SLEEP/MEDICINE) so clicking them
 *     sends the raw XState event directly — great for showing transitions.
 *
 * Toggled by `settings.showMachineDebug` (gear menu in Phase 5).
 */
export default function MachineDebug() {
  const show = usePetStore((s) => s.settings.showMachineDebug);
  const { send } = usePetActorCtx();
  const statePath = usePetStatePath();
  const currentAnim = usePetCurrentAnim();
  const stats = usePetStore((s) => s.stats);
  const isSick = usePetStore((s) => s.isSick);
  const isAsleep = usePetStore((s) => s.isAsleep);
  const hatched = usePetStore((s) => s.hatched);
  const stage = usePetStore((s) => s.stage);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="mdbg"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="absolute -right-1 -top-1 z-30 w-[min(95vw,320px)] rounded-xl border border-[#2b2138]/20 bg-[#fffaf5]/95 p-3 text-left shadow-lg backdrop-blur-sm [font-family:'Press_Start_2P',VT323,monospace]"
          style={{ fontSize: 10, letterSpacing: 0.2 }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[#2b2138]">XState Debug</span>
            <span className="rounded-full bg-[#2b2138] px-2 py-0.5 text-[8px] text-[#fff7e8]">
              live
            </span>
          </div>
          <div className="mb-1">
            <div className="opacity-60">state path</div>
            <div className="break-all rounded-md bg-[#f4e8d0] px-2 py-1 text-[#6b4a80]">
              pet · {statePath}
            </div>
          </div>
          <div className="mb-2">
            <div className="opacity-60">canvas anim</div>
            <div className="rounded-md bg-[#dff0df] px-2 py-1 text-[#3b6b43]">
              {currentAnim}
            </div>
          </div>
          <div className="mb-2 grid grid-cols-3 gap-1 text-[9px]">
            <Tag label="stage" v={stage} />
            <Tag label="hatched" v={hatched ? 'y' : 'n'} />
            <Tag label="sick" v={isSick ? 'y' : 'n'} />
            <Tag label="sleep" v={isAsleep ? 'y' : 'n'} />
          </div>
          <div className="mb-2 grid grid-cols-5 gap-1 text-[9px]">
            <Mini label="HUN" v={stats.hunger} />
            <Mini label="HAP" v={stats.happiness} />
            <Mini label="ENR" v={stats.energy} />
            <Mini label="HYG" v={stats.hygiene} />
            <Mini label="HLT" v={stats.health} />
          </div>
          <div className="grid grid-cols-5 gap-1 text-[9px]">
            <DbBtn label="feed" onClick={() => send({ type: 'FEED', kind: 'meal' })} />
            <DbBtn label="play" onClick={() => send({ type: 'PLAY' })} />
            <DbBtn label="clean" onClick={() => send({ type: 'CLEAN' })} />
            <DbBtn label="sleep" onClick={() => send({ type: 'SLEEP_CLICK' })} />
            <DbBtn label="med" onClick={() => send({ type: 'MEDICINE' })} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Tag({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-sm border border-[#2b2138]/10 bg-[#fff7e8] px-1 py-0.5 text-center">
      <div className="opacity-60">{label}</div>
      <div className="font-bold text-[#2b2138]">{v}</div>
    </div>
  );
}
function Mini({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-sm border border-[#2b2138]/10 bg-[#fff7e8] px-1 py-0.5 text-center">
      <div className="opacity-60">{label}</div>
      <div className="font-bold text-[#2b2138]">{Math.round(v)}</div>
    </div>
  );
}
function DbBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-sm border border-[#2b2138]/20 bg-[#ffdfe9] px-1 py-1 text-[9px] text-[#80344a] transition hover:bg-[#f7a8c4] active:translate-y-px"
      type="button"
    >
      {label}
    </button>
  );
}
