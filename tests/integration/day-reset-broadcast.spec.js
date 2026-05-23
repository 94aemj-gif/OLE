import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerDayReset } from '@/modules/reset/sequence.js';
import { handleEventLocally } from '@/modules/reset/apply.js';
import { applyEventsOnce } from '@/modules/sync/events.js';
import { localStore } from '@/modules/storage/local-store.js';

const MANAGER = { id: 'mgr-1', display_name: 'Laura' };
const TZ = 'America/Mexico_City';

beforeEach(() => globalThis.localStorage.clear());

describe('day-reset broadcast end-to-end (3 devices)', () => {
  it('initiator wipes local; online device wipes on next pull; offline device wipes after reconnect', async () => {
    // Simulated server-side event store
    /** @type {Array<{id:string,kind:string,issued_at:string,payload:any}>} */
    const serverEvents = [];

    // Device A — initiator (online)
    const clientA = {
      deleteCapturesForDay: vi.fn(async () => ({ status: 204, body: null })),
      insertEvent: vi.fn(async (e) => {
        const row = { id: 'ev-1', issued_at: '2026-05-22T11:00:00Z', ...e };
        serverEvents.push(row);
        return { status: 201, body: [row] };
      }),
      insertAudit: vi.fn(async () => ({ status: 201, body: null }))
    };
    localStore.set('shift_state', { count: 999 }); // A's local state
    await triggerDayReset({ client: clientA, manager: MANAGER, timezone: TZ });
    expect(localStore.get('shift_state')).toBeNull(); // A wiped immediately

    // Device B — online during broadcast; pulls events and applies idempotently
    globalThis.localStorage.clear();
    localStore.set('shift_state', { count: 555 });
    const clientB = {
      listEvents: vi.fn(async () => ({ status: 200, body: serverEvents }))
    };
    await applyEventsOnce(clientB, handleEventLocally);
    expect(localStore.get('shift_state')).toBeNull(); // B wiped

    // Re-pull on B — must not double-apply
    localStore.set('shift_state', { count: 100 }); // operator captured after reset
    await applyEventsOnce(clientB, handleEventLocally);
    expect(localStore.get('shift_state')).toEqual({ count: 100 });

    // Device C — was offline; comes online and pulls
    globalThis.localStorage.clear();
    localStore.set('shift_state', { count: 333 });
    const clientC = {
      listEvents: vi.fn(async () => ({ status: 200, body: serverEvents }))
    };
    await applyEventsOnce(clientC, handleEventLocally);
    expect(localStore.get('shift_state')).toBeNull();
  });
});
