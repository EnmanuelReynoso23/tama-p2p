import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import {
  connectP2P,
  disconnectP2P,
  broadcastMyState,
  sendP2PGift,
  sendP2PInteraction,
  getCRDTHistory,
  type PetStatsBroadcast,
} from './p2p';

describe('Yjs CRDT P2P Engine', () => {
  beforeEach(() => {
    disconnectP2P();
  });

  afterEach(() => {
    disconnectP2P();
  });

  it('initializes room and broadcasts local pet state to CRDT map', () => {
    const onReceiveState = vi.fn();
    connectP2P('test-room-1', {
      onPeerJoin: vi.fn(),
      onPeerLeave: vi.fn(),
      onReceiveState,
      onReceiveGift: vi.fn(),
      onReceiveInteraction: vi.fn(),
    });

    const petData: Omit<PetStatsBroadcast, 'playerId'> = {
      ownerName: 'Reyno',
      device: 'phone',
      name: 'Mochi',
      stage: 'child',
      adultVariant: null,
      hunger: 80,
      happiness: 90,
      energy: 70,
      hygiene: 60,
      health: 100,
      isAsleep: false,
      isSick: false,
      streak: 5,
      habitsCompleted: 3,
      habitsTotal: 4,
      completedDays: ['2026-10-25'],
      frozenDays: [],
    };

    broadcastMyState(petData);
    expect(onReceiveState).not.toHaveBeenCalled();
  });

  it('merges state between two independent Y.Docs (P2P CRDT sync)', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const petsA = docA.getMap('pets');
    const petsB = docB.getMap('pets');

    // Peer A adds its pet
    petsA.set('peer-a', {
      playerId: 'peer-a',
      ownerName: 'Alice',
      name: 'TamaA',
      stage: 'baby',
      hunger: 50,
      updatedAt: 1000,
    });

    // Peer B adds its pet offline
    petsB.set('peer-b', {
      playerId: 'peer-b',
      ownerName: 'Bob',
      name: 'TamaB',
      stage: 'child',
      hunger: 90,
      updatedAt: 1005,
    });

    // Exchange CRDT update state vectors
    const updateFromAToB = Y.encodeStateAsUpdate(docA);
    const updateFromBToA = Y.encodeStateAsUpdate(docB);

    Y.applyUpdate(docB, updateFromAToB);
    Y.applyUpdate(docA, updateFromBToA);

    // Both docs now have both pets with zero conflicts
    expect(petsA.get('peer-b')).toEqual(petsB.get('peer-b'));
    expect(petsB.get('peer-a')).toEqual(petsA.get('peer-a'));
    expect(petsA.has('peer-a')).toBe(true);
    expect(petsA.has('peer-b')).toBe(true);
  });

  it('handles gifts and interactions and registers in CRDT history', () => {
    connectP2P('test-room-gifts', {
      onPeerJoin: vi.fn(),
      onPeerLeave: vi.fn(),
      onReceiveState: vi.fn(),
      onReceiveGift: vi.fn(),
      onReceiveInteraction: vi.fn(),
    });

    sendP2PGift('berry', 'Reyno', 'friend-123');
    sendP2PInteraction('cheer', 'Reyno', 'friend-123');

    const history = getCRDTHistory();
    expect(history.length).toBe(2);
    expect(history.some((h) => h.type === 'gift' && h.detail === 'berry')).toBe(true);
    expect(history.some((h) => h.type === 'interaction' && h.detail === 'cheer')).toBe(true);
  });

  it('cleans up resources cleanly on disconnectP2P', () => {
    connectP2P('test-room-cleanup', {
      onPeerJoin: vi.fn(),
      onPeerLeave: vi.fn(),
      onReceiveState: vi.fn(),
      onReceiveGift: vi.fn(),
      onReceiveInteraction: vi.fn(),
    });

    disconnectP2P();
    expect(getCRDTHistory()).toEqual([]);
  });
});
