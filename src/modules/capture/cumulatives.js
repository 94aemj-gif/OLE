// @ts-check
// Shift + day cumulatives for the capture footer (PRD §6 / Acceptance #5).
// Both carry actual_good, break-adjusted target, and delta (actual − target).

import { windowTotals } from '../analysis/history.js';

/**
 * @param {Object} input
 * @param {Array<any>} input.captures        // recent captures (any line/shift/day)
 * @param {string} input.lineId
 * @param {string} input.shiftId
 * @param {string} input.dayStartIso          // plant-day window [start, end)
 * @param {string} input.dayEndIso
 * @param {Map<string,any>} [input.productsById]
 * @param {Map<string,any>} [input.shiftsById]
 * @param {string} [input.timezone]
 */
export function computeCumulatives(input) {
  const inDay = (input.captures ?? []).filter(
    (c) =>
      !c.undone &&
      c.line_id === input.lineId &&
      c.hour_bucket >= input.dayStartIso &&
      c.hour_bucket < input.dayEndIso
  );
  const opts = {
    productsById: input.productsById,
    shiftsById: input.shiftsById,
    timezone: input.timezone
  };
  const day = windowTotals(inDay, opts);
  const shift = windowTotals(
    inDay.filter((c) => c.shift_id === input.shiftId),
    opts
  );
  return {
    shift: { actual: shift.good, target: shift.target, delta: shift.good - shift.target },
    day: { actual: day.good, target: day.target, delta: day.good - day.target }
  };
}
