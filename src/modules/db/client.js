// @ts-check
const BACKOFF_SCHEDULE_MS = [1000, 2000, 5000, 15000, 60000];

/**
 * @typedef {Object} ClientConfig
 * @property {string} [baseUrl] - Defaults to same-origin "".
 * @property {(ms:number)=>Promise<void>} [sleep]
 * @property {typeof fetch} [fetchImpl]
 */

/** @param {number} ms */
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function makeHttpError(status, text, body, permanent) {
  const err = /** @type {any} */ (new Error(`HTTP ${status}: ${text}`));
  err.code = status;
  err.body = body;
  err.permanent = permanent;
  return err;
}

/** @param {ClientConfig} [cfg] */
export function makeDbClient(cfg = {}) {
  const baseUrl = cfg.baseUrl ?? '';
  const sleep = cfg.sleep ?? defaultSleep;
  const fetchImpl = cfg.fetchImpl ?? globalThis.fetch.bind(globalThis);

  async function attemptOnce(path, init) {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init.headers ?? {})
      }
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (res.status >= 200 && res.status < 300) return { status: res.status, body };
    if (res.status === 409) return { status: 409, body };
    if (res.status >= 400 && res.status < 500) {
      throw makeHttpError(res.status, text, body, true);
    }
    throw makeHttpError(res.status, text, body, false);
  }

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
    throw lastErr ?? new Error('Request failed after retries');
  }

  return {
    insertCapture(payload) {
      return requestWithRetry('/api/captures', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    patchCaptureUndo(id, undoneAt) {
      return requestWithRetry(`/api/captures/${encodeURIComponent(id)}/undo`, {
        method: 'POST',
        body: JSON.stringify({ undoneAt })
      });
    },
    listCaptures({ watermarkIso, includeUndone = false, limit = 1000 }) {
      const qs = new URLSearchParams();
      if (watermarkIso) qs.set('watermark', watermarkIso);
      if (includeUndone) qs.set('includeUndone', '1');
      qs.set('limit', String(limit));
      return requestWithRetry(`/api/captures?${qs}`, { method: 'GET' });
    },
    insertAudit(entry) {
      return requestWithRetry('/api/audit', {
        method: 'POST',
        body: JSON.stringify(entry)
      });
    },
    insertEvent(event) {
      return requestWithRetry('/api/events', {
        method: 'POST',
        body: JSON.stringify(event)
      });
    },
    listEvents({ watermarkIso }) {
      const qs = new URLSearchParams();
      if (watermarkIso) qs.set('watermark', watermarkIso);
      return requestWithRetry(`/api/events?${qs}`, { method: 'GET' });
    },
    insertDeadLetter(payload) {
      return requestWithRetry('/api/dead-letter', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    listDeadLetter() {
      return requestWithRetry('/api/dead-letter', { method: 'GET' });
    },
    patchDeadLetter(id, body) {
      return requestWithRetry(`/api/dead-letter/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    },
    getConfig() {
      return requestWithRetry('/api/config', { method: 'GET' });
    },
    patchConfig(data, expectedUpdatedAt) {
      return requestWithRetry('/api/config', {
        method: 'PATCH',
        body: JSON.stringify({ data, expectedUpdatedAt })
      });
    },
    deleteCapturesForDay({ startIso, endIso }) {
      const qs = new URLSearchParams({ start: startIso, end: endIso });
      return requestWithRetry(`/api/captures?${qs}`, { method: 'DELETE' });
    },
    upsertTabletHealth(payload) {
      return requestWithRetry('/api/tablet-health', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    listTabletHealth() {
      return requestWithRetry('/api/tablet-health', { method: 'GET' });
    },
    getConfig() {
      return requestWithRetry('/api/config', { method: 'GET' });
    }
  };
}
