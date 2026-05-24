// @ts-check
import { localStore } from '../storage/local-store.js';
import { shiftStateKey } from './local.js';

const PENDING_KEY = 'capture_undo_pending';
const RECENT_CAPTURES_KEY = 'recent_captures';
const WINDOW_MS = 10_000;

/**
 * Open a 10-second undo window for a freshly committed capture.
 * @param {Object} capture — enriched row from persistCaptureLocally (has id)
 * @param {{line_id:string, shift_id:string, plantDayIso:string}} [ctx]
 * @param {() => number} [now]
 */
export function openUndoWindow(capture, ctx, now = () => Date.now()) {
  let lineCtx = ctx ?? null;
  if (!lineCtx && capture.line_id && capture.shift_id && typeof capture.hour_bucket === 'string') {
    lineCtx = {
      line_id: capture.line_id,
      shift_id: capture.shift_id,
      plantDayIso: capture.hour_bucket
    };
  }
  const pending = {
    id: capture.id,
    hash: capture.payload_hash,
    units: capture.units_produced,
    scrap: (capture.scrap_rows ?? []).reduce((a, r) => a + r.pieces, 0),
    downtime: (capture.downtime_rows ?? []).reduce((a, r) => a + r.minutes, 0),
    lineCtx,
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
  const key = pending.lineCtx ? shiftStateKey(pending.lineCtx) : 'shift_state';
  const state = localStore.get(key, { count: 0, scrap: 0, downtime: 0 });
  state.count = Math.max(0, state.count - pending.units);
  state.scrap = Math.max(0, state.scrap - pending.scrap);
  state.downtime = Math.max(0, state.downtime - pending.downtime);
  localStore.set(key, state);

  if (pending.id) {
    const recents = localStore.get(RECENT_CAPTURES_KEY, []);
    const idx = recents.findIndex((r) => r.id === pending.id);
    if (idx >= 0) {
      recents[idx] = { ...recents[idx], undone: true, undone_at: new Date().toISOString() };
      localStore.set(RECENT_CAPTURES_KEY, recents);
    }
  }

  localStore.remove(PENDING_KEY);
  return true;
}

export const _internals = { PENDING_KEY, WINDOW_MS };
