// @ts-check
/**
 * Nucleo de Animo: reglas de la mascota, sin pantalla ni red.
 *
 * JavaScript puro (sin APIs del navegador) para que lo usen igual la app web
 * (Android, iPhone, la maquinita) y el firmware del huevo (Moddable en ESP32).
 * Todas las funciones son puras: reciben un estado y devuelven uno nuevo.
 *
 * Idea propia de Animo: la mascota es un brote. Crece con el tiempo, pero la
 * forma adulta depende de como la cuidaste y de tu racha de habitos.
 */

/** @typedef {'egg' | 'baby' | 'child' | 'teen' | 'adult'} Stage */
/** @typedef {'radiant' | 'chill' | 'scruffy'} Form */
/** @typedef {'hunger' | 'happiness' | 'energy' | 'hygiene' | 'health'} NeedKey */
/** @typedef {{ hunger: number, happiness: number, energy: number, hygiene: number, health: number }} Needs */

/**
 * @typedef {object} Pet
 * @property {number} version
 * @property {string} name
 * @property {number} birthTs        momento en que se puso el huevo (ms)
 * @property {number} lastUpdated    ultimo momento simulado (ms)
 * @property {number} ageMs          edad en tiempo de juego (ms), avanza con advance()
 * @property {Stage} stage
 * @property {Form | null} adultVariant
 * @property {boolean} hatched
 * @property {Needs} stats
 * @property {boolean} isAsleep
 * @property {boolean} isSick
 * @property {number} poops
 * @property {number} digestMs       tiempo de juego que falta para la proxima caca (0 = nada pendiente)
 * @property {number} careEma        promedio movil de cuidado, 0-100
 * @property {number} careCarryMs    sobrante de tiempo para la proxima muestra de cuidado
 * @property {number} caressHourStart
 * @property {number} caressCount
 * @property {{ meal: number, snack: number, clean: number, play: number }} cooldownsUntil
 */

export const PET_VERSION = 3;
export const NEED_MAX = 100;
export const NEED_KEYS = /** @type {const} */ (['hunger', 'happiness', 'energy', 'hygiene', 'health']);

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/** Edad (tiempo de juego) en la que empieza cada etapa. */
export const STAGE_STARTS = /** @type {const} */ ({
  egg: 0,
  baby: 2 * MIN,
  child: 12 * HOUR,
  teen: 2 * 24 * HOUR,
  adult: 5 * 24 * HOUR,
});

export const STAGE_ORDER = /** @type {const} */ (['egg', 'baby', 'child', 'teen', 'adult']);
export const FORMS = /** @type {const} */ (['radiant', 'chill', 'scruffy']);

/** Cambio por hora de cada necesidad. */
const AWAKE_PER_HOUR = { hunger: -6, happiness: -4, energy: -5, hygiene: -3 };
const ASLEEP_PER_HOUR = { hunger: -2, happiness: -1, energy: 16, hygiene: -1 };

const LOW = 20;
const SICK_BELOW = 30;
const DIGEST_MS = 90 * MIN;
const MAX_POOPS = 4;
const CARE_SAMPLE_MS = 30 * MIN;
const CARESS_PER_HOUR = 10;
/** Tope de la simulacion al volver: una semana. Despues de eso solo se cuenta como una semana. */
export const MAX_CATCH_UP_MS = 7 * 24 * HOUR;

/** @param {number} v */
export function clampNeed(v) {
  if (!(v > 0)) return 0;
  return v > NEED_MAX ? NEED_MAX : v;
}

/**
 * @param {Needs} needs
 * @param {Partial<Needs>} delta
 * @returns {Needs}
 */
export function addNeeds(needs, delta) {
  return {
    hunger: clampNeed(needs.hunger + (delta.hunger || 0)),
    happiness: clampNeed(needs.happiness + (delta.happiness || 0)),
    energy: clampNeed(needs.energy + (delta.energy || 0)),
    hygiene: clampNeed(needs.hygiene + (delta.hygiene || 0)),
    health: clampNeed(needs.health + (delta.health || 0)),
  };
}

/** @param {Needs} n */
export function needsAverage(n) {
  return (n.hunger + n.happiness + n.energy + n.hygiene + n.health) / 5;
}

/**
 * @param {string} name
 * @param {number} now
 * @returns {Pet}
 */
export function createPet(name, now) {
  return {
    version: PET_VERSION,
    name: cleanName(name),
    birthTs: now,
    lastUpdated: now,
    ageMs: 0,
    stage: 'egg',
    adultVariant: null,
    hatched: false,
    stats: { hunger: 80, happiness: 80, energy: 90, hygiene: 100, health: 100 },
    isAsleep: false,
    isSick: false,
    poops: 0,
    digestMs: 0,
    careEma: 70,
    careCarryMs: 0,
    caressHourStart: 0,
    caressCount: 0,
    cooldownsUntil: { meal: 0, snack: 0, clean: 0, play: 0 },
  };
}

