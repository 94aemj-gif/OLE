import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/storage/idb-store.js', () => {
  const stores = new Map();
  const ensure = (n) => (stores.has(n) ? stores.get(n) : stores.set(n, new Map()).get(n));
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

const { buildCapturePayload } = await import('@/modules/capture/payload.js');
const { persistCaptureLocally, readShiftState } = await import('@/modules/capture/local.js');
const { drainOnce, queueDepth } = await import('@/modules/sync/push-queue.js');
const { idbStore } = await import('@/modules/storage/idb-store.js');

describe('capture → local → sync', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    idbStore._reset();
  });

  it('persists locally first, then drains to server on next sync', async () => {
    const payload = await buildCapturePayload({
      line_id: 'L-01',
      employee_number: '12345',
      client_timestamp: '2026-05-22T14:00:00.000Z',
      shift_id: 'M',
      hour_bucket: '2026-05-22T14:00:00.000Z',
      units_produced: 240,
      scrap_rows: [],
      downtime_rows: [],
      client_id: 't-1'
    });
    await persistCaptureLocally(payload);
    expect(readShiftState().count).toBe(240);
    expect(await queueDepth()).toBe(1);

    const client = {
      insertCapture: vi.fn(async () => ({ status: 201, body: [{ id: 'srv-1' }] })),
      insertDeadLetter: vi.fn()
    };
    const r = await drainOnce(client);
    expect(r.committed).toBe(1);
    expect(await queueDepth()).toBe(0);
  });

  it('keeps queue intact on transient 503', async () => {
    const payload = await buildCapturePayload({
      line_id: 'L-01',
      employee_number: '12345',
      client_timestamp: '2026-05-22T14:00:00.000Z',
      shift_id: 'M',
      hour_bucket: '2026-05-22T14:00:00.000Z',
      units_produced: 240,
      scrap_rows: [],
      downtime_rows: [],
      client_id: 't-1'
    });
    await persistCaptureLocally(payload);

    const client = {
      insertCapture: vi.fn(async () => {
        const err = new Error('busy');
        err.code = 503;
        throw err;
      }),
      insertDeadLetter: vi.fn()
    };
    const r = await drainOnce(client, () => 0);
    expect(r.deferred).toBe(1);
    expect(await queueDepth()).toBe(1);
  });

  it('dead-letters on permanent 422', async () => {
    const payload = await buildCapturePayload({
      line_id: 'L-01',
      employee_number: '12345',
      client_timestamp: '2026-05-22T14:00:00.000Z',
      shift_id: 'M',
      hour_bucket: '2026-05-22T14:00:00.000Z',
      units_produced: 240,
      scrap_rows: [{ reason_id: 'SR-01', pieces: 5 }],
      downtime_rows: [],
      client_id: 't-1'
    });
    await persistCaptureLocally(payload);
    const client = {
      insertCapture: vi.fn(async () => {
        const err = new Error('bad');
        err.code = 422;
        err.permanent = true;
        throw err;
      }),
      insertDeadLetter: vi.fn(async () => ({ status: 201, body: [{}] }))
    };
    const r = await drainOnce(client);
    expect(r.dead).toBe(1);
    expect(client.insertDeadLetter).toHaveBeenCalledOnce();
  });
});
