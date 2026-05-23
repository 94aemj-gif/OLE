// @ts-check
const BACKOFF_SCHEDULE_MS = [1000, 2000, 5000, 15000, 60000];

/**
 * @typedef {Object} ClientConfig
 * @property {string} url
 * @property {string} anonKey
 * @property {(ms:number)=>Promise<void>} [sleep]
 * @property {typeof fetch} [fetchImpl]
 */

/** @param {number} ms */
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {number} status
 * @param {string} text
 * @param {any} body
 * @param {boolean} permanent
 */
function makeHttpError(status, text, body, permanent) {
  const err = /** @type {any} */ (new Error(`HTTP ${status}: ${text}`));
  err.code = status;
  err.body = body;
  err.permanent = permanent;
  return err;
}

/** @param {ClientConfig} cfg */
export function makeSupabaseClient(cfg) {
  const sleep = cfg.sleep ?? defaultSleep;
  const fetchImpl = cfg.fetchImpl ?? globalThis.fetch.bind(globalThis);

  /**
   * @param {string} path
   * @param {RequestInit & {prefer?:string}} init
   */
  async function rawRequest(path, init = {}) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
      ...(init.headers ?? {})
    };
    if (init.prefer) headers['Prefer'] = init.prefer;
    const res = await fetchImpl(`${cfg.url}${path}`, { ...init, headers });
    return res;
  }

  /**
   * @param {string} path
   * @param {RequestInit & {prefer?:string}} init
   * @returns {Promise<{status:number, body:any}>}
   */
  async function attemptOnce(path, init) {
    const res = await rawRequest(path, init);
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (res.status >= 200 && res.status < 300) return { status: res.status, body };
    if (res.status === 409) return { status: 409, body };
    if (res.status >= 400 && res.status < 500) {
      throw makeHttpError(res.status, text, body, true);
    }
    throw makeHttpError(res.status, text, body, false);
  }

  /**
   * @param {string} path
   * @param {RequestInit & {prefer?:string}} init
   */
  async function requestWithRetry(path, init) {
    let lastErr = null;
    for (let attempt = 0; attempt <= BACKOFF_SCHEDULE_MS.length; attempt += 1) {
      try {
        return await attemptOnce(path, init);
      } catch (err) {
        if (err && /** @type {any} */ (err).permanent) throw err;
        lastErr = err;
      }
      if (attempt < BACKOFF_SCHEDULE_MS.length) {
        await sleep(BACKOFF_SCHEDULE_MS[attempt]);
      }
    }
    throw lastErr ?? new Error('Supabase request failed after retries');
  }

  return {
    insertCapture(payload) {
      return requestWithRetry('/rest/v1/captures', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify(payload)
      });
    },
    patchCaptureUndo(id, undoneAt) {
      return requestWithRetry(`/rest/v1/captures?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        prefer: 'return=representation',
        body: JSON.stringify({ undone: true, undone_at: undoneAt })
      });
    },
    listCaptures({ watermarkIso, includeUndone = false, limit = 1000 }) {
      const undoneFilter = includeUndone ? '' : '&undone=eq.false';
      return requestWithRetry(
        `/rest/v1/captures?updated_at=gte.${encodeURIComponent(watermarkIso)}${undoneFilter}&order=updated_at.asc&limit=${limit}`,
        { method: 'GET' }
      );
    },
    insertAudit(entry) {
      return requestWithRetry('/rest/v1/audit_log', {
        method: 'POST',
        prefer: 'return=minimal',
        body: JSON.stringify(entry)
      });
    },
    insertEvent(event) {
      return requestWithRetry('/rest/v1/events', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify(event)
      });
    },
    listEvents({ watermarkIso }) {
      return requestWithRetry(
        `/rest/v1/events?issued_at=gte.${encodeURIComponent(watermarkIso)}&order=issued_at.asc`,
        { method: 'GET' }
      );
    },
    insertDeadLetter(payload) {
      return requestWithRetry('/rest/v1/dead_letter', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify(payload)
      });
    },
    listDeadLetter() {
      return requestWithRetry(
        '/rest/v1/dead_letter?state=eq.pending&order=client_timestamp.desc&limit=100',
        { method: 'GET' }
      );
    },
    patchDeadLetter(id, body) {
      return requestWithRetry(`/rest/v1/dead_letter?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    },
    getConfig() {
      return requestWithRetry('/rest/v1/config?id=eq.1', { method: 'GET' });
    },
    patchConfig(data, expectedUpdatedAt) {
      const ifMatch = expectedUpdatedAt
        ? `&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}`
        : '';
      return requestWithRetry(`/rest/v1/config?id=eq.1${ifMatch}`, {
        method: 'PATCH',
        prefer: 'return=representation',
        body: JSON.stringify({ data })
      });
    },
    deleteCapturesForDay({ startIso, endIso }) {
      return requestWithRetry(
        `/rest/v1/captures?hour_bucket=gte.${encodeURIComponent(startIso)}&hour_bucket=lt.${encodeURIComponent(endIso)}`,
        { method: 'DELETE', prefer: 'return=minimal' }
      );
    },
    upsertTabletHealth(payload) {
      return requestWithRetry('/rest/v1/tablet_health', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: JSON.stringify(payload)
      });
    },
    listTabletHealth() {
      return requestWithRetry('/rest/v1/tablet_health?order=tablet_id.asc', {
        method: 'GET'
      });
    }
  };
}
