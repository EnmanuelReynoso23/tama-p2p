import { describe, expect, it } from 'vitest';
import {
  canonicalizePayload,
  getOrCreateCryptoIdentity,
  signPayload,
  verifySignedPayload,
} from './crypto';

describe('Local-First Cryptographic Identity & Digital Signatures', () => {
  it('canonicalizes payloads deterministically ignoring sig and pubKey', () => {
    const p1 = { b: 2, a: 1, sig: 'abc', pubKey: 'xyz' };
    const p2 = { a: 1, b: 2 };
    expect(canonicalizePayload(p1)).toBe(canonicalizePayload(p2));
    expect(canonicalizePayload(p1)).toBe('{"a":1,"b":2}');
  });

  it('generates an identity and signs/verifies a payload successfully', async () => {
    const identity = await getOrCreateCryptoIdentity();
    expect(identity.pubKey).toBeDefined();
    expect(identity.pubKey.length).toBeGreaterThan(64);

    const payload = {
      playerId: 'test-player-1',
      name: 'Mochi',
      hunger: 80,
      timestamp: 1234567890,
    };

    const signed = await signPayload(payload);
    expect(signed.pubKey).toBe(identity.pubKey);
    expect(signed.sig).toBeDefined();
    expect(signed.sig.length).toBeGreaterThan(64);

    const isValid = await verifySignedPayload(signed);
    expect(isValid).toBe(true);
  });

  it('detects and rejects tampered / forged payloads', async () => {
    const payload = {
      playerId: 'test-player-2',
      name: 'Mochi',
      hunger: 80,
    };

    const signed = await signPayload(payload);

    // Tampering with stats (e.g. malicious peer increases hunger to 100)
    const tampered = { ...signed, hunger: 100 };
    const isValid = await verifySignedPayload(tampered);
    expect(isValid).toBe(false);
  });

  it('rejects payloads with missing or corrupt signatures', async () => {
    const unsigned = { playerId: 'test-3', hunger: 50 };
    expect(await verifySignedPayload(unsigned)).toBe(false);

    const corruptSig = {
      playerId: 'test-3',
      hunger: 50,
      pubKey: '04abcd',
      sig: '001122',
    };
    expect(await verifySignedPayload(corruptSig)).toBe(false);
  });
});
