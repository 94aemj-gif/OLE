import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerDayReset, wipeLocalShift } from '@/modules/reset/sequence.js';
import { localStore } from '@/modules/storage/local-store.js';

const MANAGER = { id: 'mgr-1', display_name: 'Laura' };
const TZ = 'America/Mexico_City';
const NOW = new Date('2026-05-22T18:00:00Z');

function makeClient(overrides = {}) {
  return {
    deleteCapturesForDay: vi.fn(async () => ({ status: 204, body: null })),
    insertEvent: vi.fn(async () => ({ status: 201, body: [{ id: 'ev-1' }] })),
    insertAudit: vi.fn(async () => ({ status: 201, body: null })),
    ...overrides
  };
}

beforeEach(() => {
  globalThis.localStorage.clear();
  localStore.set('shift_state', { count: 1000 });
  localStore.set('recent_captures', [{ a: 1 }]);
});

describe('triggerDayReset', () => {
  it('sequences DELETE → event → audit, then wipes local state', async () => {
    const calls = [];
    const client = makeClient({
      deleteCapturesForDay: vi.fn(async () => {
        calls.push('delete');
        return { status: 204, body: null };
      }),
      insertEvent: vi.fn(async () => {
        calls.push('event');
        return { status: 201, body: [{ id: 'ev-1' }] };
      }),
      insertAudit: vi.fn(async () => {
        calls.push('audit');
        return { status: 201, body: null };
      })
    });
    const res = await triggerDayReset({ client, manager: MANAGER, timezone: TZ, now: NOW });
    expect(calls).toEqual(['delete', 'event', 'audit']);
    expect(res.eventId).toBe('ev-1');
    expect(localStore.get('shift_state')).toBeNull();
    expect(localStore.get('recent_captures')).toBeNull();
  });

  it('aborts (no later step) if DELETE fails; local state preserved', async () => {
    const client = makeClient({
      deleteCapturesForDay: vi.fn(async () => {
        const err = new Error('forbidden');
        err.code = 403;
        err.permanent = true;
        throw err;
      })
    });
    await expect(
      triggerDayReset({ client, manager: MANAGER, timezone: TZ, now: NOW })
    ).rejects.toThrow(/forbidden/);
    expect(client.insertEvent).not.toHaveBeenCalled();
    expect(client.insertAudit).not.toHaveBeenCalled();
    expect(localStore.get('shift_state')).toEqual({ count: 1000 });
  });

  it('aborts if audit fails; event already issued; local state preserved', async () => {
    const client = makeClient({
      insertAudit: vi.fn(async () => {
        throw new Error('audit failure');
      })
    });
    await expect(
      triggerDayReset({ client, manager: MANAGER, timezone: TZ, now: NOW })
    ).rejects.toThrow(/audit/);
    expect(client.deleteCapturesForDay).toHaveBeenCalledOnce();
    expect(client.insertEvent).toHaveBeenCalledOnce();
    expect(localStore.get('shift_state')).toEqual({ count: 1000 });
  });

  it('audit detail records event_id and plant-day range', async () => {
    const client = makeClient();
    await triggerDayReset({ client, manager: MANAGER, timezone: TZ, now: NOW });
    const auditArg = client.insertAudit.mock.calls[0][0];
    expect(auditArg.action).toBe('DAY_RESET');
    expect(auditArg.actor_name).toBe('Laura');
    expect(auditArg.detail.event_id).toBe('ev-1');
    expect(auditArg.detail.startIso).toBeTruthy();
    expect(auditArg.detail.endIso).toBeTruthy();
  });
});

describe('wipeLocalShift', () => {
  it('removes shift_state, recent_captures, undo pending, and watermark', () => {
    localStore.set('shift_state', { count: 42 });
    localStore.set('recent_captures', [1]);
    localStore.set('capture_undo_pending', { hash: 'h' });
    localStore.set('sync:captures_watermark', 'T1');
    wipeLocalShift();
    expect(localStore.get('shift_state')).toBeNull();
    expect(localStore.get('recent_captures')).toBeNull();
    expect(localStore.get('capture_undo_pending')).toBeNull();
    expect(localStore.get('sync:captures_watermark')).toBeNull();
  });
});
