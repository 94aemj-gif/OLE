// @ts-check
import { localStore } from '../storage/local-store.js';

const PENDING_KEY = 'capture_undo_pending';
const WINDOW_MS = 10_000;

/**
 * Open a 10-second undo window for a freshly committed capture.
 * @param {Object} payload
 * @param {() => number} [now]
 */
export function openUndoWindow(payload, now = () => Date.now()) {
  const pending = {
    hash: payload.payload_hash,
    units: payload.units_produced,
    scrap: payload.scrap_rows.reduce((a, r) => a + r.pieces, 0),
    downtime: payload.downtime_rows.reduce((a, r) => a + r.minutes, 0),
    expires_at: now() + WINDOW_MS
  };
  localStore.set(PENDING_KEY, pending);
  return pending;
}

export function readPendingUndo(now = () => Date.now()) {
  const pending = localStore.get(PENDING_KEY, null);
  if (!pending) return null;
  if (pending.expires_at <= now()) {
    localStore.remove(PENDING_KEY);
    return null;
  }
  return pending;
}

/** Returns true if the undo was applied; false if the window has expired. */
export function applyUndo(now = () => Date.now()) {
  const pending = readPendingUndo(now);
  if (!pending) return false;
  const state = localStore.get('shift_state', { count: 0, scrap: 0, downtime: 0 });
  state.count = Math.max(0, state.count - pending.units);
  state.scrap = Math.max(0, state.scrap - pending.scrap);
  state.downtime = Math.max(0, state.downtime - pending.downtime);
  localStore.set('shift_state', state);
  localStore.remove(PENDING_KEY);
  return true;
}

export const _internals = { PENDING_KEY, WINDOW_MS };
