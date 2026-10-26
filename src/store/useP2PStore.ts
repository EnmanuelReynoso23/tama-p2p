import { create } from 'zustand';
import {
  connectP2P,
  disconnectP2P,
  broadcastMyState,
  sendP2PGift,
  sendP2PInteraction,
  myPeerId,
  type PetSyncData,
  type P2PGift,
  type P2PInteraction,
} from '../network/p2p';
import { usePetStore } from './usePetStore';
import { useHabitStore } from './useHabitStore';
import { lifeStageFromAge } from '../game/careScore';
import { EGG_DURATION_MS } from '../game/constants';

export interface P2PState {
  roomId: string;
  isConnected: boolean;
  myPeerId: string;
  peers: string[];
  remotePets: Record<string, PetSyncData>;
  log: Array<{ id: string; text: string; time: number }>;

  setRoomId: (id: string) => void;
  joinRoom: (roomId?: string) => void;
  leaveRoom: () => void;
  syncCurrentPet: () => void;
  sendGiftToPeers: (kind: P2PGift['kind']) => void;
  sendInteractionToPeers: (action: P2PInteraction['action']) => void;
  clearLog: () => void;
}

export const useP2PStore = create<P2PState>((set, get) => ({
  roomId: 'tamagotchi-amigos',
  isConnected: false,
  myPeerId,
  peers: [],
  remotePets: {},
  log: [],

  setRoomId: (roomId) => set({ roomId }),

  joinRoom: (customRoomId) => {
    const targetRoom = customRoomId || get().roomId;
    if (!targetRoom) return;

    set({ roomId: targetRoom, isConnected: true, peers: [], remotePets: {} });

    connectP2P(targetRoom, {
      onPeerJoin: (peerId) => {
        set((state) => ({
          peers: state.peers.includes(peerId) ? state.peers : [...state.peers, peerId],
          log: [
            {
              id: Math.random().toString(36).slice(2),
              text: `Amigo conectado: ${peerId.slice(0, 6)}`,
              time: Date.now(),
            },
            ...state.log.slice(0, 20),
          ],
        }));
        // Broadcast current pet immediately to the newcomer
        get().syncCurrentPet();
      },
      onPeerLeave: (peerId) => {
        set((state) => {
          const updatedPets = { ...state.remotePets };
          delete updatedPets[peerId];
          return {
            peers: state.peers.filter((p) => p !== peerId),
            remotePets: updatedPets,
            log: [
              {
                id: Math.random().toString(36).slice(2),
                text: `Amigo desconectado: ${peerId.slice(0, 6)}`,
                time: Date.now(),
              },
              ...state.log.slice(0, 20),
            ],
          };
        });
      },
      onReceiveState: (data, peerId) => {
        set((state) => ({
          remotePets: {
            ...state.remotePets,
            [peerId]: data,
          },
        }));

        if (data.habitsTotal && data.habitsCompleted !== undefined) {
          const friendDone = data.habitsCompleted === data.habitsTotal && data.habitsTotal > 0;
          useHabitStore.getState().setFriendStatus(friendDone, data.streak || 1);
        }
      },
      onReceiveGift: (gift, peerId) => {
        // Apply gift effect locally
        const petStore = usePetStore.getState();
        if (gift.kind === 'berry' || gift.kind === 'snack') {
          petStore.feed('snack');
        } else if (gift.kind === 'medicine') {
          petStore.giveMedicineNow();
        } else if (gift.kind === 'toy') {
          petStore.petStrokeNow();
        }

        set((state) => ({
          log: [
            {
              id: Math.random().toString(36).slice(2),
              text: `${gift.senderName || peerId.slice(0, 6)} te envio un regalo (${gift.kind})`,
              time: Date.now(),
            },
            ...state.log.slice(0, 20),
          ],
        }));
      },
      onReceiveInteraction: (interaction, peerId) => {
        const petStore = usePetStore.getState();
        if (interaction.action === 'pet' || interaction.action === 'cheer') {
          petStore.petStrokeNow();
        }

        set((state) => ({
          log: [
            {
              id: Math.random().toString(36).slice(2),
              text: `${interaction.senderName || peerId.slice(0, 6)} interactuo con tu mascota (${interaction.action})`,
              time: Date.now(),
            },
            ...state.log.slice(0, 20),
          ],
        }));
      },
    });

    get().syncCurrentPet();
  },

  leaveRoom: () => {
    disconnectP2P();
    set({ isConnected: false, peers: [], remotePets: {} });
  },

  syncCurrentPet: () => {
    const s = usePetStore.getState();
    const habitStore = useHabitStore.getState();
    const stage = s.hatched
      ? lifeStageFromAge(s.birthTs, Date.now(), EGG_DURATION_MS)
      : 'egg';

    broadcastMyState({
      name: s.name,
      stage,
      hunger: Math.round(s.stats.hunger),
      happiness: Math.round(s.stats.happiness),
      energy: Math.round(s.stats.energy),
      hygiene: Math.round(s.stats.hygiene),
      health: Math.round(s.stats.health),
      isAsleep: s.isAsleep,
      streak: habitStore.currentStreak,
      habitsCompleted: habitStore.habits.filter((h) => h.completed).length,
      habitsTotal: habitStore.habits.length,
    });
  },

  sendGiftToPeers: (kind) => {
    const petName = usePetStore.getState().name;
    sendP2PGift(kind, petName);
    set((state) => ({
      log: [
        {
          id: Math.random().toString(36).slice(2),
          text: `Enviaste regalo (${kind}) a tus amigos`,
          time: Date.now(),
        },
        ...state.log.slice(0, 20),
      ],
    }));
  },

  sendInteractionToPeers: (action) => {
    const petName = usePetStore.getState().name;
    sendP2PInteraction(action, petName);
    set((state) => ({
      log: [
        {
          id: Math.random().toString(36).slice(2),
          text: `Enviaste interaccion (${action}) a tus amigos`,
          time: Date.now(),
        },
        ...state.log.slice(0, 20),
      ],
    }));
  },

  clearLog: () => set({ log: [] }),
}));
