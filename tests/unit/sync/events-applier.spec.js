import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyEventsOnce } from '@/modules/sync/events.js';

describe('events applier', () => {
  beforeEach(() => globalThis.localStorage.clear());

  it('applies a new day_reset event exactly once', async () => {
    const apply = vi.fn();
    const client = {
      listEvents: vi.fn(async () => ({
        status: 200,
        body: [{ id: 'ev-1', kind: 'day_reset', issued_at: '2026-05-22T11:00:00Z', payload: {} }]
      }))
    };
    await applyEventsOnce(client, apply);
    expect(apply).toHaveBeenCalledTimes(1);

    // Second pass with same payload — apply not re-invoked
    await applyEventsOnce(client, apply);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('advances watermark to the latest applied issued_at', async () => {
    const apply = vi.fn();
    const client = {
      listEvents: vi.fn(async () => ({
        status: 200,
        body: [
          { id: 'ev-1', kind: 'day_reset', issued_at: '2026-05-22T11:00:00Z', payload: {} },
          { id: 'ev-2', kind: 'day_reset', issued_at: '2026-05-22T12:00:00Z', payload: {} }
        ]
      }))
    };
    await applyEventsOnce(client, apply);
    expect(globalThis.localStorage.getItem('ole:sync:events_watermark')).toBe(
      '"2026-05-22T12:00:00Z"'
    );
  });

  it('ignores events already in applied set on first run', async () => {
    globalThis.localStorage.setItem('ole:sync:applied_events', '["ev-1"]');
    const apply = vi.fn();
    const client = {
      listEvents: vi.fn(async () => ({
        status: 200,
        body: [{ id: 'ev-1', kind: 'day_reset', issued_at: '2026-05-22T11:00:00Z', payload: {} }]
      }))
    };
    await applyEventsOnce(client, apply);
    expect(apply).not.toHaveBeenCalled();
  });
});
