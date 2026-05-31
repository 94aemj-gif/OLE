import { describe, it, expect } from 'vitest';
import {
  slotProductiveMinutes,
  calculatedTarget,
  hourSlotTarget,
  efficiencyPct
} from '@/modules/kpi/target.js';

describe('slotProductiveMinutes', () => {
  it('full hour with no breaks = 60', () => {
    expect(slotProductiveMinutes('07:00', [])).toBe(60);
  });

  it('subtracts a 30-minute break that overlaps the slot', () => {
    // slot 10:00–11:00, break 10:00–10:30 → 30 productive
    expect(slotProductiveMinutes('10:00', [{ start: '10:00', end: '10:30' }])).toBe(30);
  });

  it('ignores breaks outside the slot', () => {
    expect(slotProductiveMinutes('07:00', [{ start: '10:00', end: '10:30' }])).toBe(60);
  });

  it('clamps to 0 when fully covered', () => {
    expect(slotProductiveMinutes('10:00', [{ start: '09:30', end: '11:30' }])).toBe(0);
  });
});

describe('calculatedTarget (PRD §6 + Acceptance #1)', () => {
  it('30 productive minutes and 1000 pcs/h SKU → 500', () => {
    expect(calculatedTarget(1000, 30)).toBe(500);
  });

  it('full hour returns the standard target', () => {
    expect(calculatedTarget(250, 60)).toBe(250);
  });

  it('rounds to nearest piece', () => {
    expect(calculatedTarget(250, 30)).toBe(125);
    expect(calculatedTarget(255, 30)).toBe(128); // 127.5 → 128
  });
});

describe('hourSlotTarget', () => {
  it('applies break reduction to the SKU target', () => {
    const product = { standard_target_per_hour: 1000 };
    expect(hourSlotTarget(product, '10:00', [{ start: '10:00', end: '10:30' }])).toBe(500);
  });
});

describe('efficiencyPct (Acceptance #2)', () => {
  it('480 good against a 500 target = 96%', () => {
    expect(efficiencyPct(480, 500)).toBe(96);
  });

  it('returns null when target is 0', () => {
    expect(efficiencyPct(100, 0)).toBeNull();
  });
});
