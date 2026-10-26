/**
 * EGG — life stage #1 (first 60 seconds real time by default).
 *
 * Sprites are 16×16 pixel grids. The egg has:
 *   - wobble  (gentle 2-frame tilt, idle before any cracks appear)
 *   - crack1  (first chip, 2 frames)
 *   - crack2  (bigger spider-web crack, 2 frames)
 *   - hatching_hatched (empty shell halves — triggers the sparkle burst)
 *   - idle    (catch-all — aliased to wobble frame 0)
 */

import type { SpriteFrame } from '../sprites/palette';
import { PALETTE } from '../sprites/palette';

export const EGG_FRAME_W = 16;
export const EGG_FRAME_H = 16;

/* ================= egg shell pixel grids ================= */

// Clean whole egg (used as wobble-idle base frame)
const eggWhole: SpriteFrame = [
  '................',
  '................',
  '.....kkkkkk.....',
  '....kWWWWWWk....',
  '...kWssWssWWk...',
  '..kWWWssWWWWWk..',
  '..kWppWssWSpWk..',
  '..kWWWsWWsWWWk..',
  '..kWsSWWWsSpWk..',
  '..kWSSSsWWSSWk..',
  '..kWWWSSWWWpWk..',
  '..kWWWWWWWWWpWk.',
  '...kWpWWWWWWWk..',
  '....kkkkkkkk....',
  '................',
  '................',
];

// Wobble — egg tilted slightly left
const eggTiltLeft: SpriteFrame = [
  '................',
  '....kkkkkk......',
  '...kWWWWWWk.....',
  '..kWssWssWWk....',
  '.kWWWssWWWWWk...',
  '.kWppWssWSpWW...',
  '.kWWWsWWsWWWk...',
  '.kWsSWWWsSpWk...',
  '.kWSSSsWWSSWk...',
  '.kWWWSSWWWpWk...',
  '.kWWWWWWWWWpWk..',
  '..kWpWWWWWWWk...',
  '...kkkkkkkk.....',
  '................',
  '................',
  '................',
];

// Wobble — tilted right (mirror, keeps subtlety)
const eggTiltRight: SpriteFrame = [
  '................',
  '......kkkkkk....',
  '.....kWWWWWWk...',
  '....kWssWssWWk..',
  '...kWWWssWWWWWk.',
  '...kWppWssWSpWk.',
  '...kWWWsWWsWWWk.',
  '...kWsSWWWsSpWk.',
  '...kWSSSsWWSSWk.',
  '...kWWWSSWWWpWk.',
  '..kWWWWWWWWWpWk.',
  '...kWpWWWWWWWk..',
  '....kkkkkkkk....',
  '................',
  '................',
  '................',
];

// Crack stage 1 — small hairline on top right
const eggCrack1A: SpriteFrame = [
  '................',
  '................',
  '.....kkkkkk.....',
  '....kWWWWWWk....',
  '...kWssWskWWk...',
  '..kWWWssWWkWWk..',
  '..kWppWssW.kWk..',
  '..kWWWsWWsWWWk..',
  '..kWsSWWWsSpWk..',
  '..kWSSSsWWSSWk..',
  '..kWWWSSWWWpWk..',
  '..kWWWWWWWWWpWk.',
  '...kWpWWWWWWWk..',
  '....kkkkkkkk....',
  '................',
  '................',
];
const eggCrack1B: SpriteFrame = [
  '................',
  '.....kkkkkk.....',
  '....kWWWWWWk....',
  '...kWssWskWWk...',
  '..kWWWssWWkWWk..',
  '..kWppWssW.kWk..',
  '..kWWWsWWsWWWk..',
  '..kWsSWWWsSpWk..',
  '..kWSSSsWWSSWk..',
  '..kWWWSSWWWpWk..',
  '..kWWWWWWWWWpWk.',
  '...kWpWWWWWWWk..',
  '....kkkkkkkk....',
  '................',
  '................',
  '................',
];

// Crack stage 2 — big cross-crack + two half-shells sliding apart
const eggCrack2A: SpriteFrame = [
  '................',
  '................',
  '.....kkkkkk.....',
  '....kWk.WWWk....',
  '...kWsWkWsWWk...',
  '..kWW.WsW.WWWk..',
  '..kWp.WsW.WpWk..',
  '..kWWWWW.WWWWk..',
  '..kW.sWWWs.SpWk.',
  '..kWSSSs.WSSWk..',
  '..kWWWSSWWWpWk..',
  '..kWWWWWWWWWpWk.',
  '...kWpWWWWWWWk..',
  '....kkkkkkkk....',
  '................',
  '................',
];
const eggCrack2B: SpriteFrame = [
  '................',
  '................',
  '....kk..kkk.....',
  '...kWk..WWWk....',
  '..kWsW..WsWWk...',
  '.kWW.W..W.WWWk..',
  '.kWp.W..W.WpWk..',
  '.kWWWW.W.WWWWk..',
  '.kW.sWWWs.SSpWk.',
  '.kWSSSs.W.SSWk..',
  '.kWWWSSWWW.pWk..',
  '.kWWWWWWWWWpWk..',
  '..kWpWWWWWWWk...',
  '...kkkkkkkkk....',
  '................',
  '................',
];

// Hatched — two half shells left/right at bottom, nothing in the middle
// (baby sprite takes over the screen once hatched=true; this frame is used
// briefly for 100ms visual "shells fall open" flash)
const eggHatched: SpriteFrame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.kkk........kkk.',
  'kWpk........kWpk',
  'kWpWk......kWpWk',
  '.kkkk......kkkk.',
  '................',
];

/* ================= animation definitions ================= */

/**
 * Egg animations map. Each has frames + frameTime.
 * The XState machine egg sub-machine sends 'next' via TICK and uses
 * hatching_wobble → hatching_crack → hatching_hatched in sequence.
 */
export type EggAnimationName =
  | 'wobble'
  | 'crack1'
  | 'crack2'
  | 'hatching_hatched'
  | 'idle'
  | 'blink';

export interface EggAnimation {
  readonly frames: readonly SpriteFrame[];
  readonly frameTime: number; // seconds per frame
}

export const eggAnimations: Record<EggAnimationName, EggAnimation> = {
  idle: { frames: [eggWhole], frameTime: 1 },
  wobble: { frames: [eggTiltLeft, eggWhole, eggTiltRight, eggWhole], frameTime: 0.22 },
  crack1: { frames: [eggCrack1A, eggCrack1B, eggCrack1A, eggWhole], frameTime: 0.2 },
  crack2: { frames: [eggCrack2A, eggCrack2B, eggCrack2A, eggWhole], frameTime: 0.18 },
  hatching_hatched: { frames: [eggHatched], frameTime: 0.12 },
  blink: { frames: [eggWhole], frameTime: 0.08 }, // unused but keeps interface uniform
};

/* Egg stage does not have eyes — leave eyeSlots empty (no eye tracking needed). */
export const eggEyeSlots: readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number }[] = [];

/* Make the linter happy about unused PALETTE import (used via renderSprite at runtime). */
void PALETTE;
