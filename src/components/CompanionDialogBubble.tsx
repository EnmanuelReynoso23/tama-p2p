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
  const peerToPlayer = useP2PStore((s) => s.peerToPlayer);
  const friends = useP2PStore((s) => s.friends);

  const habitsCompleted = habits.filter((h) => h.completed).length;
  const friendOnline = peers.length > 0;
  const firstOnlineId = Object.values(peerToPlayer)[0];
  const firstRemotePet = firstOnlineId ? friends[firstOnlineId]?.pet : undefined;

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
      className="relative mt-4 w-full rounded-2xl border-2 border-ink bg-paper p-3"
    >
      {/* Triangulo tipo globo de dialogo */}
      <div className="absolute -top-2 left-8 h-0 w-0 border-x-8 border-x-transparent border-b-8 border-b-[#2b2138]" />
      <div className="absolute -top-1.5 left-8 h-0 w-0 border-x-8 border-x-transparent border-b-8 border-b-[#fffaf0]" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide text-lilac">
            <span>{petName} dice:</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink" aria-live="polite">
            {greeting}
          </p>
        </div>

        <button
          onClick={onOpenChat}
          type="button"
          className="self-center min-h-[44px] whitespace-nowrap rounded-xl border-2 border-ink bg-blush px-3 text-sm font-extrabold text-ink transition hover:bg-[#ffb3c6] active:translate-y-px"
        >
          Hablar
        </button>
      </div>
    </motion.div>
  );
}
