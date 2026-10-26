import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

interface Props {
  value: string;
  size?: number;
  label: string;
  /** Dark modules colour. */
  color?: string;
}

/** Crisp SVG QR code (scan with the phone camera to open an invite). */
export default function QrCode({ value, size = 168, label, color = '#2b2138' }: Props) {
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
      }
    }
    return { path: d, count: n };
  }, [value]);

  const quiet = 2;
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`${-quiet} ${-quiet} ${count + quiet * 2} ${count + quiet * 2}`}
      shapeRendering="crispEdges"
      className="rounded-xl bg-white"
    >
      <rect x={-quiet} y={-quiet} width={count + quiet * 2} height={count + quiet * 2} fill="#fff" />
      <path d={path} fill={color} />
    </svg>
  );
}
