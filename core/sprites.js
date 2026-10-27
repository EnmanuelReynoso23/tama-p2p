// @ts-check
/**
 * Dibujos de Animo, generados por codigo (24x24 pixeles).
 *
 * La mascota es un brote: un cuerpo redondo con hojas que crecen en cada etapa.
 * De adulto puede ser "radiant" (le sale una flor), "chill" (una hoja ancha de
 * sombrero) o "scruffy" (hojas revueltas). La cara cambia con el animo.
 *
 * Cada cuadro es una lista de 24 cadenas; cada letra es un color de PALETTE
 * ('.' es transparente). Lo usan la app web (canvas) y el firmware (Poco).
 */

export const SPRITE_SIZE = 24;

/** Colores por letra. */
export const PALETTE = {
  o: '#2b2238', // contorno
  b: '#a7e8bd', // cuerpo
  l: '#dbf8e3', // cuerpo con luz
  d: '#72c690', // cuerpo con sombra
  q: '#d7dca2', // cuerpo enfermo
  Q: '#b3b878', // sombra enfermo
  g: '#4fb35f', // hoja
  G: '#2f7d3b', // hoja oscura y tallo
  e: '#2b2238', // ojos y boca
  w: '#ffffff', // brillo del ojo
  c: '#ff9eb5', // cachetes
  m: '#d0435f', // boca abierta
  p: '#ffb8cb', // petalo
  P: '#f27b9e', // petalo oscuro
  y: '#ffd45c', // centro de la flor
  s: '#fff3da', // cascaron
  h: '#e6cfa6', // cascaron con sombra
  S: '#f0a96b', // manchas del cascaron
  z: '#7f8fe6', // letras de sueno, lagrimas, sudor
  n: '#9a7259', // caca
  N: '#62452f', // caca oscura
};

/** @typedef {'egg' | 'baby' | 'child' | 'teen' | 'adult'} Stage */
/** @typedef {'radiant' | 'chill' | 'scruffy'} Form */
/** @typedef {'egg' | 'sleep' | 'sick' | 'hungry' | 'dirty' | 'sad' | 'tired' | 'happy' | 'ok'} Mood */
/** @typedef {string[][]} Grid */

const N = SPRITE_SIZE;

/** @returns {Grid} */
function blank() {
  const g = [];
  for (let y = 0; y < N; y++) {
    const row = [];
    for (let x = 0; x < N; x++) row.push('.');
    g.push(row);
  }
  return g;
}

/** @param {Grid} g @param {number} x @param {number} y @param {string} c */
function put(g, x, y, c) {
  if (x >= 0 && x < N && y >= 0 && y < N) g[y][x] = c;
}

/** @param {Grid} g @returns {string[]} */
function rows(g) {
  return g.map((r) => r.join(''));
}

/** Contorno alrededor de todo lo pintado. @param {Grid} g */
function outline(g) {
  const out = blank();
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (g[y][x] !== '.') {
        out[y][x] = g[y][x];
        continue;
      }
      const near =
        (y > 0 && g[y - 1][x] !== '.') ||
        (y < N - 1 && g[y + 1][x] !== '.') ||
        (x > 0 && g[y][x - 1] !== '.') ||
        (x < N - 1 && g[y][x + 1] !== '.');
      if (near) out[y][x] = 'o';
    }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Huevo                                                             */
/* ------------------------------------------------------------------ */

/** @param {number} t cuadro 0 o 1 */
function eggFrame(t) {
  const g = blank();
  const cy = 13;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const ry = y + 0.5 < cy ? 8.5 : 7;
      const nx = (x + 0.5 - 12) / 6.2;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      // Se mece: la mitad de arriba se inclina un pixel en el cuadro 1.
      const sx = t === 1 && y < cy - 2 ? x + 1 : x;
      put(g, sx, y, nx * 0.6 + ny * 0.8 > 0.55 ? 'h' : 's');
    }
  const lean = (/** @type {number} */ y) => (t === 1 && y < cy - 2 ? 1 : 0);
  for (const [x, y] of [[9, 8], [10, 8], [10, 9], [14, 12], [15, 12], [15, 13], [10, 16], [11, 16]])
    put(g, x + lean(y), y, 'S');
  // Una puntita verde asoma por arriba.
  put(g, 12 + lean(4), 4, 'g');
  put(g, 13 + lean(3), 3, 'g');
  return outline(g);
}

