import { joinRoom, selfId, type Room } from 'trystero/nostr';

export interface PetStatsBroadcast {
  name: string;
  stage: string;
  hunger: number;
  happiness: number;
  energy: number;
  hygiene: number;
  health: number;
  isAsleep: boolean;
  streak?: number;
  habitsCompleted?: number;
  habitsTotal?: number;
}

export type PetSyncData = PetStatsBroadcast & {
  senderId: string;
  updatedAt: number;
};

export interface P2PGift {
  senderId: string;
  senderName: string;
  kind: 'berry' | 'snack' | 'toy' | 'medicine';
  timestamp: number;
}

export interface P2PInteraction {
  senderId: string;
  senderName: string;
  action: 'visit' | 'pet' | 'cheer';
  timestamp: number;
}

export interface P2PCallbacks {
  onPeerJoin: (peerId: string) => void;
  onPeerLeave: (peerId: string) => void;
  onReceiveState: (data: PetSyncData, peerId: string) => void;
  onReceiveGift: (gift: P2PGift, peerId: string) => void;
  onReceiveInteraction: (interaction: P2PInteraction, peerId: string) => void;
}

let activeRoom: Room | null = null;
let currentSendState: ((data: PetSyncData) => Promise<void>) | null = null;
let currentSendGift: ((gift: P2PGift) => Promise<void>) | null = null;
let currentSendInteraction: ((interaction: P2PInteraction) => Promise<void>) | null = null;

export const myPeerId = selfId;

export function connectP2P(roomId: string, callbacks: P2PCallbacks): void {
  disconnectP2P();

  const appId = 'pixel-pet-nostr-p2p';
  const room = joinRoom({ appId }, roomId);
  activeRoom = room;

  // Use makeAction without strict generic constraint issue
  const stateAction = room.makeAction('petState');
  const giftAction = room.makeAction('petGift');
  const interactionAction = room.makeAction('petInteraction');

  currentSendState = (data) => stateAction.send(data as unknown as Record<string, string | number | boolean>);
  currentSendGift = (gift) => giftAction.send(gift as unknown as Record<string, string | number | boolean>);
  currentSendInteraction = (interaction) => interactionAction.send(interaction as unknown as Record<string, string | number | boolean>);

  room.onPeerJoin = (peerId: string) => {
    callbacks.onPeerJoin(peerId);
  };

  room.onPeerLeave = (peerId: string) => {
    callbacks.onPeerLeave(peerId);
  };

  stateAction.onMessage = (data: unknown, context: { peerId: string }) => {
    callbacks.onReceiveState(data as PetSyncData, context.peerId);
  };

  giftAction.onMessage = (gift: unknown, context: { peerId: string }) => {
    callbacks.onReceiveGift(gift as P2PGift, context.peerId);
  };

  interactionAction.onMessage = (interaction: unknown, context: { peerId: string }) => {
    callbacks.onReceiveInteraction(interaction as P2PInteraction, context.peerId);
  };
}

export function broadcastMyState(data: PetStatsBroadcast): void {
  if (!currentSendState || !activeRoom) return;
  const payload: PetSyncData = {
    ...data,
    senderId: myPeerId,
    updatedAt: Date.now(),
  };
  currentSendState(payload).catch(() => {});
}

export function sendP2PGift(giftKind: P2PGift['kind'], senderName: string): void {
  if (!currentSendGift || !activeRoom) return;
  const payload: P2PGift = {
    senderId: myPeerId,
    senderName,
    kind: giftKind,
    timestamp: Date.now(),
  };
  currentSendGift(payload).catch(() => {});
}

export function sendP2PInteraction(action: P2PInteraction['action'], senderName: string): void {
  if (!currentSendInteraction || !activeRoom) return;
  const payload: P2PInteraction = {
    senderId: myPeerId,
    senderName,
    action,
    timestamp: Date.now(),
  };
  currentSendInteraction(payload).catch(() => {});
}

export function disconnectP2P(): void {
  if (activeRoom) {
    try {
      activeRoom.leave();
    } catch {}
    activeRoom = null;
    currentSendState = null;
    currentSendGift = null;
    currentSendInteraction = null;
  }
}
