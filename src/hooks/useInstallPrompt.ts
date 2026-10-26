import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'tama-install-dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

// Capture the event as early as possible (it can fire before React mounts).
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

/**
 * "Add to home screen" state:
 *  - `native`: Chrome/Edge/Android gave us a prompt we can trigger with a button.
 *  - `ios`:    Safari has no prompt — we show "Compartir → Añadir a inicio" steps.
 *  - `none`:   already installed, dismissed, or unsupported.
 */
export function useInstallPrompt() {
  const [, force] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const standalone = isStandalone();
  const kind: 'native' | 'ios' | 'none' =
    standalone || dismissed ? 'none' : deferred ? 'native' : isIos() ? 'ios' : 'none';

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    force((n) => n + 1);
    return outcome === 'accepted';
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode */
    }
  }, []);

  return { kind, install, dismiss, standalone };
}
