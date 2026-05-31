// @ts-check
// History & analysis (PRD §7.6): compare shifts/days/weeks, trend by SKU, and
// historical downtime Pareto. Pure functions over capture rows — the caller
// supplies the captures for each window (filtered by line / shift / date range).

import { hourSlotTarget, efficiencyPct } from '../kpi/target.js';
import { currentSlotStart } from '../time/shift.js';

function sumRows(rows, key) {
  return (rows ?? []).reduce((a, r) => a + (r[key] || 0), 0);
}

/** Break-adjusted target for a single capture, or 0 when SKU/shift/tz unknown. */
function captureTarget(c, opts) {
  const product = opts.productsById?.get(c.product_id);
  const shift = opts.shiftsById?.get(c.shift_id);
  if (!product || !shift || !opts.timezone) return 0;
  return hourSlotTarget(product, currentSlotStart(new Date(c.hour_bucket), opts.timezone), shift.breaks ?? []);
}

/**
 * Aggregate good / scrap / downtime / target / efficiency for a set of captures.
 * Target is break-adjusted per capture using its SKU and its shift's breaks;
 * it is only added when product + shift + timezone are resolvable.
 *
 * @param {Array<any>} captures
 * @param {{productsById?:Map<string,any>, shiftsById?:Map<string,any>, timezone?:string}} [opts]
 */
export function windowTotals(captures, opts = {}) {
  let good = 0;
  let scrap = 0;
  let downtime = 0;
  let target = 0;
  for (const c of captures ?? []) {
    if (c.undone) continue;
    good += c.units_produced || 0;
    scrap += sumRows(c.scrap_rows, 'pieces');
    downtime += sumRows(c.downtime_rows, 'minutes');
    target += captureTarget(c, opts);
  }
  return { good, scrap, downtime, target, efficiency: efficiencyPct(good, target) };
}

/**
 * Side-by-side comparison of arbitrary windows (shifts, days, or weeks).
 *
 * @param {Array<{label:string, captures:any[]}>} windows
 * @param {{products?:any[], shifts?:any[], timezone?:string}} [opts]
 */
export function compareWindows(windows, opts = {}) {
  const productsById = new Map((opts.products ?? []).map((p) => [p.id, p]));
  const shiftsById = new Map((opts.shifts ?? []).map((s) => [s.id, s]));
  return (windows ?? []).map((w) => ({
    label: w.label,
    ...windowTotals(w.captures, { productsById, shiftsById, timezone: opts.timezone })
  }));
}

/**
 * Good-piece trend per SKU over time. Default bucket = civil day (YYYY-MM-DD)
 * from the capture's hour_bucket.
 *
 * @param {Array<any>} captures
 * @param {{products?:any[], bucket?:(c:any)=>string}} [opts]
 */
function accumulateSku(bySku, sku, bucket, good) {
  const inner = bySku.get(sku) ?? new Map();
  inner.set(bucket, (inner.get(bucket) || 0) + good);
  bySku.set(sku, inner);
}

function toSeries(inner) {
  return [...inner.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([bucket, good]) => ({ bucket, good }));
}

export function trendBySku(captures, opts = {}) {
  const nameById = new Map((opts.products ?? []).map((p) => [p.id, p.name ?? p.sku_code ?? p.id]));
  const bucketOf = opts.bucket ?? ((c) => String(c.hour_bucket).slice(0, 10));
  const bySku = new Map();
  for (const c of captures ?? []) {
    if (c.undone) continue;
    accumulateSku(bySku, c.product_id ?? null, bucketOf(c), c.units_produced || 0);
  }
  return [...bySku.entries()].map(([sku, inner]) => ({
    product_id: sku,
    product_name: nameById.get(sku) ?? sku ?? '—',
    series: toSeries(inner)
  }));
}

/**
 * Historical downtime Pareto: minutes by reason across the captures, sorted
 * descending, with share and cumulative share.
 *
 * @param {Array<any>} captures
 * @param {Array<{id:string,name?:string}>} [reasons]
 */
function tallyDowntime(captures) {
  const byCode = new Map();
  for (const c of captures ?? []) {
    if (c.undone) continue;
    for (const r of c.downtime_rows ?? []) {
      const id = r.reason_id ?? 'UNKNOWN';
      byCode.set(id, (byCode.get(id) || 0) + (r.minutes || 0));
    }
  }
  return byCode;
}

export function downtimePareto(captures, reasons = []) {
  const nameById = new Map((reasons ?? []).map((r) => [r.id, r.name]));
  const byCode = tallyDowntime(captures);
  const total = [...byCode.values()].reduce((a, b) => a + b, 0);
  const rows = [...byCode.entries()]
    .map(([id, minutes]) => ({ reason_id: id, name: nameById.get(id) ?? id, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
  let cum = 0;
  return rows.map((row) => {
    cum += row.minutes;
    return {
      ...row,
      pct: total ? (row.minutes / total) * 100 : 0,
      cumPct: total ? (cum / total) * 100 : 0
    };
  });
}
