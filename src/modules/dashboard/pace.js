// @ts-check
import { paceTier } from '../ui/pace-pill.js';

/**
 * Compute pace percent = actual / (target_per_hour × hours_elapsed) × 100.
 * Hours capped at 0.001 to avoid divide-by-zero at shift start.
 *
 * @param {Object} input
 * @param {number} input.actual
 * @param {number} input.targetPerHour
 * @param {number} input.hoursElapsed
 */
export function computePace(input) {
  const expected = input.targetPerHour * Math.max(input.hoursElapsed, 0.001);
  const percent = (input.actual / expected) * 100;
  return { percent, tier: paceTier(percent) };
}
