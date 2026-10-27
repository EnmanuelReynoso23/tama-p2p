import { describe, expect, it } from 'vitest';
import { createPet } from './animo.js';
import { machinePetState, parseRelayMessage, parseRelayTopic, relayBase, relayTopics, roomHash } from './relay.js';
import { parsePetSync } from '../src/network/protocol';

describe('puente MQTT', () => {
  it('el tema de la sala es fijo y distinto por sala', () => {
    expect(roomHash('animo:mochi-k7p3')).toBe(roomHash('animo:mochi-k7p3'));
    expect(roomHash('animo:mochi-k7p3')).not.toBe(roomHash('animo:mochi-k7p4'));
    expect(relayBase('mochi-k7p3')).toMatch(/^animo\/v2\/[0-9a-f]{16}$/);
  });

  it('lee solo temas de su sala y sin comodines', () => {
    const { base, myPet, msgTo } = relayTopics('sala-uno', 'p-abc');
    expect(parseRelayTopic(base, myPet)).toEqual({ kind: 'pet', from: 'p-abc' });
    expect(parseRelayTopic(base, msgTo(''))).toEqual({ kind: 'msg', target: 'all', from: 'p-abc' });
    expect(parseRelayTopic(base, `${base}/off/p-abc`)).toEqual({ kind: 'off', from: 'p-abc' });
    expect(parseRelayTopic(relayBase('otra'), myPet)).toBeNull();
    expect(parseRelayTopic(base, `${base}/pet/+`)).toBeNull();
    expect(parseRelayTopic(base, `${base}/pet/a/b`)).toBeNull();
  });

  it('nadie se hace pasar por otro: el remitente sale del tema', () => {
    const topic = { kind: 'msg', target: 'all', from: 'p-ana' };
    const ok = { type: 'gift', id: 'p-ana-1-x', playerId: 'p-ana', senderName: 'Ana', kind: 'berry', timestamp: 5 };
    expect(parseRelayMessage(ok, topic)).toMatchObject({ type: 'gift', kind: 'berry', playerId: 'p-ana' });
    expect(parseRelayMessage({ ...ok, playerId: 'p-luis' }, topic)).toBeNull();
    expect(parseRelayMessage({ ...ok, kind: 'bomba' }, topic)).toBeNull();
    expect(parseRelayMessage({ ...ok, id: 'a/b' }, topic)).toBeNull();
    expect(parseRelayMessage({ ...ok, type: 'interaction', action: 'cheer' }, { ...topic, target: 'p-yo' })).toMatchObject({
      type: 'interaction',
      action: 'cheer',
      targetPlayerId: 'p-yo',
    });
  });

  it('el estado de la maquinita lo entiende la app', () => {
    const pet = createPet('Brote', 1_000);
    const state = machinePetState(pet, { playerId: 'm-abc', ownerName: 'Reyno', now: 2_000 });
    const parsed = parsePetSync(JSON.parse(JSON.stringify(state)));
    expect(parsed).toMatchObject({ playerId: 'm-abc', device: 'machine', name: 'Brote', stage: 'egg', updatedAt: 2_000 });
  });
});
