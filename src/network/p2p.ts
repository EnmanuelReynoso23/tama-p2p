import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
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
import { getPlayerId, readAppMode } from './invite';
import { signPayload, verifySignedPayload } from './crypto';
import { connectMqtt, type MqttClient } from './mqttws';
import { RELAY_KEEPALIVE_S, RELAY_WS_URL, parseRelayMessage, parseRelayTopic, relayTopics } from '../../core/relay.js';

export type { PetStatsBroadcast, PetSyncData, P2PGift, P2PInteraction, GiftKind, InteractionKind };

export interface P2PCallbacks {
  onPeerJoin: (peerId: string) => void;
  onPeerLeave: (peerId: string) => void;
  onReceiveState: (data: PetSyncData, peerId: string) => void;
  onReceiveGift: (gift: P2PGift, peerId: string) => void;
  onReceiveInteraction: (interaction: P2PInteraction, peerId: string) => void;
}

export const myPlayerId = getPlayerId();

const DEFAULT_SIGNALING_SERVERS = [
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-signaling-eu.herokuapp.com',
  'wss://y-webrtc-signaling-us.herokuapp.com',
];

const CONSUMED_GIFTS_KEY = 'tama-consumed-gifts';
const CONSUMED_INTERACTIONS_KEY = 'tama-consumed-interactions';
const MAX_ITEM_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadConsumedIds(storageKey: string): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.slice(-300) : []);
  } catch {
    return new Set();
  }
}

function persistConsumedId(storageKey: string, id: string, set: Set<string>): void {
  set.add(id);
  try {
    if (typeof window !== 'undefined') {
      const arr = Array.from(set).slice(-300);
      localStorage.setItem(storageKey, JSON.stringify(arr));
    }
  } catch {
    /* ignore */
  }
}

let activeDoc: Y.Doc | null = null;
let activeWebrtc: WebrtcProvider | null = null;
let activeIndexeddb: IndexeddbPersistence | null = null;
let currentRoomId: string | null = null;
let activeRelay: MqttClient | null = null;
let activeRelayTopics: ReturnType<typeof relayTopics> | null = null;

/** Una maquinita que no manda su estado en este tiempo se da por apagada. */
const MACHINE_STALE_MS = 3 * 60 * 1000;
const MAX_RELAY_PAYLOAD = 8 * 1024;

let consumedGifts = loadConsumedIds(CONSUMED_GIFTS_KEY);
let consumedInteractions = loadConsumedIds(CONSUMED_INTERACTIONS_KEY);

/**
 * Connects to a room using Local-First CRDTs:
 * 1. Y.Doc holds shared state (pets map, gifts, interactions).
 * 2. y-indexeddb persists state in IndexedDB (offline-ready, zero data loss).
 * 3. y-webrtc synchronizes CRDT state directly P2P with room peers when online.
 */
