import { describe, it, expect } from 'vitest';
import { evaluateRow, countDeadLetter24h, localVsServerDelta } from '@/modules/health/metrics.js';

const THRESHOLDS = { heartbeat_max_age_seconds: 300, queue_depth_max: 50, delta_max: 0 };
const NOW = new Date('2026-05-22T14:00:00Z');

describe('evaluateRow', () => {
  it('flags heartbeatStale when older than threshold', () => {
    const r = evaluateRow(
      {
        last_heartbeat: '2026-05-22T13:50:00Z',
        push_queue_depth: 0,
        dead_letter_24h: 0,
        local_vs_server_delta: 0
      },
      THRESHOLDS,
      NOW
    );
    expect(r.heartbeatStale).toBe(true);
    expect(r.queueHigh).toBe(false);
    expect(r.deadLetterPresent).toBe(false);
    expect(r.deltaHigh).toBe(false);
  });

  it('flags queueHigh and deadLetterPresent and deltaHigh', () => {
    const r = evaluateRow(
      {
        last_heartbeat: '2026-05-22T13:59:00Z',
        push_queue_depth: 100,
        dead_letter_24h: 3,
        local_vs_server_delta: 5
      },
      THRESHOLDS,
      NOW
    );
    expect(r.queueHigh).toBe(true);
    expect(r.deadLetterPresent).toBe(true);
    expect(r.deltaHigh).toBe(true);
  });
});

describe('countDeadLetter24h', () => {
  it('counts only rows in the last 24h', () => {
    const rows = [
      { client_timestamp: '2026-05-22T13:00:00Z' }, // 1h ago — in
      { client_timestamp: '2026-05-21T13:59:59Z' }, // 24h+1s ago — out
      { client_timestamp: '2026-05-21T15:00:00Z' } // 23h ago — in
    ];
    expect(countDeadLetter24h(rows, NOW)).toBe(2);
  });
});

describe('localVsServerDelta', () => {
  it('returns absolute difference', () => {
    expect(localVsServerDelta(10, 7)).toBe(3);
    expect(localVsServerDelta(0, 5)).toBe(5);
    expect(localVsServerDelta(5, 5)).toBe(0);
  });
});
