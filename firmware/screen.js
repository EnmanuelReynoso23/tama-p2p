/**
 * Dibujo de la pantalla de la maquinita (240x240 en el ESP32, otra medida en el simulador).
 *
 * No depende de Moddable: recibe un "pintor" con fillRectangle(color, x, y, w, h)
 * y makeColor(r, g, b), asi se puede probar en la computadora.
 */
import { moodOf, STAGE_STARTS } from 'animo-core';
import { PALETTE, petFrames, POOP, SPRITE_SIZE } from 'animo-sprites';

export const MENU = [
  { id: 'meal', label: 'Comer' },
  { id: 'snack', label: 'Merienda' },
  { id: 'play', label: 'Jugar' },
  { id: 'clean', label: 'Limpiar' },
  { id: 'sleep', label: 'Dormir' },
  { id: 'medicine', label: 'Medicina' },
];

const NEED_ORDER = ['hunger', 'happiness', 'energy', 'hygiene', 'health'];

function hexRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

export class Screen {
  /**
   * @param {{ width: number, height: number, fillRectangle: Function, makeColor: Function, drawText?: Function, getTextWidth?: Function }} poco
   * @param {object} [font] fuente de Commodetto (opcional; sin ella no hay texto)
   */
  constructor(poco, font) {
    this.poco = poco;
    this.font = font || null;
    this.w = poco.width;
    this.h = poco.height;
    this.colors = {};
    for (const k in PALETTE) this.colors[k] = poco.makeColor(...hexRgb(PALETTE[k]));
    const c = (hex) => poco.makeColor(...hexRgb(hex));
    this.ui = {
      day: c('#bfe7fb'),
      night: c('#2e2a58'),
      ground: c('#b6e39b'),
      groundNight: c('#3f5e45'),
      ink: c('#2b2138'),
      paper: c('#fffaf2'),
      good: c('#4fb35f'),
      mid: c('#f2b33d'),
      bad: c('#d0435f'),
      empty: c('#e6dfd2'),
      white: c('#ffffff'),
    };
    this.scale = Math.max(2, Math.floor(Math.min(this.w, this.h - 96) / SPRITE_SIZE));
  }

  /** Pinta un cuadro (filas de letras) agrandado. Junta pixeles seguidos del mismo color. */
  sprite(rows, x0, y0, s) {
    const { poco, colors } = this;
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        let run = 1;
        while (x + run < row.length && row[x + run] === ch) run++;
        if (ch !== '.') poco.fillRectangle(colors[ch], x0 + x * s, y0 + y * s, run * s, s);
        x += run;
      }
    }
  }

  text(str, x, y, color, center) {
    if (!this.font || !this.poco.drawText) return;
    const w = center && this.poco.getTextWidth ? this.poco.getTextWidth(str, this.font) : 0;
    this.poco.drawText(str, this.font, color, center ? Math.round(x - w / 2) : x, y);
  }

  /**
   * @param {object} pet estado del nucleo
   * @param {{ menu: number, frame: number, message?: string, online?: boolean }} view
   */
  draw(pet, view) {
    const { poco, ui, w, h, scale } = this;
    const night = pet.isAsleep;
    const groundY = h - 56;

    poco.fillRectangle(night ? ui.night : ui.day, 0, 0, w, groundY);
    poco.fillRectangle(night ? ui.groundNight : ui.ground, 0, groundY, w, h - groundY);

    // Barras de necesidades arriba
    const barW = Math.floor((w - 12) / 5) - 4;
    NEED_ORDER.forEach((k, i) => {
      const v = Math.max(0, Math.min(100, pet.stats[k]));
      const x = 8 + i * (barW + 4);
      poco.fillRectangle(ui.ink, x, 6, barW, 10);
      poco.fillRectangle(ui.empty, x + 1, 7, barW - 2, 8);
      const fill = Math.round(((barW - 2) * v) / 100);
      if (fill > 0) poco.fillRectangle(v < 30 ? ui.bad : v < 60 ? ui.mid : ui.good, x + 1, 7, fill, 8);
    });

    // Conectada con los amigos: un cuadrito verde bajo las barras.
    if (view.online) {
      poco.fillRectangle(ui.ink, w - 16, 22, 10, 10);
      poco.fillRectangle(ui.good, w - 15, 23, 8, 8);
    }

    // Mascota
    const mood = moodOf(pet);
    const frames = petFrames(pet.hatched ? pet.stage : 'egg', pet.adultVariant, mood);
    const size = SPRITE_SIZE * scale;
    const px = Math.round((w - size) / 2);
    const py = groundY - size + scale;
    this.sprite(frames[view.frame % frames.length], px, py, scale);

    // Cacas a la derecha
    const ps = Math.max(2, scale >> 1);
    for (let i = 0; i < pet.poops; i++) this.sprite(POOP, w - 8 - (i + 1) * (8 * ps + 4), groundY - 6 * ps + ps, ps);

    // Huevo: cuanto falta
    if (!pet.hatched) {
      const p = Math.min(1, pet.ageMs / STAGE_STARTS.baby);
      poco.fillRectangle(ui.ink, 30, groundY + 10, w - 60, 8);
      poco.fillRectangle(ui.paper, 31, groundY + 11, w - 62, 6);
      poco.fillRectangle(ui.good, 31, groundY + 11, Math.round((w - 62) * p), 6);
    }

    // Menu abajo
    const boxY = h - 34;
    poco.fillRectangle(ui.ink, 6, boxY, w - 12, 28);
    poco.fillRectangle(ui.paper, 8, boxY + 2, w - 16, 24);
    const item = MENU[view.menu % MENU.length];
    const label = view.message || (item.id === 'sleep' && pet.isAsleep ? 'Despertar' : item.label);
    this.text(label, w / 2, boxY + 5, ui.ink, true);
    // Puntos: en que opcion del menu vas
    MENU.forEach((_, i) => {
      poco.fillRectangle(i === view.menu % MENU.length ? ui.ink : ui.empty, w / 2 - MENU.length * 5 + i * 10, boxY - 8, 6, 4);
    });
  }
}
