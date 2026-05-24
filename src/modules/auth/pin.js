// @ts-check
import { idbStore } from '../storage/idb-store.js';

const LOCKOUT_STORE = 'auth_lockout';
const LOCKOUT_ID = 'pin';
const MAX_FAILURES = 5;
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000;
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;

const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

/**
 * Generate a random hex salt for a new manager.
 */
export function newSalt() {
  const bytes = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/**
 * PBKDF2-SHA256 hash of `pin` with `saltHex`. Returns hex digest.
 * @param {string} pin
 * @param {string} saltHex
 */
export async function hashPin(pin, saltHex) {
  if (typeof saltHex !== 'string' || saltHex.length === 0) {
    throw new Error('hashPin requires a non-empty salt');
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return toHex(bits);
}

/**
 * Verify a PIN against the manager catalog.
 *
 * @param {string} pin
 * @param {Array<{id:string, display_name:string, pin_hash:string, pin_salt?:string, active:boolean}>} managers
 * @param {() => number} [now]
 * @returns {Promise<{ok:true, manager:{id:string, display_name:string}} | {ok:false, code:'locked'|'invalid'|'deactivated', retryAtMs?:number}>}
 */
export async function verifyPin(pin, managers, now = () => Date.now()) {
  const lockout = await readLockout();
  if (lockout && lockout.retryAtMs > now()) {
    return { ok: false, code: 'locked', retryAtMs: lockout.retryAtMs };
  }
  let match = null;
  for (const mgr of managers) {
    if (!mgr.pin_salt) continue;
    const candidate = await hashPin(pin, mgr.pin_salt);
    if (constantTimeEqual(candidate, mgr.pin_hash)) {
      match = mgr;
      break;
    }
  }
  if (!match) {
    await recordFailure(now);
    return { ok: false, code: 'invalid' };
  }
  if (!match.active) {
    return { ok: false, code: 'deactivated' };
  }
  await clearLockout();
  return { ok: true, manager: { id: match.id, display_name: match.display_name } };
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function readLockout() {
  try {
    const rec = await idbStore.get(LOCKOUT_STORE, LOCKOUT_ID);
    return rec ?? null;
  } catch {
    return null;
  }
}

async function clearLockout() {
  try {
    await idbStore.delete(LOCKOUT_STORE, LOCKOUT_ID);
  } catch {
    /* ignore */
  }
}

async function recordFailure(now) {
  const current = (await readLockout()) ?? { id: LOCKOUT_ID, failures: 0, retryAtMs: 0 };
  const failures = current.failures + 1;
  const retryAtMs = failures >= MAX_FAILURES ? now() + LOCKOUT_WINDOW_MS : 0;
  try {
    await idbStore.put(LOCKOUT_STORE, { id: LOCKOUT_ID, failures, retryAtMs });
  } catch {
    /* ignore */
  }
}

export const _internals = {
  LOCKOUT_STORE,
  LOCKOUT_ID,
  MAX_FAILURES,
  LOCKOUT_WINDOW_MS,
  PBKDF2_ITERATIONS
};
