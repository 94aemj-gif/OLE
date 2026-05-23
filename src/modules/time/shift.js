// @ts-check
import { plantDayRange } from './plant-day.js';

/**
 * Find the shift that contains the given moment. Supports overnight shifts (end < start).
 * @param {Date} now
 * @param {{id:string,start:string,end:string,breaks?:Array<{start:string,end:string}>}[]} shifts
 * @param {string} timezone
 */
export function findActiveShift(now, shifts, timezone) {
  const minutes = minutesInPlantDay(now, timezone);
  for (const shift of shifts) {
    const startMin = parseHmm(shift.start);
    const endMin = parseHmm(shift.end);
    if (endMin > startMin) {
      if (minutes >= startMin && minutes < endMin) return shift;
    } else {
      // overnight shift
      if (minutes >= startMin || minutes < endMin) return shift;
    }
  }
  return null;
}

/**
 * Planned minutes for a shift = shift duration − sum of break durations.
 * @param {{start:string,end:string,breaks?:Array<{start:string,end:string}>}} shift
 */
export function plannedMinutes(shift) {
  const startMin = parseHmm(shift.start);
  const endMin = parseHmm(shift.end);
  const duration = endMin > startMin ? endMin - startMin : 24 * 60 - startMin + endMin;
  const breakMin = (shift.breaks ?? []).reduce(
    (acc, b) => acc + Math.max(parseHmm(b.end) - parseHmm(b.start), 0),
    0
  );
  return duration - breakMin;
}

/**
 * Hours elapsed in the current shift relative to `now`, capped at planned duration.
 * @param {Date} now
 * @param {{start:string,end:string,breaks?:Array<{start:string,end:string}>}} shift
 * @param {string} timezone
 */
export function hoursElapsedInShift(now, shift, timezone) {
  const minutes = minutesInPlantDay(now, timezone);
  const startMin = parseHmm(shift.start);
  const endMin = parseHmm(shift.end);
  const sinceStart =
    endMin > startMin
      ? minutes - startMin
      : minutes >= startMin
        ? minutes - startMin
        : 24 * 60 - startMin + minutes;
  return Math.max(sinceStart, 0) / 60;
}

function parseHmm(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

function minutesInPlantDay(now, timezone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const h = parts.hour === '24' ? 0 : Number(parts.hour);
  return h * 60 + Number(parts.minute);
}

export { plantDayRange };
