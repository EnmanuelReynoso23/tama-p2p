import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePetStore } from '../store/usePetStore';
import { usePetActorCtx } from '../store/usePetActor';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { TIME_SPEEDS, type TimeSpeed } from '../game/constants';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Settings + dev panel. Opens as a modal on small screens and a sheet on big.
 * Accessible: focus trap (loose), ESC to close, click outside closes.
 *
 * Controls:
 *  - Time speed: 1× / 10× / 60× / 600×
 *  - Dev: Skip to next stage · Set all stats to 20 · Make sick · Toggle night (day/night Phase 6)
 *  - Toggle: machine debug view
 *  - Reset pet with confirm dialog (3-second countdown hold)
 */
export default function SettingsPanel({ open, onClose }: Props) {
  const timeSpeed = usePetStore((s) => s.settings.timeSpeed);
  const setTimeSpeed = usePetStore((s) => s.setTimeSpeed);
  const showDebug = usePetStore((s) => s.settings.showMachineDebug);
  const setShowDebug = usePetStore((s) => s.setShowMachineDebug);
  const forceNight = usePetStore((s) => s.settings.forceNight);
  const setForceNight = usePetStore((s) => s.setForceNight);
  const devSetAllStats = usePetStore((s) => s.devSetAllStats);
  const devSetSick = usePetStore((s) => s.devSetSick);
  const devAdvanceBirth = usePetStore((s) => s.devAdvanceBirth);
  const resetPet = usePetStore((s) => s.resetPet);
  const isSick = usePetStore((s) => s.isSick);
  const stage = usePetStore((s) => s.stage);
  const petName = usePetStore((s) => s.name);
  const reduced = usePrefersReducedMotion();

  const { send } = usePetActorCtx();

  const [confirmMs, setConfirmMs] = useState(0);
  const [confirmHolding, setConfirmHolding] = useState(false);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Confirm-hold loop (reset pet)
  useEffect(() => {
    if (!confirmHolding) {
      setConfirmMs(0);
      return;
    }
    const id = window.setInterval(() => {
      setConfirmMs((m) => {
        const next = m + 100;
        if (next >= 3000) {
          resetPet();
          setConfirmHolding(false);
          onClose();
          return 0;
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [confirmHolding, resetPet, onClose]);

  const evolveStage = () => {
    // Shortcut: dev advance birth by ~7 days then send EVOLVE event (fallback)
    if (stage === 'egg') {
      devAdvanceBirth(999999999); // triggers hatch via age
    } else {
      devAdvanceBirth(8 * 24 * 60 * 60 * 1000); // skip 8 days → max stage
    }
    send({ type: 'EVOLVE' });
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <div aria-hidden className="absolute inset-0 bg-[#2b2138]/40 backdrop-blur-sm" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Settings and developer tools"
            initial={reduced ? false : { opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.97 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl bg-[#fffaf2] border border-[#2b2138]/10 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.4)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b2138]/10">
              <div className="font-pixel text-[11px] text-[#2b2138]">⚙ SETTINGS</div>
              <button
                onClick={onClose}
                type="button"
                aria-label="Close settings"
                className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-[#ffe8d0] transition"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#2b2138]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Time speed */}
              <Section label="Time speed">
                <div className="grid grid-cols-4 gap-2">
                  {(TIME_SPEEDS as readonly TimeSpeed[]).map((ts) => (
                    <button
                      key={ts}
                      onClick={() => setTimeSpeed(ts)}
                      type="button"
                      className={`py-2 rounded-xl border font-pixel text-[10px] transition active:translate-y-px ${
                        timeSpeed === ts
                          ? 'bg-[#f7a8c4] border-[#d97894] text-[#80344a] shadow-[0_2px_0_rgba(0,0,0,0.05)]'
                          : 'bg-white/70 border-[#2b2138]/10 text-[#2b2138] hover:bg-[#ffe8d0]'
                      }`}
                    >
                      {ts}×
                    </button>
                  ))}
                </div>
              </Section>

              {/* Toggles */}
              <Section label="Toggles">
                <Toggle
                  label="Show XState debug"
                  hint="Live state-machine view on the screen"
                  checked={showDebug}
                  onChange={setShowDebug}
                />
                <Toggle
                  label="Force night mode"
                  hint="Show stars, moon and dim room lighting"
                  checked={forceNight}
                  onChange={setForceNight}
                />
              </Section>

              {/* Dev actions */}
              <Section label="Dev actions">
                <div className="grid grid-cols-2 gap-2">
                  <DevBtn onClick={evolveStage} tone="good">
                    ⚡ Skip next stage
                  </DevBtn>
                  <DevBtn onClick={() => devSetAllStats(20)} tone="warn">
                    Set stats = 20
                  </DevBtn>
                  <DevBtn
                    onClick={() => devSetSick(!isSick)}
                    tone={isSick ? 'warn' : 'info'}
                  >
                    {isSick ? 'Cure' : 'Make sick'}
                  </DevBtn>
                  <DevBtn
                    onClick={() => devSetAllStats(100)}
                    tone="good"
                  >
                    Max stats
                  </DevBtn>
                </div>
              </Section>

              {/* Reset pet (hold to confirm) */}
              <Section label="Reset pet">
                <div className="relative rounded-2xl border border-[#e06a7c]/40 bg-[#fff0f2] p-3">
                  <p className="font-sans text-[11px] text-[#80344a] leading-snug mb-2">
                    Hold the button below for <b>3 seconds</b> to erase <b>{petName}</b> and
                    start over with a new egg. This cannot be undone.
                  </p>
                  <button
                    onPointerDown={() => setConfirmHolding(true)}
                    onPointerUp={() => setConfirmHolding(false)}
                    onPointerLeave={() => setConfirmHolding(false)}
                    onPointerCancel={() => setConfirmHolding(false)}
                    className="relative w-full h-10 rounded-xl border border-[#e06a7c]/60 bg-white/70 font-pixel text-[10px] text-[#80344a] overflow-hidden transition active:translate-y-px"
                    type="button"
                  >
                    <div
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-[#f7a8c4]/50 transition-[width]"
                      style={{ width: `${(confirmMs / 3000) * 100}%` }}
                    />
                    <span className="relative">
                      {confirmHolding
                        ? `Hold… ${(3 - confirmMs / 1000).toFixed(1)}s`
                        : 'HOLD TO RESET'}
                    </span>
                  </button>
                </div>
              </Section>

              {/* Footer note */}
              <p className="font-pixel text-[8px] text-[#6b4a80]/80 leading-relaxed">
                Pixel Pet · portfolio build · keyboard: F feed · P play · C clean · S sleep · D debug
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-pixel text-[9px] tracking-widest text-[#6b4a80]/80 mb-2 uppercase">
        {label}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start justify-between gap-3 rounded-xl border border-[#2b2138]/10 bg-white/60 p-2.5 transition ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#fffaf2]'
      }`}
    >
      <div className="min-w-0">
        <div className="font-pixel text-[10px] text-[#2b2138] leading-snug">{label}</div>
        {hint ? <div className="font-sans text-[10px] text-[#6b4a80] leading-snug mt-0.5">{hint}</div> : null}
      </div>
      <div
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${
          checked ? 'bg-[#6fb86a]' : 'bg-[#2b2138]/20'
        }`}
      >
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </div>
    </label>
  );
}

function DevBtn({
  onClick,
  tone,
  children,
}: {
  onClick: () => void;
  tone: 'info' | 'warn' | 'good';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'warn'
      ? 'bg-[#ffe9c7] border-[#e8b156]/60 text-[#7a4d12] hover:bg-[#ffdcb0]'
      : tone === 'good'
      ? 'bg-[#dff0df] border-[#6fb86a]/60 text-[#2b5c34] hover:bg-[#cfe7cf]'
      : 'bg-[#fff0f5] border-[#f7a8c4]/60 text-[#80344a] hover:bg-[#ffe0ec]';
  return (
    <button
      onClick={onClick}
      type="button"
      className={`rounded-xl border px-2 py-2 font-pixel text-[9px] leading-tight transition active:translate-y-px ${cls}`}
    >
      {children}
    </button>
  );
}
