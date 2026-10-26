import { PALETTE } from '../sprites/palette';
import { renderSprite } from '../sprites/renderSprite';
import { paletteForHour, currentLocalHourFloat, type SkyPalette } from './dayNight';

export interface SceneOpts {
  forceNight?: boolean;
  /** 0 = natural lighting from local hour; 1 = fully force night (sleeping). Blends smoothly for awake↔asleep transitions. */
  sleepingNightStrength?: number;
  /** Optional hour override (0..24). If omitted, uses current local time. */
  hourOverride?: number;
}

/** Random small star pixel positions cached once (stable across frames) */
const STAR_POSITIONS: Array<[number, number, number]> = (() => {
  const arr: Array<[number, number, number]> = [];
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(rnd() * 256);
    const y = Math.floor(rnd() * 130); // only upper 2/3 of sky
    const s = rnd() < 0.25 ? 2 : 1;
    arr.push([x, y, s]);
  }
  return arr;
})();

/**
 * Cloud positions drift left over time; reset when off left edge.
 * Stored in an IIFE so it is a module-level mutable cache (single instance for our single canvas).
 */
interface Cloud { x: number; y: number; w: number; speed: number; }
const CLOUDS: Cloud[] = (() => {
  const rng = mulberry32(42);
  const arr: Cloud[] = [];
  for (let i = 0; i < 3; i++) {
    arr.push({
      x: rng() * 256,
      y: 20 + rng() * 50,
      w: 28 + Math.floor(rng() * 20),
      speed: 2 + rng() * 2, // px per 10 seconds
    });
  }
  return arr;
})();

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Fireflies — sparse, appear only at night. Positions drift slowly + blink. */
interface Firefly { x: number; y: number; phase: number; speed: number; }
const FIREFLIES: Firefly[] = (() => {
  const rng = mulberry32(1776);
  const arr: Firefly[] = [];
  for (let i = 0; i < 8; i++) {
    arr.push({
      x: rng() * 256,
      y: 130 + rng() * 40,
      phase: rng() * Math.PI * 2,
      speed: 0.5 + rng(),
    });
  }
  return arr;
})();

