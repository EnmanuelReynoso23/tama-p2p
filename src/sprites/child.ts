/**
 * CHILD stage sprite (day 1–3 after hatch).
 *
 * 18×18 frames (slightly larger than baby's 16×16) with tiny tail nub and
 * more defined head antennae. Design matches the pink blob look of baby but
 * with a visible tail curl and a slightly wider head / bigger smile.
 */

import type { SpriteFrame } from '../sprites/palette';
import { PALETTE } from '../sprites/palette';

export const CHILD_FRAME_W = 18;
export const CHILD_FRAME_H = 18;

type _F = SpriteFrame;
void ({} as _F);

/** Helper: keep pixel grids valid. All frames share W=18 H=18. */

const childBase0: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSWkSSkWSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSSwSSSSSSwSSSk.',
  '.kSSSwkSSSSkwSSSk.',
  '.kSSSSSSSSSSSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];

const childBase1: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSWkSSkWSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSSwSSSSSSwSSSk.',
  '.kSSSwkSSSSkwSSSk.',
  '.kSSSSSSSSSSSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];

// Happy — upward ^ eyes and open smile
const childHappy0: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSkkSSkkSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSS^SSSSSS^SSSk.',
  '.kSSSSSSWWSSSSSSk.',
  '.kSSSwwwwwwwSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];
