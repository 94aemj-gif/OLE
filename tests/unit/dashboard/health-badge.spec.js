import { describe, it, expect } from 'vitest';
import { shouldShowBadge } from '@/modules/dashboard/health-badge.js';

const THRESHOLDS = { heartbeat_max_age_seconds: 300, queue_depth_max: 50, delta_max: 0 };
const now = new Date('2026-05-22T14:00:00Z');

describe('health badge visibility', () => {
  it('hidden when all tablets are healthy', () => {
    const rows = [
      {
        last_heartbeat: '2026-05-22T13:59:30Z',
        push_queue_depth: 0,
        dead_letter_24h: 0,
        local_vs_server_delta: 0
      }
    ];
    expect(shouldShowBadge(rows, THRESHOLDS, now)).toBe(false);
  });

  it('shows when a tablet heartbeat is older than threshold', () => {
    const rows = [
      {
        last_heartbeat: '2026-05-22T13:50:00Z',
        push_queue_depth: 0,
        dead_letter_24h: 0,
        local_vs_server_delta: 0
      }
    ];
    expect(shouldShowBadge(rows, THRESHOLDS, now)).toBe(true);
  });

  it('shows when queue depth exceeds threshold', () => {
    const rows = [
      {
        last_heartbeat: '2026-05-22T13:59:30Z',
        push_queue_depth: 100,
        dead_letter_24h: 0,
        local_vs_server_delta: 0
      }
    ];
    expect(shouldShowBadge(rows, THRESHOLDS, now)).toBe(true);
  });

  it('shows when any dead-letter exists', () => {
    const rows = [
      {
        last_heartbeat: '2026-05-22T13:59:30Z',
        push_queue_depth: 0,
        dead_letter_24h: 1,
        local_vs_server_delta: 0
      }
    ];
    expect(shouldShowBadge(rows, THRESHOLDS, now)).toBe(true);
  });

  it('shows when local-vs-server delta exceeds threshold', () => {
    const rows = [
      {
        last_heartbeat: '2026-05-22T13:59:30Z',
        push_queue_depth: 0,
        dead_letter_24h: 0,
        local_vs_server_delta: 5
      }
    ];
    expect(shouldShowBadge(rows, THRESHOLDS, now)).toBe(true);
  });
});
