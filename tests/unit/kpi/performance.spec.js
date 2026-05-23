import { describe, it, expect } from 'vitest';
import { performance } from '@/modules/kpi/performance.js';

describe('performance', () => {
  it('is actual / theoretical (below cap)', () => {
    // theoretical = 250 * 7 = 1750; actual = 1400 → 0.8
    const p = performance({ actualOutput: 1400, hourlyTarget: 250, runMinutes: 420 });
    expect(p).toBeCloseTo(0.8, 3);
  });

  it('caps at 1.0 (OEE convention)', () => {
    const p = performance({ actualOutput: 3000, hourlyTarget: 250, runMinutes: 60 });
    expect(p).toBe(1);
  });

  it('is 0 when theoretical is 0', () => {
    expect(performance({ actualOutput: 100, hourlyTarget: 0, runMinutes: 60 })).toBe(0);
    expect(performance({ actualOutput: 100, hourlyTarget: 250, runMinutes: 0 })).toBe(0);
  });
});
