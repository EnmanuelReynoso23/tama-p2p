/**
 * Animo en la maquinita (ESP32-C3 + pantalla ST7789) con Moddable SDK.
 *
 * Usa el mismo nucleo que la app (core/animo.js y core/sprites.js), asi la
 * mascota se comporta igual en el telefono y en el aparato.
 *
 * Botones: A cambia de opcion, B la hace, C vuelve a la primera.
 */
import Poco from 'commodetto/Poco';
import parseBMF from 'commodetto/parseBMF';
import Resource from 'Resource';
import Timer from 'timer';
import config from 'mc/config';
import buttons from 'buttons';
import { caress, catchUp, cheer, clean, createPet, feed, giveMedicine, play, revivePet, toggleSleep } from 'animo-core';
import { MENU, Screen } from 'animo-screen';
import { AnimoNet } from 'animo-net';

const DOMAIN = 'animo';
const KEY = 'pet';
const SAVE_EVERY_MS = 5 * 60 * 1000;
const PUBLISH_EVERY_MS = 30 * 1000;
const MAX_SEEN = 30;
const MAX_GIFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** La fuente de la pantalla solo tiene ASCII: se quitan acentos y lo raro. */
const PLAIN = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ñ: 'N' };
function plain(text, max) {
  let out = '';
  for (const ch of String(text)) {
    const c = PLAIN[ch] ?? ch;
    if (c >= ' ' && c <= '~') out += c;
  }
  return out.trim().slice(0, max);
}

/** Codigo de sala igual que en la app: minusculas, numeros y guiones. */
function roomFromConfig() {
  const room = String(config.room ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 48);
  return room.length >= 4 ? room : '';
}


/** Id de esta maquinita: se inventa la primera vez y se guarda. */
function playerId() {
  const saved = readJson('player', '');
  if (typeof saved === 'string' && /^[a-z0-9-]{8,40}$/.test(saved)) return saved;
  let id = 'm-';
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  for (let i = 0; i < 20; i++) id += abc[(Math.random() * abc.length) | 0];
  writeJson('player', id);
  return id;
}

/**
 * Guardado con el Key-Value store de ECMA-419 (memoria flash del ESP32). El
 * simulador de Linux no lo trae: ahi se guarda solo en memoria.
 */
let kv = null;
function storage() {
  if (kv) return kv;
  if (device.keyValue) kv = device.keyValue.open({ path: DOMAIN, format: 'string' });
  else {
    const mem = new Map();
    kv = { read: (k) => mem.get(k), write: (k, v) => mem.set(k, v) };
  }
  return kv;
}

function readJson(key, fallback) {
  try {
    const raw = storage().read(key);
    if (typeof raw === 'string') return JSON.parse(raw);
  } catch {
    // dato corrupto
  }
  return fallback;
}

function writeJson(key, value) {
  try {
    storage().write(key, JSON.stringify(value));
  } catch {
    // sin espacio
  }
}

function load(now) {
  const raw = readJson(KEY, null);
  if (raw && typeof raw === 'object') {
    try {
      return revivePet(raw, now);
    } catch {
      // partida corrupta: se empieza de nuevo
    }
  }
  return createPet('Brote', now);
}