export function connectP2P(roomId: string, callbacks: P2PCallbacks): void {
  if (activeDoc && currentRoomId === roomId) {
    return;
  }

  disconnectP2P();
  currentRoomId = roomId;
  consumedGifts = loadConsumedIds(CONSUMED_GIFTS_KEY);
  consumedInteractions = loadConsumedIds(CONSUMED_INTERACTIONS_KEY);

  const doc = new Y.Doc();
  activeDoc = doc;

  const petsMap = doc.getMap<unknown>('pets');
  const giftsMap = doc.getMap<unknown>('gifts');
  const interactionsMap = doc.getMap<unknown>('interactions');

  const processPendingGifts = () => {
    const now = Date.now();
    giftsMap.forEach((val, key) => {
      if (consumedGifts.has(key)) return;
      persistConsumedId(CONSUMED_GIFTS_KEY, key, consumedGifts);

      const parsed = parseGift(val);
      if (parsed && (!parsed.targetPlayerId || parsed.targetPlayerId === myPlayerId)) {
        if (parsed.playerId !== myPlayerId && now - parsed.timestamp < MAX_ITEM_AGE_MS) {
          callbacks.onReceiveGift(parsed, parsed.playerId || key);
        }
      }
    });
  };

  const processPendingInteractions = () => {
    const now = Date.now();
    interactionsMap.forEach((val, key) => {
      if (consumedInteractions.has(key)) return;
      persistConsumedId(CONSUMED_INTERACTIONS_KEY, key, consumedInteractions);

      const parsed = parseInteraction(val);
      if (parsed && (!parsed.targetPlayerId || parsed.targetPlayerId === myPlayerId)) {
        if (parsed.playerId !== myPlayerId && now - parsed.timestamp < MAX_ITEM_AGE_MS) {
          callbacks.onReceiveInteraction(parsed, parsed.playerId || key);
        }
      }
    });
  };

  // 1. Local IndexedDB Persistence (Browser only)
  const hasIndexedDB = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
  if (hasIndexedDB) {
    try {
      const idb = new IndexeddbPersistence(`tama-db-${roomId}`, doc);
      activeIndexeddb = idb;

      idb.whenSynced
        .then(() => {
          // Rehydrate friends from local IndexedDB state immediately
          petsMap.forEach((val, playerId) => {
            if (playerId !== myPlayerId) {
              const parsed = parsePetSync(val);
              if (parsed) callbacks.onReceiveState(parsed, playerId);
            }
          });

          // Deliver any offline gifts or interactions waiting in IndexedDB
          processPendingGifts();
          processPendingInteractions();
        })
        .catch(() => {
          /* ignore error */
        });
    } catch {
      /* ignore error */
    }
  }

  // 2. Real-time WebRTC P2P Sync (Browser only)
  const hasWebRTC =
    typeof window !== 'undefined' &&
    (typeof RTCPeerConnection !== 'undefined' || typeof (window as unknown as { RTCPeerConnection?: unknown }).RTCPeerConnection !== 'undefined');

  if (hasWebRTC) {
    try {
      const webrtc = new WebrtcProvider(`tama-room-${roomId}`, doc, {
        signaling: DEFAULT_SIGNALING_SERVERS,
        password: `tama:${roomId}`,
      });
      activeWebrtc = webrtc;

      // Set user awareness presence
      if (webrtc.awareness) {
        webrtc.awareness.setLocalStateField('user', {
          playerId: myPlayerId,
          device: readAppMode(),
          connectedAt: Date.now(),
        });

        let prevOnlinePeers = new Set<string>();

        webrtc.awareness.on('change', () => {
          const states = webrtc.awareness.getStates() as Map<
            number,
            { user?: { playerId?: string; device?: string } }
          >;
          const currentPeers = new Set<string>();

          states.forEach((state, clientID) => {
            if (clientID === webrtc.awareness.clientID) return;
            const pId = state?.user?.playerId;
            if (pId && pId !== myPlayerId) {
              currentPeers.add(pId);
            }
          });

          // Check joined peers
          for (const peerId of currentPeers) {
            if (!prevOnlinePeers.has(peerId)) {
              callbacks.onPeerJoin(peerId);
            }
          }

          // Check left peers
          for (const peerId of prevOnlinePeers) {
            if (!currentPeers.has(peerId)) {
              callbacks.onPeerLeave(peerId);
            }
          }

          prevOnlinePeers = currentPeers;
        });
      }
    } catch {
      /* ignore webrtc init error */
    }
  }

  // 3. Observers for CRDT State Changes
  petsMap.observe((event) => {
    event.changes.keys.forEach((change, key) => {
      if (key === myPlayerId) return;
      if (change.action === 'add' || change.action === 'update') {
        const raw = petsMap.get(key);
        const parsed = parsePetSync(raw);
        if (parsed) {
          if (parsed.sig && parsed.pubKey && typeof raw === 'object' && raw !== null) {
            void verifySignedPayload(raw as Record<string, unknown>).then((valid) => {
              if (valid) callbacks.onReceiveState(parsed, key);
            });
          } else {
            callbacks.onReceiveState(parsed, key);
          }
        }
      }
    });
  });

  giftsMap.observe((event) => {
    const now = Date.now();
    event.changes.keys.forEach((change, key) => {
      if (change.action === 'add' || change.action === 'update') {
        if (consumedGifts.has(key)) return;
        persistConsumedId(CONSUMED_GIFTS_KEY, key, consumedGifts);

        const raw = giftsMap.get(key);
        const parsed = parseGift(raw);
        if (parsed && (!parsed.targetPlayerId || parsed.targetPlayerId === myPlayerId)) {
          if (parsed.playerId !== myPlayerId && now - parsed.timestamp < MAX_ITEM_AGE_MS) {
            if (parsed.sig && parsed.pubKey && typeof raw === 'object' && raw !== null) {
              void verifySignedPayload(raw as Record<string, unknown>).then((valid) => {
                if (valid) callbacks.onReceiveGift(parsed, parsed.playerId || key);
              });
            } else {
              callbacks.onReceiveGift(parsed, parsed.playerId || key);
            }
          }
        }
      }
    });
  });

  interactionsMap.observe((event) => {
    const now = Date.now();
    event.changes.keys.forEach((change, key) => {
      if (change.action === 'add' || change.action === 'update') {
        if (consumedInteractions.has(key)) return;
        persistConsumedId(CONSUMED_INTERACTIONS_KEY, key, consumedInteractions);

        const raw = interactionsMap.get(key);
        const parsed = parseInteraction(raw);
        if (parsed && (!parsed.targetPlayerId || parsed.targetPlayerId === myPlayerId)) {
          if (parsed.playerId !== myPlayerId && now - parsed.timestamp < MAX_ITEM_AGE_MS) {
            if (parsed.sig && parsed.pubKey && typeof raw === 'object' && raw !== null) {
              void verifySignedPayload(raw as Record<string, unknown>).then((valid) => {
                if (valid) callbacks.onReceiveInteraction(parsed, parsed.playerId || key);
              });
            } else {
              callbacks.onReceiveInteraction(parsed, parsed.playerId || key);
            }
          }
        }
      }
    });
  });

  // 4. Puente MQTT con la maquinita (el ESP32 no habla WebRTC). Lo que llega
  //    se mete en los mismos mapas, asi pasa por las mismas validaciones.
  if (typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
    connectRelay(roomId, doc, callbacks);
  }
}

