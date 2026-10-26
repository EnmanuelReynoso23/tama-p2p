import { useState } from 'react';
import { motion } from 'framer-motion';
import { useP2PStore } from '../store/useP2PStore';

interface Props {
  onClose: () => void;
}

export default function P2PPanel({ onClose }: Props) {
  const {
    roomId,
    setRoomId,
    isConnected,
    peers,
    remotePets,
    log,
    joinRoom,
    leaveRoom,
    sendGiftToPeers,
    sendInteractionToPeers,
    syncCurrentPet,
  } = useP2PStore();

  const [inputRoom, setInputRoom] = useState(roomId);

  const handleToggleConnect = () => {
    if (isConnected) {
      leaveRoom();
    } else {
      if (!inputRoom.trim()) return;
      setRoomId(inputRoom.trim());
      joinRoom(inputRoom.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl border-4 border-[#2b2138] bg-[#fbf6ec] p-5 font-mono text-[#2b2138] shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b-2 border-[#2b2138]/20 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-3 w-3 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <h2 className="text-sm font-bold tracking-wider uppercase">
              Conexion P2P Directa
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-[#2b2138] px-2 py-0.5 text-xs font-bold hover:bg-[#2b2138] hover:text-white"
          >
            CERRAR
          </button>
        </div>

        {/* Formulario de Sala */}
        <div className="mt-4 flex flex-col gap-2">
          <label className="text-[11px] font-bold uppercase tracking-wide text-[#2b2138]/70">
            Codigo de Sala Compartida:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputRoom}
              disabled={isConnected}
              onChange={(e) => setInputRoom(e.target.value)}
              placeholder="Ej: sala-secreta-123"
              className="flex-1 rounded border-2 border-[#2b2138] bg-white px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#f7a8c4] disabled:bg-gray-100"
            />
            <button
              onClick={handleToggleConnect}
              className={`rounded border-2 border-[#2b2138] px-3 py-1.5 text-xs font-bold uppercase transition ${
                isConnected
                  ? 'bg-red-400 text-[#2b2138] hover:bg-red-500'
                  : 'bg-emerald-400 text-[#2b2138] hover:bg-emerald-500'
              }`}
            >
              {isConnected ? 'Desconectar' : 'Conectar'}
            </button>
          </div>
          <p className="text-[10px] text-[#2b2138]/60">
            Comparte el mismo codigo con tu amiga para conectarse directamente por WebRTC sin servidores intermedios.
          </p>
        </div>

        {/* Estado de conexión */}
        {isConnected && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between rounded border border-[#2b2138]/30 bg-[#efe6d5] px-3 py-2 text-xs">
              <span>Amigos en linea: <strong>{peers.length}</strong></span>
              <button
                onClick={syncCurrentPet}
                className="text-[10px] underline hover:text-[#5e4b75]"
              >
                Sincronizar mi estado
              </button>
            </div>

            {/* Mascotas de amigos */}
            {peers.length === 0 ? (
              <div className="rounded border border-dashed border-[#2b2138]/30 p-4 text-center text-xs text-[#2b2138]/70">
                Esperando a que tu amiga se una a la sala &quot;{roomId}&quot;...
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide">
                  Mascotas de tus amigos:
                </span>
                {Object.entries(remotePets).map(([peerId, pet]) => (
                  <div
                    key={peerId}
                    className="rounded-lg border-2 border-[#2b2138] bg-white p-3 text-xs shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{pet.name}</span>
                      <span className="text-[10px] uppercase bg-purple-100 px-1.5 py-0.5 rounded border border-purple-300">
                        Etapa: {pet.stage}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                      <div>Hambre: {pet.hunger} / 4</div>
                      <div>Felicidad: {pet.happiness} / 4</div>
                      <div>Energia: {pet.energy} / 4</div>
                      <div>Salud: {pet.health} / 4</div>
                    </div>

                    {pet.isAsleep && (
                      <div className="mt-1 text-[10px] text-indigo-600 font-bold">
                        Durmiendo Zzz...
                      </div>
                    )}

                    {/* Acciones directas con el amigo */}
                    <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => sendGiftToPeers('berry')}
                        className="rounded border border-[#2b2138] bg-[#fdf2d0] px-2 py-1 text-[10px] font-bold hover:bg-[#fae3a0]"
                      >
                        Enviar Baya
                      </button>
                      <button
                        onClick={() => sendGiftToPeers('toy')}
                        className="rounded border border-[#2b2138] bg-[#d2f0ee] px-2 py-1 text-[10px] font-bold hover:bg-[#b0e6e3]"
                      >
                        Enviar Juguete
                      </button>
                      <button
                        onClick={() => sendInteractionToPeers('pet')}
                        className="rounded border border-[#2b2138] bg-[#ffd6e0] px-2 py-1 text-[10px] font-bold hover:bg-[#fca5bc]"
                      >
                        Acariciar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Registro de eventos */}
            <div className="mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wide">
                Historial de eventos:
              </span>
              <div className="mt-1 max-h-24 overflow-y-auto rounded border border-[#2b2138]/20 bg-white p-2 text-[10px]">
                {log.length === 0 ? (
                  <span className="text-gray-400">Sin eventos recientes</span>
                ) : (
                  log.map((item) => (
                    <div key={item.id} className="py-0.5 border-b border-gray-100 last:border-0">
                      {item.text}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
