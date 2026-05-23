import { describe, it, expect } from 'vitest';
import { findActiveShift, plannedMinutes, hoursElapsedInShift } from '@/modules/time/shift.js';
import { plantDayRange, hourBucket } from '@/modules/time/plant-day.js';

const TZ = 'America/Mexico_City';

const SHIFTS = [
  { id: 'M', start: '06:00', end: '14:00', breaks: [{ start: '10:00', end: '10:30' }] },
  { id: 'E', start: '14:00', end: '22:00', breaks: [{ start: '18:00', end: '18:30' }] },
  { id: 'N', start: '22:00', end: '06:00', breaks: [{ start: '02:00', end: '02:30' }] }
];

describe('shift accounting', () => {
  it('finds active morning shift at plant-local 08:00', () => {
    // 08:00 America/Mexico_City = 14:00 UTC (CDT, UTC-6 → UTC-5 in DST; pick Jun for CST stable -6 → 14:00)
    const moment = new Date('2026-06-15T14:00:00Z');
    const s = findActiveShift(moment, SHIFTS, TZ);
    expect(s?.id).toBe('M');
  });

  it('finds overnight shift wrapping midnight', () => {
    const moment = new Date('2026-06-15T07:00:00Z'); // 01:00 local
    const s = findActiveShift(moment, SHIFTS, TZ);
    expect(s?.id).toBe('N');
  });

  it('plannedMinutes subtracts breaks', () => {
    expect(plannedMinutes(SHIFTS[0])).toBe(8 * 60 - 30);
    expect(plannedMinutes(SHIFTS[2])).toBe(8 * 60 - 30);
  });

  it('hoursElapsedInShift returns non-negative value', () => {
    const moment = new Date('2026-06-15T15:00:00Z'); // 09:00 local in morning shift
    expect(hoursElapsedInShift(moment, SHIFTS[0], TZ)).toBeCloseTo(3, 0);
  });

  it('plantDayRange returns 24h range', () => {
    const { startIso, endIso } = plantDayRange(new Date('2026-06-15T17:00:00Z'), TZ);
    const ms = Date.parse(endIso) - Date.parse(startIso);
    expect(ms).toBe(24 * 60 * 60 * 1000);
  });

  it('hourBucket truncates to plant-local top of hour', () => {
    const bucket = hourBucket(new Date('2026-06-15T14:37:21Z'), TZ);
    expect(bucket).toMatch(/T(14|13):00:00\.000Z$/);
  });
});
