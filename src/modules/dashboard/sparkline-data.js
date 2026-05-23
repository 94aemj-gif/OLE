// @ts-check
/**
 * Bucketize captures into the last N hours relative to `now`. Returns
 * a fixed-length array (oldest → newest) of unit totals per hour.
 *
 * @param {Array<{hour_bucket:string, units_produced:number, undone?:boolean}>} captures
 * @param {Date} now
 * @param {number} hours
 */
export function rolling(captures, now, hours = 8) {
  const buckets = new Array(hours).fill(0);
  const nowMs = now.getTime();
  const hourMs = 60 * 60 * 1000;
  for (const c of captures) {
    if (c.undone) continue;
    const t = Date.parse(c.hour_bucket);
    const ageHours = Math.floor((nowMs - t) / hourMs);
    if (ageHours < 0 || ageHours >= hours) continue;
    buckets[hours - 1 - ageHours] += c.units_produced;
  }
  return buckets;
}
