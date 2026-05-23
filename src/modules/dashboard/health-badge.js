// @ts-check
/**
 * Decide whether the plant-wide health badge should show, given a tablet_health table
 * snapshot and the configured thresholds.
 *
 * @param {Array<{last_heartbeat:string, push_queue_depth:number, dead_letter_24h:number, local_vs_server_delta:number}>} rows
 * @param {{heartbeat_max_age_seconds:number, queue_depth_max:number, delta_max:number}} thresholds
 * @param {Date} now
 */
export function shouldShowBadge(rows, thresholds, now) {
  const nowMs = now.getTime();
  return rows.some((r) => {
    const ageSec = (nowMs - Date.parse(r.last_heartbeat)) / 1000;
    return (
      ageSec > thresholds.heartbeat_max_age_seconds ||
      r.push_queue_depth > thresholds.queue_depth_max ||
      r.dead_letter_24h > 0 ||
      r.local_vs_server_delta > thresholds.delta_max
    );
  });
}
