// @ts-check
/**
 * Availability = run_time / planned_time.
 * @param {{plannedMinutes:number, downtimeMinutes:number}} input
 */
export function availability(input) {
  const planned = Math.max(input.plannedMinutes, 0);
  if (planned === 0) return 0;
  const run = Math.max(planned - Math.max(input.downtimeMinutes, 0), 0);
  return run / planned;
}
