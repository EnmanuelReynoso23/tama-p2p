import { motion } from 'framer-motion';
import { useHabitStore } from '../store/useHabitStore';
import { friendDisplayName, useOnlineFriendIds, useP2PStore } from '../store/useP2PStore';
import { friendStreak, getNextMilestone, streakStatus } from '../game/streak';
import { useToday } from '../hooks/useToday';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { vibrate, HAPTIC_PATTERNS } from '../utils/haptics';
import FlameIcon from './FlameIcon';
import MiniPet from './MiniPet';

interface Props {
  onOpenFriends: () => void;
}

const STATUS_COPY = {
  done: 'Racha asegurada hoy. Tu mascota está radiante.',
  frozen: 'Día protegido con comodín. Tu racha se mantiene a salvo.',
  'at-risk': 'Completa tus hábitos antes de medianoche para no perderla.',
  none: 'Completa todos tus hábitos de hoy para encender la racha.',
} as const;

/**
 * Top-of-screen streak card: your flame + count, streak freeze badges,
 * milestone progress, and a row of friend avatars with shared streaks.
 */
export default function StreakHero({ onOpenFriends }: Props) {
  const today = useToday();
  const days = useHabitStore((s) => s.completedDays);
  const frozenDays = useHabitStore((s) => s.frozenDays);
  const freezes = useHabitStore((s) => s.freezesAvailable);
  const useFreeze = useHabitStore((s) => s.useFreezeForToday);
  const current = useHabitStore((s) => s.currentStreak);
  const best = useHabitStore((s) => s.bestStreak);
  const friends = useP2PStore((s) => s.friends);
  const online = useOnlineFriendIds();
  const reduced = usePrefersReducedMotion();

  const status = streakStatus(days, today, frozenDays);
  const nextMilestone = getNextMilestone(current);

  const handleUseFreeze = () => {
    const success = useFreeze();
    if (success) vibrate(HAPTIC_PATTERNS.freezeUsed);
  };

  const friendList = Object.values(friends)
    .filter((f) => f.device !== 'machine')
    .map((f) => ({
      f,
      s: friendStreak(days, f.pet.completedDays, today, frozenDays, f.pet.frozenDays ?? []),
    }))
    .sort((a, b) => b.s.count - a.s.count)
    .slice(0, 4);

  return (
    <section
      aria-labelledby="streak-title"
      className="rounded-3xl border-[3px] border-ink bg-gradient-to-br from-[#fff3e2] via-paper to-[#ffe9f0] p-4 shadow-[0_6px_0_#2b2138]"
    >
      <div className="flex items-center gap-3">
        <motion.div
          className="shrink-0 grid place-items-center h-16 w-16 rounded-2xl bg-white border-2 border-ink"
          animate={status === 'done' && !reduced ? { rotate: [0, -4, 4, 0] } : undefined}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2 }}
        >
          <FlameIcon status={status} className="w-11 h-11" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-1">
            <h2 id="streak-title" className="font-pixel text-[15px] leading-tight text-ink">
              {current} {current === 1 ? 'día' : 'días'}
              <span className="sr-only"> de racha</span>
            </h2>
            <div className="flex items-center gap-1.5" title={`${freezes} comodines de protección disponibles`}>
              <span className="text-[11px] font-bold text-ink/70">Comodines:</span>
              <div className="flex gap-1">
                <span className={`w-3.5 h-3.5 rounded-full border border-ink text-[9px] font-black grid place-items-center ${freezes >= 1 ? 'bg-[#7fd1ae] text-white' : 'bg-gray-200 text-ink/30'}`}>
                  {freezes >= 1 ? 'P' : '-'}
                </span>
                <span className={`w-3.5 h-3.5 rounded-full border border-ink text-[9px] font-black grid place-items-center ${freezes >= 2 ? 'bg-[#7fd1ae] text-white' : 'bg-gray-200 text-ink/30'}`}>
                  {freezes >= 2 ? 'P' : '-'}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-1 text-[13px] leading-snug font-semibold text-lilac">{STATUS_COPY[status]}</p>
          
          <div className="mt-1 flex flex-wrap items-center justify-between text-xs text-ink/70 gap-1">
            <span>Récord: {best} {best === 1 ? 'día' : 'días'}</span>
            {nextMilestone && (
              <span className="text-[11px] font-extrabold text-[#7c5295]">
                Meta: {nextMilestone.days}d ({nextMilestone.name})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Freeze Action button if at-risk and user has freeze tokens */}
      {status === 'at-risk' && freezes > 0 && (
        <div className="mt-3 pt-2 border-t border-dashed border-ink/15">
          <button
            type="button"
            onClick={handleUseFreeze}
            className="w-full min-h-[38px] rounded-xl border border-ink bg-[#e6f7ef] px-3 py-1 text-xs font-bold text-[#1a5336] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <span>Usar 1 comodín para proteger el día de hoy ({freezes} disp.)</span>
          </button>
        </div>
      )}

      <div className="mt-3 border-t-2 border-dashed border-ink/15 pt-3">
        {friendList.length === 0 ? (
          <button
            type="button"
            onClick={onOpenFriends}
            className="w-full min-h-[44px] rounded-2xl border-2 border-ink bg-blush px-3 py-2 text-left text-sm font-bold text-ink active:translate-y-px"
          >
            Invita a un amigo y cuiden una racha juntos
          </button>
        ) : (
          <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Rachas con amigos">
            {friendList.map(({ f, s }) => {
              const isOnline = online.has(f.playerId);
              const name = friendDisplayName(f);
              return (
                <li key={f.playerId}>
                  <button
                    type="button"
                    onClick={onOpenFriends}
                    aria-label={`Racha con ${name}: ${s.count} días. ${
                      s.status === 'done'
                        ? 'Ambos completaron hoy.'
                        : s.friendDoneToday
                          ? 'Tu amigo ya completo, faltas tu.'
                          : s.meDoneToday
                            ? 'Falta tu amigo.'
                            : 'Ninguno ha completado hoy.'
                    } ${isOnline ? 'En línea.' : 'Desconectado.'}`}
                    className={`relative flex items-center gap-1.5 rounded-2xl border-2 bg-white pl-1 pr-2.5 py-1 min-h-[48px] ${
                      s.status === 'done' ? 'border-emerald-600' : 'border-ink border-dashed'
                    }`}
                  >
                    <span className="relative">
                      <MiniPet
                        stage={f.pet.stage}
                        variant={f.pet.adultVariant}
                        mood={f.pet.isAsleep ? 'sleeping' : 'idle'}
                        size={36}
                        flip
                        label=""
                      />
                      <span
                        aria-hidden
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                          isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      />
                    </span>
                    <FlameIcon status={s.status} className="w-5 h-5" />
                    <span className="font-pixel text-[11px] text-ink">{s.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
