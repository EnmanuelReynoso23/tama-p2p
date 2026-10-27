/**
 * Transferencia Criptografica de Partida (Handoff P2P / Respaldo).
 *
 * Permite exportar la partida completa (mascota + habitos + rachas) firmada
 * con la llave ECDSA P-256 del dispositivo emisor para transferirla
 * a otro telefono, a una computadora o al huevo fisico ESP32 mediante QR o codigo.
 */

import { signPayload, verifySignedPayload } from './crypto';
import type { PetPersisted } from '../store/usePetStore';
import type { DailyHabit } from '../store/useHabitStore';

export interface AnimoHandoffData {
  version: 2;
  type: 'animo-handoff';
  timestamp: number;
  pet: {
    name: string;
    birthTs: number;
    stage: string;
    adultVariant: string | null;
    stats: {
      hunger: number;
      happiness: number;
      energy: number;
      hygiene: number;
      health: number;
    };
    isAsleep: boolean;
    isSick: boolean;
    hatched: boolean;
  };
  habits: {
    habits: DailyHabit[];
    completedDays: string[];
    frozenDays: string[];
    freezesAvailable: number;
  };
}

export type SignedHandoffPayload = AnimoHandoffData & {
  pubKey: string;
  sig: string;
};

export const HANDOFF_PREFIX = 'animo://handoff#';

/**
 * Empaqueta y firma digitalmente el estado de la mascota y sus habitos.
 * Devuelve una cadena compacta con prefijo lista para QR o portapapeles.
 */
export async function createHandoffPackage(
  pet: Pick<PetPersisted, 'name' | 'birthTs' | 'stage' | 'adultVariant' | 'stats' | 'isAsleep' | 'isSick' | 'hatched'>,
  habits: {
    habits: DailyHabit[];
    completedDays: string[];
    frozenDays: string[];
    freezesAvailable: number;
  },
): Promise<string> {
  const payload: AnimoHandoffData = {
    version: 2,
    type: 'animo-handoff',
    timestamp: Date.now(),
    pet: {
      name: pet.name,
      birthTs: pet.birthTs,
      stage: pet.stage,
      adultVariant: pet.adultVariant,
      stats: {
        hunger: pet.stats.hunger,
        happiness: pet.stats.happiness,
        energy: pet.stats.energy,
        hygiene: pet.stats.hygiene,
        health: pet.stats.health,
      },
      isAsleep: pet.isAsleep,
      isSick: pet.isSick,
      hatched: pet.hatched,
    },
    habits: {
      habits: habits.habits,
      completedDays: habits.completedDays,
      frozenDays: habits.frozenDays,
      freezesAvailable: habits.freezesAvailable,
    },
  };

  const signed = await signPayload(payload as unknown as Record<string, unknown>);
  const json = JSON.stringify(signed);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return `${HANDOFF_PREFIX}${base64}`;
}

/**
 * Decodifica y verifica criptograficamente la firma P-256 de un paquete de handoff.
 */
export async function verifyAndParseHandoff(
  rawInput: string,
): Promise<{ ok: true; data: SignedHandoffPayload } | { ok: false; error: string }> {
  try {
    let clean = rawInput.trim();
    if (clean.startsWith(HANDOFF_PREFIX)) {
      clean = clean.slice(HANDOFF_PREFIX.length);
    }

    const json = decodeURIComponent(escape(atob(clean)));
    const parsed = JSON.parse(json) as Record<string, unknown>;

    if (parsed.type !== 'animo-handoff' || parsed.version !== 2) {
      return { ok: false, error: 'Formato de partida no compatible' };
    }

    if (!parsed.pet || typeof parsed.pet !== 'object') {
      return { ok: false, error: 'Datos de mascota ausentes' };
    }

    // Verificacion de la firma digital ECDSA P-256
    const isValid = await verifySignedPayload(parsed);
    if (!isValid) {
      return { ok: false, error: 'Firma digital invalida o datos alterados' };
    }

    return { ok: true, data: parsed as unknown as SignedHandoffPayload };
  } catch {
    return { ok: false, error: 'Codigo o QR de partida invalido' };
  }
}
