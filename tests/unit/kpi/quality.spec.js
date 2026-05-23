import { describe, it, expect } from 'vitest';
import { quality } from '@/modules/kpi/quality.js';

describe('quality', () => {
  it('is good / actual', () => {
    expect(quality({ actualOutput: 1000, scrapUnits: 50 })).toBe(0.95);
  });

  it('returns 1 when actual is 0 (denominator guard)', () => {
    expect(quality({ actualOutput: 0, scrapUnits: 0 })).toBe(1);
  });

  it('clamps scrap > actual to 0 good', () => {
    expect(quality({ actualOutput: 100, scrapUnits: 200 })).toBe(0);
  });

  it('clamps negative scrap to 0', () => {
    expect(quality({ actualOutput: 100, scrapUnits: -10 })).toBe(1);
  });
});
