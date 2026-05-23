import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleEventLocally } from '@/modules/reset/apply.js';
import { applyEventsOnce } from '@/modules/sync/events.js';
import { localStore } from '@/modules/storage/local-store.js';

beforeEach(() => globalThis.localStorage.clear());

describe('handleEventLocally', () => {
  it('wipes shift state on day_reset', () => {
    localStore.set('shift_state', { count: 500 });
    handleEventLocally({ id: 'ev-1', kind: 'day_reset' });
    expect(localStore.get('shift_state')).toBeNull();
  });

  it('is a no-op for unrelated events', () => {
    localStore.set('shift_state', { count: 500 });
    handleEventLocally({ id: 'ev-1', kind: 'unrelated' });
    expect(localStore.get('shift_state')).toEqual({ count: 500 });
  });
});

describe('idempotent application via sync.events', () => {
  it('does not wipe twice when the same event is pulled again', async () => {
    localStore.set('shift_state', { count: 500 });
    const apply = vi.fn((ev) => handleEventLocally(ev));
    const client = {
      listEvents: vi.fn(async () => ({
        status: 200,
        body: [{ id: 'ev-1', kind: 'day_reset', issued_at: '2026-05-22T11:00:00Z', payload: {} }]
      }))
    };
    await applyEventsOnce(client, apply);
    expect(apply).toHaveBeenCalledTimes(1);
    // Restore state and re-pull — same event must NOT re-apply
    localStore.set('shift_state', { count: 200 });
    await applyEventsOnce(client, apply);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(localStore.get('shift_state')).toEqual({ count: 200 });
  });
});
