/**
 * Invite links + stable player identity.
 *
 * Trystero gives a new random `selfId` on every page load, so friends are
 * tracked by a `playerId` that we create once and keep in localStorage.
 *
 * Invite link format:  https://<host>/?sala=<code>
 * The code is also the room password (Trystero encrypts the WebRTC handshake
 * with it), so it is generated with enough entropy to be unguessable.
 */

const PLAYER_ID_KEY = 'tama-player-id';
export const INVITE_PARAM = 'sala';
export const MODE_PARAM = 'modo';

const WORDS = [
  'mochi', 'luna', 'sol', 'nube', 'coco', 'kiwi', 'mango', 'pixel', 'boba',
  'menta', 'lima', 'miel', 'perla', 'trufa', 'nori', 'yuzu', 'chispa', 'bambu',
];

function randomChars(n: number): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o/1/l/i look-alikes
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function getPlayerId(): string {
  try {
    const existing = localStorage.getItem(PLAYER_ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `p-${randomChars(20)}`;
    localStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch {
    return `p-${randomChars(20)}`;
  }
}

/** e.g. "mochi-k7p3-luna-x9qd" — friendly to read aloud, ~40 bits of randomness. */
export function generateRoomCode(): string {
  const pick = () => {
    const b = new Uint8Array(1);
    crypto.getRandomValues(b);
    return WORDS[b[0] % WORDS.length];
  };
  return `${pick()}-${randomChars(4)}-${pick()}-${randomChars(4)}`;
}

/** Room codes are lowercase [a-z0-9-], 4–48 chars. */
export function sanitizeRoomCode(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 48);
}

export function isValidRoomCode(code: string): boolean {
  return /^[a-z0-9-]{4,48}$/.test(code);
}

export function buildInviteUrl(code: string): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set(INVITE_PARAM, code);
  return url.toString();
}

/**
 * Reads `?sala=` from the current URL and removes it from the address bar
 * (so reloading or installing the PWA doesn't keep re-joining from the link).
 */
export function consumeInviteFromUrl(): string | null {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get(INVITE_PARAM);
  if (!raw) return null;
  url.searchParams.delete(INVITE_PARAM);
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  const code = sanitizeRoomCode(raw);
  return isValidRoomCode(code) ? code : null;
}

export type AppMode = 'phone' | 'machine';

/** `?modo=maquina` (Raspberry Pi kiosk) — remembered so the kiosk survives reloads. */
export function readAppMode(): AppMode {
  try {
    const param = new URLSearchParams(window.location.search).get(MODE_PARAM);
    if (param === 'maquina' || param === 'machine') {
      localStorage.setItem('tama-mode', 'machine');
      return 'machine';
    }
    if (param === 'telefono' || param === 'phone') {
      localStorage.setItem('tama-mode', 'phone');
      return 'phone';
    }
    return localStorage.getItem('tama-mode') === 'machine' ? 'machine' : 'phone';
  } catch {
    return 'phone';
  }
}

/** Share sheet on phones, clipboard as fallback. Returns what happened. */
export async function shareInvite(
  code: string,
  petName: string,
): Promise<'shared' | 'copied' | 'failed'> {
  const url = buildInviteUrl(code);
  const text = `¡Cuidemos nuestras mascotas juntos y no rompamos la racha! ${petName} te espera:`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Animo · Racha con amigos', text, url });
      return 'shared';
    }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
