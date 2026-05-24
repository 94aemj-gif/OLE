// @ts-check
import { localStore } from '../storage/local-store.js';
import { enqueueCapture } from '../sync/push-queue.js';

const SHIFT_STATE_PREFIX = 'shift_state:';
const RECENT_CAPTURES_KEY = 'recent_captures';
const RECENT_LIMIT = 5000;

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

/**
 * @param {{line_id:string, shift_id:string, plantDayIso:string}} ctx
 */
export function shiftStateKey(ctx) {
  return `${SHIFT_STATE_PREFIX}${ctx.line_id}:${ctx.shift_id}:${ctx.plantDayIso.slice(0, 10)}`;
}

function defaultCtxFromPayload(payload) {
  return {
    line_id: payload.line_id,
    shift_id: payload.shift_id,
    plantDayIso: typeof payload.hour_bucket === 'string' ? payload.hour_bucket : '1970-01-01'
  };
}

/**
 * Persist a capture locally and enqueue it for sync.
 * @param {Object} payload
 * @param {{line_id:string, shift_id:string, plantDayIso:string}} [ctx]
 */
export async function persistCaptureLocally(payload, ctx) {
  const lineCtx = ctx ?? defaultCtxFromPayload(payload);
  const key = shiftStateKey(lineCtx);
  const state = localStore.get(key, { count: 0, scrap: 0, downtime: 0 });
  state.count += payload.units_produced;
  state.scrap += payload.scrap_rows.reduce((a, r) => a + r.pieces, 0);
  state.downtime += payload.downtime_rows.reduce((a, r) => a + r.minutes, 0);

  const enriched = {
    ...payload,
    id: uid(),
    undone: false,
    server_timestamp: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  state.last_capture = {
    id: enriched.id,
    at: payload.client_timestamp,
    units: payload.units_produced,
    hash: payload.payload_hash
  };
  localStore.set(key, state);

  const recents = localStore.get(RECENT_CAPTURES_KEY, []);
  recents.unshift(enriched);
  if (recents.length > RECENT_LIMIT) recents.length = RECENT_LIMIT;
  localStore.set(RECENT_CAPTURES_KEY, recents);

  await enqueueCapture(payload);
  return { state, capture: enriched };
}

/**
 * @param {{line_id:string, shift_id:string, plantDayIso:string}} [ctx]
 */
export function readShiftState(ctx) {
  const fallback = { count: 0, scrap: 0, downtime: 0 };
  if (!ctx) return fallback;
  return localStore.get(shiftStateKey(ctx), fallback);
}

export function resetShiftState() {
  const ls = globalThis.localStorage;
  if (ls) {
    const nsPrefix = `ole:${SHIFT_STATE_PREFIX}`;
    const keys = [];
    for (let i = 0; i < ls.length; i += 1) {
      const k = ls.key(i);
      if (k && (k.startsWith(nsPrefix) || k === 'ole:shift_state')) keys.push(k);
    }
    for (const k of keys) ls.removeItem(k);
  }
  localStore.remove(RECENT_CAPTURES_KEY);
}

export const _internals = { SHIFT_STATE_PREFIX, RECENT_CAPTURES_KEY, RECENT_LIMIT };
