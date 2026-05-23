import { describe, it, expect } from 'vitest';
import { computeSummary } from '@/modules/dashboard/summary.js';

describe('computeSummary', () => {
  it('sums totals across lines', () => {
    const s = computeSummary([
      { line_id: 'L-01', count: 240, scrap: 5, pace: 80 },
      { line_id: 'L-02', count: 300, scrap: 2, pace: 95 }
    ]);
    expect(s.totalProduction).toBe(540);
    expect(s.totalScrap).toBe(7);
    expect(s.linesActive).toBe(2);
    expect(s.linesTotal).toBe(2);
    expect(s.avgPace).toBeCloseTo(87.5, 1);
  });

  it('counts only active lines (count > 0)', () => {
    const s = computeSummary([
      { line_id: 'L-01', count: 240, scrap: 0, pace: 80 },
      { line_id: 'L-02', count: 0, scrap: 0, pace: 0 }
    ]);
    expect(s.linesActive).toBe(1);
    expect(s.linesTotal).toBe(2);
  });

  it('returns zeros for empty input', () => {
    const s = computeSummary([]);
    expect(s).toEqual({
      totalProduction: 0,
      totalScrap: 0,
      linesActive: 0,
      linesTotal: 0,
      avgPace: 0
    });
  });
});
