import { describe, it, expect } from 'vitest';
import { deriveRuns, summarizeRuns } from '@/modules/capture/runs.js';

// Hours 1–4 ran SKU-A, hours 5–6 ran SKU-B (PRD Acceptance #4).
const cap = (hour, product_id, units, scrap = 0, extra = {}) => ({
  hour_bucket: `2026-05-22T${String(hour).padStart(2, '0')}:00:00Z`,
  product_id,
  units_produced: units,
  scrap_rows: scrap ? [{ pieces: scrap }] : [],
  downtime_rows: [],
  ...extra
});

const captures = [
  cap(6, 'SKU-A', 240),
  cap(7, 'SKU-A', 250),
  cap(8, 'SKU-A', 230),
  cap(9, 'SKU-A', 245),
  cap(10, 'SKU-B', 280),
  cap(11, 'SKU-B', 300)
];

const products = [
  { id: 'SKU-A', name: 'Neo 60', standard_target_per_hour: 250 },
  { id: 'SKU-B', name: 'Neo 35', standard_target_per_hour: 300 }
];

describe('deriveRuns (Acceptance #4)', () => {
  it('splits into one run per contiguous SKU', () => {
    const runs = deriveRuns(captures);
    expect(runs).toHaveLength(2);
    expect(runs[0].product_id).toBe('SKU-A');
    expect(runs[0].captures).toHaveLength(4);
    expect(runs[1].product_id).toBe('SKU-B');
    expect(runs[1].captures).toHaveLength(2);
  });

  it('a SKU returning after another SKU is a new run (contiguity, not grouping)', () => {
    const ab_a = [cap(6, 'A', 10), cap(7, 'B', 10), cap(8, 'A', 10)];
    const runs = deriveRuns(ab_a);
    expect(runs.map((r) => r.product_id)).toEqual(['A', 'B', 'A']);
  });

  it('ignores undone captures and orders by hour', () => {
    const messy = [cap(8, 'A', 10), cap(6, 'A', 10), cap(7, 'A', 999, 0, { undone: true })];
    const runs = deriveRuns(messy);
    expect(runs).toHaveLength(1);
    expect(runs[0].captures).toHaveLength(2);
    expect(runs[0].start_hour).toContain('06:00');
  });
});

describe('summarizeRuns', () => {
  it('aggregates good/scrap per run and names the SKU', () => {
    const rows = summarizeRuns({ captures, products });
    expect(rows).toHaveLength(2);
    expect(rows[0].product_name).toBe('Neo 60');
    expect(rows[0].good).toBe(965); // 240+250+230+245
    expect(rows[0].hours).toBe(4);
    expect(rows[1].product_name).toBe('Neo 35');
    expect(rows[1].good).toBe(580); // 280+300
  });

  it('computes break-adjusted target + efficiency when shift+tz given', () => {
    const shift = { breaks: [{ start: '10:00', end: '10:30' }] };
    const rows = summarizeRuns({ captures, products, shift, timezone: 'UTC' });
    // SKU-A ran full hours 6–9 → 4 × 250 = 1000
    expect(rows[0].target).toBe(1000);
    // SKU-B hour 10 has a 30-min break (150) + full hour 11 (300) = 450
    expect(rows[1].target).toBe(450);
    expect(rows[0].efficiency).toBeCloseTo((965 / 1000) * 100, 5);
  });
});
