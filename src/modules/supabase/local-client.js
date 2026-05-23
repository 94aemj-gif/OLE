// @ts-check
import { localStore } from '../storage/local-store.js';
import { FALLBACK_CATALOG } from '../storage/fallback-catalog.js';

/**
 * Drop-in replacement for makeSupabaseClient backed by localStorage.
 * Lets the admin / operator / dashboard / graficas screens run with
 * no Supabase project — every read/write touches localStorage only.
 *
 * Data is per-device (no sync). Surviving a browser-data wipe is not
 * a goal.
 */

const KEYS = {
  catalog: 'catalog',
  catalogUpdatedAt: 'catalog:updated_at',
  captures: 'recent_captures',
  audit: 'local_audit_log',
  events: 'local_events',
  deadLetter: 'local_dead_letter',
  health: 'local_tablet_health'
};

const nowIso = () => new Date().toISOString();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

function ensureCatalog() {
  let c = localStore.get(KEYS.catalog, null);
  if (!c) {
    c = FALLBACK_CATALOG;
    localStore.set(KEYS.catalog, c);
    localStore.set(KEYS.catalogUpdatedAt, nowIso());
  }
  return c;
}

export function makeLocalClient() {
  ensureCatalog();
  return {
    async getConfig() {
      const data = ensureCatalog();
      const updated_at = localStore.get(KEYS.catalogUpdatedAt, nowIso());
      return { status: 200, body: [{ id: 1, data, updated_at }] };
    },

    async patchConfig(data, _expectedUpdatedAt) {
      localStore.set(KEYS.catalog, data);
      const ts = nowIso();
      localStore.set(KEYS.catalogUpdatedAt, ts);
      return { status: 200, body: [{ id: 1, data, updated_at: ts }] };
    },

    async insertCapture(payload) {
      const list = localStore.get(KEYS.captures, []);
      const row = {
        ...payload,
        id: uid(),
        undone: false,
        server_timestamp: nowIso(),
        updated_at: nowIso()
      };
      list.unshift(row);
      if (list.length > 200) list.length = 200;
      localStore.set(KEYS.captures, list);
      return { status: 201, body: [row] };
    },

    async patchCaptureUndo(id, undoneAt) {
      const list = localStore.get(KEYS.captures, []);
      const row = list.find((r) => r.id === id);
      if (row) {
        row.undone = true;
        row.undone_at = undoneAt;
        localStore.set(KEYS.captures, list);
      }
      return { status: 200, body: row ? [row] : [] };
    },

    /** @param {{watermarkIso?:string, includeUndone?:boolean, limit?:number}} [opts] */
    async listCaptures(opts = {}) {
      const { watermarkIso, includeUndone = false, limit = 1000 } = opts;
      const all = localStore.get(KEYS.captures, []);
      const filtered = all
        .filter((c) => {
          if (!includeUndone && c.undone) return false;
          if (watermarkIso && c.client_timestamp < watermarkIso) return false;
          return true;
        })
        .slice(0, limit);
      return { status: 200, body: filtered };
    },

    async insertAudit(entry) {
      const list = localStore.get(KEYS.audit, []);
      list.unshift({ ...entry, id: uid(), occurred_at: nowIso() });
      if (list.length > 500) list.length = 500;
      localStore.set(KEYS.audit, list);
      return { status: 201, body: null };
    },

    /** @param {{startIso?:string, endIso?:string, limit?:number}} [opts] */
    async listAuditLog(opts = {}) {
      const { startIso, endIso, limit = 200 } = opts;
      const list = localStore.get(KEYS.audit, []);
      const filtered = list
        .filter((r) => {
          if (startIso && r.occurred_at < startIso) return false;
          if (endIso && r.occurred_at > endIso) return false;
          return true;
        })
        .slice(0, limit);
      return { status: 200, body: filtered };
    },

    async insertEvent(event) {
      const list = localStore.get(KEYS.events, []);
      const row = { ...event, id: uid(), issued_at: nowIso() };
      list.unshift(row);
      localStore.set(KEYS.events, list);
      return { status: 201, body: [row] };
    },

    /** @param {{watermarkIso?:string}} [opts] */
    async listEvents(opts = {}) {
      const { watermarkIso } = opts;
      const all = localStore.get(KEYS.events, []);
      const filtered = watermarkIso ? all.filter((r) => r.issued_at >= watermarkIso) : all;
      return { status: 200, body: filtered };
    },

    async insertDeadLetter(payload) {
      const list = localStore.get(KEYS.deadLetter, []);
      const row = { ...payload, id: uid(), state: 'pending' };
      list.unshift(row);
      localStore.set(KEYS.deadLetter, list);
      return { status: 201, body: [row] };
    },

    async listDeadLetter() {
      const list = localStore.get(KEYS.deadLetter, []).filter((r) => r.state === 'pending');
      return { status: 200, body: list };
    },

    async patchDeadLetter(id, body) {
      const list = localStore.get(KEYS.deadLetter, []);
      const i = list.findIndex((r) => r.id === id);
      if (i >= 0) {
        list[i] = { ...list[i], ...body };
        localStore.set(KEYS.deadLetter, list);
      }
      return { status: 200, body: i >= 0 ? [list[i]] : [] };
    },

    async upsertTabletHealth(payload) {
      const list = localStore.get(KEYS.health, []);
      const i = list.findIndex((r) => r.tablet_id === payload.tablet_id);
      if (i >= 0) list[i] = payload;
      else list.push(payload);
      localStore.set(KEYS.health, list);
      return { status: 200, body: null };
    },

    async listTabletHealth() {
      const list = localStore.get(KEYS.health, []);
      return { status: 200, body: list };
    },

    async deleteCapturesForDay({ startIso, endIso }) {
      const list = localStore.get(KEYS.captures, []);
      const kept = list.filter((c) => !(c.hour_bucket >= startIso && c.hour_bucket < endIso));
      localStore.set(KEYS.captures, kept);
      return { status: 204, body: null };
    }
  };
}

export const _internalKeys = KEYS;