/** @param {unknown} name */
export function cleanName(name) {
  const s = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, 16) : '';
  return s || 'Brote';
}

/**
 * Etapa que corresponde a una edad.
 * @param {number} ageMs
 * @returns {Stage}
 */
export function stageForAge(ageMs) {
  /** @type {Stage} */
  let stage = 'egg';
  for (const s of STAGE_ORDER) if (ageMs >= STAGE_STARTS[s]) stage = s;
  return stage;
}

/**
 * Forma adulta: el cuidado manda; una racha de 7 dias o mas sube un escalon.
 * @param {number} careEma
 * @param {number} streak
 * @returns {Form}
 */
export function formFor(careEma, streak) {
  let level = careEma >= 70 ? 2 : careEma >= 45 ? 1 : 0;
  if (streak >= 7 && level < 2) level += 1;
  return level === 2 ? 'radiant' : level === 1 ? 'chill' : 'scruffy';
}

/**
 * Avanza el estado un trozo de tiempo de juego. Trozos largos se parten solos.
 * @param {Pet} pet
 * @param {number} dtMs  tiempo de juego a simular
 * @param {{ streak?: number }} [ctx]
 * @returns {Pet}
 */
export function advance(pet, dtMs, ctx) {
  let left = Math.min(Math.max(0, dtMs), MAX_CATCH_UP_MS);
  let p = pet;
  while (left > 0) {
    const step = Math.min(left, 5 * MIN);
    p = step_(p, step, ctx && ctx.streak ? ctx.streak : 0);
    left -= step;
  }
  return p;
}

/**
 * @param {Pet} pet
 * @param {number} dt
 * @param {number} streak
 * @returns {Pet}
 */
function step_(pet, dt, streak) {
  const ageMs = pet.ageMs + dt;
  const nextStage = stageForAge(ageMs);

  // El huevo no tiene necesidades: solo cuenta el tiempo hasta nacer.
  if (!pet.hatched) {
    if (nextStage === 'egg') return { ...pet, ageMs };
    return { ...pet, ageMs, stage: nextStage, hatched: true };
  }

  const h = dt / HOUR;
  const rate = pet.isAsleep ? ASLEEP_PER_HOUR : AWAKE_PER_HOUR;
  /** @type {Partial<Needs>} */
  const delta = {
    hunger: rate.hunger * h,
    happiness: rate.happiness * h,
    energy: rate.energy * h,
    hygiene: rate.hygiene * h - pet.poops * 1.5 * h,
    health: 0,
  };

  const s = pet.stats;
  let healthPerHour = 0;
  if (s.hunger < LOW) healthPerHour -= 4;
  if (s.hygiene < LOW) healthPerHour -= 3;
  if (pet.poops >= 3) healthPerHour -= 2;
  if (healthPerHour === 0 && !pet.isSick && needsAverage(s) > 50) healthPerHour = 2;
  if (pet.isSick) delta.happiness = (delta.happiness || 0) - 3 * h;
  delta.health = healthPerHour * h;

  let stats = addNeeds(s, delta);

  // Digestion: despues de comer, sale una caca.
  let digestMs = pet.digestMs;
  let poops = pet.poops;
  if (digestMs > 0) {
    digestMs -= dt;
    if (digestMs <= 0) {
      digestMs = 0;
      poops = Math.min(MAX_POOPS, poops + 1);
    }
  }

  // Se duerme sola si se queda sin energia y despierta cuando se llena.
  let isAsleep = pet.isAsleep;
  if (!isAsleep && stats.energy <= 5) isAsleep = true;
  else if (isAsleep && stats.energy >= NEED_MAX) isAsleep = false;

  const isSick = pet.isSick || stats.health < SICK_BELOW;

  // Muestra de cuidado cada media hora de juego.
  let careEma = pet.careEma;
  let careCarryMs = pet.careCarryMs + dt;
  while (careCarryMs >= CARE_SAMPLE_MS) {
    careCarryMs -= CARE_SAMPLE_MS;
    const sample = needsAverage(stats) - poops * 5 - (isSick ? 15 : 0);
    careEma = careEma * 0.96 + Math.max(0, sample) * 0.04;
  }

  let stage = pet.stage;
  let adultVariant = pet.adultVariant;
  if (nextStage !== stage) {
    stage = nextStage;
    if (stage === 'adult' && !adultVariant) adultVariant = formFor(careEma, streak);
  }

  return { ...pet, ageMs, stage, adultVariant, stats, digestMs, poops, isAsleep, isSick, careEma, careCarryMs };
}

