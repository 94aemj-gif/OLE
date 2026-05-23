// @ts-check
import { localStore } from '../storage/local-store.js';
import { queueDepth } from '../sync/push-queue.js';
import { countDeadLetter24h } from './metrics.js';
import { idbStore } from '../storage/idb-store.js';

const APP_VERSION = '1.0.0';

/**
 * Upsert this tablet's health row. Caller invokes every ~30s.
 *
 * @param {any} client
 * @param {{tablet_id:string, line_id:string|null}} ctx
 */
export async function upsertHealth(client, ctx) {
  const now = new Date();
  const depth = await queueDepth();
  const deadLetterRows = await safeAll('dead_letter_local');
  const dead24h = countDeadLetter24h(
    deadLetterRows.map((r) => ({ client_timestamp: r.id })),
    now
  );
  const localToday = localStore.get('shift_state', { count: 0 }).count;
  const lastServerCount = localStore.get('sync:server_count_today', 0);
  const delta = Math.abs(localToday - lastServerCount);
  await client.upsertTabletHealth({
    tablet_id: ctx.tablet_id,
    assigned_line_id: ctx.line_id,
    last_heartbeat: now.toISOString(),
    push_queue_depth: depth,
    dead_letter_24h: dead24h,
    last_successful_sync: localStore.get('sync:last_success_at', null),
    local_vs_server_delta: delta,
    app_version: APP_VERSION
  });
}

async function safeAll(store) {
  try {
    return await idbStore.all(store);
  } catch {
    return [];
  }
}
