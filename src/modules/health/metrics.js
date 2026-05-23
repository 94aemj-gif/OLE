// @ts-check
/**
 * Decide whether a single tablet_health row crosses any threshold.
 *
 * @param {{last_heartbeat:string, push_queue_depth:number, dead_letter_24h:number, local_vs_server_delta:number}} row
 * @param {{heartbeat_max_age_seconds:number, queue_depth_max:number, delta_max:number}} thresholds
 * @param {Date} now
 */
export function evaluateRow(row, thresholds, now) {
  const ageSec = (now.getTime() - Date.parse(row.last_heartbeat)) / 1000;
  return {
    heartbeatStale: ageSec > thresholds.heartbeat_max_age_seconds,
    queueHigh: row.push_queue_depth > thresholds.queue_depth_max,
    deadLetterPresent: row.dead_letter_24h > 0,
    deltaHigh: row.local_vs_server_delta > thresholds.delta_max
  };
}

/**
 * Count dead-letter rows landed in the last 24h.
 *
 * @param {Array<{client_timestamp:string}>} deadLetterRows
 * @param {Date} now
 */
export function countDeadLetter24h(deadLetterRows, now) {
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  return deadLetterRows.filter((r) => Date.parse(r.client_timestamp) >= cutoff).length;
}

/**
 * Absolute delta between local count and server-side count.
 *
 * @param {number} localCount
 * @param {number} serverCount
 */
export function localVsServerDelta(localCount, serverCount) {
  return Math.abs(localCount - serverCount);
}
