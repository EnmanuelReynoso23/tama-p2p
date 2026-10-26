import { useState } from 'react';
import { friendDisplayName, useOnlineFriendIds, useP2PStore, type FriendRecord } from '../store/useP2PStore';
import { useHabitStore } from '../store/useHabitStore';
import { usePetStore } from '../store/usePetStore';
import { friendStreak } from '../game/streak';
import { useToday } from '../hooks/useToday';
import { buildInviteUrl, isValidRoomCode, sanitizeRoomCode, shareInvite } from '../network/invite';
import FlameIcon from './FlameIcon';
import MiniPet from './MiniPet';
import QrCode from './QrCode';
import WeekStrip from './WeekStrip';

/** "Amigos" tab: invite by link / QR / code, then one card per friend with your shared streak. */
export default function FriendsView() {
  const friends = useP2PStore((s) => s.friends);
  const list = Object.values(friends).sort((a, b) => b.lastSeen - a.lastSeen);

  return (
    <div className="flex flex-col gap-4">
      <InviteCard />
      <section aria-labelledby="friends-title" className="flex flex-col gap-3">
        <h2 id="friends-title" className="px-1 font-pixel text-[12px] text-ink">
          Tus amigos {list.length > 0 ? `(${list.length})` : ''}
        </h2>
        {list.length === 0 ? (
          <p className="rounded-3xl border-2 border-dashed border-ink/30 bg-paper p-5 text-center text-sm text-ink/80">
            Aún no hay nadie por aquí. Comparte tu enlace: cuando tu amigo lo abra, aparecerá su
            mascota y empezará su racha juntos. 🐣
          </p>
        ) : (
          list.map((f) => <FriendCard key={f.playerId} friend={f} />)
        )}
      </section>
      <ActivityLog />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function InviteCard() {
  const roomId = useP2PStore((s) => s.roomId);
  const isConnected = useP2PStore((s) => s.isConnected);
  const peers = useP2PStore((s) => s.peers);
  const ownerName = useP2PStore((s) => s.ownerName);
  const setOwnerName = useP2PStore((s) => s.setOwnerName);
  const newRoom = useP2PStore((s) => s.newRoom);
  const joinRoom = useP2PStore((s) => s.joinRoom);
  const leaveRoom = useP2PStore((s) => s.leaveRoom);
  const petName = usePetStore((s) => s.name);
  const pushToast = usePetStore((s) => s.pushToast);

  const [showQr, setShowQr] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState('');
  const [nameDraft, setNameDraft] = useState(ownerName);

  const share = async (room: string) => {
    const result = await shareInvite(room, petName);
    if (result === 'copied') {
      pushToast({ title: 'Enlace copiado', body: 'Pégalo en WhatsApp o donde quieras 💌', tone: 'good' });
    } else if (result === 'failed') {
      setShowQr(true);
    }
  };

  const createAndShare = async () => {
    const room = roomId || newRoom();
    joinRoom(room);
    await share(room);
  };

  const joinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeRoomCode(code);
    if (!isValidRoomCode(clean)) return;
    joinRoom(clean);
    setJoinOpen(false);
    setCode('');
  };

  const statusText = !isConnected
    ? 'Sin conectar'
    : peers.length === 0
      ? 'Conectado · esperando amigos…'
      : `Conectado · ${peers.length} ${peers.length === 1 ? 'amigo' : 'amigos'} en línea`;

  return (
    <section
      aria-labelledby="invite-title"
      className="rounded-3xl border-[3px] border-ink bg-paper p-4 shadow-[0_6px_0_#2b2138]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="invite-title" className="font-pixel text-[13px] leading-snug text-ink">
            Racha con amigos
          </h2>
          <p className="mt-1 text-sm text-ink/80">
            Cuando los dos completan sus hábitos el mismo día, la llama crece. 🔥
          </p>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink" role="status">
        <span
          aria-hidden
          className={`inline-block h-3 w-3 rounded-full ${
            isConnected ? (peers.length ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-gray-400'
          }`}
        />
        {statusText}
      </p>

      {/* Your name, so friends see "Mochi de Ana" */}
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setOwnerName(nameDraft);
        }}
      >
        <label className="flex-1 text-xs font-bold text-lilac">
          Tu nombre (lo ven tus amigos)
          <input
            value={nameDraft}
            maxLength={24}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => nameDraft !== ownerName && setOwnerName(nameDraft)}
            placeholder="Ej: Ana"
            autoComplete="nickname"
            className="mt-1 block w-full min-h-[44px] rounded-xl border-2 border-ink bg-white px-3 text-base text-ink outline-none"
          />
        </label>
      </form>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={createAndShare}
          className="min-h-[52px] rounded-2xl border-2 border-ink bg-flame px-4 text-base font-extrabold text-white shadow-[0_4px_0_#2b2138] active:translate-y-[2px] active:shadow-[0_2px_0_#2b2138]"
        >
          {roomId ? '💌 Compartir enlace de invitación' : '💌 Crear sala e invitar'}
        </button>

        {roomId && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-expanded={showQr}
              onClick={() => setShowQr((v) => !v)}
              className="min-h-[48px] rounded-2xl border-2 border-ink bg-white px-3 text-sm font-bold text-ink active:translate-y-px"
            >
              {showQr ? 'Ocultar QR' : 'Mostrar QR'}
            </button>
            {isConnected ? (
              <button
                type="button"
                onClick={leaveRoom}
                className="min-h-[48px] rounded-2xl border-2 border-ink bg-white px-3 text-sm font-bold text-ink active:translate-y-px"
              >
                Desconectar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => joinRoom(roomId)}
                className="min-h-[48px] rounded-2xl border-2 border-ink bg-mint px-3 text-sm font-bold text-ink active:translate-y-px"
              >
                Reconectar
              </button>
            )}
          </div>
        )}

        {roomId && showQr && (
          <div className="mt-1 flex flex-col items-center gap-2 rounded-2xl bg-white p-3 border-2 border-ink/15">
            <QrCode
              value={buildInviteUrl(roomId)}
              label="Código QR con el enlace de invitación. Escanéalo con la cámara del otro teléfono."
            />
            <p className="text-center text-xs text-ink/80">
              Escanéalo con la cámara del otro teléfono o de la máquina.
            </p>
          </div>
        )}

        {roomId && (
          <p className="text-xs text-ink/70">
            Código de sala:{' '}
            <code className="rounded bg-cream px-1.5 py-0.5 font-mono text-[13px] font-bold text-ink select-all">
              {roomId}
            </code>
          </p>
        )}

        <button
          type="button"
          aria-expanded={joinOpen}
          aria-controls="join-form"
          onClick={() => setJoinOpen((v) => !v)}
          className="mt-1 self-start text-sm font-bold text-lilac underline underline-offset-4 min-h-[44px]"
        >
          ¿Te pasaron un código?
        </button>
        {joinOpen && (
          <form id="join-form" onSubmit={joinWithCode} className="flex gap-2">
            <label className="sr-only" htmlFor="join-code">
              Código de sala
            </label>
            <input
              id="join-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="mochi-k7p3-luna-x9qd"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-h-[48px] rounded-xl border-2 border-ink bg-white px-3 font-mono text-base text-ink outline-none"
            />
            <button
              type="submit"
              disabled={!isValidRoomCode(sanitizeRoomCode(code))}
              className="min-h-[48px] rounded-xl border-2 border-ink bg-mint px-4 text-sm font-extrabold text-ink disabled:opacity-50"
            >
              Unirme
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function timeAgo(ts: number): string {
  const min = Math.round((Date.now() - ts) / 60_000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

function FriendCard({ friend }: { friend: FriendRecord }) {
  const today = useToday();
  const myDays = useHabitStore((s) => s.completedDays);
  const online = useOnlineFriendIds().has(friend.playerId);
  const sendGift = useP2PStore((s) => s.sendGiftToPeers);
  const sendInteraction = useP2PStore((s) => s.sendInteractionToPeers);
  const forget = useP2PStore((s) => s.forgetFriend);
  const [confirmForget, setConfirmForget] = useState(false);

  const s = friendStreak(myDays, friend.pet.completedDays, today);
  const name = friendDisplayName(friend);
  const who = friend.ownerName || friend.pet.name;
  const pet = friend.pet;

  const verdict =
    s.status === 'done'
      ? '¡Los dos listos hoy! 🎉'
      : s.meDoneToday
        ? `Falta ${who}. ¡Mándale ánimos!`
        : s.friendDoneToday
          ? `${who} ya cumplió. ¡Te toca!`
          : s.status === 'at-risk'
            ? 'La racha está en riesgo hoy'
            : 'Completen hoy para encender la racha';

  return (
    <article
      aria-label={`${name}, racha compartida de ${s.count} días`}
      className="rounded-3xl border-[3px] border-ink bg-paper p-4 shadow-[0_6px_0_#2b2138]"
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0 rounded-2xl border-2 border-ink bg-[#eef0eb] p-1">
          <MiniPet
            stage={pet.stage}
            variant={pet.adultVariant}
            mood={pet.isSick ? 'sick' : pet.isAsleep ? 'sleeping' : 'idle'}
            size={64}
            flip
            label={`Mascota ${pet.name}, etapa ${pet.stage}${pet.isAsleep ? ', durmiendo' : ''}`}
          />
          <span
            aria-hidden
            className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
              online ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-extrabold text-ink">{name}</h3>
          <p className="text-xs text-ink/70">
            {online ? 'En línea' : `Visto ${timeAgo(friend.lastSeen)}`}
            {' · '}
            {friend.device === 'machine' ? '🕹️ máquina' : '📱 teléfono'}
          </p>
          <p className="mt-0.5 text-xs text-ink/70">
            Hábitos hoy: {pet.habitsCompleted}/{pet.habitsTotal}
          </p>
        </div>
        <div className="flex flex-col items-center">
          <FlameIcon status={s.status} className="w-9 h-9" />
          <span className="font-pixel text-[13px] text-ink">{s.count}</span>
        </div>
      </div>

      <p className="mt-3 text-sm font-bold text-lilac">{verdict}</p>

      <div className="mt-3">
        <WeekStrip week={s.week} friendName={who} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <ActionChip disabled={!online} onClick={() => sendInteraction('cheer')} label="Animar" emoji="🔥" />
        <ActionChip disabled={!online} onClick={() => sendGift('berry')} label="Regalo" emoji="🎁" />
        <ActionChip disabled={!online} onClick={() => sendInteraction('pet')} label="Caricia" emoji="💗" />
      </div>
      {!online && (
        <p className="mt-2 text-xs text-ink/70">
          Los regalos llegan cuando {who} tenga la app abierta. La racha se cuenta igual.
        </p>
      )}

      <div className="mt-3 text-right">
        {confirmForget ? (
          <span className="inline-flex items-center gap-2 text-xs">
            ¿Olvidar a {who}?
            <button
              type="button"
              onClick={() => forget(friend.playerId)}
              className="min-h-[36px] rounded-lg border-2 border-red-700 px-2 font-bold text-red-700"
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => setConfirmForget(false)}
              className="min-h-[36px] rounded-lg border-2 border-ink/40 px-2 font-bold text-ink"
            >
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmForget(true)}
            className="min-h-[36px] text-xs text-ink/60 underline"
          >
            Olvidar amigo
          </button>
        )}
      </div>
    </article>
  );
}

function ActionChip({
  label,
  emoji,
  onClick,
  disabled,
}: {
  label: string;
  emoji: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[56px] flex-col items-center justify-center rounded-2xl border-2 border-ink bg-white text-sm font-bold text-ink active:translate-y-px disabled:opacity-45"
    >
      <span aria-hidden className="text-lg leading-none">
        {emoji}
      </span>
      {label}
    </button>
  );
}

function ActivityLog() {
  const log = useP2PStore((s) => s.log);
  if (log.length === 0) return null;
  return (
    <details className="rounded-3xl border-2 border-ink/20 bg-paper p-4">
      <summary className="cursor-pointer text-sm font-bold text-ink min-h-[32px]">Actividad reciente</summary>
      <ul className="mt-2 flex flex-col gap-1 text-sm text-ink/85">
        {log.map((l) => (
          <li key={l.id} className="border-b border-ink/10 py-1 last:border-0">
            {l.text}
          </li>
        ))}
      </ul>
    </details>
  );
}
