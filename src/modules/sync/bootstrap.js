// @ts-check
import { makeDbClient } from '../db/client.js';
import { createSyncLoop } from './index.js';
import { handleEventLocally } from '../reset/apply.js';
import { localStore } from '../storage/local-store.js';
import { shiftStateKey } from '../capture/local.js';

const RECENT_CAPTURES_KEY = 'recent_captures';
const RECENT_LIMIT = 5000;

function sumRows(rows, field) {
  return rows.reduce((acc, r) => acc + (r?.[field] ?? 0), 0);
}

function eligibleForShiftState(row) {
  return Boolean(
    row && !row.undone && row.line_id && row.shift_id && typeof row.hour_bucket === 'string'
  );
}

function applyRowToGroup(groups, row) {
  const ctx = { line_id: row.line_id, shift_id: row.shift_id, plantDayIso: row.hour_bucket };
  const key = shiftStateKey(ctx);
  let state = groups.get(key);
  if (!state) {
    state = { count: 0, scrap: 0, downtime: 0, last_capture: null };
    groups.set(key, state);
  }
  state.count += row.units_produced ?? 0;
  state.scrap += sumRows(row.scrap_rows ?? [], 'pieces');
  state.downtime += sumRows(row.downtime_rows ?? [], 'minutes');
  const candidate = {
    id: row.id,
    at: row.client_timestamp,
    units: row.units_produced,
    hash: row.payload_hash
  };
  if (!state.last_capture || String(candidate.at ?? '') > String(state.last_capture.at ?? '')) {
    state.last_capture = candidate;
  }
}

/**
 * Rebuild per-(line, shift, day) shift_state counters from the current
 * recent_captures list. Lets the operator-page counter reflect captures
 * pulled from other tablets, not just locally entered ones.
 */
function recomputeShiftStates() {
  const captures = localStore.get(RECENT_CAPTURES_KEY, []);
  const groups = new Map();
  for (const row of captures) {
    if (eligibleForShiftState(row)) applyRowToGroup(groups, row);
  }
  for (const [key, state] of groups) localStore.set(key, state);
}

export const SYNC_APPLIED_EVENT = 'ole:sync-applied';

function dispatchSyncApplied(detail) {
  if (typeof globalThis.dispatchEvent === 'function') {
    globalThis.dispatchEvent(new CustomEvent(SYNC_APPLIED_EVENT, { detail }));
  }
}

function captureKey(row) {
  return row?.payload_hash ?? row?.id ?? null;
}

/**
 * Merge pulled captures into local cache (deduped by payload_hash, then id)
 * and rebuild shift_state counters. Server rows win over local rows for the
 * same payload_hash so the locally-issued id is replaced by the server uuid
 * once sync completes — prevents double-counting in shift_state.
 * Emits `ole:sync-applied` afterwards so pages can re-render without F5.
 * @param {any[]} rows
 */
function mergeCapturesIntoLocal(rows) {
  const existing = localStore.get(RECENT_CAPTURES_KEY, []);
  const merged = new Map();
  for (const row of existing) {
    const key = captureKey(row);
    if (key) merged.set(key, row);
  }
  for (const row of rows) {
    const key = captureKey(row);
    if (key) merged.set(key, row);
  }
  const out = [...merged.values()]
    .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))
    .slice(0, RECENT_LIMIT);
  localStore.set(RECENT_CAPTURES_KEY, out);
  recomputeShiftStates();
  dispatchSyncApplied({ fetched: rows.length });
}

/**
 * Boot a 30s push/pull/events sync loop bound to the remote /api/* client.
 * Returns the loop so callers can stop or tickNow.
 *
 * @param {Object} [opts]
 * @param {(rows:any[])=>void} [opts.applyCaptures]
 * @param {(event:any)=>void|Promise<void>} [opts.applyEvent]
 * @param {number} [opts.intervalMs]
 */
/**
 * Best-effort pull of the catalog from /api/config into localStorage. Pages read
 * the cached catalog via loadOrSeedCatalog; this keeps it in sync with the DB on
 * the next render/reload. Falls back silently to the seeded catalog when offline.
 * @param {{getConfig:()=>Promise<{body:any}>}} client
 */
async function refreshCatalogFromApi(client) {
  try {
    const res = await client.getConfig();
    const rows = res?.body;
    const data = Array.isArray(rows) ? rows[0]?.data : rows?.data;
    if (data && Array.isArray(data.lines)) {
      localStore.set('catalog', data);
      dispatchSyncApplied({ catalog: true });
    }
  } catch {
    /* offline or API down — keep the cached/fallback catalog */
  }
}

export function startRemoteSync(opts = {}) {
  const client = makeDbClient();
  const applyCaptures = opts.applyCaptures ?? mergeCapturesIntoLocal;
  const applyEvent = opts.applyEvent ?? handleEventLocally;
  void refreshCatalogFromApi(client);
  const loop = createSyncLoop({
    client,
    applyCaptures,
    applyEvent,
    intervalMs: opts.intervalMs
  });
  loop.start();
  return { loop, client };
}