function connectRelay(roomId: string, doc: Y.Doc, callbacks: P2PCallbacks): void {
  const topics = relayTopics(roomId, myPlayerId);
  activeRelayTopics = topics;
  const petsMap = doc.getMap<unknown>('pets');
  const giftsMap = doc.getMap<unknown>('gifts');
  const interactionsMap = doc.getMap<unknown>('interactions');
  const offline = new Set<string>();

  const isMachine = (playerId: string) => parsePetSync(petsMap.get(playerId))?.device === 'machine';

  const onMessage = (topic: string, payload: string) => {
    const t = parseRelayTopic(topics.base, topic);
    if (!t || t.from === myPlayerId || payload.length > MAX_RELAY_PAYLOAD) return;
    if (t.kind === 'off') {
      if (payload !== '1') {
        offline.delete(t.from);
      } else {
        offline.add(t.from);
        // La presencia de los telefonos la da WebRTC; la de la maquinita, esto.
        if (isMachine(t.from)) callbacks.onPeerLeave(t.from);
      }
      return;
    }
    if (!payload) return;
    let raw: unknown;
    try {
      raw = JSON.parse(payload);
    } catch {
      return;
    }
    if (t.kind === 'pet') {
      const next = parsePetSync(raw);
      if (!next || next.playerId !== t.from) return;
      const prev = parsePetSync(petsMap.get(t.from));
      if (prev && prev.updatedAt >= next.updatedAt) return;
      petsMap.set(t.from, raw);
      if (next.device === 'machine' && (offline.has(t.from) || Date.now() - next.updatedAt > MACHINE_STALE_MS))
        callbacks.onPeerLeave(t.from);
      return;
    }
    const msg = parseRelayMessage(raw, t);
    if (!msg) return;
    const base = {
      playerId: msg.playerId,
      senderName: msg.senderName,
      timestamp: msg.timestamp,
      ...(msg.targetPlayerId ? { targetPlayerId: msg.targetPlayerId } : {}),
    };
    if (msg.type === 'gift') {
      if (!giftsMap.has(msg.id)) giftsMap.set(msg.id, { ...base, kind: msg.kind });
    } else if (!interactionsMap.has(msg.id)) {
      interactionsMap.set(msg.id, { ...base, action: msg.action });
    }
  };

  activeRelay = connectMqtt({
    url: RELAY_WS_URL,
    clientId: `animo-${myPlayerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}-${Math.random().toString(36).slice(2, 8)}`,
    keepAliveS: RELAY_KEEPALIVE_S,
    will: { topic: topics.myOff, payload: '1', retain: true },
    subscribe: topics.subscribe,
    onConnect: () => {
      activeRelay?.publish(topics.myOff, '', true);
      const mine = petsMap.get(myPlayerId);
      if (mine) activeRelay?.publish(topics.myPet, JSON.stringify(mine), true);
    },
    onMessage,
  });
}

function relayPublish(topic: string, payload: unknown, retain: boolean): void {
  if (!activeRelay) return;
  try {
    activeRelay.publish(topic, JSON.stringify(payload), retain);
  } catch {
    /* sin broker se sigue por WebRTC */
  }
}