const childHappy1: SpriteFrame = [
  '..................',
  '.......kkkk.......',
  '......kSSSSk......',
  '.....kSSSSSSk.....',
  '....kSWWSSWWSk....',
  '...kSSkkSSkkSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSS^SSSSSS^SSSk.',
  '.kSSSSSSWWSSSSSSk.',
  '.kSSSwwwwwwwSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];

// Eating — mouth-open chomp + crumb dot inside, close variation
const childEat0: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSWkSSkWSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSSwSSSSSSwSSSk.',
  '.kSSSSkkkkkkSSSSk.',
  '.kSSSkwWWWWwkSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];
const childEat1: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSWkSSkWSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSSwSSSSSSwSSSk.',
  '.kSSSSSkkkkSSSSSk.',
  '.kSSSSkkSSkkSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];

// Playing — jumping side-to-side, squashed vs stretched
const childPlay0: SpriteFrame = [
  '..................',
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSkkSSkkSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSS^SSSSSS^SSSk.',
  '.kSSSSSSwwSSSSSSk.',
  '.kSSSSSSSSSSSSSSk.',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk.......kkk..',
  '..................',
  '..................',
  '..................',
];
const childPlay1: SpriteFrame = [
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSkkSSkkSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSS^SSSSSS^SSSk.',
  '.kSSSSSSwwSSSSSSk.',
  '.kSSSSSSSSSSSSSSk.',
  '.kSSSdddSdddSdSSk.',
  '..kddddddSSSddddk.',
  '..kkddddd.Sddddkk.',
  '...kkkkk..kkkkkk..',
  '..................',
  '..................',
  '..................',
  '..................',
];

// Sleeping — closed zzz eyelids flat, body relaxed
const childSleep0: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSSSSSSSSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSS---SS---SSSk.',
  '.kSSSSSSSSSSSSSSk.',
  '.kSSSSSSSSSSSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];
const childSleep1: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSSSSSSSSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSS=SSSS=SSSSSk.',
  '.kSSSSSSSSSSSSSSk.',
  '.kSSSSSSSSSSSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];

// Hungry — droopy, stomach rumble (slightly sad eyes + open mouth down curve)
const childHungry0: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSkkSSkkSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSSvSSSSSSvSSSk.',
  '.kSSSSSSSSSSSSSSk.',
  '.kSSSSSwwwwSSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];
const childHungry1: SpriteFrame = [
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSkkSSkkSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSSvSSSSSSvSSSk.',
  '.kSSSSSSSSSSSSSSk.',
  '.kSSSSSwwwwSSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '.kSdddSkdddSdddSk.',
  'kkdddSSSdddSSSddkk',
  'kkk...SSSSS...kkk.',
  '......kkkk........',
  '..................',
  '..................',
  '..................',
];

// Sad — tear drop
const childSad0: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSkkSSkkSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSSxSSSSSSxSSSk.',
  '.kSSSSSSSSSSSSSSk.',
  '.kSSSwwwSSwwwSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];
const childSad1: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSkkSSkkSSk...',
  '..kSSSSSSSSSSSSk..',
  '.bkSSSppSSppSSSk..',
  'bbSSSSSSSSSSSSSSk.',
  'bkSSSSSSSSSSSSSSk.',
  '.kSSSwwwSSwwwSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];

// Sick — wobbly tilt + green tint applied at runtime via renderSprite tint
const childSick0: SpriteFrame = [
  '..................',
  '......kkkk........',
  '....kkSSSSkk......',
  '...kSWWSSWWSk.....',
  '..kSSkkSSkkSSk....',
  '.kSSSSSSSSSSSSk...',
  '.kSSSppSSppSSSk...',
  'kSSSxSSSSSSxSSSk..',
  'kSSSSSSwwSSSSSSk..',
  'kSSSSSwSwwSwSSSk..',
  '.kSSSSdSSSSdSSk...',
  '..kSdddSdddSddSk..',
  '..kkddd.SSS.dddk..',
  '...kkk..kkk..kk...',
  '..................',
  '..................',
  '..................',
  '..................',
];
const childSick1: SpriteFrame = [
  '..................',
  '........kkkk......',
  '......kkSSSSkk....',
  '.....kSWWSSWWSk...',
  '....kSSkkSSkkSSk..',
  '...kSSSSSSSSSSSSk.',
  '...kSSSppSSppSSSk.',
  '..kSSSxSSSSSSxSSSk',
  '..kSSSSSSwwSSSSSk.',
  '..kSSSSSwSwwSwSSSk',
  '...kSSSSdSSSSdSSk.',
  '....kSdddSdddSdSk.',
  '....kkdddSSSSddkk.',
  '.....kkk.kkk.kkk..',
  '..................',
  '..................',
  '..................',
  '..................',
];

// Dirty — brown overlay spots (stink particles also drawn; this adds body specks)
const childDirty0: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWcSScWSk....',
  '...kSSWkSSkWSSk...',
  '..kcSSSSSSSSSSck..',
  '..kSSSppSSppSSSk..',
  '.kSSSwSSccSSwSSSk.',
  '.kSSSwkcSSckwSSSk.',
  '.kSSSSSSSSSSSScck.',
  '.kSSScdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];
const childDirty1: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWc....c',
  '...kSSkkcckSSck...',
  '..kSSSSSSSSSSSSk..',
  '..kcSSppcSppcSck..',
  '.kSSSwSSSSSSwSSSk.',
  '.kSSSwkSSSSkwSSSk.',
  '.kSSccSSSSSSSSSck.',
  '.kSSSSdccSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];

// Being petted — eyes ^ ^ + blush
const childPet0: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSkkSSkkSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSPPppSSppPPSk..',
  '.kSSS^^SSSS^^SSSk.',
  '.kSSSSSSSSSSSSSSk.',
  '.kSSSwwSSwwSSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];
const childPet1: SpriteFrame = [
  '..................',
  '.......kkkk.......',
  '......kSSSSk......',
  '.....kSSSSSSk.....',
  '....kSWWSSWWSk....',
  '...kSSkkSSkkSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSPPppSSppPPSk..',
  '.kSSS^^SSSS^^SSSk.',
  '.kSSSSSSSSSSSSSSk.',
  '.kSSSwwSSwwSSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];

// Refusing (too full / too tired) — head shake X eyes
const childRefuse0: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSWXSSXWSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSppSSppSSSk..',
  '.kSSSwSSSSSSwSSSk.',
  '.kSSSSkSSSSkSSSSk.',
  '.kSSSSwwwwwwSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];
const childRefuse1: SpriteFrame = [
  '..................',
  '.....kkkk.........',
  '....kSSSSk........',
  '...kSSSSSSk.......',
  '..kSWWSSWWSk......',
  '.kSSWXSSXWSSk.....',
  'kSSSSSSSSSSSSk....',
  'kSSSppSSppSSSk....',
  'kSSwSSSSSSwSSSk...',
  'kSSkSSSSkSSSSSk...',
  'kSSwwwwwwSSSSk....',
  '.kSSdSSSSdSSSk....',
  '..kSdddSdddSdSk...',
  '..kkddSSSSSddkk...',
  '...kk.kkkk.kk.....',
  '..................',
  '..................',
  '..................',
];

// Cleaning — soap bubble aura overlay drawn via particles; body tint wet shine
const childClean0: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkSSSSkk.....',
  '....kSWWSSWWSk....',
  '...kSSWkSSkWSSk...',
  '..kSSSSSSSSSSSSk..',
  '..kSSSbbSSbbSSSk..',
  '.kSSSwSSSSSSwSSSk.',
  '.kSSSSkSSSSkSSSSk.',
  '.kSSSSSSwwSSSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];
const childClean1: SpriteFrame = [
  '..................',
  '..................',
  '.......kkkk.......',
  '.....kkbBbbkk.....',
  '....kSWWbbWWSk....',
  '...kSSWkbbkWSSk...',
  '..kSSbbbbbbbbSSk..',
  '..kSSSbbSSbbSSSk..',
  '.kSSSwSSSSSSwSSSk.',
  '.kSSSSkSSSSkSSSSk.',
  '.kSSSSSSwwSSSSSSk.',
  '.kSSSSdSSSSdSSSk..',
  '..kSdddSdddSdddSk.',
  '..kkddd.SSS.dddkk.',
  '...kkk..kkk..kkk..',
  '..................',
  '..................',
  '..................',
];

/* ============================= animations ================================= */

export type ChildAnimationName =
  | 'idle'
  | 'happy'
  | 'eating'
  | 'playing'
  | 'sleeping'
  | 'hungry'
  | 'sad'
  | 'sick'
  | 'dirty'
  | 'pet'
  | 'refuse'
  | 'clean'
  | 'blink';

export interface ChildAnimation {
  readonly frames: readonly SpriteFrame[];
  readonly frameTime: number;
}

export const childAnimations: Record<ChildAnimationName, ChildAnimation> = {
  idle:     { frames: [childBase0, childBase1], frameTime: 0.45 },
  happy:    { frames: [childHappy0, childHappy1], frameTime: 0.22 },
  eating:   { frames: [childEat0, childEat1], frameTime: 0.18 },
  playing:  { frames: [childPlay0, childPlay1, childPlay0, childPlay1], frameTime: 0.18 },
  sleeping: { frames: [childSleep0, childSleep1], frameTime: 0.6 },
  hungry:   { frames: [childHungry0, childHungry1], frameTime: 0.35 },
  sad:      { frames: [childSad0, childSad1], frameTime: 0.5 },
  sick:     { frames: [childSick0, childSick1], frameTime: 0.4 },
  dirty:    { frames: [childDirty0, childDirty1], frameTime: 0.5 },
  pet:      { frames: [childPet0, childPet1], frameTime: 0.28 },
  refuse:   { frames: [childRefuse0, childRefuse1], frameTime: 0.2 },
  clean:    { frames: [childClean0, childClean1], frameTime: 0.3 },
  blink:    { frames: [childBase0, childBase0], frameTime: 0.08 },
};

/**
 * Eye slot metadata (in frame-local pixel coordinates W=18 H=18).
 * Two eyes each of width=2 height=3 px.
 */
export const childEyeSlots: readonly {
  readonly x: number; readonly y: number; readonly w: number; readonly h: number;
}[] = [
  { x: 6,  y: 8, w: 2, h: 2 },
  { x: 11, y: 8, w: 2, h: 2 },
];

void PALETTE;
