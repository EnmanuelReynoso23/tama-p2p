import { joinRoom, type Room } from 'trystero/nostr';
import {
  PROTOCOL_VERSION,
  parseGift,
  parseInteraction,
  parsePetSync,
  type GiftKind,
  type InteractionKind,
  type P2PGift,
  type P2PInteraction,
  type PetStatsBroadcast,
  type PetSyncData,
} from './protocol';
import { getPlayerId } from './invite';

export type { PetStatsBroadcast, PetSyncData, P2PGift, P2PInteraction, GiftKind, InteractionKind };

export interface P2PCallbacks {
  onPeerJoin: (peerId: string) => void;
  onPeerLeave: (peerId: string) => void;
  onReceiveState: (data: PetSyncData, peerId: string) => void;
  onReceiveGift: (gift: P2PGift, peerId: string) => void;
  onReceiveInteraction: (interaction: P2PInteraction, peerId: string) => void;
}

type Sender = (data: unknown) => Promise<void>;

let activeRoom: Room | null = null;
let sendState: Sender | null = null;
let sendGift: Sender | null = null;
let sendInteraction: Sender | null = null;

export const myPlayerId = getPlayerId();

/**
 * Joins a Trystero room over public Nostr relays (no server of our own).
 * The room code doubles as the password that encrypts the WebRTC handshake.
 */
export function connectP2P(roomId: string, callbacks: P2PCallbacks): void {
  disconnectP2P();

  const room = joinRoom(
    { appId: 'pixel-pet-nostr-p2p', password: `tama:${roomId}`, maxReceiveBytes: 64 * 1024 },
    roomId,
  );
  activeRoom = room;

  const stateAction = room.makeAction('petState');
  const giftAction = room.makeAction('petGift');
  const interactionAction = room.makeAction('petInteraction');

  // Payloads are plain JSON objects; Trystero's JsonValue type wants an index signature.
  sendState = (d) => stateAction.send(d as never);
  sendGift = (d) => giftAction.send(d as never);
  sendInteraction = (d) => interactionAction.send(d as never);

  room.onPeerJoin = (peerId) => callbacks.onPeerJoin(peerId);
  room.onPeerLeave = (peerId) => callbacks.onPeerLeave(peerId);

  stateAction.onMessage = (data, { peerId }) => {
    const parsed = parsePetSync(data);
    if (parsed && parsed.playerId !== myPlayerId) callbacks.onReceiveState(parsed, peerId);
  };
  giftAction.onMessage = (data, { peerId }) => {
    const parsed = parseGift(data);
    if (parsed) callbacks.onReceiveGift(parsed, peerId);
  };
  interactionAction.onMessage = (data, { peerId }) => {
    const parsed = parseInteraction(data);
    if (parsed) callbacks.onReceiveInteraction(parsed, peerId);
  };
}

export function broadcastMyState(data: Omit<PetStatsBroadcast, 'playerId'>): void {
  if (!sendState) return;
  const payload: PetSyncData = {
    ...data,
    playerId: myPlayerId,
    v: PROTOCOL_VERSION,
    updatedAt: Date.now(),
  };
  sendState(payload).catch(() => {});
}

export function sendP2PGift(kind: GiftKind, senderName: string): void {
  if (!sendGift) return;
  const payload: P2PGift = { playerId: myPlayerId, senderName, kind, timestamp: Date.now() };
  sendGift(payload).catch(() => {});
}

export function sendP2PInteraction(action: InteractionKind, senderName: string): void {
  if (!sendInteraction) return;
  const payload: P2PInteraction = { playerId: myPlayerId, senderName, action, timestamp: Date.now() };
  sendInteraction(payload).catch(() => {});
}

export function disconnectP2P(): void {
  if (!activeRoom) return;
  try {
    void activeRoom.leave();
  } catch {
    /* already gone */
  }
  activeRoom = null;
  sendState = null;
  sendGift = null;
  sendInteraction = null;
}
