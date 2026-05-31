// @ts-check
// Per-SKU, break-adjusted hourly target (PRD §6).
//   calculated_target = round( SKU.standard_target_per_hour × productive_minutes / 60 )
// Productive minutes of an hour slot = 60 minus any overlap with shift breaks.

/** @param {string} hhmm */
function parseHmm(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Productive minutes within a 60-minute slot starting at `slotStart`, after
 * subtracting overlap with the shift's breaks. Clamped to [0, 60].
 * Breaks crossing midnight are not expected within a single hour slot.
 *
 * @param {string} slotStart  // "HH:MM" — slot covers [slotStart, slotStart+60min)
 * @param {Array<{start:string,end:string}>} [breaks]
 * @returns {number}
 */
export function slotProductiveMinutes(slotStart, breaks = []) {
  const start = parseHmm(slotStart);
  const end = start + 60;
  let overlap = 0;
  for (const b of breaks ?? []) {
    const bStart = parseHmm(b.start);
    const bEnd = parseHmm(b.end);
    overlap += Math.max(0, Math.min(end, bEnd) - Math.max(start, bStart));
  }
  return Math.max(0, Math.min(60, 60 - overlap));
}

/**
 * Break-adjusted hourly target for a SKU.
 *
 * @param {number} standardTargetPerHour
 * @param {number} productiveMinutes  // 0..60
 * @returns {number}
 */
export function calculatedTarget(standardTargetPerHour, productiveMinutes) {
  const std = Math.max(0, Number(standardTargetPerHour) || 0);
  const min = Math.max(0, Math.min(60, Number(productiveMinutes) || 0));
  return Math.round(std * (min / 60));
}

/**
 * Convenience: target for one hour slot given the active SKU and shift breaks.
 *
 * @param {{standard_target_per_hour:number}} product
 * @param {string} slotStart
 * @param {Array<{start:string,end:string}>} [breaks]
 * @returns {number}
 */
export function hourSlotTarget(product, slotStart, breaks = []) {
  return calculatedTarget(product?.standard_target_per_hour ?? 0, slotProductiveMinutes(slotStart, breaks));
}

/**
 * Efficiency % of good pieces against the calculated target.
 * Returns null when target is 0 (UI renders "—", PRD §6).
 *
 * @param {number} good
 * @param {number} target
 * @returns {number|null}
 */
export function efficiencyPct(good, target) {
  if (!target || target <= 0) return null;
  return (Math.max(0, good) / target) * 100;
}
