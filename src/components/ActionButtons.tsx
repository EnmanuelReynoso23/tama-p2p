import { useEffect, useState } from 'react';
import { usePetStore } from '../store/usePetStore';
import { vibrate } from '../utils/haptics';
import { unlockAudio } from '../sounds/sfx';

/** Cuenta regresiva en segundos hasta `until` (0 si ya paso). */
function useSecondsLeft(until: number): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (until <= now) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [until, now]);
  return Math.max(0, Math.ceil((until - now) / 1000));
}

interface CareProps {
  label: string;
  hint: string;
  color: string;
  wait: number;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

function CareButton({ label, hint, color, wait, disabled, onPress, children }: CareProps) {
  return (
    <button
      type="button"
      onClick={() => {
        unlockAudio();
        vibrate(15);
        onPress();
      }}
      disabled={disabled}
      aria-label={`${label}. ${hint}`}
      className={`care-btn relative flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-ink ${color} px-1 py-2 text-ink`}
    >
      <svg viewBox="0 0 12 12" className="pixelated h-6 w-6" aria-hidden shapeRendering="crispEdges">
        {children}
      </svg>
      <span className="text-[12px] font-extrabold leading-none">{label}</span>
      {wait > 0 && (
        <span className="absolute right-1 top-1 rounded-full bg-ink px-1.5 text-[10px] font-bold text-white">{wait}s</span>
      )}
    </button>
  );
}

/** Iconos de pixeles propios (12x12). */
const R = ({ x, y, w = 1, h = 1, f }: { x: number; y: number; w?: number; h?: number; f: string }) => (
  <rect x={x} y={y} width={w} height={h} fill={f} />
);
const INK = '#2b2138';

/** Botones para cuidar a la mascota: comer, merienda, jugar, bañar, dormir y medicina. */
export default function ActionButtons() {
  const hatched = usePetStore((s) => s.hatched);
  const isAsleep = usePetStore((s) => s.isAsleep);
  const isSick = usePetStore((s) => s.isSick);
  const cd = usePetStore((s) => s.cooldownsUntil);
  const pet = usePetStore.getState;

  const meal = useSecondsLeft(cd.meal);
  const snack = useSecondsLeft(cd.snack);
  const play = useSecondsLeft(cd.play);
  const clean = useSecondsLeft(cd.clean);

  if (!hatched) {
    return (
      <p className="mt-3 rounded-2xl border-2 border-dashed border-ink/40 bg-paper px-3 py-3 text-center text-sm font-bold text-ink">
        Tu huevo está por abrirse. Quédate cerca.
      </p>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      <CareButton label="Comer" hint="Comida completa" color="bg-[#ffe1c2]" wait={meal} disabled={isAsleep} onPress={() => pet().feed('meal')}>
        <R x={2} y={6} w={8} h={1} f={INK} />
        <R x={3} y={7} w={6} h={2} f={INK} />
        <R x={3} y={4} w={6} h={2} f="#d0435f" />
        <R x={5} y={2} w={1} h={2} f="#2f7d3b" />
      </CareButton>
      <CareButton label="Merienda" hint="Algo dulce, sube el ánimo" color="bg-blush" wait={snack} disabled={isAsleep} onPress={() => pet().feed('snack')}>
        <R x={3} y={3} w={6} h={6} f={INK} />
        <R x={4} y={4} w={4} h={4} f="#ffd45c" />
        <R x={5} y={5} w={1} h={1} f={INK} />
        <R x={7} y={6} w={1} h={1} f={INK} />
      </CareButton>
      <CareButton label="Jugar" hint="Sube el ánimo, gasta energía" color="bg-[#dcd2ff]" wait={play} disabled={isAsleep} onPress={() => pet().play()}>
        <R x={3} y={3} w={6} h={6} f={INK} />
        <R x={4} y={4} w={4} h={4} f="#7f8fe6" />
        <R x={4} y={6} w={4} h={1} f="#fff3da" />
      </CareButton>
      <CareButton label="Bañar" hint="Limpia y quita la caca" color="bg-[#cdeffd]" wait={clean} disabled={isAsleep} onPress={() => pet().cleanNow()}>
        <R x={2} y={6} w={8} h={3} f={INK} />
        <R x={3} y={6} w={6} h={2} f="#7fb8e6" />
        <R x={4} y={3} w={1} h={1} f="#7fb8e6" />
        <R x={7} y={2} w={1} h={1} f="#7fb8e6" />
        <R x={6} y={4} w={1} h={1} f="#7fb8e6" />
      </CareButton>
      <CareButton
        label={isAsleep ? 'Despertar' : 'Dormir'}
        hint={isAsleep ? 'Despertarla ahora' : 'Recupera energía'}
        color="bg-[#e5e0f5]"
        wait={0}
        onPress={() => pet().toggleSleepToggle()}
      >
        {isAsleep ? (
          <>
            <R x={5} y={1} w={2} h={2} f="#ffd45c" />
            <R x={3} y={4} w={6} h={6} f="#ffd45c" />
            <R x={4} y={5} w={4} h={4} f="#ffe999" />
          </>
        ) : (
          <>
            <R x={4} y={2} w={4} h={8} f="#f3efd2" />
            <R x={3} y={3} w={1} h={6} f="#f3efd2" />
            <R x={6} y={3} w={3} h={6} f="#e5e0f5" />
          </>
        )}
      </CareButton>
      <CareButton
        label="Medicina"
        hint={isSick ? 'Está enferma: dale medicina' : 'Solo si está enferma'}
        color={isSick ? 'bg-[#ffd0d0]' : 'bg-paper'}
        wait={0}
        disabled={!isSick}
        onPress={() => pet().giveMedicineNow()}
      >
        <R x={2} y={4} w={8} h={4} f={INK} />
        <R x={3} y={5} w={3} h={2} f="#ffffff" />
        <R x={6} y={5} w={3} h={2} f="#d0435f" />
      </CareButton>
    </div>
  );
}
