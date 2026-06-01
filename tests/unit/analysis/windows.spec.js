import { describe, it, expect } from 'vitest';
import { buildWindows, isoWeekKey } from '@/modules/analysis/windows.js';

const cap = (date, shift, good = 10) => ({
  hour_bucket: `${date}T08:00:00Z`,
  shift_id: shift,
  units_produced: good
});

describe('isoWeekKey', () => {
  it('computes the ISO week', () => {
    expect(isoWeekKey('2026-05-22')).toBe('2026-W21');
    expect(isoWeekKey('2026-01-01')).toBe('2026-W01');
  });
});

describe('buildWindows', () => {
  const caps = [
    cap('2026-05-22', 'S-MORNING'),
    cap('2026-05-22', 'S-EVENING'),
    cap('2026-05-23', 'S-MORNING'),
    { ...cap('2026-05-23', 'S-MORNING', 999), undone: true }
  ];

  it('groups by civil day, oldest→newest', () => {
    const w = buildWindows(caps, 'day');
    expect(w.map((x) => x.label)).toEqual(['2026-05-22', '2026-05-23']);
    expect(w[0].captures).toHaveLength(2);
  });

  it('groups by shift instance', () => {
    const w = buildWindows(caps, 'shift');
    expect(w.map((x) => x.label)).toEqual([
      '2026-05-22 · S-MORNING',
      '2026-05-22 · S-EVENING',
      '2026-05-23 · S-MORNING'
    ]);
  });

  it('groups by ISO week', () => {
    const w = buildWindows(caps, 'week');
    expect(w).toHaveLength(1);
    expect(w[0].label).toBe('2026-W21');
  });

  it('caps to the most recent N windows', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      cap(`2026-05-${String(i + 1).padStart(2, '0')}`, 'S-MORNING')
    );
    const w = buildWindows(many, 'day', { limit: 5 });
    expect(w).toHaveLength(5);
    expect(w[w.length - 1].label).toBe('2026-05-12');
  });
});
