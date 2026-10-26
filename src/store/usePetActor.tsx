import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useSelector } from '@xstate/react';
import type { ActorRefFrom, SnapshotFrom } from 'xstate';
import { createPetActor, petMachine, type PetAnim, type PetEvent, type StoreBridge } from '../machines/petMachine';
import { usePetStore, setMachineEventSink } from '../store/usePetStore';
import { deriveMood } from '../game/actions';

/* ------------------------------------------------------------------ */
/*  Bridge — Zustand → XState adapter                                  */
/* ------------------------------------------------------------------ */

function buildStoreBridge(): StoreBridge {
  const snap = () => usePetStore.getState();
  return {
    readStats: () => ({ ...snap().stats }),
    isAsleep: () => snap().isAsleep,
    isSick: () => snap().isSick,
    isHatched: () => snap().hatched,
    feed: (kind) => {
      const r = snap().feed(kind);
      return r;
    },
    play: (bonus) => snap().play(bonus ?? 0),
    cleanNow: () => snap().cleanNow(),
    giveMedicine: () => snap().giveMedicineNow(),
    toggleSleep: () => snap().toggleSleepToggle(),
    petStroke: () => snap().petStrokeNow().granted,
    evolveToNextStageOrNop: () => {
      const s = snap();
      const byOrder: Array<{ from: 'egg' | 'baby' | 'child' | 'teen' | 'adult'; to: 'egg' | 'baby' | 'child' | 'teen' | 'adult' }> = [
        { from: 'egg', to: 'baby' },
        { from: 'baby', to: 'child' },
        { from: 'child', to: 'teen' },
        { from: 'teen', to: 'adult' },
      ];
      const next = byOrder.find((o) => o.from === s.stage);
      if (next && next.to !== s.stage) {
        s.evolveTo(next.to as 'baby' | 'child' | 'teen' | 'adult');
        return true;
      }
      return false;
    },
    deriveMood: () => {
      const s = snap();
      const mood = deriveMood(s.stats, { isAsleep: s.isAsleep, isSick: s.isSick });
      return mood.kind;
    },
    onHatchingComplete: () => {
      const s = snap();
      if (!s.hatched) {
        s.setHatched();
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/*  React context                                                      */
/* ------------------------------------------------------------------ */

type PetActorRef = ActorRefFrom<typeof petMachine>;
type PetSnapshot = SnapshotFrom<typeof petMachine>;

interface PetActorContextValue {
  actor: PetActorRef;
  send: (event: PetEvent) => void;
  currentAnim: PetAnim;
  statePath: string;
  snapshot: () => PetSnapshot;
}

const PetActorContext = createContext<PetActorContextValue | null>(null);

export function PetActorProvider({ children }: { children: React.ReactNode }) {
  // Actor is created once per mount. Bridge re-reads Zustand on every call,
  // so there is no stale-closure issue.
  const actorRef = useRef<PetActorRef | null>(null);
  if (actorRef.current === null) {
    const bridge = buildStoreBridge();
    actorRef.current = createPetActor(bridge);
  }

  const value = useMemo<PetActorContextValue>(() => {
    const actor = actorRef.current!;
    return {
      actor,
      send: (event) => actor.send(event),
      currentAnim: actor.getSnapshot().context.currentAnim,
      statePath: statePathOf(actor.getSnapshot()),
      snapshot: () => actor.getSnapshot(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start / stop actor, subscribe to state transitions and dispatch TICK
  // via rAF (so dt stays precise even if tab rate drops).
  useEffect(() => {
    const actor = actorRef.current!;
    const sub = actor.subscribe(() => {
      /* Force re-render via a version counter below if needed, but we use
       * useSelector in consumers so this is just for side-effect tracking */
    });
    actor.start();

    // Wire the Zustand → XState event bridge so tick() can fire EVOLVE /
    // HATCHING_COMPLETE through the machine for transient flash visuals.
    setMachineEventSink((e) => {
      actor.send(e as PetEvent);
    });

    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(120, t - last); // clamp to 120ms max (avoids huge steps after tab switch)
      last = t;
      actor.send({ type: 'TICK', dtMs: dt });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      setMachineEventSink(null);
      sub.unsubscribe();
      actor.stop();
    };
  }, []);

  return (
    <PetActorContext.Provider value={value}>
      {/* Subscribe children to updates via a child-subscription wrapper */}
      <_PetVersionBump actor={actorRef.current}>{children}</_PetVersionBump>
    </PetActorContext.Provider>
  );
}

/**
 * Renders its children, but bumps a version counter every time the actor
 * emits a state transition so subscribed consumers using useSelector get
 * fresh values and components without explicit subscription re-render at
 * least at the shell level (keeps MachineDebug live).
 */
function _PetVersionBump({
  actor,
  children,
}: {
  actor: PetActorRef;
  children: React.ReactNode;
}) {
  const [, setV] = React.useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const sub = actor.subscribe(() => setV());
    return () => sub.unsubscribe();
  }, [actor]);
  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

export function usePetActorCtx(): PetActorContextValue {
  const v = useContext(PetActorContext);
  if (!v) throw new Error('usePetActorCtx must be used inside <PetActorProvider>');
  return v;
}

export function usePetCurrentAnim(): PetAnim {
  const { actor } = usePetActorCtx();
  return useSelector(actor, (s) => s.context.currentAnim);
}

export function usePetStatePath(): string {
  const { actor } = usePetActorCtx();
  return useSelector(actor, (s) => statePathOf(s));
}

export function usePetSnapshot(): () => PetSnapshot {
  return usePetActorCtx().snapshot;
}

/* ------------------------------------------------------------------ */
/*  Util: pretty state-path string for the debug view                  */
/* ------------------------------------------------------------------ */

function statePathOf(snap: PetSnapshot): string {
  // XState v5 Snapshot exposes .value as nested object.
  // Walk it to produce a dot-separated path like "alive.consciousness.idle".
  const segments: string[] = [];
  let node: unknown = snap.value;
  while (node && typeof node === 'object') {
    const keys = Object.keys(node as Record<string, unknown>);
    if (keys.length === 0) break;
    const k = keys[0];
    segments.push(k);
    node = (node as Record<string, unknown>)[k];
    if (typeof node === 'string') {
      segments.push(node);
      break;
    }
  }
  return segments.join(' · ') || 'unknown';
}
