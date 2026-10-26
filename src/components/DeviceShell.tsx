import { motion } from 'framer-motion';
import PetCanvas from './PetCanvas';
import MachineDebug from './MachineDebug';
import ActionButtons from './ActionButtons';

/**
 * The outer "handheld device" shell. Polished pastel plastic, rounded corners,
 * inner shadows, a small speaker grille, brand label, and four chunky buttons
 * (ActionButtons component — real functional with cooldowns in Phase 5).
 */
export default function DeviceShell() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative mx-auto w-full max-w-md rounded-[44px] bg-[#f4b8c0] p-5 sm:p-7 shadow-device"
      style={{
        boxShadow:
          '0 24px 60px -16px rgba(120, 60, 90, 0.35), inset 0 3px 0 rgba(255,255,255,0.45), inset 0 -8px 0 rgba(0,0,0,0.06)',
      }}
    >
      {/* Top stripe / brand area */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-400 shadow-inner" aria-hidden />
          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-inner" aria-hidden />
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-inner" aria-hidden />
        </div>
        <div className="font-pixel text-[10px] sm:text-xs text-rose-900/80 tracking-widest select-none">
          PIXEL · PET
        </div>
        <div className="speaker-dots w-16 h-4 opacity-70" aria-hidden />
      </div>

      {/* Screen */}
      <div className="relative rounded-3xl bg-[#d0a0a8] p-3 shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]">
        <div className="relative">
          <PetCanvas />
          {/* State-machine debug (toggle via settings panel / Ctrl+Alt+D) */}
          <div onClick={(e) => e.stopPropagation()} className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="pointer-events-auto">
              <MachineDebug />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom label */}
      <div className="mt-5 px-2 flex items-center justify-between text-rose-900/70">
        <div className="font-pixel text-[9px] sm:text-[10px] opacity-80">MODEL PP-01</div>
        <div className="flex items-center gap-1 opacity-70">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-700/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-rose-700/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-rose-700/40" />
        </div>
      </div>

      {/* Action buttons */}
      <ActionButtons />
    </motion.div>
  );
}