export function broadcastMyState(data: Omit<PetStatsBroadcast, 'playerId'>): void {
  if (!activeDoc) return;
  const payload: PetSyncData = {
    ...data,
    playerId: myPlayerId,
    v: PROTOCOL_VERSION,
    updatedAt: Date.now(),
  };
  const petsMap = activeDoc.getMap<unknown>('pets');
  petsMap.set(myPlayerId, payload);

  // Cryptographically sign payload locally with Web Crypto API ECDSA P-256
  void signPayload(payload as unknown as Record<string, unknown>).then((signed) => {
    if (activeDoc && currentRoomId) {
      activeDoc.getMap<unknown>('pets').set(myPlayerId, signed);
      if (activeRelayTopics) relayPublish(activeRelayTopics.myPet, signed, true);
    }
  });
}

export function sendP2PGift(kind: GiftKind, senderName: string, targetPlayerId?: string): void {
  if (!activeDoc) return;
  const giftId = `${myPlayerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload: P2PGift = {
    playerId: myPlayerId,
    senderName,
    kind,
    timestamp: Date.now(),
    ...(targetPlayerId ? { targetPlayerId } : {}),
  };
  persistConsumedId(CONSUMED_GIFTS_KEY, giftId, consumedGifts);
  const giftsMap = activeDoc.getMap<unknown>('gifts');
  giftsMap.set(giftId, payload);
  if (activeRelayTopics)
    relayPublish(activeRelayTopics.msgTo(targetPlayerId ?? ''), { type: 'gift', id: giftId, ...payload }, true);

  void signPayload(payload as unknown as Record<string, unknown>).then((signed) => {
    if (activeDoc && currentRoomId) {
      activeDoc.getMap<unknown>('gifts').set(giftId, signed);
    }
  });
}

export function sendP2PInteraction(action: InteractionKind, senderName: string, targetPlayerId?: string): void {
  if (!activeDoc) return;
  const interactionId = `${myPlayerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload: P2PInteraction = {
    playerId: myPlayerId,
    senderName,
    action,
    timestamp: Date.now(),
    ...(targetPlayerId ? { targetPlayerId } : {}),
  };
  persistConsumedId(CONSUMED_INTERACTIONS_KEY, interactionId, consumedInteractions);
  const interactionsMap = activeDoc.getMap<unknown>('interactions');
  interactionsMap.set(interactionId, payload);
  if (activeRelayTopics)
    relayPublish(activeRelayTopics.msgTo(targetPlayerId ?? ''), { type: 'interaction', id: interactionId, ...payload }, true);

  void signPayload(payload as unknown as Record<string, unknown>).then((signed) => {
    if (activeDoc && currentRoomId) {
      activeDoc.getMap<unknown>('interactions').set(interactionId, signed);
    }
  });
}

export interface CRDTHistoryItem {
  id: string;
  type: 'gift' | 'interaction';
  senderName: string;
  playerId: string;
  targetPlayerId?: string;
  detail: string;
  timestamp: number;
}

export function getCRDTHistory(): CRDTHistoryItem[] {
  if (!activeDoc) return [];
  const giftsMap = activeDoc.getMap<unknown>('gifts');
  const interactionsMap = activeDoc.getMap<unknown>('interactions');
  const items: CRDTHistoryItem[] = [];

  giftsMap.forEach((val, id) => {
    const p = parseGift(val);
    if (p) {
      items.push({
        id,
        type: 'gift',
        senderName: p.senderName,
        playerId: p.playerId,
        targetPlayerId: p.targetPlayerId,
        detail: p.kind,
        timestamp: p.timestamp,
      });
    }
  });

  interactionsMap.forEach((val, id) => {
    const p = parseInteraction(val);
    if (p) {
      items.push({
        id,
        type: 'interaction',
        senderName: p.senderName,
        playerId: p.playerId,
        targetPlayerId: p.targetPlayerId,
        detail: p.action,
        timestamp: p.timestamp,
      });
    }
  });

  items.sort((a, b) => b.timestamp - a.timestamp);
  return items.slice(0, 50);
}

export function disconnectP2P(): void {
  if (activeRelay) {
    try {
      activeRelay.close();
    } catch {
      /* ignore */
    }
    activeRelay = null;
  }
  activeRelayTopics = null;

  if (activeWebrtc) {
    try {
      activeWebrtc.destroy();
    } catch {
      /* ignore */
    }
    activeWebrtc = null;
  }

  if (activeIndexeddb) {
    try {
      void activeIndexeddb.destroy();
    } catch {
      /* ignore */
    }
    activeIndexeddb = null;
  }

  if (activeDoc) {
    try {
      activeDoc.destroy();
    } catch {
      /* ignore */
    }
    activeDoc = null;
  }

  currentRoomId = null;
}
