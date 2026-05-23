// @ts-check
import { localStore } from '../storage/local-store.js';

const APPLIED_KEY = 'sync:applied_events';
const EVENT_WATERMARK_KEY = 'sync:events_watermark';

function appliedSet() {
  return new Set(localStore.get(APPLIED_KEY, []));
}

function persistApplied(set) {
  localStore.set(APPLIED_KEY, [...set]);
}

/**
 * @param {{listEvents:(opts:{watermarkIso:string})=>Promise<{status:number, body:any}>}} client
 * @param {(event:any)=>Promise<void>|void} apply
 */
export async function applyEventsOnce(client, apply) {
  const stored = localStore.get(EVENT_WATERMARK_KEY, null);
  const fromIso = stored ?? new Date(0).toISOString();
  const res = await client.listEvents({ watermarkIso: fromIso });
  const rows = Array.isArray(res.body) ? res.body : [];
  const applied = appliedSet();
  let latest = stored;
  for (const ev of rows) {
    if (applied.has(ev.id)) continue;
    await apply(ev);
    applied.add(ev.id);
    latest = ev.issued_at;
  }
  persistApplied(applied);
  if (latest) localStore.set(EVENT_WATERMARK_KEY, latest);
  return { fetched: rows.length };
}

export const _internals = { APPLIED_KEY, EVENT_WATERMARK_KEY };