/**
 * Pone el reloj al dia: simula desde lastUpdated hasta now (con la velocidad dada).
 * @param {Pet} pet
 * @param {number} now
 * @param {{ speed?: number, streak?: number }} [ctx]
 * @returns {Pet}
 */
export function catchUp(pet, now, ctx) {
  const real = now - pet.lastUpdated;
  if (!(real > 0)) return pet.lastUpdated > now ? { ...pet, lastUpdated: now } : pet;
  const speed = ctx && ctx.speed && ctx.speed > 0 ? ctx.speed : 1;
  return { ...advance(pet, real * speed, ctx), lastUpdated: now };
}

/* ------------------------------------------------------------------ */
/*  Acciones                                                          */
/* ------------------------------------------------------------------ */

/**
 * @typedef {'asleep' | 'egg' | 'full' | 'cooldown' | 'tired' | 'clean' | 'not_sick'} Refusal
 * @typedef {{ ok: true, pet: Pet } | { ok: false, reason: Refusal, pet: Pet }} ActionResult
 */

/** @param {Pet} pet @param {Refusal} reason @returns {ActionResult} */
const no = (pet, reason) => ({ ok: false, reason, pet });
/** @param {Pet} pet @returns {ActionResult} */
const yes = (pet) => ({ ok: true, pet });

/**
 * @param {Pet} pet
 * @param {'meal' | 'snack'} kind
 * @param {number} now
 * @returns {ActionResult}
 */
export function feed(pet, kind, now) {
  if (!pet.hatched) return no(pet, 'egg');
  if (pet.isAsleep) return no(pet, 'asleep');
  if (pet.cooldownsUntil[kind] > now) return no(pet, 'cooldown');
  if (kind === 'meal') {
    if (pet.stats.hunger >= 95) return no(pet, 'full');
    return yes({
      ...pet,
      stats: addNeeds(pet.stats, { hunger: 35, happiness: 3 }),
      digestMs: pet.digestMs > 0 ? pet.digestMs : DIGEST_MS,
      cooldownsUntil: { ...pet.cooldownsUntil, meal: now + 8000 },
    });
  }
  if (pet.stats.hunger >= 99) return no(pet, 'full');
  return yes({
    ...pet,
    stats: addNeeds(pet.stats, { hunger: 12, happiness: 8, health: -2 }),
    cooldownsUntil: { ...pet.cooldownsUntil, snack: now + 20000 },
  });
}

/** @param {Pet} pet @param {number} now @returns {ActionResult} */
export function play(pet, now) {
  if (!pet.hatched) return no(pet, 'egg');
  if (pet.isAsleep) return no(pet, 'asleep');
  if (pet.stats.energy < 15) return no(pet, 'tired');
  if (pet.cooldownsUntil.play > now) return no(pet, 'cooldown');
  return yes({
    ...pet,
    stats: addNeeds(pet.stats, { happiness: 18, energy: -12, hunger: -5 }),
    cooldownsUntil: { ...pet.cooldownsUntil, play: now + 5000 },
  });
}

/** @param {Pet} pet @param {number} now @returns {ActionResult} */
export function clean(pet, now) {
  if (!pet.hatched) return no(pet, 'egg');
  if (pet.isAsleep) return no(pet, 'asleep');
  if (pet.cooldownsUntil.clean > now) return no(pet, 'cooldown');
  if (pet.poops === 0 && pet.stats.hygiene >= 98) return no(pet, 'clean');
  return yes({
    ...pet,
    poops: 0,
    stats: addNeeds(pet.stats, { hygiene: 45, happiness: 2 }),
    cooldownsUntil: { ...pet.cooldownsUntil, clean: now + 30000 },
  });
}

/** @param {Pet} pet @returns {ActionResult} */
export function giveMedicine(pet) {
  if (!pet.hatched) return no(pet, 'egg');
  if (!pet.isSick) return no(pet, 'not_sick');
  return yes({ ...pet, isSick: false, stats: addNeeds(pet.stats, { health: 35, happiness: -5 }) });
}

/** @param {Pet} pet @returns {ActionResult} */
export function toggleSleep(pet) {
  if (!pet.hatched) return no(pet, 'egg');
  return yes({ ...pet, isAsleep: !pet.isAsleep });
}

/**
 * Caricia: un poco de felicidad, con tope por hora para que no se abuse.
 * @param {Pet} pet
 * @param {number} now
 * @returns {{ pet: Pet, granted: number }}
 */
