// @ts-check
import { hourBucket } from '../time/plant-day.js';

/**
 * @param {Object} input
 */
export async function buildCapturePayload(input) {
  const canonical = {
    line_id: input.line_id,
    operator_number: input.employee_number,
    client_timestamp: input.client_timestamp ?? new Date().toISOString(),
    shift_id: input.shift_id,
    hour_bucket:
      input.hour_bucket ??
      hourBucket(new Date(input.client_timestamp ?? Date.now()), input.timezone),
    units_produced: Number(input.units_produced),
    scrap_rows: (input.scrap_rows ?? []).map((r) => ({
      reason_id: r.reason_id,
      pieces: Number(r.pieces),
      note: r.note ?? null
    })),
    downtime_rows: (input.downtime_rows ?? []).map((r) => ({
      reason_id: r.reason_id,
      minutes: Number(r.minutes),
      note: r.note ?? null
    })),
    client_id: input.client_id
  };
  const hash = await sha256Hex(stableStringify(canonical));
  return { ...canonical, payload_hash: hash };
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export { stableStringify, sha256Hex };
