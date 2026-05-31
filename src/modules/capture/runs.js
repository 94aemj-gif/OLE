// @ts-check
// Run derivation (PRD §5). A Run is a continuous production span within a shift
// for a single SKU. Runs are DERIVED from the product_id stamped on each hourly
// capture — no separate Run table. Changing SKU mid-shift starts a new run; the
// same SKU returning after a different SKU is a new run (contiguity, not grouping).

import { hourSlotTarget, efficiencyPct } from '../kpi/target.js';
import { currentSlotStart } from '../time/shift.js';

/**
 * Split ordered captures into contiguous runs by product_id.
 *
 * @param {Array<{hour_bucket:string, product_id?:string|null, undone?:boolean}>} captures
 * @returns {Array<{product_id:string|null, captures:any[], start_hour:string, end_hour:string}>}
 */
export function deriveRuns(captures) {
  const live = (captures ?? [])
    .filter((c) => !c.undone)
    .slice()
    .sort((a, b) => Date.parse(a.hour_bucket) - Date.parse(b.hour_bucket));
  const runs = [];
  let cur = null;
  for (const c of live) {
    const pid = c.product_id ?? null;
    if (!cur || cur.product_id !== pid) {
      cur = { product_id: pid, captures: [], start_hour: c.hour_bucket, end_hour: c.hour_bucket };
      runs.push(cur);
    }
    cur.captures.push(c);
    cur.end_hour = c.hour_bucket;
  }
  return runs;
}

/**
 * Per-run summary with good/scrap/downtime totals and (when shift+timezone are
 * supplied) break-adjusted target + efficiency for the SKU.
 *
 * @param {Object} input
 * @param {Array<any>} input.captures
 * @param {Array<{id:string,name?:string,sku_code?:string,standard_target_per_hour:number}>} [input.products]
 * @param {{breaks?:Array<{start:string,end:string}>}} [input.shift]
 * @param {string} [input.timezone]
 */
export function summarizeRuns(input) {
  const runs = deriveRuns(input.captures);
  const byId = new Map((input.products ?? []).map((p) => [p.id, p]));
  return runs.map((run) => {
    const product = byId.get(run.product_id) ?? null;
    const { good, scrap, downtime, target } = aggregateRun(run, product, input.shift, input.timezone);
    return {
      product_id: run.product_id,
      product_name: product?.name ?? product?.sku_code ?? run.product_id ?? '—',
      hours: run.captures.length,
      start_hour: run.start_hour,
      end_hour: run.end_hour,
      good,
      scrap,
      downtime,
      target,
      efficiency: efficiencyPct(good, target)
    };
  });
}

function sumRows(rows, key) {
  return (rows ?? []).reduce((a, r) => a + (r[key] || 0), 0);
}

function aggregateRun(run, product, shift, timezone) {
  let good = 0;
  let scrap = 0;
  let downtime = 0;
  let target = 0;
  const computeTarget = Boolean(product && shift && timezone);
  for (const c of run.captures) {
    good += c.units_produced || 0;
    scrap += sumRows(c.scrap_rows, 'pieces');
    downtime += sumRows(c.downtime_rows, 'minutes');
    if (computeTarget) {
      target += hourSlotTarget(product, currentSlotStart(new Date(c.hour_bucket), timezone), shift.breaks ?? []);
    }
  }
  return { good, scrap, downtime, target };
}
