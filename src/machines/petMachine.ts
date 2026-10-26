import { assign, createActor, setup } from 'xstate';
import type { BabyAnimationName } from '../sprites/baby';

/**
 * XState v5 behaviour state machine for the pet.
 *
 * The machine does NOT own stats — those live in Zustand and are injected via
 * `ctx.bridge` (see StoreBridge). Guards read the bridge. Actions call the
 * bridge (which in turn mutates the Zustand store and produces side effects
 * like toasts, SFX). This keeps persistence purely in Zustand.
 *
 * Animation selection: every transition and every 9s mood re-check updates
 * `ctx.currentAnim`. The canvas renderer reads this value.
 */

export type PetAnim =
  | BabyAnimationName
  | 'evolving'
  | 'hatching_wobble'
  | 'hatching_crack'
  | 'hatching_hatched';

export interface StoreBridge {
  readStats(): {
    hunger: number;
    happiness: number;
    energy: number;
    hygiene: number;
    health: number;
  };
  isAsleep(): boolean;
  isSick(): boolean;
  feed(kind: 'meal' | 'snack'): { ok: boolean; reason?: string };
  play(bonus?: number): { ok: boolean; reason?: string };
  cleanNow(): { ok: boolean; reason?: string };
  giveMedicine(): { ok: boolean; reason?: string };
  toggleSleep(): void;
  petStroke(): number;
  evolveToNextStageOrNop(): boolean;
  deriveMood():
    | 'hungry'
    | 'sad'
    | 'tired'
    | 'dirty'
    | 'sick'
    | 'sleeping'
    | 'great'
    | 'good'
    | 'neutral';
  /* dev helpers */
  isHatched(): boolean;
  onHatchingComplete?: () => void;
}

export interface PetMachineContext {
  bridge: StoreBridge;
  currentAnim: PetAnim;
  asleep: boolean;
  sick: boolean;
  hatched: boolean;
  pettingActive: boolean;
  beingPettedStrokes: number;
  idleBoredomCounterMs: number;
  sleepClickCount: number;
}

export type PetEvent =
  | { type: 'TICK'; dtMs: number }
  | { type: 'FEED'; kind: 'meal' | 'snack' }
  | { type: 'PLAY' }
  | { type: 'CLEAN' }
  | { type: 'SLEEP_CLICK' }
  | { type: 'WAKE' }
  | { type: 'PET_START' }
  | { type: 'PET_STROKE' }
  | { type: 'PET_END' }
  | { type: 'MEDICINE' }
  | { type: 'EVOLVE' }
  | { type: 'HATCHING_COMPLETE' }
  | { type: 'CURSOR_INTERACT' };

function moodToAnim(mood: ReturnType<StoreBridge['deriveMood']>, sick: boolean, asleep: boolean): PetAnim {
  if (asleep) return 'sleeping';
  if (sick) return 'sick';
  switch (mood) {
    case 'hungry':
      return 'hungry';
    case 'sad':
      return 'sad';
    case 'tired':
      return 'sleeping';
    case 'dirty':
      return 'dirty';
    case 'sick':
      return 'sick';
    case 'great':
      return 'happy';
    case 'good':
    case 'neutral':
    default:
      return 'idle';
  }
}

/* ------------------------------------------------------------------ */

