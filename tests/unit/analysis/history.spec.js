import { describe, it, expect } from 'vitest';
import {
  windowTotals,
  compareWindows,
  trendBySku,
  downtimePareto
} from '@/modules/analysis/history.js';

const cap = (day, hour, product_id, good, scrap = 0, downtime = []) => ({
  hour_bucket: `2026-05-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00Z`,
  shift_id: 'S-MORNING',
  product_id,
  units_produced: good,
  scrap_rows: scrap ? [{ pieces: scrap }] : [],
  downtime_rows: downtime
});

const products = [
  { id: 'A', name: 'Neo 60', standard_target_per_hour: 250 },
  { id: 'B', name: 'Neo 35', standard_target_per_hour: 300 }
];
const shifts = [{ id: 'S-MORNING', breaks: [{ start: '10:00', end: '10:30' }] }];

describe('windowTotals', () => {
  it('sums good/scrap/downtime and computes break-adjusted target', () => {
    const caps = [cap(22, 6, 'A', 240, 5, [{ reason_id: 'DR-05', minutes: 12 }]), cap(22, 7, 'A', 250)];
    const t = windowTotals(caps, {
      productsById: new Map(products.map((p) => [p.id, p])),
      shiftsById: new Map(shifts.map((s) => [s.id, s])),
      timezone: 'UTC'
    });
    expect(t.good).toBe(490);
    expect(t.scrap).toBe(5);
    expect(t.downtime).toBe(12);
    expect(t.target).toBe(500); // 2 full hours × 250
    expect(t.efficiency).toBe(98);
  });

  it('excludes undone captures', () => {
    const caps = [cap(22, 6, 'A', 100), { ...cap(22, 7, 'A', 999), undone: true }];
    expect(windowTotals(caps).good).toBe(100);
  });
});

describe('compareWindows (shift/day/week side by side)', () => {
  it('returns one labeled row per window', () => {
    const rows = compareWindows(
      [
        { label: 'Lun', captures: [cap(22, 6, 'A', 240)] },
        { label: 'Mar', captures: [cap(23, 6, 'A', 250)] }
      ],
      { products, shifts, timezone: 'UTC' }
    );
    expect(rows.map((r) => r.label)).toEqual(['Lun', 'Mar']);
    expect(rows[0].good).toBe(240);
    expect(rows[1].good).toBe(250);
    expect(rows[1].efficiency).toBe(100);
  });
});

describe('trendBySku', () => {
  it('builds a per-SKU daily series', () => {
    const caps = [cap(22, 6, 'A', 100), cap(22, 7, 'A', 50), cap(23, 6, 'A', 80), cap(22, 6, 'B', 200)];
    const trend = trendBySku(caps, { products });
    const a = trend.find((t) => t.product_id === 'A');
    expect(a.product_name).toBe('Neo 60');
    expect(a.series).toEqual([
      { bucket: '2026-05-22', good: 150 },
      { bucket: '2026-05-23', good: 80 }
    ]);
    expect(trend.find((t) => t.product_id === 'B').series[0].good).toBe(200);
  });
});

describe('downtimePareto', () => {
  it('ranks reasons by minutes with cumulative share', () => {
    const caps = [
      cap(22, 6, 'A', 0, 0, [{ reason_id: 'DR-05', minutes: 30 }]),
      cap(22, 7, 'A', 0, 0, [{ reason_id: 'DR-01', minutes: 10 }]),
      cap(22, 8, 'A', 0, 0, [{ reason_id: 'DR-05', minutes: 20 }])
    ];
    const reasons = [
      { id: 'DR-05', name: 'Falla mecánica' },
      { id: 'DR-01', name: 'Junta' }
    ];
    const pareto = downtimePareto(caps, reasons);
    expect(pareto[0]).toMatchObject({ reason_id: 'DR-05', name: 'Falla mecánica', minutes: 50 });
    expect(pareto[0].pct).toBeCloseTo(83.33, 1);
    expect(pareto[1].cumPct).toBe(100);
  });

  it('returns empty when there is no downtime', () => {
    expect(downtimePareto([cap(22, 6, 'A', 100)])).toEqual([]);
  });
});
