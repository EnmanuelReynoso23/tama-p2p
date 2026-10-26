import { decayStats } from './stats';

// Re-export for ergonomic central import in store + tests.
export * from './constants';
export * from './stats';
export * from './actions';
export * from './careScore';
export * from './offline';

// tiny helper so tests and store can share "tick 1 minute" semantics without
// importing constants directly from multiple files.
export const PER_MINUTE_DECAY = (
  stats: Parameters<typeof decayStats>[0],
  opts: Parameters<typeof decayStats>[2],
) => decayStats(stats, 1 / 60, opts);
