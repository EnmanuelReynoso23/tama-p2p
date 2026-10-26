/**
 * BABY stage sprites — 16×16 px original.
 *
 * Each frame is a grid of palette chars; '.' means transparent.
 * Eyes are NOT drawn in the body frames — they are a separate overlay
 * layer rendered by PetCanvas so the pupils can follow the cursor.
 * Instead, each frame ships with `eyeSlots` giving the bounding pixel
 * rects of each eye, and a `mouth` rect so we know where food/tears go.
 *
 * Design: a round, blob-like critter with big eyes, two tiny antennae
 * stubs, and small pink feet. Original character design — no
 * resemblance to any existing IP.
 */

import type { SpriteFrame } from './palette';

export const BABY_FRAME_W = 16;
export const BABY_FRAME_H = 16;

/* --------------------------------------------------------------------- */
/*  Body frames (no eyes drawn)                                          */
/* --------------------------------------------------------------------- */

// Idle (breathing bob) — frame 1: slightly compressed
export const babyIdle1: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '..kSSSSSSSSSSk..',
  '.kSSSSSSSSSSSSSk',
  '.kSwwSSSSSSwwSSk',
  '.kSSSSSSSSSSSSSk',
  '.kSSSSSSSSSSSSSk',
  '.kSddSSSSSSddSSk',
  '.kSSSSSSSSSSSSSk',
  '..kSSSSSSSSSSk..',
  '..kSSSk..kSSSk..',
  '...kSk....kSk...',
  '....k......k....',
  '................',
  '................',
];

// Idle — frame 2: slightly expanded inhale
export const babyIdle2: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '.kSSSSSSSSSSSSk.',
  'kSSSSSSSSSSSSSkk',
  'kSwwSSSSSSwwSSkk',
  'kSSSSSSSSSSSSSkk',
  'kSSSSSSSSSSSSSkk',
  'kSSSSSSSSSSSSSkk',
  'kSddSSSSSSddSSkk',
  'kSSSSSSSSSSSSSkk',
  '.kSSSSSSSSSSSk..',
  '..kSSSk..kSSSk..',
  '...kSk....kSk...',
  '....k......k....',
  '................',
];

// Blink (eye line drawn in-body so the eye overlay layer can be skipped)
export const babyBlink: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '..kSSSSSSSSSSk..',
  '.kSSSSSSSSSSSSSk',
  '.kSkkkSSSSkkkSk.',
  '.kSSSSSSSSSSSSSk',
  '.kSSSSSSSSSSSSSk',
  '.kSddSSSSSSddSSk',
  '.kSSSSSSSSSSSSSk',
  '..kSSSSSSSSSSk..',
  '..kSSSk..kSSSk..',
  '...kSk....kSk...',
  '....k......k....',
  '................',
  '................',
];

// Happy — eyes blanked out (overlay draws ^ ^), big smile with cheeks
export const babyHappy: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '.kSSSSSSSSSSSSk.',
  'kSSSSSSSSSSSSSkk',
  'kSSSSkSSSSkSSSkk',
  'kSSSSSSSSSSSSSk.',
  'kSSSppSSSSppSSk.',
  'kSSSSSSkkSSSSSk.',
  '.kSSSSkkkkSSSk..',
  '..kSSSSSSSSSSk..',
  '..kSSSk..kSSSk..',
  '...kSk....kSk...',
  '....k......k....',
  '................',
  '................',
];

// Sleeping — closed eyes (kkkk lines), soft small mouth
export const babySleeping: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '..kSSSSSSSSSSk..',
  '.kSSSSSSSSSSSSSk',
  '.kSkkkSSSSkkkSk.',
  '.kSSSSSSSSSSSSSk',
  '.kSSSSSkkSSSSSSk',
  '.kSddSSSSSSddSSk',
  '.kSSSSSSSSSSSSSk',
  '..kSSSSSSSSSSk..',
  '..kSSSk..kSSSk..',
  '...kSk....kSk...',
  '....k......k....',
  '................',
  '................',
];

// Eating — mouth open; crumbs emit around mouth pixel
export const babyEating: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '..kSSSSSSSSSSk..',
  '.kSSSSSSSSSSSSSk',
  '.kSwwSSSSSSwwSSk',
  '.kSSSSSSSSSSSSSk',
  '.kSSSSSokkoSSSSk',
  '.kSddSSSSSSddSSk',
  '.kSSSSSSSSSSSSSk',
  '..kSSSSSSSSSSk..',
  '..kSSSk..kSSSk..',
  '...kSk....kSk...',
  '....k......k....',
  '................',
  '................',
];

// Sad — droopy body, we'll draw a tear on top
export const babySad: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '..kSSSSSSSSSSk..',
  '..kSSSSSSSSSSSk.',
  '.kSSwwSSSSSwwSSk',
  '.kSSSSSSSSSSSSSk',
  '.kSSSSSSSSSSSSSk',
  '.kSSddSSSSddSSSk',
  '..kSSSSSSSSSSSk.',
  '...kSSSSSSSSSk..',
  '...kSSk..kSSSk..',
  '....kS....kSk...',
  '.....k....k.....',
  '................',
  '................',
];

// Hungry — droopy, empty-stomach outline mouth
export const babyHungry: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '..kSSSSSSSSSSk..',
  '.kSSSSSSSSSSSSSk',
  '.kSwwSSSSSSwwSSk',
  '.kSSSSSSSSSSSSSk',
  '.kSSSSSkkkkSSSSk',
  '.kSddSSSSSSddSSk',
  '.kSSSSSSSSSSSSSk',
  '..kSSSSSSSSSSk..',
  '..kSSSk..kSSSk..',
  '...kSk....kSk...',
  '....k......k....',
  '................',
  '................',
];

