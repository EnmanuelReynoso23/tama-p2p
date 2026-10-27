import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  connectP2P,
  disconnectP2P,
  broadcastMyState,
  sendP2PGift,
  sendP2PInteraction,
  myPlayerId,
  type PetSyncData,
  type GiftKind,
  type InteractionKind,
} from '../network/p2p';
import { generateRoomCode, isValidRoomCode, readAppMode, sanitizeRoomCode } from '../network/invite';
import { usePetStore } from './usePetStore';
import { useHabitStore } from './useHabitStore';

export interface FriendRecord {
  playerId: string;
  ownerName: string;
  device: PetSyncData['device'];
  pet: PetSyncData;
  lastSeen: number;
}

export interface P2PLogItem {
  id: string;
  text: string;
  time: number;
}

export interface P2PState {
  roomId: string;
  /** Reconnect to `roomId` automatically when the app opens. */
  autoConnect: boolean;
  /** Your display name for friends ("Mochi de Ana"). */
  ownerName: string;
  isConnected: boolean;
  myPlayerId: string;
  peers: string[];
  /** Trystero peerId (per session) → stable playerId. */
  peerToPlayer: Record<string, string>;
  /** Everyone you've ever met in the room, kept so friend streaks survive offline days. */
  friends: Record<string, FriendRecord>;
  log: P2PLogItem[];

  setRoomId: (id: string) => void;
  newRoom: () => string;
  setOwnerName: (name: string) => void;
  joinRoom: (roomId?: string) => void;
  leaveRoom: () => void;
  syncCurrentPet: () => void;
  sendGiftToPeers: (kind: GiftKind, targetPlayerId?: string) => void;
  sendInteractionToPeers: (action: InteractionKind, targetPlayerId?: string) => void;
  forgetFriend: (playerId: string) => void;
  clearLog: () => void;
}

const GIFT_LABEL: Record<GiftKind, string> = {
  berry: 'una baya',
  snack: 'un snack',
  toy: 'un juguete',
  medicine: 'medicina',
};

const INTERACTION_LABEL: Record<InteractionKind, string> = {
  visit: 'vino de visita',
  pet: 'acarició a tu mascota',
  cheer: 'te está animando: ¡no rompas la racha!',
};

/** One received gift/interaction per friend per window — a peer can't spam-feed your pet. */
const EFFECT_COOLDOWN_MS = 30_000;
const lastEffectAt = new Map<string, number>();
function allowEffect(key: string): boolean {
  const now = Date.now();
  if ((lastEffectAt.get(key) ?? 0) + EFFECT_COOLDOWN_MS > now) return false;
  lastEffectAt.set(key, now);
  return true;
}

/** Broadcast at most every 3 s (stats tick every second). */
const SYNC_MIN_INTERVAL_MS = 3_000;
let lastSyncAt = 0;
let pendingSync: number | null = null;

const logItem = (text: string): P2PLogItem => ({
  id: Math.random().toString(36).slice(2),
  text,
  time: Date.now(),
});

export function friendDisplayName(f: Pick<FriendRecord, 'ownerName' | 'pet'>): string {
  return f.ownerName ? `${f.pet.name} de ${f.ownerName}` : f.pet.name;
}

