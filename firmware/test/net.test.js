import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPet } from '../../core/animo.js';
import { relayTopics } from '../../core/relay.js';
import { AnimoNet } from '../net.js';

/** Imita el cliente MQTT de ECMA-419 de Moddable. */
function fakeMqtt() {
  const made = [];
  class Client {
    static CONNACK = 2;
    static SUBSCRIBE = 8;
    constructor(options) {
      this.options = options;
      this.writes = [];
      this.buffer = null;
      made.push(this);
    }
    write(data, options) {
      this.writes.push({ text: data ? String.fromArrayBuffer(data) : null, ...options });
    }
    read() {
      return this.buffer;
    }
    close() {}
    /** El broker entrega un mensaje en pedazos. */
    deliver(topic, text, parts = 2) {
      const step = Math.ceil(text.length / parts);
      for (let i = 0; i < text.length; i += step) {
        this.buffer = ArrayBuffer.fromString(text.slice(i, i + step));
        const options = i === 0 ? { topic, more: i + step < text.length } : { more: i + step < text.length };
        this.options.onReadable.call(this, step, options);
      }
    }
  }
  return { Client, made };
}

describe('red de la maquinita', () => {
  const realDevice = globalThis.device;
  afterEach(() => {
    globalThis.device = realDevice;
  });

  it('se suscribe, publica su mascota y recibe regalos', () => {
    // Moddable trae estas dos; en Node se imitan.
    ArrayBuffer.fromString ??= (s) => new TextEncoder().encode(s).buffer;
    String.fromArrayBuffer ??= (b) => new TextDecoder().decode(b);
    const { Client, made } = fakeMqtt();
    globalThis.device = { network: { mqtt: { io: Client } } };
    const onMessage = vi.fn();
    const onStatus = vi.fn();
    const net = new AnimoNet({ roomId: 'sala-uno', playerId: 'm-yo', onMessage, onStatus });
    net.start();
    const c = made[0];
    expect(c.options.will.retain).toBe(true);

    const pet = createPet('Brote', 1_800_000_000_000);
    net.publishPet(pet, 1000); // reloj sin poner en hora: no publica
    net.publishPet(pet, 1_800_000_000_000);
    c.options.onControl.call(c, Client.CONNACK);
    expect(onStatus).toHaveBeenCalledWith(true);
    const t = relayTopics('sala-uno', 'm-yo');
    expect(c.writes[0].items.map((i) => i.topic)).toEqual(t.subscribe);
    expect(c.writes.find((w) => w.topic === t.myPet && w.retain)).toBeTruthy();

    const ana = relayTopics('sala-uno', 'p-ana');
    const gift = JSON.stringify({ type: 'gift', id: 'p-ana-1-x', playerId: 'p-ana', senderName: 'Ana', kind: 'berry', timestamp: 5 });
    c.deliver(ana.msgTo(''), gift, 3);
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'gift', kind: 'berry', senderName: 'Ana' }));
    // Lo propio y lo falsificado no cuenta.
    c.deliver(t.msgTo(''), JSON.stringify({ type: 'gift', id: 'm-yo-1', playerId: 'm-yo', kind: 'berry', timestamp: 5 }));
    c.deliver(ana.msgTo(''), JSON.stringify({ type: 'gift', id: 'z', playerId: 'p-luis', kind: 'berry', timestamp: 5 }));
    expect(onMessage).toHaveBeenCalledTimes(1);
  });
});
