/**
 * Day/night cycle driven by the user's real local time.
 *
 * Times of day (24h hour integer or float):
 *   dawn:   5–7  (sunrise — gradient from night → day)
 *   day:    7–17
 *   dusk:  17–19 (sunset — gradient from day → night)
 *   night: 19–5 (next day)
 *
 * Returns values for every 1 minute and is cheap; call once per frame
 * (t in hours float) and cache per-minute.
 */

export interface SkyPalette {
  skyTop: string;
  skyBottom: string;
  sunColor: string;
  sunY: number; // 0..1 where 0=top, 0.5=horizon, 1=bottom of sky area (below horizon not shown)
  ambient: number; // 0..1 (0 = darkest night, 1 = bright noon)
  hillColor: string;
  groundColor: string;
  groundSpeckle: string;
  isNight: boolean;
  starsAlpha: number; // 0..1 (stars/moon visible only at night)
  moonX: number; // 0..1
  moonY: number; // 0..1
}

/**
 * Map hour-of-day (float 0–24) to palette. Smooth mixes across dawn/dusk.
 */
export function paletteForHour(h: number, nightForceOverride?: boolean, sleepingNightT: number = 0): SkyPalette {
  const nightForced = nightForceOverride === true;
  const sleepT = Math.max(0, Math.min(1, sleepingNightT));

  /* Time blending weights (0..1) */
  const dawn = smooth(h, 5, 7); // ramps 0→1 from 5am→7am
  const dusk = smooth(h, 17, 19); // ramps 0→1 from 5pm→7pm
  const isDawn = h >= 4.5 && h < 8;
  const isDusk = h >= 16.5 && h < 20;

  // Natural blend factor from night to pure day (0 night → 1 midday)
  const naturalDayT = clamp01(dawn * (1 - dusk) * (1 - 0.05 * duskWeightTowardNight(h)));
  // Apply night overrides: forceNight OR sleepingNightT both reduce dayT toward 0
  const overrideReduce = Math.max(nightForced ? 1 : 0, sleepT);
  const dayT = naturalDayT * (1 - overrideReduce);

  const lerpC = lerpColor;
  const nightTop = '#1c1a3a';
  const nightBottom = '#2f2b52';
  const dayTop = '#bfe3ff';
  const dayBottom = '#e7f5ff';
  const dawnTop = '#ffcfbf';
  const dawnBottom = '#ffe9cf';
  const duskTop = '#f4b8c0';
  const duskBottom = '#ffdab0';

  let skyTop = lerpC(nightTop, dayTop, dayT);
  let skyBottom = lerpC(nightBottom, dayBottom, dayT);
  if (isDawn) {
    const t = smooth(h, 5, 7);
    skyTop = lerpC(skyTop, dawnTop, 0.35 * (1 - Math.abs(t - 0.5) * 2));
    skyBottom = lerpC(skyBottom, dawnBottom, 0.55 * (1 - Math.abs(t - 0.5) * 2));
  }
  if (isDusk) {
    const t = smooth(h, 17, 19);
    skyTop = lerpC(skyTop, duskTop, 0.35 * (1 - Math.abs(t - 0.5) * 2));
    skyBottom = lerpC(skyBottom, duskBottom, 0.55 * (1 - Math.abs(t - 0.5) * 2));
  }

  // Sun position: arc from sunrise left → noon top → sunset right
  const isNight = nightForced || h < 5.5 || h >= 19.25;
  const sunHour = nightForced ? 20 : h;
  // Map [6,18] → [0,π]
  const sunTheta = clamp01((sunHour - 6) / 12) * Math.PI;
  const sunX = 0.5 - 0.42 * Math.cos(sunTheta);
  void sunX;
  const sunY = 1 - Math.sin(sunTheta); // 0 at top, 1 at bottom

  // Moon position: arc opposite sun, over hours 20..8
  const moonTheta = clamp01(((sunHour + 12) % 24 - 6) / 12) * Math.PI;
  const moonX = 0.5 - 0.42 * Math.cos(moonTheta);
  const moonY = 1 - Math.sin(moonTheta);

  // Ambient brightness factor (0.18 night → 1.0 day)
  const ambient = nightForced ? 0.18 : 0.18 + 0.82 * dayT;

  // Ground / hill colors based on ambient
  const dayHill = '#a7d9a8';
  const nightHill = '#384852';
  const dayGround = '#7bc67b';
  const nightGround = '#263830';
  const dayGroundSpeckle = '#64b264';
  const nightGroundSpeckle = '#1a2a24';
  const hillColor = lerpC(nightHill, dayHill, dayT);
  const groundColor = lerpC(nightGround, dayGround, dayT);
  const groundSpeckle = lerpC(nightGroundSpeckle, dayGroundSpeckle, dayT);

  const sunColor = isDusk
    ? '#ff9a6b'
    : isDawn
    ? '#ffd9a3'
    : '#fff3c6';

  return {
    skyTop,
    skyBottom,
    sunColor,
    sunY: isNight ? 1.2 : sunY,
    ambient,
    hillColor,
    groundColor,
    groundSpeckle,
    isNight,
    starsAlpha: isNight ? (nightForced ? 1 : clamp01(1 - Math.abs(Math.min(h, 24 - h + 19) - 2))) : 0,
    moonX,
    moonY,
  };
}

/* Dusk helper for subtle dayT dip near sunset edge */
function duskWeightTowardNight(h: number) {
  // 0 at 17, peaks ~18.5, 0 at 19.5
  return Math.max(0, 1 - Math.abs(h - 18.5) / 1.5);
}

/* Small helpers */

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smooth(h: number, from: number, to: number) {
  return clamp01((h - from) / (to - from));
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => {
    const s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
    return s.length === 1 ? '0' + s : s;
  };
  return '#' + to(r) + to(g) + to(b);
}
export function lerpColor(a: string, b: string, t: number) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const k = clamp01(t);
  return rgbToHex(ar + (br - ar) * k, ag + (bg - ag) * k, ab + (bb - ab) * k);
}

/**
 * Convenience: fetch current user's local time as float hours.
 */
export function currentLocalHourFloat(now = new Date()): number {
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}
