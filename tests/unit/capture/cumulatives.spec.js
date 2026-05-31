import { describe, it, expect } from 'vitest';
import { computeCumulatives } from '@/modules/capture/cumulatives.js';

const cap = (line, shiftId, hour, good, extra = {}) => ({
  line_id: line,
  shift_id: shiftId,
  hour_bucket: `2026-05-22T${String(hour).padStart(2, '0')}:00:00Z`,
  product_id: 'A',
  units_produced: good,
  scrap_rows: [],
  downtime_rows: [],
  ...extra
});

const products = [{ id: 'A', name: 'A', standard_target_per_hour: 250 }];
const shifts = [
  { id: 'S1', breaks: [] },
  { id: 'S2', breaks: [] }
];

const base = {
  lineId: 'L-01',
  shiftId: 'S1',
  dayStartIso: '2026-05-22T00:00:00Z',
  dayEndIso: '2026-05-23T00:00:00Z',
  productsById: new Map(products.map((p) => [p.id, p])),
  shiftsById: new Map(shifts.map((s) => [s.id, s])),
  timezone: 'UTC'
};

describe('computeCumulatives (Acceptance #5)', () => {
  it('reports shift and day cumulatives, each with delta vs target', () => {
    const captures = [
      cap('L-01', 'S1', 6, 240), // shift 1
      cap('L-01', 'S1', 7, 250), // shift 1
      cap('L-01', 'S2', 14, 300) // later shift, same day + line
    ];
    const r = computeCumulatives({ ...base, captures });

    // Shift S1: good 490 vs target 500 (2 full hours × 250)
    expect(r.shift.actual).toBe(490);
    expect(r.shift.target).toBe(500);
    expect(r.shift.delta).toBe(-10);

    // Day: all three hours = 790 good vs 750 target (3 × 250)
    expect(r.day.actual).toBe(790);
    expect(r.day.target).toBe(750);
    expect(r.day.delta).toBe(40);
  });

  it('ignores other lines, other days, and undone captures', () => {
    const captures = [
      cap('L-01', 'S1', 6, 100),
      cap('L-02', 'S1', 6, 999), // other line
      cap('L-01', 'S1', 7, 999, { undone: true }), // undone
      cap('L-01', 'S1', 6, 50, { hour_bucket: '2026-05-21T06:00:00Z' }) // prior day
    ];
    const r = computeCumulatives({ ...base, captures });
    expect(r.day.actual).toBe(100);
    expect(r.shift.actual).toBe(100);
  });
});
