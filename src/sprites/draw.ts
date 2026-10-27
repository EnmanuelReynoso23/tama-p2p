import { PALETTE } from '../../core/sprites.js';

const COLORS = PALETTE as Record<string, string>;
const cache = new Map<string, HTMLCanvasElement>();

/**
 * Pasa un cuadro (lista de filas de letras) a un canvas 1:1, guardado en memoria.
 * Para dibujarlo grande se usa drawImage con imageSmoothingEnabled = false.
 */
export function spriteCanvas(rows: readonly string[]): HTMLCanvasElement {
  const key = rows.join('\n');
  let cvs = cache.get(key);
  if (cvs) return cvs;
  cvs = document.createElement('canvas');
  cvs.width = rows[0]?.length ?? 0;
  cvs.height = rows.length;
  const ctx = cvs.getContext('2d');
  if (ctx) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = COLORS[row[x]];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    });
  }
  if (cache.size > 200) cache.clear();
  cache.set(key, cvs);
  return cvs;
}
