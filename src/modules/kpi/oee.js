// @ts-check
import { availability } from './availability.js';
import { performance } from './performance.js';
import { quality } from './quality.js';

/**
 * @param {{plannedMinutes:number,downtimeMinutes:number,hourlyTarget:number,actualOutput:number,scrapUnits:number}} input
 */
export function oee(input) {
  const a = availability({
    plannedMinutes: input.plannedMinutes,
    downtimeMinutes: input.downtimeMinutes
  });
  const runMinutes = Math.max(input.plannedMinutes - input.downtimeMinutes, 0);
  const p = performance({
    actualOutput: input.actualOutput,
    hourlyTarget: input.hourlyTarget,
    runMinutes
  });
  const q = quality({ actualOutput: input.actualOutput, scrapUnits: input.scrapUnits });
  return { availability: a, performance: p, quality: q, oee: a * p * q, runMinutes };
}