const petSetup = setup({
  types: {} as {
    context: PetMachineContext;
    events: PetEvent;
  },
  actions: {
    doFeed: assign(({ context, event }) => {
      if (event.type !== 'FEED') return {};
      const r = context.bridge.feed(event.kind);
      return { currentAnim: r.ok ? 'eating' : 'refuse' };
    }),
    doPlay: assign(({ context }) => {
      const r = context.bridge.play();
      return { currentAnim: r.ok ? 'playing' : 'refuse' };
    }),
    doClean: assign(({ context }) => {
      const r = context.bridge.cleanNow();
      return { currentAnim: r.ok ? 'clean' : 'refuse' };
    }),
    doMedicine: assign(({ context }) => {
      const r = context.bridge.giveMedicine();
      return {
        sick: r.ok ? false : context.sick,
        currentAnim: r.ok ? 'happy' : 'refuse',
      };
    }),
    doToggleSleep: assign(({ context }) => {
      context.bridge.toggleSleep();
      const asleep = context.bridge.isAsleep();
      return {
        asleep,
        sleepClickCount: 0,
        currentAnim: asleep ? 'sleeping' : 'idle',
      };
    }),
    doSetSleepTrue: assign(({ context }) => {
      // Only call bridge.toggleSleep if NOT already asleep (avoids double-flip desync)
      if (!context.bridge.isAsleep()) context.bridge.toggleSleep();
      return {
        asleep: true,
        sleepClickCount: 0,
        currentAnim: 'sleeping',
      };
    }),
    doSetSleepFalse: assign(({ context }) => {
      // Only call bridge.toggleSleep if currently asleep
      if (context.bridge.isAsleep()) context.bridge.toggleSleep();
      return {
        asleep: false,
        sleepClickCount: 0,
        currentAnim: 'idle',
      };
    }),
    refreshIdleAnim: assign(({ context }) => {
      return {
        currentAnim: moodToAnim(
          context.bridge.deriveMood(),
          context.bridge.isSick(),
          context.bridge.isAsleep(),
        ),
      };
    }),
    resetBoredom: assign({ idleBoredomCounterMs: 0 }),
    doEvolve: assign(({ context }) => {
      context.bridge.evolveToNextStageOrNop();
      return { currentAnim: 'evolving' };
    }),
    onHatchingDone: ({ context }) => {
      context.bridge.onHatchingComplete?.();
    },
  },
  guards: {
    canPlay: ({ context }) => context.bridge.readStats().energy >= 15,
    notFull: ({ context, event }) => {
      if (event.type !== 'FEED') return true;
      return context.bridge.readStats().hunger < 99;
    },
    needsCleaning: ({ context }) => context.bridge.readStats().hygiene < 99,
    isSick: ({ context }) => context.bridge.isSick(),
    isAsleepCtx: ({ context }) => context.asleep || context.bridge.isAsleep(),
    notAsleep: ({ context }) => !(context.asleep || context.bridge.isAsleep()),
    hatched: ({ context }) => context.hatched || context.bridge.isHatched(),
    sleepClicksExceed3: ({ context }) => context.sleepClickCount >= 3,
  },
});

/* ------------------------------------------------------------------ */