export const useP2PStore = create<P2PState>()(
  persist(
    (set, get) => {
      const pushLog = (text: string) =>
        set((s) => ({ log: [logItem(text), ...s.log].slice(0, 30) }));

      const senderName = () => {
        const { ownerName } = get();
        const pet = usePetStore.getState().name;
        return ownerName ? `${ownerName} (${pet})` : pet;
      };

      const sendNow = () => {
        lastSyncAt = Date.now();
        const s = usePetStore.getState();
        const habits = useHabitStore.getState();
        broadcastMyState({
          ownerName: get().ownerName,
          device: readAppMode(),
          name: s.name,
          stage: s.hatched ? s.stage : 'egg',
          adultVariant: s.adultVariant,
          hunger: Math.round(s.stats.hunger),
          happiness: Math.round(s.stats.happiness),
          energy: Math.round(s.stats.energy),
          hygiene: Math.round(s.stats.hygiene),
          health: Math.round(s.stats.health),
          isAsleep: s.isAsleep,
          isSick: s.isSick,
          streak: habits.currentStreak,
          habitsCompleted: habits.habits.filter((h) => h.completed).length,
          habitsTotal: habits.habits.length,
          completedDays: habits.completedDays,
          frozenDays: habits.frozenDays,
        });
      };

      return {
        roomId: '',
        autoConnect: false,
        ownerName: '',
        isConnected: false,
        myPlayerId,
        peers: [],
        peerToPlayer: {},
        friends: {},
        log: [],

        setRoomId: (roomId) => set({ roomId: sanitizeRoomCode(roomId) }),

        newRoom: () => {
          const code = generateRoomCode();
          set({ roomId: code });
          return code;
        },

        setOwnerName: (name) => {
          set({ ownerName: name.trim().slice(0, 24) });
          get().syncCurrentPet();
        },

        joinRoom: (customRoomId) => {
          const target = sanitizeRoomCode(customRoomId ?? get().roomId);
          if (!isValidRoomCode(target)) return;

          set({ roomId: target, isConnected: true, autoConnect: true, peers: [], peerToPlayer: {} });

          connectP2P(target, {
            onPeerJoin: (peerId) => {
              set((s) => ({ peers: s.peers.includes(peerId) ? s.peers : [...s.peers, peerId] }));
              // Say hi right away so the newcomer sees us without waiting for a tick.
              sendNow();
            },
            onPeerLeave: (peerId) => {
              const playerId = get().peerToPlayer[peerId];
              const friend = playerId ? get().friends[playerId] : undefined;
              set((s) => {
                const peerToPlayer = { ...s.peerToPlayer };
                delete peerToPlayer[peerId];
                return { peers: s.peers.filter((p) => p !== peerId), peerToPlayer };
              });
              if (friend) pushLog(`${friendDisplayName(friend)} se desconectó`);
            },
            onReceiveState: (data, peerId) => {
              const isNew = !get().peerToPlayer[peerId];
              set((s) => ({
                peerToPlayer: { ...s.peerToPlayer, [peerId]: data.playerId },
                friends: {
                  ...s.friends,
                  [data.playerId]: {
                    playerId: data.playerId,
                    ownerName: data.ownerName,
                    device: data.device,
                    pet: data,
                    lastSeen: Date.now(),
                  },
                },
              }));
              if (isNew) pushLog(`${friendDisplayName({ ownerName: data.ownerName, pet: data })} está en línea`);
            },
            onReceiveGift: (gift, peerId) => {
              const key = `${gift.playerId || peerId}:gift`;
              if (!allowEffect(key)) return;
              const pet = usePetStore.getState();
              if (gift.kind === 'berry' || gift.kind === 'snack') pet.feed('snack');
              else if (gift.kind === 'medicine') pet.giveMedicineNow();
              else pet.petStrokeNow();
              const text = `${gift.senderName} te envió ${GIFT_LABEL[gift.kind]}`;
              pushLog(text);
              pet.pushToast({ title: '¡Regalo!', body: text, tone: 'good' });
            },
            onReceiveInteraction: (interaction, peerId) => {
              const key = `${interaction.playerId || peerId}:${interaction.action}`;
              if (!allowEffect(key)) return;
              const pet = usePetStore.getState();
              if (interaction.action !== 'visit') pet.petStrokeNow();
              const text = `${interaction.senderName} ${INTERACTION_LABEL[interaction.action]}`;
              pushLog(text);
              pet.pushToast({
                title: interaction.action === 'cheer' ? '¡Ánimo!' : 'Visita',
                body: text,
                tone: 'info',
              });
            },
          });

          pushLog(`Conectado a la sala ${target}`);
          sendNow();
        },

        leaveRoom: () => {
          disconnectP2P();
          set({ isConnected: false, autoConnect: false, peers: [], peerToPlayer: {} });
        },

        syncCurrentPet: () => {
          if (!get().isConnected) return;
          const wait = lastSyncAt + SYNC_MIN_INTERVAL_MS - Date.now();
          if (wait <= 0) {
            sendNow();
          } else if (pendingSync === null) {
            pendingSync = window.setTimeout(() => {
              pendingSync = null;
              if (get().isConnected) sendNow();
            }, wait);
          }
        },

        sendGiftToPeers: (kind, targetPlayerId) => {
          sendP2PGift(kind, senderName(), targetPlayerId);
          pushLog(targetPlayerId ? `Enviaste ${GIFT_LABEL[kind]} a tu amigo` : `Enviaste ${GIFT_LABEL[kind]} a tus amigos`);
        },

        sendInteractionToPeers: (action, targetPlayerId) => {
          sendP2PInteraction(action, senderName(), targetPlayerId);
          pushLog(action === 'cheer' ? 'Enviaste ánimos' : 'Enviaste cariño');
        },

        forgetFriend: (playerId) =>
          set((s) => {
            const friends = { ...s.friends };
            delete friends[playerId];
            return { friends };
          }),

        clearLog: () => set({ log: [] }),
      };
    },
    {
      name: 'tama-p2p-storage',
      version: 1,
      partialize: (s) => ({
        roomId: s.roomId,
        autoConnect: s.autoConnect,
        ownerName: s.ownerName,
        friends: s.friends,
      }),
    },
  ),
);

/** Friends currently connected (some peer in the room maps to them). */
export function useOnlineFriendIds(): Set<string> {
  const peerToPlayer = useP2PStore((s) => s.peerToPlayer);
  return new Set(Object.values(peerToPlayer));
}
