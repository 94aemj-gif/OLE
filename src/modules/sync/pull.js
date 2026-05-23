// @ts-check
import { localStore } from '../storage/local-store.js';

const WATERMARK_KEY = 'sync:captures_watermark';
const OVERLAP_MS = 5 * 60 * 1000;

/**
 * Pull captures since (watermark - 5 min) and merge into local cache.
 * Returns { fetched, applied }.
 *
 * @param {{listCaptures: (opts:{watermarkIso:string})=>Promise<{status:number, body:any}>}} client
 * @param {(rows:any[])=>void} applyRows
 * @param {() => number} now
 */
export async function pullCapturesOnce(client, applyRows, now = () => Date.now()) {
  const stored = localStore.get(WATERMARK_KEY, null);
  const watermark = stored ? Date.parse(stored) : 0;
  const fromMs = Math.max(watermark - OVERLAP_MS, 0);
  const fromIso = new Date(fromMs).toISOString();
  const res = await client.listCaptures({ watermarkIso: fromIso });
  const rows = Array.isArray(res.body) ? res.body : [];
  applyRows(rows);
  if (rows.length > 0) {
    const newestUpdated = rows[rows.length - 1].updated_at;
    if (newestUpdated) localStore.set(WATERMARK_KEY, newestUpdated);
  } else {
    localStore.set(WATERMARK_KEY, new Date(now()).toISOString());
  }
  return { fetched: rows.length };
}

export const _internals = { WATERMARK_KEY, OVERLAP_MS };
