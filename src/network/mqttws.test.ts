import { describe, expect, it, vi } from 'vitest';
import { connectMqtt, connectPacket, publishPacket, readPackets, subscribePacket } from './mqttws';

const enc = new TextEncoder();

describe('cliente MQTT por WebSocket', () => {
  it('arma CONNECT con testamento retenido', () => {
    const p = connectPacket({ clientId: 'ab', keepAliveS: 60, will: { topic: 't', payload: '1', retain: true } });
    expect(Array.from(p)).toEqual([0x10, 20, 0, 4, 77, 81, 84, 84, 4, 0x26, 0, 60, 0, 2, 97, 98, 0, 1, 116, 0, 1, 49]);
  });

  it('lee paquetes partidos y largos', () => {
    const big = 'x'.repeat(300);
    const a = publishPacket('animo/t', big, true);
    const b = publishPacket('animo/u', 'hola', false);
    const all = new Uint8Array([...a, ...b]);
    const first = readPackets(all.subarray(0, 10));
    expect(first.packets).toEqual([]);
    const second = readPackets(all);
    expect(second.packets).toEqual([
      { type: 'publish', topic: 'animo/t', payload: big },
      { type: 'publish', topic: 'animo/u', payload: 'hola' },
    ]);
    expect(second.rest.length).toBe(0);
  });

  it('conecta, se suscribe, manda lo pendiente y entrega mensajes', () => {
    const sockets: FakeWs[] = [];
    class FakeWs {
      readyState = 0;
      binaryType = '';
      sent: Uint8Array[] = [];
      onopen: (() => void) | null = null;
      onmessage: ((ev: { data: ArrayBuffer }) => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(
        public url: string,
        public protocol: string,
      ) {
        sockets.push(this);
      }
      send(p: Uint8Array) {
        this.sent.push(p);
      }
      close() {
        this.onclose?.();
      }
    }
    const onMessage = vi.fn();
    const client = connectMqtt({
      url: 'wss://x/mqtt',
      clientId: 'c',
      keepAliveS: 60,
      subscribe: ['animo/#'],
      onMessage,
      WebSocketImpl: FakeWs as unknown as typeof WebSocket,
    });
    client.publish('animo/a', 'antes', true);
    const ws = sockets[0];
    expect(ws.protocol).toBe('mqtt');
    ws.readyState = 1;
    ws.onopen?.();
    expect(ws.sent[0][0]).toBe(0x10);
    ws.onmessage?.({ data: Uint8Array.of(0x20, 2, 0, 0).buffer });
    expect(client.isConnected()).toBe(true);
    expect(Array.from(ws.sent[1])).toEqual(Array.from(subscribePacket(1, ['animo/#'])));
    expect(Array.from(ws.sent[2])).toEqual(Array.from(publishPacket('animo/a', 'antes', true)));
    const msg = publishPacket('animo/b', '{"ok":1}', false);
    ws.onmessage?.({ data: msg.slice(0, 5).buffer });
    ws.onmessage?.({ data: msg.slice(5).buffer });
    expect(onMessage).toHaveBeenCalledWith('animo/b', '{"ok":1}');
    client.close();
    expect(client.isConnected()).toBe(false);
    expect(enc.encode('x').length).toBe(1);
  });
});
