// @ts-check
import { idbStore } from '../storage/idb-store.js';

const QUEUE = 'push_queue';
const DEAD_LETTER_LOCAL = 'dead_letter_local';
const BACKOFF_MS = [1000, 2000, 5000, 15000, 60000];

/**
 * Enqueue a capture payload for later POST.
 * @param {Object} payload
 */
export async function enqueueCapture(payload) {
  const record = {
    id: payload.payload_hash + ':' + payload.client_timestamp,
    payload,
    attempts: 0,
    nextAttemptAt: 0
  };
  await idbStore.put(QUEUE, record);
  return record;
}

export async function queueDepth() {
  return idbStore.count(QUEUE);
}

async function handlePermanent(row, err, client) {
  await client.insertDeadLetter({
    original_payload: row.payload,
    line_id: row.payload.line_id,
    operator_number: row.payload.operator_number,
    client_timestamp: row.payload.client_timestamp,
    client_id: row.payload.client_id,
    reject_reason: String(err.message || err.code || 'permanent error')
  });
  await idbStore.put(DEAD_LETTER_LOCAL, {
    id: row.id,
    payload: row.payload,
    reject_reason: err.message
  });
  await idbStore.delete(QUEUE, row.id);
}

async function handleTransient(row, now) {
  const nextAttempt = Math.min(row.attempts, BACKOFF_MS.length - 1);
  await idbStore.put(QUEUE, {
    ...row,
    attempts: row.attempts + 1,
    nextAttemptAt: now() + BACKOFF_MS[nextAttempt]
  });
}

async function attemptRow(row, client, now, results) {
  if (row.nextAttemptAt > now()) {
    results.deferred += 1;
    return;
  }
  try {
    const res = await client.insertCapture(row.payload);
    if (res.status === 201 || res.status === 200 || res.status === 409) {
      await idbStore.delete(QUEUE, row.id);
      results.committed += 1;
    }
  } catch (err) {
    if (err && err.permanent) {
      await handlePermanent(row, err, client);
      results.dead += 1;
    } else {
      await handleTransient(row, now);
      results.deferred += 1;
    }
  }
}

/**
 * Drain the queue once, attempting each pending row.
 *
 * @param {{insertCapture:(p:any)=>Promise<{status:number,body:any}>, insertDeadLetter:(p:any)=>Promise<any>}} client
 * @param {() => number} [now]
 */
export async function drainOnce(client, now = () => Date.now()) {
  const rows = await idbStore.all(QUEUE);
  const results = { committed: 0, deferred: 0, dead: 0 };
  for (const row of rows) {
    await attemptRow(row, client, now, results);
  }
  return results;
}

export const _queueStores = { QUEUE, DEAD_LETTER_LOCAL };
