// @ts-check
const DB_NAME = 'ole';
const DB_VERSION = 2;
const STORES = ['push_queue', 'dead_letter_local', 'kpi_cache', 'auth_lockout'];

/** @type {Promise<IDBDatabase> | null} */
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(storeName, mode) {
  const db = await openDb();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

export const idbStore = {
  async put(store, record) {
    const objectStore = await tx(store, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = objectStore.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  },
  async get(store, id) {
    const objectStore = await tx(store, 'readonly');
    return new Promise((resolve, reject) => {
      const req = objectStore.get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  },
  async delete(store, id) {
    const objectStore = await tx(store, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = objectStore.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  async all(store) {
    const objectStore = await tx(store, 'readonly');
    return new Promise((resolve, reject) => {
      const req = objectStore.getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  },
  async count(store) {
    const objectStore = await tx(store, 'readonly');
    return new Promise((resolve, reject) => {
      const req = objectStore.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  _resetForTests() {
    dbPromise = null;
  }
};
