import { describe, it, expect } from 'vitest';
import { buildCapturePayload, stableStringify } from '@/modules/capture/payload.js';

describe('buildCapturePayload', () => {
  it('builds a payload with deterministic hash regardless of input key order', async () => {
    const a = await buildCapturePayload({
      line_id: 'L-01',
      employee_number: '12345',
      client_timestamp: '2026-05-22T14:00:00.000Z',
      shift_id: 'M',
      hour_bucket: '2026-05-22T14:00:00.000Z',
      units_produced: 240,
      scrap_rows: [{ reason_id: 'SR-01', pieces: 3 }],
      downtime_rows: [{ reason_id: 'DR-01', minutes: 5 }],
      client_id: 't-1'
    });
    const b = await buildCapturePayload({
      // same fields, shuffled
      client_id: 't-1',
      downtime_rows: [{ reason_id: 'DR-01', minutes: 5 }],
      scrap_rows: [{ reason_id: 'SR-01', pieces: 3 }],
      units_produced: 240,
      hour_bucket: '2026-05-22T14:00:00.000Z',
      shift_id: 'M',
      client_timestamp: '2026-05-22T14:00:00.000Z',
      employee_number: '12345',
      line_id: 'L-01'
    });
    expect(a.payload_hash).toBe(b.payload_hash);
    expect(a.payload_hash).toHaveLength(64);
  });

  it('normalizes scrap/downtime row notes to null', async () => {
    const p = await buildCapturePayload({
      line_id: 'L-01',
      employee_number: '12345',
      client_timestamp: '2026-05-22T14:00:00.000Z',
      shift_id: 'M',
      hour_bucket: '2026-05-22T14:00:00.000Z',
      units_produced: 240,
      scrap_rows: [{ reason_id: 'SR-01', pieces: 3 }],
      downtime_rows: [],
      client_id: 't-1'
    });
    expect(p.scrap_rows[0].note).toBeNull();
  });

  it('stableStringify orders object keys', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(stableStringify([{ b: 1, a: 2 }, 'x'])).toBe('[{"a":2,"b":1},"x"]');
  });
});
