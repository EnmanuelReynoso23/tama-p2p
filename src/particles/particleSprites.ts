/**
 * 5×5–ish pixel sprites for particle effects.
 * Each is a string grid with palette characters. Use the same PALETTE mapping
 * as the pet sprites so we can reuse renderSprite for them trivially.
 */

import { PALETTE } from '../sprites/palette';

type SpriteFrame = readonly string[];

/* Pixel grids. 'k' is dark outline per PALETTE. */

/** Heart (used for petting/happy actions) */
export const heartSprite: SpriteFrame = [
  '.k.k.',
  'kpkpk',
  'kpppk',
  '.kpk.',
  '..k..',
];

/** Small food crumb (3×3-ish with halo empty) */
export const crumbSprite: SpriteFrame = [
  '.....',
  '.k.k.',
  '..S..',
  '.k.k.',
  '.....',
];

/** Soap bubble (transparent center, ring) */
export const bubbleSprite: SpriteFrame = [
  '.kkk.',
  'k.w.k',
  'k.w.k',
  'k.w.k',
  '.kkk.',
];

/** Sleep Z (text character) */
export const zzzSprite: SpriteFrame = [
  'kkkk.',
  '...k.',
  '..k..',
  '.k...',
  'kkkk.',
];

/** Sparkle / star burst */
export const sparkleSprite: SpriteFrame = [
  '..k..',
  '.kwk.',
  'kwbwk',
  '.kwk.',
  '..k..',
];

/** Stink line (wavy vertical) */
export const stinkSprite: SpriteFrame = [
  '.kk..',
  'k..k.',
  '.kk..',
  'k..k.',
  '.kk..',
];

/** Tear drop */
export const tearSprite: SpriteFrame = [
  '..k..',
  '.kbk.',
  '.kbk.',
  '.kbk.',
  '..k..',
];

/** Gold star (mini-game) */
export const starSprite: SpriteFrame = [
  '..k..',
  '.kyk.',
  'kyyyk',
  'kyyk.',
  '.k.k.',
];

/** Butterfly (boredom event) — tiny */
export const butterflySprite: SpriteFrame = [
  'k...k',
  'pkwkp',
  'pkkkp',
  '.kwk.',
  '..k..',
];

/** Ensure each frame uses only palette characters — sanity check is statically
 *  via renderSprite using PALETTE dict lookup (invalid keys silently ignored). */
export const PARTICLE_PALETTE = PALETTE;

// TS guard: ensure exports are SpriteFrame (enables IDE completion)
type _Assert = SpriteFrame;
void ({} as _Assert);
