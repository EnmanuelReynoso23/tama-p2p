import { useState } from 'react';
import { motion } from 'framer-motion';
import { useHabitStore } from '../store/useHabitStore';
import { usePetStore } from '../store/usePetStore';
import { useP2PStore } from '../store/useP2PStore';

export default function HabitsCard() {
  const {
    currentStreak,
    bestStreak,
    sharedStreak,
    friendCompletedToday,
    habits,
    toggleHabit,
    addHabit,
    deleteHabit,
  } = useHabitStore();

  const petStrokeNow = usePetStore((s) => s.petStrokeNow);
  const isP2PConnected = useP2PStore((s) => s.isConnected);
  const syncCurrentPet = useP2PStore((s) => s.syncCurrentPet);

  const [newTitle, setNewTitle] = useState('');

  const completedCount = habits.filter((h) => h.completed).length;
  const progressPercent = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  const handleToggle = (id: string) => {
    toggleHabit(id);
    petStrokeNow();
    if (isP2PConnected) {
      syncCurrentPet();
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addHabit(newTitle.trim(), 'focus');
    setNewTitle('');
  };

  return (
    <div className="mx-auto mt-4 w-full max-w-sm rounded-2xl border-4 border-[#2b2138] bg-[#fdfaf3] p-4 font-mono text-[#2b2138] shadow-lg">
      {/* Cabecera de Racha */}
      <div className="flex items-center justify-between border-b-2 border-[#2b2138]/20 pb-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#795b8a]">
            Tu Progreso Diario
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xl font-black text-[#e85d04] tracking-tight">
              {currentStreak} {currentStreak === 1 ? 'DIA' : 'DIAS'}
            </span>
            <span className="rounded bg-[#ffe5d9] px-2 py-0.5 text-[9px] font-bold text-[#b03000] border border-[#f48c06]">
              RACHA ACTIVA
            </span>
          </div>
        </div>

        <div className="text-right text-[10px]">
          <div className="text-gray-500">Record: {bestStreak} d</div>
          {isP2PConnected && (
            <div className="font-bold text-[#2a9d8f] mt-0.5">
              Racha Amiga: {sharedStreak} d {friendCompletedToday ? '[Listo]' : '[Pendiente]'}
            </div>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-3">
        <div className="flex justify-between text-[10px] font-bold mb-1">
          <span>Metas de hoy: {completedCount}/{habits.length}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-3 w-full rounded-full border-2 border-[#2b2138] bg-white p-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
            className="h-full rounded-full bg-gradient-to-r from-[#ffd166] to-[#06d6a0]"
          />
        </div>
      </div>

      {/* Lista de habitos */}
      <div className="mt-4 flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
        {habits.map((h) => (
          <div
            key={h.id}
            onClick={() => handleToggle(h.id)}
            className={`group flex items-center justify-between rounded-lg border-2 border-[#2b2138] p-2 text-xs transition cursor-pointer select-none ${
              h.completed ? 'bg-[#d8f3dc] opacity-75' : 'bg-white hover:bg-[#fff0f3]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="checkbox"
                checked={h.completed}
                readOnly
                className="h-4 w-4 rounded border-2 border-[#2b2138] accent-[#2b2138] cursor-pointer"
              />
              <span className={`truncate text-[11px] ${h.completed ? 'line-through text-gray-500' : 'font-bold'}`}>
                {h.title}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteHabit(h.id);
              }}
              className="opacity-0 group-hover:opacity-100 px-1 text-[10px] text-gray-400 hover:text-red-500 font-bold"
              title="Eliminar meta"
            >
              [X]
            </button>
          </div>
        ))}
      </div>

      {/* Formulario agregar habito */}
      <form onSubmit={handleAdd} className="mt-3 flex gap-1.5 pt-2 border-t border-[#2b2138]/20">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nueva meta (ej: Meditar 5 min)..."
          className="flex-1 rounded border-2 border-[#2b2138] bg-white px-2.5 py-1 text-[11px] outline-none focus:ring-1 focus:ring-[#f7a8c4]"
        />
        <button
          type="submit"
          className="rounded border-2 border-[#2b2138] bg-[#c7f9cc] px-2.5 py-1 text-[10px] font-bold uppercase hover:bg-[#80ed99] active:translate-y-px"
        >
          Agregar
        </button>
      </form>
    </div>
  );
}