/* ------------------------------------------------------------------ */
/*  Brote                                                             */
/* ------------------------------------------------------------------ */

const BODY = {
  baby: { rx: 5, ry: 4, cy: 18, eye: 2, big: false },
  child: { rx: 6, ry: 5, cy: 17, eye: 2, big: false },
  teen: { rx: 7, ry: 5.5, cy: 16.5, eye: 3, big: true },
  adult: { rx: 8, ry: 6.5, cy: 16, eye: 3, big: true },
};

/** Hojas mirando a la derecha: [dx, dy, color]. Se reflejan para la izquierda. */
const LEAF_S = [[1, 0, 'g'], [2, -1, 'g'], [2, 0, 'G']];
const LEAF_M = [[1, 0, 'g'], [2, 0, 'g'], [1, -1, 'g'], [2, -1, 'g'], [3, -1, 'g'], [3, -2, 'g'], [3, 0, 'G'], [4, -2, 'G']];
const LEAF_L = [
  [1, 0, 'g'], [2, 0, 'g'], [3, 0, 'g'], [4, 0, 'G'],
  [1, -1, 'g'], [2, -1, 'g'], [3, -1, 'g'], [4, -1, 'g'], [5, -1, 'G'],
  [2, -2, 'g'], [3, -2, 'g'], [4, -2, 'g'], [5, -2, 'g'],
  [4, -3, 'g'], [5, -3, 'G'],
];
const LEAF_DROOP = [[1, 0, 'G'], [2, 1, 'g'], [3, 1, 'g'], [3, 2, 'G']];

/**
 * @param {Grid} g
 * @param {number[][] | (string|number)[][]} leaf
 * @param {number} x
 * @param {number} y
 * @param {1 | -1} dir
 */
function leaf(g, leaf, x, y, dir) {
  for (const [dx, dy, c] of /** @type {[number, number, string][]} */ (leaf)) put(g, x + dx * dir, y + dy, c);
}

/** Flor redonda de petalos (forma radiant). */
const FLOWER = ['.ppp.', 'ppppp', 'pyyyp', 'pyyyp', '.PPP.'];

/**
 * @param {Stage} stage
 * @param {Form | null} form
 * @param {Mood} mood
 * @param {number} t cuadro 0 o 1
 * @returns {string[]}
 */
