import { describe, it, expect } from 'vitest';
import { unitsByHour, cumulative, scrapByHour, heatmap } from '@/modules/kpi/buckets.js';

const DAY = '2026-05-22T00:00:00.000Z';

const captures = [
  { hour_bucket: '2026-05-22T06:00:00.000Z', units_produced: 200, scrap_rows: [{ pieces: 2 }] },
  { hour_bucket: '2026-05-22T07:00:00.000Z', units_produced: 240, scrap_rows: [{ pieces: 1 }] },
  { hour_bucket: '2026-05-22T07:00:00.000Z', units_produced: 100, scrap_rows: [{ pieces: 0 }] },
  {
    hour_bucket: '2026-05-22T08:00:00.000Z',
    units_produced: 999,
    scrap_rows: [{ pieces: 99 }],
    undone: true
  }
];

describe('unitsByHour', () => {
  it('bucketizes 24 hours; sums duplicates; skips undone', () => {
    const r = unitsByHour(captures, DAY);
    expect(r.length).toBe(24);
    expect(r[6]).toBe(200);
    expect(r[7]).toBe(340);
    expect(r[8]).toBe(0); // undone excluded
  });

  it('skips captures outside the day window', () => {
    const r = unitsByHour([{ hour_bucket: '2026-05-21T20:00:00Z', units_produced: 1 }], DAY);
    expect(r.reduce((a, v) => a + v, 0)).toBe(0);
  });
});

describe('cumulative', () => {
  it('returns prefix sums', () => {
    expect(cumulative([1, 2, 3, 4])).toEqual([1, 3, 6, 10]);
  });
});

describe('scrapByHour', () => {
  it('sums scrap pieces per hour and skips undone', () => {
    const r = scrapByHour(captures, DAY);
    expect(r[6]).toBe(2);
    expect(r[7]).toBe(1);
    expect(r[8]).toBe(0);
  });
});

describe('heatmap', () => {
  it('returns 14×24 grid with newest day on the bottom', () => {
    const g = heatmap(captures, DAY, 14);
    expect(g.length).toBe(14);
    expect(g[13].length).toBe(24);
    expect(g[13][6]).toBe(200);
  });
});
