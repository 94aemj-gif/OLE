import { describe, it, expect } from 'vitest';
import { rolling } from '@/modules/dashboard/sparkline-data.js';

describe('rolling 8h bucketization', () => {
  it('returns 8 buckets with newest on the right', () => {
    const now = new Date('2026-05-22T14:30:00Z');
    const captures = [
      { hour_bucket: '2026-05-22T14:00:00Z', units_produced: 240 },
      { hour_bucket: '2026-05-22T13:00:00Z', units_produced: 200 },
      { hour_bucket: '2026-05-22T07:00:00Z', units_produced: 150 }
    ];
    const r = rolling(captures, now, 8);
    expect(r.length).toBe(8);
    expect(r[7]).toBe(240);
    expect(r[6]).toBe(200);
    expect(r[0]).toBe(150);
  });

  it('skips captures older than window', () => {
    const now = new Date('2026-05-22T14:30:00Z');
    const captures = [
      { hour_bucket: '2026-05-22T05:00:00Z', units_produced: 999 } // 9.5h ago
    ];
    expect(rolling(captures, now, 8)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('skips undone captures', () => {
    const now = new Date('2026-05-22T14:30:00Z');
    const captures = [{ hour_bucket: '2026-05-22T14:00:00Z', units_produced: 240, undone: true }];
    expect(rolling(captures, now, 8).reduce((a, v) => a + v, 0)).toBe(0);
  });
});
