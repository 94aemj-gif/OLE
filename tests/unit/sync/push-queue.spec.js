import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory IDB shim
vi.mock('@/modules/storage/idb-store.js', () => {
  const stores = new Map();
  const ensure = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  };
  return {
    idbStore: {
      async put(s, rec) {
        ensure(s).set(rec.id, rec);
        return rec;
      },
      async get(s, id) {
        return ensure(s).get(id) ?? null;
      },
      async delete(s, id) {
        ensure(s).delete(id);
      },
      async all(s) {
        return [...ensure(s).values()];
      },
      async count(s) {
        return ensure(s).size;
      },
      _reset() {
        stores.clear();
      }
    }
  };
});

const { enqueueCapture, drainOnce, queueDepth } = await import('@/modules/sync/push-queue.js');
const { idbStore } = await import('@/modules/storage/idb-store.js');

const samplePayload = (override = {}) => ({
  line_id: 'L-01',
  operator_number: '12345',
  client_timestamp: '2026-05-22T14:00:00.000Z',
  shift_id: 'M',
  hour_bucket: '2026-05-22T14:00:00.000Z',
  units_produced: 240,
  scrap_rows: [],
  downtime_rows: [],
  payload_hash: 'h1',
  client_id: 'tablet-1',
  ...override
});

describe('push queue', () => {
  beforeEach(() => idbStore._reset());

  it('enqueues a capture and reports depth', async () => {
    await enqueueCapture(samplePayload());
    expect(await queueDepth()).toBe(1);
  });

  it('drains success → removes row from queue', async () => {
    await enqueueCapture(samplePayload());
    const client = {
      insertCapture: vi.fn(async () => ({ status: 201, body: [{}] })),
      insertDeadLetter: vi.fn()
    };
    const r = await drainOnce(client);
    expect(r.committed).toBe(1);
    expect(await queueDepth()).toBe(0);
  });

  it('treats 409 as success (idempotency)', async () => {
    await enqueueCapture(samplePayload());
    const client = {
      insertCapture: vi.fn(async () => ({ status: 409, body: { code: '23505' } })),
      insertDeadLetter: vi.fn()
    };
    const r = await drainOnce(client);
    expect(r.committed).toBe(1);
    expect(await queueDepth()).toBe(0);
  });

  it('moves to dead-letter on permanent 4xx', async () => {
    await enqueueCapture(samplePayload());
    const client = {
      insertCapture: vi.fn(async () => {
        const err = new Error('422');
        err.permanent = true;
        err.code = 422;
        throw err;
      }),
      insertDeadLetter: vi.fn(async () => ({ status: 201, body: [{}] }))
    };
    const r = await drainOnce(client);
    expect(r.dead).toBe(1);
    expect(client.insertDeadLetter).toHaveBeenCalledOnce();
    expect(await queueDepth()).toBe(0);
  });

  it('defers on transient error with backoff', async () => {
    await enqueueCapture(samplePayload());
    const client = {
      insertCapture: vi.fn(async () => {
        const err = new Error('500');
        err.code = 500;
        throw err;
      }),
      insertDeadLetter: vi.fn()
    };
    const r = await drainOnce(client, () => 0);
    expect(r.deferred).toBe(1);
    expect(await queueDepth()).toBe(1);
    const rows = await idbStore.all('push_queue');
    expect(rows[0].attempts).toBe(1);
    expect(rows[0].nextAttemptAt).toBeGreaterThan(0);
  });

  it('skips rows whose nextAttemptAt is in the future', async () => {
    await enqueueCapture(samplePayload());
    // Bump nextAttemptAt by simulating a deferred attempt at t=0
    await drainOnce(
      {
        insertCapture: async () => {
          const err = new Error('500');
          err.code = 500;
          throw err;
        },
        insertDeadLetter: vi.fn()
      },
      () => 0
    );
    // Re-drain at t=500 (still inside 1s backoff)
    const client = {
      insertCapture: vi.fn(),
      insertDeadLetter: vi.fn()
    };
    const r = await drainOnce(client, () => 500);
    expect(r.deferred).toBe(1);
    expect(client.insertCapture).not.toHaveBeenCalled();
  });
});