export default function main() {
  const poco = new Poco(screen);
  let font = null;
  try {
    font = parseBMF(new Resource('OpenSans-Semibold-16.bf4'));
  } catch {
    font = null;
  }
  const view = { menu: 0, frame: 0, message: '', online: false };
  const painter = new Screen(poco, font);
  let pet = load(Date.now());
  let lastSave = Date.now();
  let messageUntil = 0;

  const save = (force) => {
    const t = Date.now();
    if (!force && t - lastSave < SAVE_EVERY_MS) return;
    lastSave = t;
    writeJson(KEY, pet);
  };

  const draw = () => {
    poco.begin();
    painter.draw(pet, view);
    poco.end();
  };

  const say = (text, ms = 1500) => {
    view.message = text;
    messageUntil = Date.now() + ms;
  };

  const REFUSED = {
    asleep: 'Esta dormida',
    egg: 'Es un huevo',
    full: 'Esta llena',
    cooldown: 'Espera',
    tired: 'Muy cansada',
    clean: 'Ya esta limpia',
    not_sick: 'No esta enferma',
  };

  const run = (id) => {
    const t = Date.now();
    pet = catchUp(pet, t);
    let res;
    if (id === 'meal' || id === 'snack') res = feed(pet, id, t);
    else if (id === 'play') res = play(pet, t);
    else if (id === 'clean') res = clean(pet, t);
    else if (id === 'sleep') res = toggleSleep(pet);
    else res = giveMedicine(pet);
    if (res.ok) {
      pet = res.pet;
      save(true);
      net?.publishPet(pet, t);
    } else say(REFUSED[res.reason] || 'No quiere');
  };

  // Amigos por MQTT (solo si la maquinita se compilo con room="codigo").
  const room = roomFromConfig();
  let net = null;
  if (room) {
    const seen = readJson('seen', []);
    const seenIds = Array.isArray(seen) ? seen.filter((id) => typeof id === 'string').slice(-MAX_SEEN) : [];
    const friends = {};
    net = new AnimoNet({
      roomId: room,
      playerId: playerId(),
      ownerName: plain(config.owner ?? '', 24),
      onStatus: (online) => {
        view.online = online;
        if (online) net.publishPet(pet, Date.now());
        draw();
      },
      onFriend: (state) => {
        const isNew = !friends[state.playerId];
        friends[state.playerId] = true;
        if (isNew && Date.now() - (state.updatedAt || 0) < 10 * 60 * 1000) say(`${plain(state.name, 14)} esta aqui`);
      },
      onMessage: (msg) => {
        const t = Date.now();
        if (seenIds.includes(msg.id)) return;
        seenIds.push(msg.id);
        while (seenIds.length > MAX_SEEN) seenIds.shift();
        writeJson('seen', seenIds);
        if (t - msg.timestamp > MAX_GIFT_AGE_MS) return;
        pet = catchUp(pet, t);
        // feed y giveMedicine dicen { ok, pet }; caress { pet, granted }; cheer da la mascota.
        let next = pet;
        if (msg.type === 'gift') {
          if (msg.kind === 'medicine') next = giveMedicine(pet).pet;
          else if (msg.kind === 'toy') next = caress(pet, t).pet;
          else next = feed(pet, 'snack', t).pet;
        } else if (msg.action === 'cheer') next = cheer(pet, t);
        else if (msg.action === 'pet') next = caress(pet, t).pet;
        if (next !== pet) {
          pet = next;
          save(true);
        }
        const who = plain(msg.senderName, 12) || 'Un amigo';
        say(msg.type === 'gift' ? `Regalo de ${who}` : msg.action === 'visit' ? `Visita de ${who}` : `Animo de ${who}`, 3000);
        draw();
      },
    });
    net.start();
  }

  buttons((key) => {
    if (key === 'a') view.menu = (view.menu + 1) % MENU.length;
    else if (key === 'b') run(MENU[view.menu].id);
    else view.menu = 0;
    draw();
  });

  // Reloj: un paso por segundo; se guarda cada 5 minutos y se avisa a los
  // amigos cada 30 segundos.
  let lastPublish = 0;
  Timer.repeat(() => {
    const t = Date.now();
    pet = catchUp(pet, t);
    save(false);
    if (net && t - lastPublish > PUBLISH_EVERY_MS) {
      lastPublish = t;
      net.publishPet(pet, t);
    }
  }, 1000);

  // Animacion
  Timer.repeat(() => {
    view.frame++;
    if (view.message && Date.now() > messageUntil) view.message = '';
    draw();
  }, pet.isAsleep ? 1000 : 500);

  draw();
}
