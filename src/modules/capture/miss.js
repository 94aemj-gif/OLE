// @ts-check
// Mandatory-cause-on-miss (PRD §6): saving an hour below target forces the
// operator to record a downtime cause before the capture is accepted.

/**
 * Is this hour a miss? Good strictly below target. A 0/undefined target is
 * never a miss (target unknown → no enforcement, efficiency renders "—").
 *
 * @param {number} good
 * @param {number} target
 * @returns {boolean}
 */
export function isMiss(good, target) {
  if (!target || target <= 0) return false;
  return Number(good) < target;
}

/**
 * A miss must carry at least one downtime cause (code + minutes > 0).
 * Returns true when the capture should be BLOCKED pending a cause.
 *
 * @param {number} good
 * @param {number} target
 * @param {Array<{reason_id?:string, minutes?:number}>} [downtimeRows]
 * @returns {boolean}
 */
export function needsCause(good, target, downtimeRows = []) {
  if (!isMiss(good, target)) return false;
  const hasCause = (downtimeRows ?? []).some((r) => r && r.reason_id && (r.minutes || 0) > 0);
  return !hasCause;
}
