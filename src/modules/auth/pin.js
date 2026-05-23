// @ts-check
import { localStore } from '../storage/local-store.js';

const LOCKOUT_KEY = 'auth:pin_lockout';
const MAX_FAILURES = 5;
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000;

/**
 * Hex SHA-256 of `pin`. No salt for v1 (per research R6); migrate when posture upgrades.
 * @param {string} pin
 */
export async function hashPin(pin) {
  const data = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a PIN against the manager catalog.
 *
 * @param {string} pin
 * @param {Array<{id:string, display_name:string, pin_hash:string, active:boolean}>} managers
 * @param {() => number} [now]
 * @returns {Promise<{ok:true, manager:{id:string, display_name:string}} | {ok:false, code:'locked'|'invalid'|'deactivated', retryAtMs?:number}>}
 */
export async function verifyPin(pin, managers, now = () => Date.now()) {
  const lockout = readLockout();
  if (lockout && lockout.retryAtMs > now()) {
    return { ok: false, code: 'locked', retryAtMs: lockout.retryAtMs };
  }
  const hashed = await hashPin(pin);
  const match = managers.find((m) => m.pin_hash === hashed);
  if (!match) {
    recordFailure(now);
    return { ok: false, code: 'invalid' };
  }
  if (!match.active) {
    return { ok: false, code: 'deactivated' };
  }
  localStore.remove(LOCKOUT_KEY);
  return { ok: true, manager: { id: match.id, display_name: match.display_name } };
}

function readLockout() {
  return localStore.get(LOCKOUT_KEY, null);
}

function recordFailure(now) {
  const current = readLockout() ?? { failures: 0, retryAtMs: 0 };
  const failures = current.failures + 1;
  const retryAtMs = failures >= MAX_FAILURES ? now() + LOCKOUT_WINDOW_MS : 0;
  localStore.set(LOCKOUT_KEY, { failures, retryAtMs });
}

export const _internals = { LOCKOUT_KEY, MAX_FAILURES, LOCKOUT_WINDOW_MS };
