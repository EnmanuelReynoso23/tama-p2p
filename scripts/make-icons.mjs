/**
 * Genera los iconos de la app y la imagen para compartir a partir de los
 * dibujos de core/sprites.js. Uso: node scripts/make-icons.mjs
 */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { PALETTE, petFrames, SPRITE_SIZE } from '../core/sprites.js';

const OUT = new URL('../public/', import.meta.url);

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

class Img {
  constructor(w, h, bg) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 4);
    this.rect(0, 0, w, h, bg);
  }
  rect(x0, y0, w, h, hex) {
    const [r, g, b] = rgb(hex);
    for (let y = Math.max(0, y0); y < Math.min(this.h, y0 + h); y++)
      for (let x = Math.max(0, x0); x < Math.min(this.w, x0 + w); x++) {
        const i = (y * this.w + x) * 4;
        this.px[i] = r;
        this.px[i + 1] = g;
        this.px[i + 2] = b;
        this.px[i + 3] = 255;
      }
  }
  sprite(rows, x0, y0, s) {
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && this.rect(x0 + x * s, y0 + y * s, s, s, PALETTE[ch])));
  }
  save(name) {
    writeFileSync(new URL(name, OUT), png(this.w, this.h, this.px));
  }
}

const hero = petFrames('adult', 'radiant', 'happy')[0];

function icon(size, petScale, name) {
  const img = new Img(size, size, '#fbf5ea');
  const ground = Math.round(size * 0.78);
  img.rect(0, 0, size, ground, '#bfe7fb');
  img.rect(0, ground, size, size - ground, '#b6e39b');
  const p = SPRITE_SIZE * petScale;
  img.sprite(hero, Math.round((size - p) / 2), ground - p + petScale * 2, petScale);
  img.save(name);
}
icon(192, 7, 'icons/icon-192.png');
icon(512, 18, 'icons/icon-512.png');
icon(512, 13, 'icons/maskable-512.png');
icon(180, 6, 'icons/apple-touch-icon.png');

// Imagen para compartir enlaces (1200x630): las etapas del brote en fila.
const og = new Img(1200, 630, '#bfe7fb');
og.rect(0, 470, 1200, 160, '#b6e39b');
og.rect(0, 470, 1200, 8, '#d3f1bf');
const lineup = [
  petFrames('egg', null, 'egg')[0],
  petFrames('baby', null, 'happy')[0],
  petFrames('child', null, 'ok')[0],
  petFrames('teen', null, 'happy')[0],
  hero,
];
lineup.forEach((rows, i) => og.sprite(rows, 30 + i * 230, 470 - 24 * 9 + 18, 9));
og.save('og.png');

// Icono vectorial
const rects = [];
hero.forEach((row, y) =>
  [...row].forEach((ch, x) => ch !== '.' && rects.push(`<rect x="${x + 4}" y="${y + 3}" width="1" height="1" fill="${PALETTE[ch]}"/>`)),
);
writeFileSync(
  new URL('icons/icon.svg', OUT),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">` +
    `<rect width="32" height="25" fill="#bfe7fb"/><rect y="25" width="32" height="7" fill="#b6e39b"/>` +
    rects.join('') +
    `</svg>\n`,
);
console.log('iconos listos');
