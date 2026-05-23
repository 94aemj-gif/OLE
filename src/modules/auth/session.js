// @ts-check
import { localStore } from '../storage/local-store.js';

const SESSION_KEY = 'auth:manager_session';
const SESSION_TTL_MS = 60 * 60 * 1000;

/**
 * @param {{id:string, display_name:string}} manager
 * @param {() => number} [now]
 */
export function openSession(manager, now = () => Date.now()) {
  const session = { manager, openedAt: now(), expiresAt: now() + SESSION_TTL_MS };
  localStore.set(SESSION_KEY, session);
  return session;
}

/** @param {() => number} [now] */
export function readSession(now = () => Date.now()) {
  const s = localStore.get(SESSION_KEY, null);
  if (!s) return null;
  if (s.expiresAt <= now()) {
    localStore.remove(SESSION_KEY);
    return null;
  }
  return s;
}

export function closeSession() {
  localStore.remove(SESSION_KEY);
}

export const _internals = { SESSION_KEY, SESSION_TTL_MS };