export const petMachine = petSetup.createMachine({
  id: 'pet',
  initial: 'egg',
  context: ({ input }) => ({
    bridge: (input as { bridge: StoreBridge }).bridge,
    currentAnim: 'hatching_wobble',
    asleep: false,
    sick: false,
    hatched: false,
    pettingActive: false,
    beingPettedStrokes: 0,
    idleBoredomCounterMs: 0,
    sleepClickCount: 0,
  }),
  on: {
    TICK: {
      actions: assign(({ context, event }) => {
        if (event.type !== 'TICK') return {};
        return {
          idleBoredomCounterMs: context.idleBoredomCounterMs + event.dtMs,
          asleep: context.bridge.isAsleep(),
          sick: context.bridge.isSick(),
          hatched: context.bridge.isHatched() ? true : context.hatched,
        };
      }),
    },
    CURSOR_INTERACT: {
      actions: 'resetBoredom',
    },
  },
  states: {
    egg: {
      initial: 'wobble',
      on: {
        HATCHING_COMPLETE: {
          target: 'alive',
          actions: [
            assign({ hatched: true, currentAnim: 'happy' }),
            'onHatchingDone',
          ],
        },
      },
      states: {
        wobble: {
          always: { guard: 'hatched', target: '#pet.alive' },
        },
      },
    },
    alive: {
      entry: 'refreshIdleAnim',
      initial: 'idle',
      states: {
        idle: {
          entry: 'refreshIdleAnim',
          after: { 9000: { target: 'idle', reenter: true, actions: 'refreshIdleAnim' } },
          always: {
            // Safety invariant: if zustand says asleep but we're in idle state (desynced), sync into asleep.
            guard: { type: 'isAsleepCtx' },
            target: 'asleep',
            actions: 'doSetSleepTrue',
          },
          on: {
            FEED: {
              target: 'eating',
              guard: { type: 'notFull' },
              actions: ['doFeed', 'resetBoredom'],
            },
            PLAY: {
              target: 'playing',
              guard: { type: 'canPlay' },
              actions: ['doPlay', 'resetBoredom'],
            },
            CLEAN: {
              target: 'cleaning',
              guard: { type: 'needsCleaning' },
              actions: ['doClean', 'resetBoredom'],
            },
            MEDICINE: {
              target: 'takingMedicine',
              guard: { type: 'isSick' },
              actions: ['doMedicine', 'resetBoredom'],
            },
            PET_START: {
              target: 'beingPetted',
              guard: { type: 'notAsleep' },
              actions: assign({ pettingActive: true, currentAnim: 'pet' }),
            },
            SLEEP_CLICK: {
              target: 'asleep',
              // No guard: if machine=idle but store=asleep (desynced), just sync INTO asleep.
              // doSetSleepTrue is idempotent (does nothing if already asleep).
              actions: 'doSetSleepTrue',
            },
            EVOLVE: {
              target: '#pet.evolving',
              actions: 'doEvolve',
            },
          },
        },
        eating: {
          after: { 1400: { target: 'idle', actions: 'refreshIdleAnim' } },
        },
        playing: {
          after: { 1800: { target: 'idle', actions: 'refreshIdleAnim' } },
        },
        cleaning: {
          after: { 1600: { target: 'idle', actions: 'refreshIdleAnim' } },
        },
        takingMedicine: {
          after: { 1600: { target: 'idle', actions: 'refreshIdleAnim' } },
        },
        beingPetted: {
          on: {
            PET_STROKE: {
              target: 'beingPetted',
              reenter: false,
              actions: [
                assign(({ context }) => {
                  context.bridge.petStroke();
                  return {
                    beingPettedStrokes: context.beingPettedStrokes + 1,
                    currentAnim: 'pet',
                  };
                }),
                'resetBoredom',
              ],
            },
            PET_END: {
              target: 'idle',
              actions: [
                assign({
                  pettingActive: false,
                  beingPettedStrokes: 0,
                }),
                'refreshIdleAnim',
              ],
            },
          },
          after: {
            1500: {
              target: 'idle',
              actions: [assign({ pettingActive: false }), 'refreshIdleAnim'],
            },
          },
        },
        asleep: {
          entry: assign({ currentAnim: 'sleeping', sleepClickCount: 0 }),
          exit: assign({ sleepClickCount: 0 }),
          on: {
            WAKE: { target: 'idle', actions: 'doSetSleepFalse' },
            SLEEP_CLICK: [
              {
                guard: ({ context }) => context.sleepClickCount + 1 >= 3,
                target: 'idle',
                actions: ['doSetSleepFalse', assign({ sleepClickCount: 0 })],
              },
              {
                // Explicit self-target → external re-enter: restarts the after-3s reset timer on each click
                target: 'asleep',
                actions: assign({
                  sleepClickCount: ({ context }) => context.sleepClickCount + 1,
                }),
              },
            ],
          },
          after: {
            3000: {
              // No-click window: if 3s passes with no click, reset click count
              target: 'asleep', // self-target forces entry action (count reset + anim)
              actions: assign({ currentAnim: 'sleeping' }),
            },
          },
        },
      },
    },
    evolving: {
      after: {
        1600: { target: 'alive.idle', actions: 'refreshIdleAnim' },
      },
    },
  },
});

/**
 * Convenience helper that creates an actor from the machine + bridge and
 * returns state-path, animation, and actor reference.
 */
export function createPetActor(bridge: StoreBridge) {
  return createActor(petMachine, { input: { bridge } });
}

export type PetActor = ReturnType<typeof createPetActor>;
