import { motion, AnimatePresence } from 'framer-motion';
import { usePetStore } from '../store/usePetStore';
import { STAT_MAX } from '../game/constants';
import type { Stats } from '../game/stats';

/**
 * Animated stats panel.
 *  - Desktop: visible as a side card on the right of DeviceShell.
 *  - Mobile: bottom sheet that peeks from bottom; tap bar to open fully.
 * 5 bars with pixel icons, color-coded:
 *   green (≥60), amber (30–60), red (<30, shakes).
 *
 * Spec compliance: bars shake slightly when critical; animated widths;
 * icons per stat; bar widths smoothly animate to new values.
 */
export default function StatsPanel() {
  const stats = usePetStore((s) => s.stats);
  const mobileOpen = usePetStore((s) => s.settings.showMachineDebug
    ? false
    : false); // unused; mobile sheet opens via header toggle (Phase 5c)

  return (
    <>
      {/* Desktop side panel: rendered as sibling to DeviceShell in App layout */}
      <aside aria-label="Pet stats" className="hidden lg:block lg:w-64 shrink-0 self-start top-8 sticky">
        <PanelBody stats={stats} compact={false} />
      </aside>

      {/* Mobile bottom sheet */}
      <AnimatePresence initial={false}>
        {!mobileOpen ? (
          <motion.div
            key="sheet-peek"
            role="region"
            aria-label="Pet vitals"
            className="lg:hidden fixed z-20 bottom-0 left-0 right-0 px-2"
            initial={{ y: 56 }}
            animate={{ y: 0 }}
            exit={{ y: 56 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          >
            <div className="mx-auto max-w-md rounded-t-2xl border border-[#2b2138]/10 bg-[#fffaf2]/95 backdrop-blur-md px-3 py-2 shadow-[0_-10px_24px_-8px_rgba(0,0,0,0.15)]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-pixel text-[10px] text-[#2b2138]">STATS</span>
                <span className="h-1.5 w-10 rounded-full bg-[#2b2138]/15" />
              </div>
              <div className="grid grid-cols-5 gap-2">
                <MiniStat name="HUN" value={stats.hunger} icon={<HungerIcon className="w-3 h-3" />} />
                <MiniStat name="HAP" value={stats.happiness} icon={<HappyIcon className="w-3 h-3" />} />
                <MiniStat name="ENG" value={stats.energy} icon={<EnergyIcon className="w-3 h-3" />} />
                <MiniStat name="HYG" value={stats.hygiene} icon={<HygieneIcon className="w-3 h-3" />} />
                <MiniStat name="HLT" value={stats.health} icon={<HealthIcon className="w-3 h-3" />} />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export function PanelBody({ stats, compact }: { stats: Stats; compact: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`rounded-3xl border border-[#2b2138]/10 bg-[#fffaf2]/95 p-4 shadow-[0_14px_36px_-16px_rgba(120,60,90,0.25)] backdrop-blur ${
        compact ? '' : 'space-y-2'
      }`}
    >
      <div className="font-pixel text-[10px] text-[#2b2138] mb-3 tracking-widest opacity-80">
        ★ VITALS ★
      </div>
      <StatRow name="Hunger" value={stats.hunger} icon={<HungerIcon className="w-4 h-4" />} />
      <StatRow name="Happy" value={stats.happiness} icon={<HappyIcon className="w-4 h-4" />} />
      <StatRow name="Energy" value={stats.energy} icon={<EnergyIcon className="w-4 h-4" />} />
      <StatRow name="Hygiene" value={stats.hygiene} icon={<HygieneIcon className="w-4 h-4" />} />
      <StatRow name="Health" value={stats.health} icon={<HealthIcon className="w-4 h-4" />} />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

function MiniStat({ name, value, icon }: { name: string; value: number; icon: JSX.Element }) {
  const { color } = tier(value);
  return (
    <div className="flex flex-col items-center gap-1">
      <span style={{ color }}>{icon}</span>
      <div className="relative w-full h-1.5 rounded-full bg-[#2b2138]/10 overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={false}
          animate={{ width: `${(value / STAT_MAX) * 100}%` }}
          transition={{ type: 'tween', duration: 0.35, ease: 'easeOut' }}
        />
      </div>
      <div className="font-pixel text-[8px] opacity-80">{name}</div>
    </div>
  );
}

function StatRow({
  name,
  value,
  icon,
}: {
  name: string;
  value: number;
  icon: JSX.Element;
}) {
  const { color, label, critical } = tier(value);
  return (
    <div className={`${critical ? 'stat-critical' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span style={{ color }}>{icon}</span>
          <span className="font-pixel text-[10px] text-[#2b2138]">{name}</span>
        </div>
        <span className="font-pixel text-[9px]" style={{ color }}>
          {label} {Math.round(value)}
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-[#2b2138]/10 overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={false}
          animate={{ width: `${(value / STAT_MAX) * 100}%` }}
          transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
        />
        {/* Pixel ticks for the retro feel */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-white/20"
              style={{ left: `${i * 10}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function tier(v: number) {
  if (v < 30) return { color: '#e06a7c', label: 'LOW', critical: true } as const;
  if (v < 60) return { color: '#e8b156', label: 'OK', critical: false } as const;
  return { color: '#6fb86a', label: 'GOOD', critical: false } as const;
}

/* ------------------------------------------------------------------ */

type I = { className?: string };

function HungerIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v6M12 10c-3 0-5 2.5-5 6s2 4 5 4 5-1 5-4-2-6-5-6z" />
    </svg>
  );
}
function HappyIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}
function EnergyIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M13 2L3 14h6v8l10-12h-6V2z" />
    </svg>
  );
}
function HygieneIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2s-6 6-6 12a6 6 0 0 0 12 0c0-6-6-12-6-12z" />
    </svg>
  );
}
function HealthIcon({ className }: I) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 21s-7-4.5-9.5-9C.5 8 2.5 4 6 4c2 0 3.5 1 6 4 2.5-3 4-4 6-4 3.5 0 5.5 4 3.5 8C19 16.5 12 21 12 21z" />
    </svg>
  );
}
