// @ts-check
/**
 * Hourly buckets for the day containing `dayStartIso`. Returns 24 numeric buckets
 * (units produced per hour).
 *
 * @param {Array<{hour_bucket:string, units_produced:number, undone?:boolean}>} captures
 * @param {string} dayStartIso
 */
export function unitsByHour(captures, dayStartIso) {
  const buckets = new Array(24).fill(0);
  const dayStart = Date.parse(dayStartIso);
  for (const c of captures) {
    if (c.undone) continue;
    const t = Date.parse(c.hour_bucket);
    const hour = Math.floor((t - dayStart) / (60 * 60 * 1000));
    if (hour < 0 || hour >= 24) continue;
    buckets[hour] += c.units_produced;
  }
  return buckets;
}

/**
 * Cumulative cumulative-vs-target line: returns 24 numeric prefix sums.
 *
 * @param {number[]} hourly
 */
export function cumulative(hourly) {
  let total = 0;
  return hourly.map((v) => {
    total += v;
    return total;
  });
}

/**
 * Scrap pieces per hour for the day containing `dayStartIso`.
 *
 * @param {Array<{hour_bucket:string, scrap_rows:Array<{pieces:number}>, undone?:boolean}>} captures
 * @param {string} dayStartIso
 */
export function scrapByHour(captures, dayStartIso) {
  const buckets = new Array(24).fill(0);
  const dayStart = Date.parse(dayStartIso);
  for (const c of captures) {
    if (c.undone) continue;
    const t = Date.parse(c.hour_bucket);
    const hour = Math.floor((t - dayStart) / (60 * 60 * 1000));
    if (hour < 0 || hour >= 24) continue;
    const pieces = (c.scrap_rows ?? []).reduce((a, r) => a + (r.pieces || 0), 0);
    buckets[hour] += pieces;
  }
  return buckets;
}

/**
 * 14-day × 24-hour heatmap (rows = days oldest→newest, cols = hours 0–23).
 *
 * @param {Array<{hour_bucket:string, units_produced:number, undone?:boolean}>} captures
 * @param {string} endDayStartIso  // start-of-day ISO for the most-recent day (UTC)
 * @param {number} [days]
 */
export function heatmap(captures, endDayStartIso, days = 14) {
  const grid = Array.from({ length: days }, () => new Array(24).fill(0));
  const endMs = Date.parse(endDayStartIso);
  const dayMs = 24 * 60 * 60 * 1000;
  for (const c of captures) {
    if (c.undone) continue;
    const t = Date.parse(c.hour_bucket);
    // ageDays: 0 if t is in [endMs, endMs+dayMs), 1 for prior civil day, etc.
    const ageDays = Math.floor((endMs + dayMs - 1 - t) / dayMs);
    if (ageDays < 0 || ageDays >= days) continue;
    const dayRow = days - 1 - ageDays;
    const dayStart = endMs - ageDays * dayMs;
    const hour = Math.floor((t - dayStart) / (60 * 60 * 1000));
    if (hour < 0 || hour >= 24) continue;
    grid[dayRow][hour] += c.units_produced;
  }
  return grid;
}
