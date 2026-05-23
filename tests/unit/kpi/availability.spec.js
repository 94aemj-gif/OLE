import { describe, it, expect } from 'vitest';
import { availability } from '@/modules/kpi/availability.js';

describe('availability', () => {
  it('is run_time / planned_time', () => {
    expect(availability({ plannedMinutes: 480, downtimeMinutes: 60 })).toBeCloseTo(420 / 480);
  });

  it('returns 0 when planned is 0', () => {
    expect(availability({ plannedMinutes: 0, downtimeMinutes: 0 })).toBe(0);
  });

  it('clamps negative downtime to 0', () => {
    expect(availability({ plannedMinutes: 480, downtimeMinutes: -30 })).toBe(1);
  });

  it('clamps downtime exceeding planned to 0 run', () => {
    expect(availability({ plannedMinutes: 480, downtimeMinutes: 600 })).toBe(0);
  });
});
