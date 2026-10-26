/**
 * Tiny 2–8 px sprite snippets used for overlay effects drawn around the pet
 * or in the scene: hearts (petting/happy), food crumbs, bubbles, Zs,
 * sparkles, stink lines, tears, butterfly. Each is a compact SpriteFrame
 * suitable to be blitted by the ParticleSystem.
 */
import type { SpriteFrame } from './palette';

export const heartFx: SpriteFrame = [
  '....',
  'pkpk',
  'pSSp',
  '.pp.',
];

export const crumbFx: SpriteFrame = [
  'yoy',
  'oyo',
  'yoy',
];

export const bubbleFx: SpriteFrame = [
  '.kk.',
  'kbWk',
  'kbbk',
  '.kk.',
];

export const zedFx: SpriteFrame = [
  'kkkkk',
  '...k.',
  '..k..',
  '.k...',
  'kkkkk',
];

export const sparkleFx: SpriteFrame = [
  '..n..',
  '.nWn.',
  'nWWWn',
  '.nWn.',
  '..n..',
];

export const stinkFx: SpriteFrame = [
  '.c.c.',
  'ckckc',
  '.ccc.',
  'ckckc',
  '.c.c.',
];

export const tearFx: SpriteFrame = [
  '.b.',
  'BbB',
  '.B.',
];

export const starFx: SpriteFrame = [
  '..y..',
  '.yWy.',
  'yWWWy',
  '.yWy.',
  '..y..',
];

export const butterflyFx: SpriteFrame = [
  '.p.p.',
  'pSpSp',
  '.S.S.',
  'pSpSp',
  '.p.p.',
];

/* ----------------------------------------------------------------- */
/*  Helper: eye whites + pupils, composed programmatically in        */
/*  PetCanvas so they can be aligned per-frame.                      */
/* ----------------------------------------------------------------- */

/** 3x3 small eye white (left/right) — caller chooses inner pupil offset. */
export const eyeWhite3x3: SpriteFrame = [
  'kkk',
  'kwk',
  'kkk',
];
/** 2x2 pupil drawn on top of white. */
export const pupil2x2: SpriteFrame = [
  'kk',
  'kk',
];
/** Half-closed happy eye ^ ^ */
export const eyeHappy: SpriteFrame = ['kkk', 'k.k', 'k.k'];
/** Closed sleeping eye line `-` */
export const eyeSleep: SpriteFrame = ['kkk', '...', '...'];
