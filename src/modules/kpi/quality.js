// @ts-check
/**
 * Quality = good_units / actual_output (1.0 when denominator is 0).
 *
 * @param {{actualOutput:number, scrapUnits:number}} input
 */
export function quality(input) {
  const actual = Math.max(input.actualOutput, 0);
  if (actual === 0) return 1;
  const good = Math.max(actual - Math.max(input.scrapUnits, 0), 0);
  return good / actual;
}
