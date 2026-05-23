import { describe, it, expect } from 'vitest';
import { oee } from '@/modules/kpi/oee.js';

describe('OEE composition', () => {
  it('matches the spec sample (US3 acceptance #1)', () => {
    // Planned 480 min, downtime 60 min, target 250/hr, units 1800, scrap 50
    // Availability = 420 / 480 = 0.875
    // run = 420 min → theoretical = 250 * 7 = 1750 → capped at 1.0
    // Quality = (1800 - 50) / 1800 ≈ 0.9722
    // OEE = 0.875 * 1.0 * 0.9722 ≈ 0.8507
    const k = oee({
      plannedMinutes: 480,
      downtimeMinutes: 60,
      hourlyTarget: 250,
      actualOutput: 1800,
      scrapUnits: 50
    });
    expect(k.availability).toBeCloseTo(0.875, 3);
    expect(k.performance).toBe(1);
    expect(k.quality).toBeCloseTo(1750 / 1800, 3);
    expect(k.oee).toBeCloseTo(0.875 * (1750 / 1800), 3);
  });

  it('handles a fully-down shift (all downtime)', () => {
    const k = oee({
      plannedMinutes: 480,
      downtimeMinutes: 480,
      hourlyTarget: 250,
      actualOutput: 0,
      scrapUnits: 0
    });
    expect(k.availability).toBe(0);
    expect(k.performance).toBe(0);
    expect(k.quality).toBe(1);
    expect(k.oee).toBe(0);
  });

  it('handles 100% performance / 100% quality / 100% availability', () => {
    const k = oee({
      plannedMinutes: 60,
      downtimeMinutes: 0,
      hourlyTarget: 100,
      actualOutput: 100,
      scrapUnits: 0
    });
    expect(k.oee).toBe(1);
  });
});
