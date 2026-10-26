import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getCompanionGreeting } from '../ai/companionBrain';
import { useHabitStore } from '../store/useHabitStore';
import { usePetStore } from '../store/usePetStore';
import { useP2PStore } from '../store/useP2PStore';

interface Props {
  onOpenChat: () => void;
}

export default function CompanionDialogBubble({ onOpenChat }: Props) {
  const petName = usePetStore((s) => s.name);
  const currentStreak = useHabitStore((s) => s.currentStreak);
  const habits = useHabitStore((s) => s.habits);
  const peers = useP2PStore((s) => s.peers);
  const remotePets = useP2PStore((s) => s.remotePets);

  const habitsCompleted = habits.filter((h) => h.completed).length;
  const friendOnline = peers.length > 0;
  const firstRemotePet = Object.values(remotePets)[0];

  const greeting = useMemo(() => {
    return getCompanionGreeting({
      petName,
      currentStreak,
      habitsTotal: habits.length,
      habitsCompleted,
      friendOnline,
      friendName: firstRemotePet?.name,
    });
  }, [petName, currentStreak, habits.length, habitsCompleted, friendOnline, firstRemotePet?.name]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mx-auto mt-2 w-full max-w-sm rounded-xl border-2 border-[#2b2138] bg-[#fffaf0] p-3 text-xs shadow-md"
    >
      {/* Triangulo tipo globo de dialogo */}
      <div className="absolute -top-2 left-8 h-0 w-0 border-x-8 border-x-transparent border-b-8 border-b-[#2b2138]" />
      <div className="absolute -top-1.5 left-8 h-0 w-0 border-x-8 border-x-transparent border-b-8 border-b-[#fffaf0]" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider text-[#8a5b9b]">
            <span>{petName} dice:</span>
          </div>
          <p className="mt-1 font-mono text-[11px] leading-relaxed text-[#2b2138]">
            {greeting}
          </p>
        </div>

        <button
          onClick={onOpenChat}
          className="self-center whitespace-nowrap rounded-lg border-2 border-[#2b2138] bg-[#ffd6e0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#2b2138] transition hover:bg-[#ffb3c6] active:translate-y-px"
        >
          Hablar
        </button>
      </div>
    </motion.div>
  );
}
