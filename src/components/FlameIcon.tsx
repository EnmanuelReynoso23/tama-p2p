import type { StreakStatus } from '../game/streak';

/** Pixel-art flame. Lit when today is done, outlined/pulsing when at risk, grey when none. */
export default function FlameIcon({
  status,
  className = 'w-8 h-8',
}: {
  status: StreakStatus;
  className?: string;
}) {
  const lit = status === 'done';
  const risk = status === 'at-risk';
  const outer = lit ? '#ff7a1a' : risk ? '#ffb47a' : '#c9bfcf';
  const inner = lit ? '#ffd166' : risk ? '#ffe5d0' : '#e7e0ea';
  const core = lit ? '#fff4c2' : '#ffffff';
  return (
    <svg
      viewBox="0 0 16 16"
      className={`${className} ${risk ? 'streak-risk' : ''}`}
      shapeRendering="crispEdges"
      aria-hidden
    >
      <path
        fill={outer}
        d="M7 1h2v1h1v1h1v2h1v1h1v5h-1v2h-1v1h-1v1H6v-1H5v-1H4v-2H3V7h1V6h1v1h1V4h1z"
      />
      <path fill={inner} d="M7 6h2v1h1v1h1v3h-1v1h-1v1H7v-1H6v-1H5V9h1V8h1z" />
      <path fill={core} d="M7 10h2v2H7z" />
    </svg>
  );
}
