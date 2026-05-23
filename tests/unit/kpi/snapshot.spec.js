import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildSnapshot, snapshotCached, _internals } from '@/modules/kpi/snapshot.js';
import { localStore } from '@/modules/storage/local-store.js';

const SHIFT = {
  id: 'M',
  start: '06:00',
  end: '14:00',
  breaks: [{ start: '10:00', end: '10:30' }]
};

const captures = [
  {
    hour_bucket: '2026-05-22T12:00:00Z',
    units_produced: 240,
    scrap_rows: [{ pieces: 5 }],
    downtime_rows: [{ minutes: 15 }]
  },
  {
    hour_bucket: '2026-05-22T13:00:00Z',
    units_produced: 230,
    scrap_rows: [{ pieces: 3 }],
    downtime_rows: []
  },
  {
    hour_bucket: '2026-05-22T14:00:00Z',
    units_produced: 999,
    scrap_rows: [],
    downtime_rows: [{ minutes: 30 }],
    undone: true
  }
];

describe('buildSnapshot', () => {
  it('aggregates units, scrap, downtime and computes KPIs', () => {
    const s = buildSnapshot({ captures, shift: SHIFT, hourlyTarget: 250 });
    expect(s.unitsProduced).toBe(470);
    expect(s.scrapUnits).toBe(8);
    expect(s.downtimeMinutes).toBe(15);
    expect(s.plannedMinutes).toBe(450); // 480 - 30 break
    expect(s.goodUnits).toBe(462);
    expect(s.oee).toBeGreaterThan(0);
    expect(s.oee).toBeLessThanOrEqual(1);
  });

  it('excludes undone captures from totals', () => {
    const s = buildSnapshot({ captures, shift: SHIFT, hourlyTarget: 250 });
    expect(s.unitsProduced).not.toContain(999);
    expect(s.unitsProduced).toBe(470);
  });
});

describe('snapshotCached', () => {
  beforeEach(() => globalThis.localStorage.clear());

  it('caches the computation for the TTL window', () => {
    let calls = 0;
    const compute = vi.fn(() => {
      calls += 1;
      return { unitsProduced: calls };
    });
    const t = 1_000_000;
    const a = snapshotCached('k', compute, () => t);
    const b = snapshotCached('k', compute, () => t + _internals.CACHE_TTL_MS - 1);
    expect(a).toEqual(b);
    expect(compute).toHaveBeenCalledOnce();
  });

  it('recomputes after TTL expires', () => {
    let calls = 0;
    const compute = vi.fn(() => {
      calls += 1;
      return { unitsProduced: calls };
    });
    const t = 1_000_000;
    snapshotCached('k', compute, () => t);
    snapshotCached('k', compute, () => t + _internals.CACHE_TTL_MS + 1);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  void localStore; // keep import used
});
