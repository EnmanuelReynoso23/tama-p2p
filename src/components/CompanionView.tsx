import { motion } from 'framer-motion';
import PetCanvas from './PetCanvas';
import CompanionDialogBubble from './CompanionDialogBubble';
import { usePetStore } from '../store/usePetStore';
import { useHabitStore } from '../store/useHabitStore';

interface Props {
  onOpenChat: () => void;
}

export default function CompanionView({ onOpenChat }: Props) {
  const name = usePetStore((s) => s.name);
  const stage = usePetStore((s) => s.stage);
  const petStrokeNow = usePetStore((s) => s.petStrokeNow);
  const currentStreak = useHabitStore((s) => s.currentStreak);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative mx-auto w-full max-w-sm rounded-[32px] border-4 border-[#2b2138] bg-[#fbf5ea] p-4 shadow-xl"
    >
      {/* Barra superior de la tarjeta */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 border border-[#2b2138]" />
          <span className="font-pixel text-[11px] font-bold text-[#2b2138] tracking-wider uppercase">
            {name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-[#2b2138] bg-[#ffd6e0] px-2 py-0.5 font-pixel text-[9px] font-bold text-[#2b2138] uppercase">
            Racha: {currentStreak} d
          </span>
          <span className="rounded-full border border-[#2b2138] bg-[#d8f3dc] px-2 py-0.5 font-pixel text-[9px] font-bold text-[#2b2138] uppercase">
            {stage === 'egg' ? 'Bebe' : stage}
          </span>
        </div>
      </div>

      {/* Pantalla del animalito */}
      <div
        onClick={() => petStrokeNow()}
        className="relative overflow-hidden rounded-2xl border-2 border-[#2b2138] bg-[#eef0eb] shadow-inner cursor-pointer"
        title="Toca para acariciar a tu mascota"
      >
        <PetCanvas />
      </div>

      {/* Burbuja de dialogo y asistente IA */}
      <CompanionDialogBubble onOpenChat={onOpenChat} />
    </motion.div>
  );
}
