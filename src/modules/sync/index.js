// @ts-check
import { drainOnce } from './push-queue.js';
import { pullCapturesOnce } from './pull.js';
import { applyEventsOnce } from './events.js';

const DEFAULT_INTERVAL_MS = 120_000;

/**
 * Orchestrates a push → pull → events cycle on a fixed interval (default 120s).
 *
 * @param {Object} deps
 * @param {any} deps.client
 * @param {(rows:any[])=>void} deps.applyCaptures
 * @param {(event:any)=>Promise<void>|void} deps.applyEvent
 * @param {number} [deps.intervalMs]
 */
export function createSyncLoop(deps) {
  const intervalMs = deps.intervalMs ?? DEFAULT_INTERVAL_MS;
  let timer = null;
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    try {
      await drainOnce(deps.client);
      await pullCapturesOnce(deps.client, deps.applyCaptures);
      await applyEventsOnce(deps.client, deps.applyEvent);
    } catch (err) {
      console.warn('sync tick failed', err);
    } finally {
      running = false;
    }
  }

  return {
    start() {
      if (timer) return;
      timer = setInterval(tick, intervalMs);
      void tick();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    tickNow: tick
  };
}
