// @ts-check
const NS = 'ole';

const k = (key) => `${NS}:${key}`;

export const localStore = {
  /** @template T @param {string} key @param {T} fallback */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(k(key));
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  /** @param {string} key @param {unknown} value */
  set(key, value) {
    try {
      localStorage.setItem(k(key), JSON.stringify(value));
    } catch (err) {
      if (err && err.name === 'QuotaExceededError') {
        throw new Error('localStorage quota exceeded');
      }
      throw err;
    }
  },
  /** @param {string} key */
  remove(key) {
    localStorage.removeItem(k(key));
  },
  clearNamespace() {
    const prefix = `${NS}:`;
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  }
};