function sproutFrame(stage, form, mood, t) {
  const B = BODY[/** @type {'baby'|'child'|'teen'|'adult'} */ (stage)] || BODY.baby;
  const g = blank();
  const asleep = mood === 'sleep';
  // Rebote: en el cuadro 1 el cuerpo se aplasta un poco (al dormir, apenas respira).
  const squash = t === 1 ? (asleep ? 0.3 : 0.6) : 0;
  const rx = B.rx + squash;
  const ry = B.ry - squash;
  const cy = B.cy + squash;
  const sick = mood === 'sick';
  const body = sick ? 'q' : 'b';
  const shade = sick ? 'Q' : 'd';
  const light = sick ? 'q' : 'l';

  let top = N;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const nx = (x + 0.5 - 12) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      if (y < top) top = y;
      let c = body;
      if (nx * 0.5 + ny * 0.85 > 0.6) c = shade;
      else if (-nx * 0.6 - ny * 0.75 > 0.45 && nx * nx + ny * ny < 0.7) c = light;
      put(g, x, y, c);
    }

  // Tallo y hojas. Al estar despierta, las hojas se mecen en el cuadro 1.
  const sway = t === 1 && !asleep ? 1 : 0;
  const stemLen = stage === 'baby' ? 2 : stage === 'adult' && form === 'chill' ? 1 : stage === 'adult' ? 4 : 3;
  for (let i = 1; i <= stemLen; i++) put(g, 12 + (i === stemLen ? sway : 0), top - i, 'G');
  const sx = 12 + sway;
  const sy = top - stemLen;

  if (stage === 'baby') {
    leaf(g, LEAF_S, sx, sy, 1);
    leaf(g, LEAF_S, sx, sy, -1);
  } else if (stage === 'child') {
    leaf(g, LEAF_M, sx, sy, 1);
    leaf(g, LEAF_M, sx, sy, -1);
  } else if (stage === 'teen') {
    leaf(g, LEAF_L, sx, sy, 1);
    leaf(g, LEAF_M, sx, sy + 1, -1);
  } else if (form === 'chill') {
    // Hoja ancha como sombrero.
    for (let dx = -6; dx <= 6; dx++) put(g, sx + dx, sy, Math.abs(dx) === 6 ? 'G' : 'g');
    for (let dx = -5; dx <= 5; dx++) put(g, sx + dx, sy - 1, 'g');
    for (let dx = -3; dx <= 3; dx++) put(g, sx + dx, sy - 2, 'g');
    for (let dx = -2; dx <= 2; dx += 2) put(g, sx + dx, sy - 1, 'G');
    put(g, sx - 7, sy + 1, 'G');
    put(g, sx + 7, sy + 1, 'G');
  } else if (form === 'scruffy') {
    leaf(g, LEAF_M, sx, sy, -1);
    leaf(g, LEAF_S, sx, sy, 1);
    leaf(g, LEAF_DROOP, 12, top - 2, 1);
    leaf(g, LEAF_S, 12, top - 3, -1);
    put(g, sx + 1, sy - 2, 'G');
    put(g, sx - 1, sy - 2, 'g');
  } else {
    // radiant: hojas medianas y una flor arriba.
    leaf(g, LEAF_M, 12, top - 2, 1);
    leaf(g, LEAF_M, 12, top - 2, -1);
    for (let r = 0; r < FLOWER.length; r++)
      for (let c = 0; c < 5; c++) if (FLOWER[r][c] !== '.') put(g, sx - 2 + c, sy - 4 + r, FLOWER[r][c]);
  }

  if (form === 'scruffy' && stage === 'adult') {
    put(g, 8, Math.round(cy) + 2, shade);
    put(g, 15, Math.round(cy) - 2, shade);
  }

  const out = outline(g);
  face(out, B, Math.round(cy - 1), mood, t);
  return rows(out);
}

/**
 * @param {Grid} g
 * @param {{ eye: number, big: boolean }} B
 * @param {number} ey fila de los ojos
 * @param {Mood} mood
 * @param {number} t
 */
