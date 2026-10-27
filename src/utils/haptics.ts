/**
 * Tactile feedback for mobile browsers via Navigator.vibrate.
 * Gracefully no-ops on desktop or unsupported devices.
 */
export function vibrate(pattern: number | readonly number[] = 25): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern as VibratePattern);
    } catch {
      // Ignore vibration errors on browsers with permission limits
    }
  }
}

export const HAPTIC_PATTERNS = {
  tap: 20,
  toggle: 30,
  streakDone: [40, 50, 70],
  freezeUsed: [60, 40, 60],
  milestone: [50, 40, 50, 40, 100],
} as const;
