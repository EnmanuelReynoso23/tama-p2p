import { NEED_MAX, type Form, type Needs, type Stage } from '../../core/animo.js';

/** Tipos y valores de la mascota que usa la interfaz (las reglas estan en core/animo.js). */
export type LifeStage = Stage;
export type AdultVariant = Form;
export type Stats = Needs;
export type StatName = keyof Needs;

export const STAT_MAX = NEED_MAX;
export const STAT_MIN = 0;

/** Velocidades del reloj para probar (1 = tiempo real). */
export const TIME_SPEEDS = [1, 10, 60, 600] as const;
export type TimeSpeed = (typeof TIME_SPEEDS)[number];
