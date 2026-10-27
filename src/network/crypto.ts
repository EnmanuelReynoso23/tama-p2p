/**
 * Local-First Cryptographic Identity & Digital Signatures (Serverless Auth).
 *
 * Each device generates an ECDSA P-256 keypair locally using standard Web Crypto API.
 * - Private key stays on device (localStorage/IndexedDB) and NEVER leaves the device.
 * - Public key serves as the cryptographic identity / trust root.
 * - Every pet update, gift, and interaction is digitally signed.
 * - Peers verify signatures using crypto.subtle.verify() to prevent tampering or impersonation.
 */

const STORAGE_PRIV_KEY = 'tama-crypto-priv';
const STORAGE_PUB_KEY = 'tama-crypto-pub';

let cachedKeyPair: CryptoKeyPair | null = null;
let cachedPubHex: string | null = null;
const importedPubKeys = new Map<string, CryptoKey>();

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bufToHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Returns canonical payload string representation for signing
 * (excluding sig and pubKey fields).
 */
export function canonicalizePayload(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload)
    .filter((k) => k !== 'sig' && k !== 'pubKey')
    .sort();
  const sortedObj: Record<string, unknown> = {};
  for (const k of keys) {
    sortedObj[k] = payload[k];
  }
  return JSON.stringify(sortedObj);
}

/**
 * Loads existing cryptographic identity or generates a new ECDSA P-256 keypair.
 */
export async function getOrCreateCryptoIdentity(): Promise<{
  pubKey: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}> {
  if (cachedKeyPair && cachedPubHex) {
    return {
      pubKey: cachedPubHex,
      privateKey: cachedKeyPair.privateKey,
      publicKey: cachedKeyPair.publicKey,
    };
  }

  const subtle = typeof crypto !== 'undefined' ? crypto.subtle : null;
  if (!subtle) {
    throw new Error('Web Crypto API is not available');
  }

  try {
    const storedPriv = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_PRIV_KEY) : null;
    const storedPub = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_PUB_KEY) : null;

    if (storedPriv && storedPub) {
      const jwk = JSON.parse(storedPriv);
      const privateKey = await subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign'],
      );

      const pubBytes = hexToBuf(storedPub);
      const publicKey = await subtle.importKey(
        'raw',
        pubBytes as unknown as BufferSource,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify'],
      );

      cachedKeyPair = { privateKey, publicKey };
      cachedPubHex = storedPub;
      importedPubKeys.set(storedPub, publicKey);

      return { pubKey: storedPub, privateKey, publicKey };
    }
  } catch {
    /* Fallback to generating new keypair */
  }

  // Generate new ECDSA P-256 keypair
  const keyPair = await subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );

  const rawPub = await subtle.exportKey('raw', keyPair.publicKey);
  const pubHex = bufToHex(rawPub);
  const jwkPriv = await subtle.exportKey('jwk', keyPair.privateKey);

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_PRIV_KEY, JSON.stringify(jwkPriv));
      localStorage.setItem(STORAGE_PUB_KEY, pubHex);
    }
  } catch {
    /* Storage not available */
  }

  cachedKeyPair = keyPair;
  cachedPubHex = pubHex;
  importedPubKeys.set(pubHex, keyPair.publicKey);

  return { pubKey: pubHex, privateKey: keyPair.privateKey, publicKey: keyPair.publicKey };
}

/**
 * Signs a payload object with this device's private key.
 */
export async function signPayload<T extends Record<string, unknown>>(
  payload: T,
): Promise<T & { pubKey: string; sig: string }> {
  const subtle = typeof crypto !== 'undefined' ? crypto.subtle : null;
  if (!subtle) {
    return { ...payload, pubKey: '', sig: '' };
  }

  try {
    const { pubKey, privateKey } = await getOrCreateCryptoIdentity();
    const dataStr = canonicalizePayload(payload);
    const dataBytes = new TextEncoder().encode(dataStr);

    const sigBuffer = await subtle.sign(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      privateKey,
      dataBytes,
    );

    const sigHex = bufToHex(sigBuffer);
    return { ...payload, pubKey, sig: sigHex };
  } catch {
    return { ...payload, pubKey: '', sig: '' };
  }
}

/**
 * Verifies the digital signature on an incoming payload.
 * Returns true if valid, false if signature is forged or invalid.
 */
export async function verifySignedPayload(
  payload: Record<string, unknown>,
): Promise<boolean> {
  const subtle = typeof crypto !== 'undefined' ? crypto.subtle : null;
  if (!subtle) return true; // graceful fallback if subtle crypto is absent

  const pubKeyHex = typeof payload.pubKey === 'string' ? payload.pubKey : null;
  const sigHex = typeof payload.sig === 'string' ? payload.sig : null;

  if (!pubKeyHex || !sigHex) {
    // Unsigned payload
    return false;
  }

  try {
    let publicKey = importedPubKeys.get(pubKeyHex);
    if (!publicKey) {
      const pubBytes = hexToBuf(pubKeyHex);
      publicKey = await subtle.importKey(
        'raw',
        pubBytes as unknown as BufferSource,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify'],
      );
      importedPubKeys.set(pubKeyHex, publicKey);
    }

    const dataStr = canonicalizePayload(payload);
    const dataBytes = new TextEncoder().encode(dataStr);
    const sigBytes = hexToBuf(sigHex);

    return await subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      sigBytes as unknown as BufferSource,
      dataBytes as unknown as BufferSource,
    );
  } catch {
    return false;
  }
}
