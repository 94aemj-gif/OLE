import { describe, it, expect } from 'vitest';
import { isMiss, needsCause } from '@/modules/capture/miss.js';

describe('isMiss', () => {
  it('good below target is a miss', () => {
    expect(isMiss(480, 500)).toBe(true);
  });
  it('good at or above target is not a miss', () => {
    expect(isMiss(500, 500)).toBe(false);
    expect(isMiss(510, 500)).toBe(false);
  });
  it('unknown target (0) is never a miss', () => {
    expect(isMiss(0, 0)).toBe(false);
  });
});

describe('needsCause (Acceptance #3)', () => {
  it('blocks a miss with no downtime cause', () => {
    expect(needsCause(480, 500, [])).toBe(true);
  });
  it('allows a miss once a downtime cause is present', () => {
    expect(needsCause(480, 500, [{ reason_id: 'DR-05', minutes: 12 }])).toBe(false);
  });
  it('a downtime row with 0 minutes does not count as a cause', () => {
    expect(needsCause(480, 500, [{ reason_id: 'DR-05', minutes: 0 }])).toBe(true);
  });
  it('does not block when target is met', () => {
    expect(needsCause(500, 500, [])).toBe(false);
  });
});
