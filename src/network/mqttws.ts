/**
 * Cliente MQTT 3.1.1 minimo sobre WebSocket: solo lo que usa el puente con la
 * maquinita (QoS 0, retenidos y testamento). Sin dependencias.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export interface MqttWill {
  topic: string;
  payload: string;
  retain?: boolean;
}

export interface MqttOptions {
  url: string;
  clientId: string;
  keepAliveS: number;
  will?: MqttWill;
  subscribe: string[];
  onConnect?: () => void;
  onMessage: (topic: string, payload: string) => void;
  onClose?: () => void;
  /** Para pruebas: otra implementacion de WebSocket. */
  WebSocketImpl?: typeof WebSocket;
}

function str(s: string): Uint8Array {
  const b = enc.encode(s);
  const out = new Uint8Array(2 + b.length);
  out[0] = b.length >> 8;
  out[1] = b.length & 0xff;
  out.set(b, 2);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function packet(first: number, body: Uint8Array[]): Uint8Array {
  const rest = concat(body);
  const len: number[] = [];
  let n = rest.length;
  do {
    let byte = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) byte |= 0x80;
    len.push(byte);
  } while (n > 0);
  return concat([Uint8Array.of(first, ...len), rest]);
}

export function connectPacket(o: Pick<MqttOptions, 'clientId' | 'keepAliveS' | 'will'>): Uint8Array {
  let flags = 0x02; // sesion limpia
  if (o.will) flags |= 0x04 | (o.will.retain ? 0x20 : 0);
  const body = [str('MQTT'), Uint8Array.of(4, flags, o.keepAliveS >> 8, o.keepAliveS & 0xff), str(o.clientId)];
  if (o.will) body.push(str(o.will.topic), str(o.will.payload));
  return packet(0x10, body);
}

export function publishPacket(topic: string, payload: string, retain: boolean): Uint8Array {
  return packet(0x30 | (retain ? 1 : 0), [str(topic), enc.encode(payload)]);
}

export function subscribePacket(id: number, topics: string[]): Uint8Array {
  return packet(0x82, [Uint8Array.of(id >> 8, id & 0xff), ...topics.flatMap((t) => [str(t), Uint8Array.of(0)])]);
}

export type MqttIncoming =
  | { type: 'connack'; code: number }
  | { type: 'publish'; topic: string; payload: string }
  | { type: 'other'; code: number };

/** Separa los paquetes completos que hay en `buf`; devuelve lo que sobra. */
export function readPackets(buf: Uint8Array): { packets: MqttIncoming[]; rest: Uint8Array } {
  const packets: MqttIncoming[] = [];
  let at = 0;
  while (at < buf.length) {
    let len = 0;
    let mult = 1;
    let i = at + 1;
    let done = false;
    for (; i < buf.length && i < at + 5; i++) {
      len += (buf[i] & 0x7f) * mult;
      mult *= 128;
      if ((buf[i] & 0x80) === 0) {
        done = true;
        i++;
        break;
      }
    }
    if (!done || i + len > buf.length) break;
    const head = buf[at];
    const body = buf.subarray(i, i + len);
    const kind = head >> 4;
    if (kind === 2) packets.push({ type: 'connack', code: body[1] ?? 255 });
    else if (kind === 3 && body.length >= 2) {
      const tl = (body[0] << 8) | body[1];
      const qos = (head >> 1) & 3;
      const start = 2 + tl + (qos > 0 ? 2 : 0);
      packets.push({ type: 'publish', topic: dec.decode(body.subarray(2, 2 + tl)), payload: dec.decode(body.subarray(start)) });
    } else packets.push({ type: 'other', code: kind });
    at = i + len;
  }
  return { packets, rest: buf.slice(at) };
}

export interface MqttClient {
  publish: (topic: string, payload: string, retain?: boolean) => void;
  close: () => void;
  isConnected: () => boolean;
}

/** Conecta y se reconecta solo (espera creciente hasta 1 minuto). */
export function connectMqtt(o: MqttOptions): MqttClient {
  const WS = o.WebSocketImpl ?? (typeof WebSocket !== 'undefined' ? WebSocket : undefined);
  let ws: WebSocket | null = null;
  let ready = false;
  let closed = false;
  let retryMs = 2000;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let buf: Uint8Array = new Uint8Array(0);
  const queue: Uint8Array[] = [];

  const send = (p: Uint8Array) => {
    if (ready && ws && ws.readyState === 1) ws.send(p);
    else if (queue.length < 20) queue.push(p);
  };

  const cleanup = () => {
    ready = false;
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
  };

  const open = () => {
    if (closed || !WS) return;
    try {
      ws = new WS(o.url, 'mqtt');
    } catch {
      schedule();
      return;
    }
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => ws?.send(connectPacket(o));
    ws.onmessage = (ev: MessageEvent) => {
      if (!(ev.data instanceof ArrayBuffer)) return;
      const merged = new Uint8Array(buf.length + ev.data.byteLength);
      merged.set(buf);
      merged.set(new Uint8Array(ev.data), buf.length);
      const { packets, rest } = readPackets(merged);
      buf = rest;
      for (const p of packets) {
        if (p.type === 'connack') {
          if (p.code !== 0) {
            ws?.close();
            return;
          }
          ready = true;
          retryMs = 2000;
          ws?.send(subscribePacket(1, o.subscribe));
          while (queue.length) ws?.send(queue.shift()!);
          pingTimer = setInterval(() => ws?.readyState === 1 && ws.send(Uint8Array.of(0xc0, 0)), (o.keepAliveS * 1000) / 2);
          o.onConnect?.();
        } else if (p.type === 'publish') {
          o.onMessage(p.topic, p.payload);
        }
      }
    };
    ws.onclose = () => {
      const was = ready;
      cleanup();
      buf = new Uint8Array(0);
      if (was) o.onClose?.();
      schedule();
    };
    ws.onerror = () => ws?.close();
  };

  const schedule = () => {
    if (closed || retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      open();
    }, retryMs);
    retryMs = Math.min(retryMs * 2, 60_000);
  };

  open();

  return {
    publish: (topic, payload, retain = false) => send(publishPacket(topic, payload, retain)),
    isConnected: () => ready,
    close: () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (ws && ready) {
        // DISCONNECT no dispara el testamento: lo mandamos nosotros.
        if (o.will) ws.send(publishPacket(o.will.topic, o.will.payload, !!o.will.retain));
        ws.send(Uint8Array.of(0xe0, 0));
      }
      cleanup();
      ws?.close();
      ws = null;
    },
  };
}
