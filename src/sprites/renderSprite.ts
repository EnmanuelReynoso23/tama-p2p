import type { PaletteKey, SpriteFrame } from './palette';
import { PALETTE } from './palette';

/**
 * Render a pixel-grid sprite frame to a 2D context.
 *
 * Each char in `frame` maps to a palette color; '.' (or any key mapping to
 * null) is transparent. The frame is drawn with `imageSmoothingEnabled=false`
 * so it stays crisp when scaled.
 *
 * Performance: frames are cached to a per-frame-key offscreen canvas so a
 * repeated draw becomes a single `drawImage` blit instead of a per-pixel
 * `fillRect` loop. The cache lives in module scope.
 */

type CacheKey = string;

const frameCache = new Map<CacheKey, HTMLCanvasElement>();
let cacheHits = 0; // informational, not currently exposed

function buildCacheKey(
  frame: SpriteFrame,
  paletteObj: Record<string, string | null>,
): CacheKey {
  // JSON of { rows + sorted (key,color) pairs is stable enough for our cache.
  const paletteSig = Object.entries(paletteObj)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v ?? 'null'}`)
    .join('|');
  return frame.join('\n') + '||' + paletteSig;
}

function validateFrame(frame: SpriteFrame): { w: number; h: number } {
  if (frame.length === 0) throw new Error('Sprite frame is empty.');
  const w = frame[0].length;
  for (let i = 0; i < frame.length; i++) {
    if (frame[i].length !== w) {
      throw new Error(
        `Sprite frame row ${i} has width ${frame[i].length}, expected ${w}.`,
      );
    }
  }
  return { w, h: frame.length };
}

function renderToOffscreen(
  frame: SpriteFrame,
  paletteObj: Record<string, string | null>,
): HTMLCanvasElement {
  const { w, h } = validateFrame(frame);
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const c = cvs.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    const row = frame[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x] as PaletteKey;
      const col = paletteObj[ch];
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(x, y, 1, 1);
    }
  }
  return cvs;
}

/**
 * Draw a sprite frame.
 * @param ctx Target canvas 2D context.
 * @param frame Array of same-length strings, one char per pixel.
 * @param paletteObj Color map (defaults to shared PALETTE).
 * @param x Top-left destination x in ctx pixels.
 * @param y Top-left destination y in ctx pixels.
 * @param scale Integer scale factor. Default 1 (1 pixel = 1 ctx pixel).
 * @param tint Optional CSS color applied as a composite "source-atop" tint
 *   (e.g. use green-ish rgba to make sprite look sick). Applied after
 *   blitting the cached pixel art.
 */
export function renderSprite(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame,
  paletteObj: Record<string, string | null> = PALETTE,
  x = 0,
  y = 0,
  scale = 1,
  tint?: string,
): { w: number; h: number } {
  const { w, h } = validateFrame(frame);
  const key = buildCacheKey(frame, paletteObj);
  let offscreen = frameCache.get(key);
  if (!offscreen) {
    offscreen = renderToOffscreen(frame, paletteObj);
    frameCache.set(key, offscreen);
  } else {
    cacheHits++;
  }

  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreen, x, y, w * scale, h * scale);
  ctx.imageSmoothingEnabled = prev;

  if (tint) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = tint;
    ctx.fillRect(x, y, w * scale, h * scale);
    ctx.restore();
  }

  return { w: w * scale, h: h * scale };
}

/**
 * Evict a single frame or all frames from the cache. Used by tests and dev
 * tools to keep memory bounded (in practice, our ~80 frames never cause
 * issues, but the API exists for hygiene).
 */
export function clearSpriteCache(frame?: SpriteFrame): void {
  if (!frame) {
    frameCache.clear();
    return;
  }
  for (const [k] of frameCache) {
    if (k.startsWith(frame.join('\n'))) frameCache.delete(k);
  }
}

export function spriteCacheSize(): number {
  return frameCache.size;
}
