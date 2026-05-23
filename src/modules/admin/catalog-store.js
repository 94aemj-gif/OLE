// @ts-check
import { localStore } from '../storage/local-store.js';

const CATALOG_KEY = 'catalog';
const UPDATED_AT_KEY = 'catalog:updated_at';

/**
 * Patch the catalog with optimistic concurrency.
 *
 * @param {any} client
 * @param {(current:any) => any} mutate  // produces the new full data object
 * @returns {Promise<{ok:true, data:any, updated_at:string} | {ok:false, code:'conflict', latest:any}>}
 */
export async function patchCatalog(client, mutate) {
  const current = await client.getConfig();
  const row = Array.isArray(current.body) ? current.body[0] : current.body;
  if (!row) throw new Error('config row missing');
  const nextData = mutate(structuredClone(row.data));
  const patch = await client.patchConfig(nextData, row.updated_at);
  if (patch.status === 409) {
    return { ok: false, code: 'conflict', latest: row };
  }
  const updated = Array.isArray(patch.body) ? patch.body[0] : patch.body;
  localStore.set(CATALOG_KEY, updated.data);
  localStore.set(UPDATED_AT_KEY, updated.updated_at);
  return { ok: true, data: updated.data, updated_at: updated.updated_at };
}

/** Deep merge with `Map`-like semantics on arrays: replace by `.id`. */
export function mergeCatalog(base, patch) {
  const out = structuredClone(base);
  for (const key of Object.keys(patch)) {
    const incoming = patch[key];
    if (Array.isArray(incoming)) {
      out[key] = mergeArrayById(out[key] ?? [], incoming);
    } else if (incoming && typeof incoming === 'object') {
      out[key] = { ...(out[key] ?? {}), ...incoming };
    } else {
      out[key] = incoming;
    }
  }
  return out;
}

function mergeArrayById(existing, incoming) {
  const byId = new Map();
  for (const row of existing) byId.set(rowKey(row), row);
  for (const row of incoming) byId.set(rowKey(row), { ...byId.get(rowKey(row)), ...row });
  return [...byId.values()];
}

function rowKey(row) {
  return row.id ?? row.employee_number ?? row.name ?? JSON.stringify(row);
}

export function readLocalCatalog() {
  return localStore.get(CATALOG_KEY, null);
}

export const _internals = { CATALOG_KEY, UPDATED_AT_KEY };