function face(g, B, ey, mood, t) {
  const left = 11 - B.eye;
  const right = N - 1 - left;
  // Columnas de cada ojo (1 o 2 de ancho), simetricas.
  const eyes = B.big ? [[left, left + 1], [right - 1, right]] : [[left], [right]];
  const my = ey + (B.big ? 3 : 2);
  const outer = (/** @type {number[]} */ cols, /** @type {number} */ i) => (i === 0 ? cols[0] - 1 : cols[cols.length - 1] + 1);

  const closed = mood === 'sleep' || mood === 'tired';
  eyes.forEach((cols, i) => {
    if (mood === 'happy') {
      for (const x of cols) put(g, x, ey, 'e');
      put(g, cols[0] - 1, ey + 1, 'e');
      put(g, cols[cols.length - 1] + 1, ey + 1, 'e');
    } else if (closed) {
      for (const x of cols) put(g, x, ey + 1, 'e');
      if (mood === 'sleep') put(g, outer(cols, i), ey + 1, 'e');
    } else if (mood === 'sick') {
      put(g, cols[0], ey + 1, 'e');
      if (cols.length > 1) put(g, cols[1], ey, 'e');
    } else {
      for (const x of cols) {
        put(g, x, ey, 'e');
        put(g, x, ey + 1, 'e');
      }
      if (cols.length > 1) put(g, cols[0], ey, 'w');
    }
  });

  // Boca
  if (mood === 'happy') {
    put(g, 10, my, 'e');
    put(g, 11, my + 1, 'm');
    put(g, 12, my + 1, 'm');
    put(g, 13, my, 'e');
  } else if (mood === 'hungry') {
    put(g, 11, my, 'e');
    put(g, 12, my, 'e');
    put(g, 11, my + 1, 'm');
    put(g, 12, my + 1, 'm');
  } else if (mood === 'sad') {
    put(g, 10, my + 1, 'e');
    put(g, 11, my, 'e');
    put(g, 12, my, 'e');
    put(g, 13, my + 1, 'e');
  } else if (mood === 'sick') {
    put(g, 10, my, 'e');
    put(g, 11, my + 1, 'e');
    put(g, 12, my, 'e');
    put(g, 13, my + 1, 'e');
  } else if (mood === 'sleep') {
    put(g, 12, my, 'e');
  } else {
    put(g, 11, my, 'e');
    put(g, 12, my, 'e');
  }

  // Detalles
  if (mood === 'happy' || mood === 'ok') {
    put(g, outer(eyes[0], 0) - (B.big ? 0 : 1), ey + 2, 'c');
    put(g, outer(eyes[1], 1) + (B.big ? 0 : 1), ey + 2, 'c');
  }
  if (mood === 'sad' && t === 1) put(g, eyes[0][0], ey + 2, 'z');
  if (mood === 'sick') {
    put(g, eyes[1][eyes[1].length - 1] + 2, ey - 2, 'z');
    put(g, eyes[1][eyes[1].length - 1] + 2, ey - 1 + t, 'z');
  }
  if (mood === 'dirty') {
    put(g, eyes[0][0] - 1, ey + 4, 'N');
    put(g, eyes[1][0] + 1, ey + 3, 'N');
    put(g, 12, ey + 5, 'N');
  }
  if (mood === 'sleep') {
    // Una "Z" de pixeles que sube y baja.
    const zx = 18;
    const zy = t === 0 ? 3 : 1;
    for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]]) put(g, zx + dx, zy + dy, 'z');
  }
}

/* ------------------------------------------------------------------ */
/*  API                                                               */
/* ------------------------------------------------------------------ */

const cache = new Map();

/**
 * Los dos cuadros de animacion de la mascota.
 * @param {Stage} stage
 * @param {Form | null} form
 * @param {Mood} mood
 * @returns {string[][]}
 */
export function petFrames(stage, form, mood) {
  const key = stage + '/' + (form || '-') + '/' + mood;
  let frames = cache.get(key);
  if (!frames) {
    frames =
      stage === 'egg'
        ? [rows(eggFrame(0)), rows(eggFrame(1))]
        : [sproutFrame(stage, form, mood, 0), sproutFrame(stage, form, mood, 1)];
    cache.set(key, frames);
  }
  return frames;
}

/** Milisegundos por cuadro segun el animo. @param {Mood} mood */
export function frameMs(mood) {
  return mood === 'sleep' ? 1100 : mood === 'egg' ? 700 : 500;
}

/** Caca (8x6). */
export const POOP = ['...nn...', '..nNNn..', '..nnnn..', '.nNnnNn.', 'nnnnnnnn', '.NNNNNN.'];

/** Hojita que sale volando al acariciar o cumplir un habito (5x4). */
export const LEAFLET = ['...gG', '.ggg.', 'ggG..', 'G....'];

/**
 * Convierte '#rrggbb' a RGB565 (pantallas de la maquinita).
 * @param {string} hex
 */
export function toRgb565(hex) {
  const v = parseInt(hex.slice(1), 16);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}
