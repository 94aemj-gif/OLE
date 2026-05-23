// @ts-check
import { localStore } from '../storage/local-store.js';
import { enqueueCapture } from '../sync/push-queue.js';

const SHIFT_STATE_KEY = 'shift_state';
const RECENT_CAPTURES_KEY = 'recent_captures';
const RECENT_LIMIT = 50;

/**
 * Persist a capture locally and enqueue it for sync.
 * @param {Object} payload
 */
export async function persistCaptureLocally(payload) {
  const state = localStore.get(SHIFT_STATE_KEY, { count: 0, scrap: 0, downtime: 0 });
  state.count += payload.units_produced;
  state.scrap += payload.scrap_rows.reduce((a, r) => a + r.pieces, 0);
  state.downtime += payload.downtime_rows.reduce((a, r) => a + r.minutes, 0);
  state.last_capture = {
    at: payload.client_timestamp,
    units: payload.units_produced,
    hash: payload.payload_hash
  };
  localStore.set(SHIFT_STATE_KEY, state);

  const recents = localStore.get(RECENT_CAPTURES_KEY, []);
  recents.unshift(payload);
  if (recents.length > RECENT_LIMIT) recents.length = RECENT_LIMIT;
  localStore.set(RECENT_CAPTURES_KEY, recents);

  await enqueueCapture(payload);
  return state;
}

export function readShiftState() {
  return localStore.get(SHIFT_STATE_KEY, { count: 0, scrap: 0, downtime: 0 });
}

export function resetShiftState() {
  localStore.remove(SHIFT_STATE_KEY);
  localStore.remove(RECENT_CAPTURES_KEY);
}

export const _internals = { SHIFT_STATE_KEY, RECENT_CAPTURES_KEY, RECENT_LIMIT };