// Dirty — brown spots overlay
export const babyDirty: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '..kSSSSSSSSSSk..',
  '.kSSSSccSSSScSSk',
  '.kSwwSSSSccwwSSk',
  '.kSSScSSSSSSSSck',
  '.kSSSSSSScSSSSSk',
  '.kSddSSccSSddSSk',
  '.kSSSSSSSScSSSSk',
  '..kcSSSSSSSSSk..',
  '..kSSSk..kSSSk..',
  '...kSk....kSk...',
  '....k......k....',
  '................',
  '................',
];

// Sick — wobbly zigzag mouth (body tint applied via renderSprite tint param)
export const babySick: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '..kSSSSSSSSSSk..',
  '.kSSSSSSSSSSSSSk',
  '.kSwwSSSSSSwwSSk',
  '.kSSSSSSSSSSSSSk',
  '.kSSSkSkSkSSSSSk',
  '.kSddSSSSSSddSSk',
  '.kSSSSSSSSSSSSSk',
  '..kSSSSSSSSSSk..',
  '..kSSSk..kSSSk..',
  '...kSk....kSk...',
  '....k......k....',
  '................',
  '................',
];

// Being petted — no eyes drawn in body (overlay draws happy ^ ^), big blush
export const babyPet: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '..kSSSSSSSSSSk..',
  '.kSSSSSSSSSSSSSk',
  '.kSSSSkSSSkSSSSk',
  '.kSSSSSSSSSSSSSk',
  '.kSppppSSppppSSk',
  '.kSddSSSSSSddSSk',
  '.kSSSSSSSSSSSSSk',
  '..kSSSSSSSSSSk..',
  '..kSSSk..kSSSk..',
  '...kSk....kSk...',
  '....k......k....',
  '................',
  '................',
];

// Playing jump frame (airborne, no feet)
export const babyPlaying: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '.kSSSSSSSSSSSSk.',
  'kSSSSSSSSSSSSSkk',
  'kSwwSSSSSSwwSSkk',
  'kSSSSSSSSSSSSSk.',
  'kSSSSSSSSSSSSSk.',
  'kSddSSSSSSddSSk.',
  '.kSSSSSSSSSSSk..',
  '..kSSSSSSSSSSk..',
  '...kSSkkSSSk....',
  '................',
  '................',
  '................',
  '................',
];

// Refusing / too full / tired — wavy eye lines + frown
export const babyRefuse: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '..kSSSSSSSSSSk..',
  '.kSSSSSSSSSSSSSk',
  '.kSkSkSSSSkSkSk.',
  '.kSSSSSSSSSSSSSk',
  '.kSSSSwwwwSSSSSk',
  '.kSddSSSSSSddSSk',
  '.kSSSSSSSSSSSSSk',
  '..kSSSSSSSSSSk..',
  '..kSSSk..kSSSk..',
  '...kSk....kSk...',
  '....k......k....',
  '................',
  '................',
];

// Cleaning (being scrubbed) — bubble layer handled by particle system
export const babyClean: SpriteFrame = [
  '................',
  '.....k...k......',
  '...k.kSk.kSk....',
  '..kSSSSSSSSSSk..',
  '.kSSSSSSSSSSSSSk',
  '.kSwwSSSSSSwwSSk',
  '.kSSSSSSSSSSSSSk',
  '.kSSSSSwwwSSSSSk',
  '.kSddSSSSSSddSSk',
  '.kSSSSSSSSSSSSSk',
  '..kSSSSSSSSSSk..',
  '..kSSSk..kSSSk..',
  '...kSk....kSk...',
  '....k......k....',
  '................',
  '................',
];

/* --------------------------------------------------------------------- */
/*  Meta — eye + mouth pixel rects so we can layer pupils onto frames.   */
/*  Coordinates are in sprite-local pixels (16x16 grid).                 */
/* --------------------------------------------------------------------- */

export interface EyeSlot {
  /** Top-left X of the eye socket in the 16x16 frame. */
  x: number;
  y: number;
  /** Inner clear width/height of the white of the eye. */
  w: number;
  h: number;
}

export const babyEyeSlots: [EyeSlot, EyeSlot] = [
  { x: 3, y: 5, w: 2, h: 1 }, // left
  { x: 10, y: 5, w: 2, h: 1 }, // right
];

/** Mouth rect (for crumbs, food etc.) in sprite-local pixels. */
export const babyMouthRect = { x: 7, y: 7, w: 2, h: 1 };

/* --------------------------------------------------------------------- */
/*  Animations — collections of frames + per-frame display time (s)      */
/* --------------------------------------------------------------------- */

export const babyAnimations = {
  idle: { frames: [babyIdle1, babyIdle2], frameTime: 0.6 },
  happy: { frames: [babyHappy, babyIdle2], frameTime: 0.22 },
  eating: { frames: [babyEating, babyIdle2], frameTime: 0.18 },
  playing: { frames: [babyPlaying, babyIdle1], frameTime: 0.2 },
  sleeping: { frames: [babySleeping, babyIdle1], frameTime: 1.2 },
  hungry: { frames: [babyHungry, babyIdle1], frameTime: 0.35 },
  sad: { frames: [babySad, babyIdle2], frameTime: 0.6 },
  sick: { frames: [babySick, babyIdle2], frameTime: 0.5 },
  dirty: { frames: [babyDirty, babyIdle1], frameTime: 0.5 },
  pet: { frames: [babyPet, babyIdle2], frameTime: 0.28 },
  refuse: { frames: [babyRefuse, babyIdle2], frameTime: 0.25 },
  clean: { frames: [babyClean, babyIdle2], frameTime: 0.22 },
  blink: { frames: [babyBlink], frameTime: 0.16 },
} as const;

export type BabyAnimationName = keyof typeof babyAnimations;
