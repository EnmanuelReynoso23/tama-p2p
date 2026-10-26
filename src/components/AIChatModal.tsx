import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAdviceForTopic } from '../ai/companionBrain';
import { useHabitStore } from '../store/useHabitStore';
import { usePetStore } from '../store/usePetStore';
import { useP2PStore } from '../store/useP2PStore';

interface Props {
  onClose: () => void;
}

interface Message {
  sender: 'user' | 'pet';
  text: string;
}

export default function AIChatModal({ onClose }: Props) {
  const petName = usePetStore((s) => s.name);
  const currentStreak = useHabitStore((s) => s.currentStreak);
  const habits = useHabitStore((s) => s.habits);
  const peers = useP2PStore((s) => s.peers);
  const remotePets = useP2PStore((s) => s.remotePets);

  const habitsCompleted = habits.filter((h) => h.completed).length;
  const firstRemotePet = Object.values(remotePets)[0];

  const companionCtx = {
    petName,
    currentStreak,
    habitsTotal: habits.length,
    habitsCompleted,
    friendOnline: peers.length > 0,
    friendName: firstRemotePet?.name,
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'pet',
      text: `Hola. Soy ${petName}, tu companero de rutina y racha. En que te puedo ayudar hoy?`,
    },
  ]);
  const [input, setInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = { sender: 'user', text: query.trim() };
    const replyText = getAdviceForTopic(query.trim(), companionCtx);
    const petReply: Message = { sender: 'pet', text: replyText };

    setMessages((prev) => [...prev, userMsg, petReply]);
    setInput('');
  };

  const QUICK_PROMPTS = [
    'Tengo flojera para empezar',
    'Como cuidar mi racha hoy',
    'Necesito concentrarme en estudiar',
    'Siento un poco de estres',
    'Recordatorio de agua',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-mono text-[#2b2138]"
    >
      <div className="relative flex flex-col h-[520px] w-full max-w-md rounded-2xl border-4 border-[#2b2138] bg-[#fbf6ec] p-4 shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b-2 border-[#2b2138]/20 pb-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#06d6a0]" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider">
                {petName} - Tu Guia de Habitos
              </h3>
              <span className="text-[10px] text-gray-500">
                Racha actual: {currentStreak} dias | Metas: {habitsCompleted}/{habits.length}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-[#2b2138] px-2 py-0.5 text-xs font-bold hover:bg-[#2b2138] hover:text-white"
          >
            CERRAR
          </button>
        </div>

        {/* Historial de conversacion */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] rounded-xl border-2 border-[#2b2138] p-2.5 text-xs ${
                  m.sender === 'user'
                    ? 'bg-[#ffd6e0] text-[#2b2138]'
                    : 'bg-white text-[#2b2138] shadow-sm'
                }`}
              >
                <div className="text-[9px] font-bold uppercase tracking-wider mb-1 text-gray-400">
                  {m.sender === 'user' ? 'Tu' : petName}
                </div>
                <div className="text-[11px] leading-relaxed whitespace-pre-wrap">
                  {m.text}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Chips de sugerencias rapidas */}
        <div className="flex gap-1.5 overflow-x-auto py-2 border-t border-[#2b2138]/10 no-scrollbar">
          {QUICK_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              className="whitespace-nowrap rounded-full border border-[#2b2138]/40 bg-[#fff] px-2.5 py-1 text-[9px] font-bold text-[#2b2138] hover:bg-[#ffe5d9]"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2 pt-2 border-t border-[#2b2138]/20"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Habla con ${petName}...`}
            className="flex-1 rounded-lg border-2 border-[#2b2138] bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#f7a8c4]"
          />
          <button
            type="submit"
            className="rounded-lg border-2 border-[#2b2138] bg-[#ffd166] px-3 py-1.5 text-xs font-bold uppercase hover:bg-[#ffc02e] active:translate-y-px"
          >
            Enviar
          </button>
        </form>
      </div>
    </motion.div>
  );
}