export function caress(pet, now) {
  if (!pet.hatched) return { pet, granted: 0 };
  const sameHour = now - pet.caressHourStart < HOUR;
  const count = sameHour ? pet.caressCount : 0;
  if (count >= CARESS_PER_HOUR) return { pet, granted: 0 };
  const granted = pet.isAsleep ? 1 : 2;
  return {
    granted,
    pet: {
      ...pet,
      stats: addNeeds(pet.stats, { happiness: granted }),
      caressHourStart: sameHour ? pet.caressHourStart : now,
      caressCount: count + 1,
    },
  };
}

/**
 * Premio por cumplir un habito: la mascota se anima. Comparte el tope por hora
 * de las caricias, asi marcar y desmarcar no sirve de truco.
 * @param {Pet} pet
 * @param {number} now
 * @returns {Pet}
 */
export function cheer(pet, now) {
  const r = caress(pet, now);
  if (r.granted === 0) return pet;
  return { ...r.pet, stats: addNeeds(r.pet.stats, { happiness: 4, health: 1 }) };
}

/* ------------------------------------------------------------------ */
/*  Animo de la mascota (para la cara y los textos)                   */
/* ------------------------------------------------------------------ */

/** @typedef {'egg' | 'sleep' | 'sick' | 'hungry' | 'dirty' | 'sad' | 'tired' | 'happy' | 'ok'} Mood */

/**
 * @param {Pet} pet
 * @returns {Mood}
 */
export function moodOf(pet) {
  if (!pet.hatched) return 'egg';
  if (pet.isAsleep) return 'sleep';
  if (pet.isSick) return 'sick';
  const s = pet.stats;
  if (s.hunger < 25) return 'hungry';
  if (s.hygiene < 25 || pet.poops >= 2) return 'dirty';
  if (s.happiness < 30) return 'sad';
  if (s.energy < 20) return 'tired';
  if (needsAverage(s) >= 75) return 'happy';
  return 'ok';
}

/**
 * Lee un estado guardado (de cualquier version) y lo deja valido.
 * @param {any} raw
 * @param {number} now
 * @returns {Pet}
 */
export function revivePet(raw, now) {
  const base = createPet(raw && raw.name, now);
  if (!raw || typeof raw !== 'object') return base;
  const num = (/** @type {unknown} */ v, /** @type {number} */ d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const st = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  const birthTs = num(raw.birthTs, now);
  const hatched = raw.hatched === true;
  const ageMs = num(raw.ageMs, Math.max(0, num(raw.lastUpdated, now) - birthTs));
  /** @type {Stage} */
  let stage = STAGE_ORDER.includes(raw.stage) ? raw.stage : stageForAge(ageMs);
  if (!hatched) stage = 'egg';
  else if (stage === 'egg') stage = 'baby';
  const cd = raw.cooldownsUntil && typeof raw.cooldownsUntil === 'object' ? raw.cooldownsUntil : {};
  const wait = (/** @type {unknown} */ v) => {
    const t = num(v, 0);
    return t > now + 60000 ? 0 : t;
  };
  return {
    ...base,
    birthTs,
    lastUpdated: Math.min(num(raw.lastUpdated, now), now),
    ageMs: Math.max(ageMs, hatched ? STAGE_STARTS.baby : 0),
    stage,
    adultVariant: FORMS.includes(raw.adultVariant) ? raw.adultVariant : stage === 'adult' ? 'chill' : null,
    hatched,
    stats: addNeeds(
      { hunger: 0, happiness: 0, energy: 0, hygiene: 0, health: 0 },
      {
        hunger: num(st.hunger, 80),
        happiness: num(st.happiness, 80),
        energy: num(st.energy, 90),
        hygiene: num(st.hygiene, 100),
        health: num(st.health, 100),
      },
    ),
    isAsleep: raw.isAsleep === true,
    isSick: raw.isSick === true,
    poops: Math.min(MAX_POOPS, Math.max(0, Math.round(num(raw.poops, 0)))),
    digestMs: Math.max(0, num(raw.digestMs, 0)),
    careEma: clampNeed(num(raw.careEma, 70)),
    careCarryMs: Math.max(0, num(raw.careCarryMs, 0)),
    caressHourStart: num(raw.caressHourStart, 0) > now ? 0 : num(raw.caressHourStart, 0),
    caressCount: Math.max(0, num(raw.caressCount, 0)),
    // Un reloj que volvio atras (la maquinita sin internet arranca en cero) no deja esperas eternas.
    cooldownsUntil: { meal: wait(cd.meal), snack: wait(cd.snack), clean: wait(cd.clean), play: wait(cd.play) },
  };
}
