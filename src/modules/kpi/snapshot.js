// @ts-check
import { oee } from './oee.js';
import { plannedMinutes } from '../time/shift.js';
import { localStore } from '../storage/local-store.js';

const CACHE_KEY_PREFIX = 'kpi_cache:';
const CACHE_TTL_MS = 60_000;

/**
 * Build a KPI snapshot for a window of captures.
 *
 * @param {Object} input
 * @param {Array<{units_produced:number, scrap_rows:Array<{pieces:number}>, downtime_rows:Array<{minutes:number}>, undone?:boolean}>} input.captures
 * @param {{start:string,end:string,breaks?:Array<{start:string,end:string}>}} input.shift
 * @param {number} input.hourlyTarget
 * @param {{lineId?:string, date?:string}} [input.window]
 */
export function buildSnapshot(input) {
  const captures = input.captures.filter((c) => !c.undone);
  // units_produced is actual_good (operator enters good pieces); scrap is separate (PRD §6).
  const goodUnits = captures.reduce((acc, c) => acc + (c.units_produced || 0), 0);
  const scrapUnits = captures.reduce(
    (acc, c) => acc + (c.scrap_rows ?? []).reduce((a, r) => a + (r.pieces || 0), 0),
    0
  );
  const unitsProduced = goodUnits + scrapUnits; // total_produced = good + scrap (informational)
  const downtimeMinutes = captures.reduce(
    (acc, c) => acc + (c.downtime_rows ?? []).reduce((a, r) => a + (r.minutes || 0), 0),
    0
  );
  const planned = plannedMinutes(input.shift);
  const k = oee({
    plannedMinutes: planned,
    downtimeMinutes,
    hourlyTarget: input.hourlyTarget,
    actualOutput: unitsProduced, // OEE performance uses total count; quality strips scrap
    scrapUnits
  });
  return {
    window: input.window ?? {},
    plannedMinutes: planned,
    downtimeMinutes,
    runMinutes: k.runMinutes,
    unitsProduced,
    scrapUnits,
    goodUnits,
    theoreticalUnits: input.hourlyTarget * (k.runMinutes / 60),
    availability: k.availability,
    performance: k.performance,
    quality: k.quality,
    oee: k.oee
  };
}

/**
 * Cached snapshot keyed by `hashKey`. Cache TTL = 60s.
 * @param {string} hashKey
 * @param {() => ReturnType<typeof buildSnapshot>} compute
 * @param {() => number} [now]
 */
export function snapshotCached(hashKey, compute, now = () => Date.now()) {
  const stored = localStore.get(`${CACHE_KEY_PREFIX}${hashKey}`, null);
  if (stored && stored.savedAt + CACHE_TTL_MS > now()) return stored.value;
  const value = compute();
  localStore.set(`${CACHE_KEY_PREFIX}${hashKey}`, { savedAt: now(), value });
  return value;
}

export const _internals = { CACHE_KEY_PREFIX, CACHE_TTL_MS };