/* ------------------------------------------------------------------ */
/*  Top-level draw API                                                 */
/* ------------------------------------------------------------------ */

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: SceneOpts = {},
) {
  const hour = opts.hourOverride ?? currentLocalHourFloat();
  const sleepStrength = opts.sleepingNightStrength ?? 0;
  const pal = paletteForHour(hour, opts.forceNight, sleepStrength);

  drawSky(ctx, w, h, pal);
  drawStars(ctx, pal);
  drawMoon(ctx, pal);
  drawSun(ctx, w, h, pal);
  drawClouds(ctx, pal);

  // Hills + ground + tree + window in the ground area
  drawHillsAndGround(ctx, w, h, pal);

  drawFireflies(ctx, pal);

  // Dusk/night vignette darkening overlay
  if (pal.ambient < 0.7) {
    const alpha = (0.7 - pal.ambient) * 0.9;
    const grad = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, 180);
    grad.addColorStop(0, `rgba(0,0,0,0)`);
    grad.addColorStop(1, `rgba(0,0,0,${alpha.toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // Sleeping: deep indigo vignette + subtle Z letter floaters over sky
  if (sleepStrength > 0.02) {
    // Deep indigo sleep vignette
    const alpha = 0.5 * sleepStrength;
    const sg = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, 200);
    sg.addColorStop(0, `rgba(30,25,90,0)`);
    sg.addColorStop(1, `rgba(30,25,90,${alpha.toFixed(3)})`);
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);
    // Floating "Z" letters (simple)
    const count = 4;
    const tSec = performance.now() / 1000;
    ctx.font = 'bold 9px "Courier New", monospace';
    for (let i = 0; i < count; i++) {
      const phase = (i / count + tSec * 0.3) % 1;
      const x = 20 + i * 60 + Math.sin(tSec * 1.2 + i * 1.7) * 5;
      const y = 90 - phase * 80;
      const zAlpha = sleepStrength * (1 - phase * 0.8);
      ctx.globalAlpha = zAlpha * 0.85;
      ctx.fillStyle = i % 2 === 0 ? '#e7e2ff' : '#fff7d3';
      ctx.fillText('Z', Math.round(x), Math.round(y));
    }
    ctx.globalAlpha = 1;
  }
}

/* ------------------------------------------------------------------ */

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, pal: SkyPalette) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawStars(ctx: CanvasRenderingContext2D, pal: SkyPalette) {
  if (pal.starsAlpha <= 0.02) return;
  const t = performance.now() / 500;
  for (let i = 0; i < STAR_POSITIONS.length; i++) {
    const [x, y, s] = STAR_POSITIONS[i];
    const twinkle = 0.5 + 0.5 * Math.sin(t + i * 0.3);
    ctx.globalAlpha = pal.starsAlpha * (0.6 + 0.4 * twinkle);
    ctx.fillStyle = i % 7 === 0 ? '#ffe9a6' : '#ffffff';
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
}

function drawMoon(ctx: CanvasRenderingContext2D, pal: SkyPalette) {
  if (pal.starsAlpha <= 0.02) return;
  const w = 256; // canvas logical W
  const h = 160; // sky ends near 160
  const mx = Math.round(pal.moonX * w);
  const my = Math.round(pal.moonY * h * 0.8 + 10);
  ctx.globalAlpha = pal.starsAlpha;
  // Halo
  const halo = ctx.createRadialGradient(mx, my, 2, mx, my, 14);
  halo.addColorStop(0, 'rgba(255,244,214,0.55)');
  halo.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(mx, my, 14, 0, Math.PI * 2);
  ctx.fill();
  // Moon body (crescent shape with shadow circle offset)
  ctx.fillStyle = '#fff6d6';
  ctx.beginPath();
  ctx.arc(mx, my, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = pal.starsAlpha * 0.45;
  ctx.fillStyle = pal.skyTop;
  ctx.beginPath();
  ctx.arc(mx + 2, my - 1, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawSun(ctx: CanvasRenderingContext2D, _w: number, _h: number, pal: SkyPalette) {
  if (pal.isNight) return;
  const W = 256;
  const skyH = 160;
  // X follows standard arc: sunrise left to noon-center to sunset-right
  const sunHour = (performance.now() / 120_000) % 24; // just a subtle drift position
  void sunHour;
  const sx = Math.round(W * 0.78); // always late-afternoon-ish; simple nice sun
  const sy = Math.round(skyH * Math.max(0.1, Math.min(0.95, pal.sunY)));
  // Halo
  const halo = ctx.createRadialGradient(sx, sy, 3, sx, sy, 22);
  const hexCol = pal.sunColor;
  halo.addColorStop(0, hexWithAlpha(hexCol, 0.7));
  halo.addColorStop(1, hexWithAlpha(hexCol, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(sx, sy, 22, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.fillStyle = hexCol;
  ctx.beginPath();
  ctx.arc(sx, sy, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(ctx: CanvasRenderingContext2D, pal: SkyPalette) {
  if (pal.isNight) return;
  const tSec = performance.now() / 1000;
  const baseTint = pal.ambient > 0.7 ? '#ffffff' : '#e9ecf5';
  for (const c of CLOUDS) {
    const x = ((c.x - c.speed * tSec / 10) % (256 + c.w) + (256 + c.w)) % (256 + c.w) - c.w;
    drawPuffCloud(ctx, x, c.y, c.w, baseTint);
  }
}

function drawPuffCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string) {
  ctx.fillStyle = color;
  const r = w * 0.14;
  // Three-arc puff
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.arc(x + r * 2.2, y + r * 0.6, r * 1.1, 0, Math.PI * 2);
  ctx.arc(x + r * 3.6, y + r, r * 0.95, 0, Math.PI * 2);
  ctx.rect(x + r, y + r * 0.85, r * 3, r * 1.1);
  ctx.fill();
}

function drawHillsAndGround(ctx: CanvasRenderingContext2D, w: number, h: number, pal: SkyPalette) {
  // Distant hill
  ctx.fillStyle = shadeColor(pal.hillColor, -0.1);
  ctx.beginPath();
  ctx.moveTo(0, 140);
  ctx.quadraticCurveTo(60, 100, 128, 130);
  ctx.quadraticCurveTo(196, 156, w, 118);
  ctx.lineTo(w, 160);
  ctx.lineTo(0, 160);
  ctx.closePath();
  ctx.fill();

  // Ground
  ctx.fillStyle = pal.groundColor;
  ctx.fillRect(0, 160, w, h - 160);
  ctx.fillStyle = pal.groundSpeckle;
  for (let i = 0; i < w; i += 8) {
    ctx.fillRect(i, 160, 2, 2);
    ctx.fillRect(i + 4, 162, 1, 2);
  }
  // Grass tufts
  ctx.fillStyle = shadeColor(pal.groundColor, -0.08);
  for (let i = 12; i < w; i += 22) {
    ctx.fillRect(i, 160, 1, -2);
    ctx.fillRect(i + 2, 160, 1, -3);
    ctx.fillRect(i + 4, 160, 1, -2);
  }

  // Window (top right corner) — small house-like element
  drawWindow(ctx, w - 44, 98, pal);

  // Tree (bottom left-ish)
  drawTree(ctx, 32, 160, pal);
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, pal: SkyPalette) {
  // Wall behind window (house side): small 40×56 house segment
  const wall = pal.isNight ? '#6a4a52' : '#e6c9a8';
  const roof = pal.isNight ? '#4a343c' : '#c58b86';
  ctx.fillStyle = wall;
  ctx.fillRect(x, y + 14, 40, 44);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 14);
  ctx.lineTo(x + 20, y);
  ctx.lineTo(x + 44, y + 14);
  ctx.closePath();
  ctx.fill();

  // Window frame
  const frame = pal.isNight ? '#3a2e34' : '#7b5a4b';
  ctx.fillStyle = frame;
  ctx.fillRect(x + 12, y + 24, 16, 16);
  const lit = pal.isNight;
  ctx.fillStyle = lit ? '#ffd98a' : '#bfe3ff';
  ctx.fillRect(x + 13, y + 25, 14, 14);
  // Crossbars
  ctx.fillStyle = frame;
  ctx.fillRect(x + 19, y + 25, 2, 14);
  ctx.fillRect(x + 13, y + 31, 14, 2);

  // Door
  ctx.fillStyle = frame;
  ctx.fillRect(x + 4, y + 44, 10, 14);
  ctx.fillStyle = pal.isNight ? '#ffd98a' : '#fff3c6';
  ctx.fillRect(x + 11, y + 51, 1, 1);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, pal: SkyPalette) {
  // Trunk
  const trunk = pal.isNight ? '#3a2a1e' : '#8a5a3b';
  const leaf = pal.isNight ? '#36513d' : '#77b06a';
  const leafShade = shadeColor(leaf, -0.12);
  ctx.fillStyle = trunk;
  ctx.fillRect(x, baseY - 14, 4, 14);
  // Canopy (three circles)
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.arc(x + 2, baseY - 16, 9, 0, Math.PI * 2);
  ctx.arc(x + 8, baseY - 20, 9, 0, Math.PI * 2);
  ctx.arc(x - 4, baseY - 20, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = leafShade;
  ctx.beginPath();
  ctx.arc(x + 10, baseY - 14, 6, 0, Math.PI * 2);
  ctx.arc(x - 7, baseY - 18, 5, 0, Math.PI * 2);
  ctx.fill();
  // One apple / leaf dot
  ctx.fillStyle = pal.isNight ? '#b05555' : PALETTE['p'];
  ctx.fillRect(x + 5, baseY - 22, 1, 1);
}

function drawFireflies(ctx: CanvasRenderingContext2D, pal: SkyPalette) {
  if (!pal.isNight) return;
  const t = performance.now() / 1000;
  for (let i = 0; i < FIREFLIES.length; i++) {
    const f = FIREFLIES[i];
    const x = f.x + Math.sin(t * 0.7 * f.speed + f.phase) * 4;
    const y = f.y + Math.cos(t * 0.9 * f.speed + f.phase) * 3;
    const blink = 0.5 + 0.5 * Math.sin(t * 3 + f.phase);
    const a = 0.4 + 0.6 * blink;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, 4);
    halo.addColorStop(0, `rgba(255,240,150,${a})`);
    halo.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = `rgba(255,255,200,${a})`;
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }
}

/* ------------------------------------------------------------------ */
/*  Color helpers                                                      */
/* ------------------------------------------------------------------ */

function hexWithAlpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shadeColor(hex: string, amt: number) {
  // amt -1..1: negative darkens.
  let [r, g, b] = hexToRgb(hex);
  if (amt < 0) {
    r *= 1 + amt; g *= 1 + amt; b *= 1 + amt;
  } else {
    r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
  }
  const to = (v: number) => {
    const s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
    return s.length === 1 ? '0' + s : s;
  };
  return '#' + to(r) + to(g) + to(b);
}

// Silence unused lint (PALETTE and renderSprite are used for tree/future items)
void renderSprite;
