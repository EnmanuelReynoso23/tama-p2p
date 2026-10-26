/**
 * P2P wire protocol. Everything that arrives from a peer is untrusted: anyone
 * holding the room code can send anything, so each message goes through a
 * `parse*` function that clamps numbers, trims strings and drops junk.
 */
import { normalizeDays } from '../game/streak';

export const PROTOCOL_VERSION = 2;

export type DeviceKind = 'phone' | 'machine';
const STAGES = ['egg', 'baby', 'child', 'teen', 'adult'] as const;
const VARIANTS = ['radiant', 'chill', 'scruffy'] as const;
export type WireStage = (typeof STAGES)[number];
export type WireVariant = (typeof VARIANTS)[number];

export interface PetStatsBroadcast {
  playerId: string;
  ownerName: string;
  device: DeviceKind;
  name: string;
  stage: WireStage;
  adultVariant: WireVariant | null;
  hunger: number;
  happiness: number;
  energy: number;
  hygiene: number;
  health: number;
  isAsleep: boolean;
  isSick: boolean;
  streak: number;
  habitsCompleted: number;
  habitsTotal: number;
  /** Local day keys where the sender completed all their habits. */
  completedDays: string[];
}

export type PetSyncData = PetStatsBroadcast & { v: number; updatedAt: number };

export type GiftKind = 'berry' | 'snack' | 'toy' | 'medicine';
export type InteractionKind = 'visit' | 'pet' | 'cheer';

export interface P2PGift {
  playerId: string;
  senderName: string;
  kind: GiftKind;
  timestamp: number;
}

export interface P2PInteraction {
  playerId: string;
  senderName: string;
  action: InteractionKind;
  timestamp: number;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function str(v: unknown, max: number, fallback = ''): string {
  if (typeof v !== 'string') return fallback;
  // Strip control chars; React escapes HTML, this just keeps the UI tidy.
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) || fallback;
}

function num(v: unknown, lo: number, hi: number, fallback = lo): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.min(hi, Math.max(lo, n));
}

function oneOf<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return options.includes(v as T) ? (v as T) : fallback;
}

export function parsePetSync(raw: unknown): PetSyncData | null {
  if (!isObj(raw)) return null;
  const playerId = str(raw.playerId, 64);
  if (!playerId) return null; // v1 clients or junk — we can't track them as a friend
  const days = Array.isArray(raw.completedDays)
    ? normalizeDays(raw.completedDays.filter((d): d is string => typeof d === 'string'))
    : [];
  return {
    v: num(raw.v, 0, 1000, 0),
    updatedAt: num(raw.updatedAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    playerId,
    ownerName: str(raw.ownerName, 24),
    device: oneOf(raw.device, ['phone', 'machine'] as const, 'phone'),
    name: str(raw.name, 16, 'Mascota'),
    stage: oneOf(raw.stage, STAGES, 'baby'),
    adultVariant: raw.adultVariant == null ? null : oneOf(raw.adultVariant, VARIANTS, 'chill'),
    hunger: num(raw.hunger, 0, 100),
    happiness: num(raw.happiness, 0, 100),
    energy: num(raw.energy, 0, 100),
    hygiene: num(raw.hygiene, 0, 100),
    health: num(raw.health, 0, 100),
    isAsleep: raw.isAsleep === true,
    isSick: raw.isSick === true,
    streak: Math.round(num(raw.streak, 0, 10_000)),
    habitsCompleted: Math.round(num(raw.habitsCompleted, 0, 100)),
    habitsTotal: Math.round(num(raw.habitsTotal, 0, 100)),
    completedDays: days,
  };
}

export function parseGift(raw: unknown): P2PGift | null {
  if (!isObj(raw)) return null;
  const kinds: readonly GiftKind[] = ['berry', 'snack', 'toy', 'medicine'];
  if (!kinds.includes(raw.kind as GiftKind)) return null;
  return {
    playerId: str(raw.playerId, 64),
    senderName: str(raw.senderName, 24, 'Un amigo'),
    kind: raw.kind as GiftKind,
    timestamp: num(raw.timestamp, 0, Number.MAX_SAFE_INTEGER, Date.now()),
  };
}

export function parseInteraction(raw: unknown): P2PInteraction | null {
  if (!isObj(raw)) return null;
  const kinds: readonly InteractionKind[] = ['visit', 'pet', 'cheer'];
  if (!kinds.includes(raw.action as InteractionKind)) return null;
  return {
    playerId: str(raw.playerId, 64),
    senderName: str(raw.senderName, 24, 'Un amigo'),
    action: raw.action as InteractionKind,
    timestamp: num(raw.timestamp, 0, Number.MAX_SAFE_INTEGER, Date.now()),
  };
}
