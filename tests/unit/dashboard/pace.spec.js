import { describe, it, expect } from 'vitest';
import { computePace } from '@/modules/dashboard/pace.js';

describe('computePace', () => {
  it('100% when actual matches target × hours', () => {
    const p = computePace({ actual: 500, targetPerHour: 250, hoursElapsed: 2 });
    expect(Math.round(p.percent)).toBe(100);
    expect(p.tier).toBe('ok');
  });

  it('blue at 95% pace', () => {
    const p = computePace({ actual: 475, targetPerHour: 250, hoursElapsed: 2 });
    expect(Math.round(p.percent)).toBe(95);
    expect(p.tier).toBe('warn');
  });

  it('amber at 80% pace', () => {
    const p = computePace({ actual: 400, targetPerHour: 250, hoursElapsed: 2 });
    expect(p.tier).toBe('alert');
  });

  it('red below 70%', () => {
    const p = computePace({ actual: 200, targetPerHour: 250, hoursElapsed: 2 });
    expect(p.tier).toBe('crit');
  });

  it('handles hoursElapsed near zero without dividing by zero', () => {
    const p = computePace({ actual: 0, targetPerHour: 250, hoursElapsed: 0 });
    expect(Number.isFinite(p.percent)).toBe(true);
    expect(p.tier).toBe('crit');
  });
});
