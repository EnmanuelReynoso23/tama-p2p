import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { usePetStore, type WelcomeToast } from '../store/usePetStore';

/**
 * Toast notification stack.
 *  - Pulls from Zustand toasts array (max 5 queued in store).
 *  - Renders up to 3 visible, staggered bottom-to-top.
 *  - Auto-dismisses after 4s, or user clicks ×.
 *  - Screen-reader live region via aria-live from App.tsx's sr-only div (we
 *    also set the nearest parent node role="status" for politeness stacking).
 */
export default function Toasts() {
  const toasts = usePetStore((s) => s.toasts);
  const dismiss = usePetStore((s) => s.dismissToast);

  // Auto-dismiss oldest toast after 4s
  useEffect(() => {
    if (toasts.length === 0) return;
    const oldestId = toasts[0].id;
    const id = window.setTimeout(() => dismiss(oldestId), 4000);
    return () => window.clearTimeout(id);
  }, [toasts, dismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed z-40 left-1/2 bottom-6 -translate-x-1/2 w-[min(92vw,360px)] flex flex-col gap-2 items-center"
    >
      <AnimatePresence initial={false}>
        {toasts.slice(0, 3).map((t, idx) => (
          <ToastCard key={t.id} t={t} idx={idx} onClose={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({
  t,
  idx,
  onClose,
}: {
  t: WelcomeToast;
  idx: number;
  onClose: () => void;
}) {
  const toneBg =
    t.tone === 'warn'
      ? 'bg-[#ffe9c7] border-[#e8b156] text-[#7a4d12]'
      : t.tone === 'good'
      ? 'bg-[#dff0df] border-[#6fb86a] text-[#2b5c34]'
      : 'bg-[#fff0f5] border-[#f7a8c4] text-[#80344a]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: -idx * 4, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.92 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`pointer-events-auto w-full rounded-2xl border ${toneBg} px-3 py-2 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.25)] flex items-start gap-2`}
    >
      <span aria-hidden className="mt-0.5">{toneEmoji(t.tone)}</span>
      <div className="flex-1 min-w-0">
        <div className="font-pixel text-[10px] leading-snug">{t.title}</div>
        <div className="font-sans text-[11px] leading-snug opacity-90 mt-0.5">{t.body}</div>
      </div>
      <button
        onClick={onClose}
        type="button"
        aria-label="Dismiss notification"
        className="opacity-60 hover:opacity-100 transition p-0.5 rounded-md hover:bg-black/5"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </motion.div>
  );
}

function toneEmoji(t: WelcomeToast['tone']) {
  switch (t) {
    case 'good':
      return '✨';
    case 'warn':
      return '⚠️';
    default:
      return '[*]';
  }
}
