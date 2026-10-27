// @ts-check
/**
 * Puente de amigos por MQTT: lo que comparten la app y la maquinita.
 *
 * La app habla con sus amigos por WebRTC, pero el ESP32 no puede. Por eso los
 * dos publican tambien en un broker MQTT, bajo un tema que sale del codigo de
 * la sala. JavaScript puro: lo usan la app web y el firmware de Moddable.
 *
 * Temas (base = animo/v2/<hash de la sala>):
 *   base/pet/<jugador>        estado de la mascota (retenido)
 *   base/msg/<destino>/<de>   ultimo regalo o mensaje de <de> a <destino>
 *                             (retenido; <destino> = "all" para todos)
 *   base/off/<jugador>        "1" si se desconecto (testamento de MQTT)
 *
 * El broker es publico: cualquiera que conozca el codigo de la sala puede leer
 * y escribir. Todo lo que llega se valida igual que lo que llega por WebRTC.
 */

export const RELAY_HOST = 'broker.emqx.io';
export const RELAY_TCP_PORT = 1883;
export const RELAY_WS_URL = 'wss://broker.emqx.io:8084/mqtt';
export const RELAY_KEEPALIVE_S = 60;
export const RELAY_VERSION = 2;

/**
 * Hash FNV-1a de 64 bits (en dos mitades de 32) en hexadecimal: igual en el
 * navegador y en XS, sin depender de crypto.
 * @param {string} text
 * @returns {string}
 */
export function roomHash(text) {
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c ^ (h1 >>> 7), 0x01000193) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/** @param {string} roomId */
export function relayBase(roomId) {
  return `animo/v2/${roomHash(`animo:${roomId}`)}`;
}

/** Ids de jugador y de sala que aceptamos en un tema (sin / ni comodines). */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** @param {unknown} id */
export function isSafeId(id) {
  return typeof id === 'string' && SAFE_ID.test(id);
}

/**
 * @param {string} roomId
 * @param {string} playerId
 */
export function relayTopics(roomId, playerId) {
  const base = relayBase(roomId);
  return {
    base,
    myPet: `${base}/pet/${playerId}`,
    myOff: `${base}/off/${playerId}`,
    /** @param {string} target @returns {string} */
    msgTo: (target) => `${base}/msg/${target || 'all'}/${playerId}`,
    subscribe: [`${base}/pet/+`, `${base}/off/+`, `${base}/msg/${playerId}/+`, `${base}/msg/all/+`],
  };
}

/**
 * @typedef {{ kind: 'pet' | 'off' | 'msg', from: string, target?: string }} RelayTopic
 */

/**
 * Lee un tema que llego del broker. Devuelve null si no es de esta sala.
 * @param {string} base
 * @param {string} topic
 * @returns {RelayTopic | null}
 */
export function parseRelayTopic(base, topic) {
  if (typeof topic !== 'string' || !topic.startsWith(`${base}/`)) return null;
  const parts = topic.slice(base.length + 1).split('/');
  if ((parts[0] === 'pet' || parts[0] === 'off') && parts.length === 2 && isSafeId(parts[1]))
    return { kind: parts[0], from: parts[1] };
  if (parts[0] === 'msg' && parts.length === 3 && isSafeId(parts[1]) && isSafeId(parts[2]))
    return { kind: 'msg', target: parts[1], from: parts[2] };
  return null;
}

/**
 * Estado de la mascota de la maquinita en el mismo formato que manda la app
 * (ver src/network/protocol.ts). La maquinita no tiene habitos: van en cero.
 * @param {import('./animo.js').Pet} pet
 * @param {{ playerId: string, ownerName?: string, now: number }} who
 */
export function machinePetState(pet, who) {
  const s = pet.stats;
  return {
    v: RELAY_VERSION,
    updatedAt: who.now,
    playerId: who.playerId,
    ownerName: (who.ownerName || '').slice(0, 24),
    device: 'machine',
    name: pet.name,
    stage: pet.hatched ? pet.stage : 'egg',
    adultVariant: pet.adultVariant,
    hunger: Math.round(s.hunger),
    happiness: Math.round(s.happiness),
    energy: Math.round(s.energy),
    hygiene: Math.round(s.hygiene),
    health: Math.round(s.health),
    isAsleep: pet.isAsleep,
    isSick: pet.isSick,
    streak: 0,
    habitsCompleted: 0,
    habitsTotal: 0,
    completedDays: [],
    frozenDays: [],
  };
}

/** @typedef {'berry' | 'snack' | 'toy' | 'medicine'} GiftKind */
/** @typedef {'visit' | 'pet' | 'cheer'} InteractionKind */

/**
 * @typedef {object} RelayMessage
 * @property {'gift' | 'interaction'} type
 * @property {string} id
 * @property {string} playerId
 * @property {string} senderName
 * @property {number} timestamp
 * @property {GiftKind} [kind]
 * @property {InteractionKind} [action]
 * @property {string} [targetPlayerId]
 */

const GIFTS = ['berry', 'snack', 'toy', 'medicine'];
const ACTIONS = ['visit', 'pet', 'cheer'];

/**
 * Valida un regalo o mensaje que llego por el broker. El que lo manda no
 * puede hacerse pasar por otro: el remitente sale del tema, no del cuerpo.
 * @param {unknown} raw
 * @param {RelayTopic} topic
 * @returns {RelayMessage | null}
 */
export function parseRelayMessage(raw, topic) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  if (o.playerId !== topic.from || !isSafeId(o.id)) return null;
  const timestamp = typeof o.timestamp === 'number' && Number.isFinite(o.timestamp) ? o.timestamp : 0;
  const senderName =
    typeof o.senderName === 'string'
      ? o.senderName.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40) || 'Un amigo'
      : 'Un amigo';
  /** @type {RelayMessage} */
  const msg = { type: 'gift', id: /** @type {string} */ (o.id), playerId: topic.from, senderName, timestamp };
  if (topic.target && topic.target !== 'all') msg.targetPlayerId = topic.target;
  if (o.type === 'gift' && GIFTS.includes(/** @type {string} */ (o.kind))) {
    msg.kind = /** @type {GiftKind} */ (o.kind);
    return msg;
  }
  if (o.type === 'interaction' && ACTIONS.includes(/** @type {string} */ (o.action))) {
    msg.type = 'interaction';
    msg.action = /** @type {InteractionKind} */ (o.action);
    return msg;
  }
  return null;
}
