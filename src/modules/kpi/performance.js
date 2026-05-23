// @ts-check
/**
 * Performance = min(actual_output / theoretical_output, 1.0).
 * Capped to avoid >100% OEE; the cap is the OEE convention (see research R5).
 *
 * @param {{actualOutput:number, hourlyTarget:number, runMinutes:number}} input
 */
export function performance(input) {
  const theoretical = Math.max(input.hourlyTarget, 0) * (Math.max(input.runMinutes, 0) / 60);
  if (theoretical === 0) return 0;
  return Math.min(input.actualOutput / theoretical, 1);
}
