import { motion } from 'framer-motion';
import PetCanvas from './PetCanvas';
import ActionButtons from './ActionButtons';
import VitalsRow from './VitalsRow';
import CompanionDialogBubble from './CompanionDialogBubble';
import { usePetStore } from '../store/usePetStore';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { STAGE_LABEL } from '../game/labels';

interface Props {
  onOpenChat: () => void;
}

/** "Mascota" tab: the LCD screen, the four care buttons, vitals and the chat bubble. */
export default function CompanionView({ onOpenChat }: Props) {
  const name = usePetStore((s) => s.name);
  const stage = usePetStore((s) => s.stage);
  const hatched = usePetStore((s) => s.hatched);
  const petStrokeNow = usePetStore((s) => s.petStrokeNow);
  const reduced = usePrefersReducedMotion();

  return (
    <motion.section
      aria-label={`Tu mascota ${name}`}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-[32px] border-[3px] border-ink bg-[#f4b8c0] p-3 pb-4 shadow-[0_6px_0_#2b2138]"
    >
      <div className="mb-2 flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-rose-400 shadow-inner" />
          <span className="h-2 w-2 rounded-full bg-amber-400 shadow-inner" />
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-inner" />
        </div>
        <span className="rounded-full border-2 border-ink bg-mint px-2.5 py-0.5 text-xs font-extrabold text-ink">
          {STAGE_LABEL[hatched ? stage : 'egg']}
        </span>
      </div>

      {/* The whole screen is a button: tap (or Enter/Space) to pet. */}
      <button
        type="button"
        onClick={() => petStrokeNow()}
        aria-label={`Acariciar a ${name}`}
        className="relative block w-full overflow-hidden rounded-2xl border-[3px] border-ink bg-[#eef0eb] shadow-inner"
      >
        <PetCanvas />
      </button>
      <p className="mt-1.5 text-center text-xs font-semibold text-rose-950/80">Toca la pantalla para acariciar</p>

      <ActionButtons />

      <div className="mt-4 rounded-2xl border-2 border-ink bg-paper px-3 py-2.5">
        <VitalsRow />
      </div>

      <CompanionDialogBubble onOpenChat={onOpenChat} />
    </motion.section>
  );
}
