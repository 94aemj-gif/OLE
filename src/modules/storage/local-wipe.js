// @ts-check

const NS_PREFIX = 'ole:';
const IDB_NAME = 'ole';

/**
 * Wipe every OLE-owned key in localStorage on this device.
 * Does NOT touch other origins, IndexedDB, or remote state.
 */
export function wipeLocalStorage() {
  const ls = globalThis.localStorage;
  if (!ls) return 0;
  const keys = [];
  for (let i = 0; i < ls.length; i += 1) {
    const k = ls.key(i);
    if (k && k.startsWith(NS_PREFIX)) keys.push(k);
  }
  for (const k of keys) ls.removeItem(k);
  return keys.length;
}

/**
 * Drop the OLE IndexedDB database (push_queue, dead_letter_local, etc.).
 * @returns {Promise<boolean>}
 */
export function wipeIndexedDb() {
  return new Promise((resolve) => {
    if (!globalThis.indexedDB) return resolve(false);
    const req = globalThis.indexedDB.deleteDatabase(IDB_NAME);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
    req.onblocked = () => resolve(false);
  });
}

/**
 * Wipe localStorage + IndexedDB on this device. Used by the admin
 * "Limpiar caché local" button when test data needs to be cleared.
 *
 * Remote (Neon) data is NOT touched — call the day-reset flow for that.
 */
export async function wipeLocalDeviceCache() {
  const removedKeys = wipeLocalStorage();
  const idbDropped = await wipeIndexedDb();
  return { removedKeys, idbDropped };
}
