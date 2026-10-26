/**
 * Shared palette for all sprites in the game.
 * Keys are single chars used inside sprite grid strings; `null` means
 * transparent. Soft pastels + one dark outline colour `k`.
 *
 * Palette order is loosely grouped: outline/skin/accent/eyes/cheeks/
 * health(sick)/hygiene(dirty)/food(snack)/nature.
 */
export const PALETTE = {
  '.': null,
  k: '#2b2138', // dark outline
  w: '#ffffff', // white
  W: '#f5f2ea', // off-white (highlights)
  s: '#f7d5e0', // light skin tint
  S: '#f7a8c4', // main body pink
  d: '#e085a6', // body shadow pink
  b: '#7ec8e3', // sky/eye blue
  B: '#3e8fb8', // eye blue shadow
  e: '#4d3f62', // soft purple
  p: '#ff6b8a', // cheek/happy pink
  g: '#9bd66f', // grass/green
  G: '#5ea84c', // dark green
  y: '#ffd447', // yellow
  o: '#ffa24a', // orange
  r: '#e94c5a', // red
  c: '#b07c4a', // brown (dirty)
  h: '#88d498', // mint (health)
  n: '#c9b6ff', // lilac (sparkles)
  t: '#f1e57a', // cream
} as const;

export type PaletteKey = keyof typeof PALETTE;
export const PALETTE_KEYS = Object.keys(PALETTE) as PaletteKey[];

export type SpriteFrame = readonly string[];

/*
 * Legacy strict-frame helpers. Kept for reference; current authoring uses plain
 * SpriteFrame (readonly string[]) and we validate at render-time only.
 */
type _CharOfString<S extends string> = S extends `${infer C}${infer R}`
  ? C | _CharOfString<R>
  : never;
type _FrameRow<W extends number, Acc extends readonly PaletteKey[] = []> =
  Acc['length'] extends W
    ? { str: ''; keys: Acc } extends { str: `${infer S}`; keys: unknown }
      ? S
      : never
    : _FrameRow<W, readonly [...Acc, PaletteKey]>;
void ({} as _CharOfString<'ab'>);
void ({} as _FrameRow<5>);

