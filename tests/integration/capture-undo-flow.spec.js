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
const { persistCaptureLocally, readShiftState, resetShiftState } = await import(
  '@/modules/capture/local.js'
);
const { openUndoWindow, applyUndo } = await import('@/modules/capture/undo.js');
const { idbStore } = await import('@/modules/storage/idb-store.js');
const { localStore } = await import('@/modules/storage/local-store.js');

const baseInput = {
  line_id: 'L-01',
  shift_id: 'S-MORNING',
  client_timestamp: '2026-05-22T14:00:00.000Z',
  hour_bucket: '2026-05-22T14:00:00.000Z',
  employee_number: '12345',
  units_produced: 240,
  scrap_rows: [{ reason_id: 'SR-01', pieces: 5 }],
  downtime_rows: [{ reason_id: 'DR-01', minutes: 3 }],
  client_id: 't-1'
};

const lineCtx = {
  line_id: 'L-01',
  shift_id: 'S-MORNING',
  plantDayIso: '2026-05-22T06:00:00.000Z'
};

describe('local-first capture → undo round-trip', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    idbStore._reset();
  });

  it('shift_state keyed by line+shift+day isolates two lines on one tablet', async () => {
    const a = await buildCapturePayload({ ...baseInput, line_id: 'L-01' });
    const b = await buildCapturePayload({ ...baseInput, line_id: 'L-02' });
    await persistCaptureLocally(a, { ...lineCtx, line_id: 'L-01' });
    await persistCaptureLocally(b, { ...lineCtx, line_id: 'L-02' });
    expect(readShiftState({ ...lineCtx, line_id: 'L-01' }).count).toBe(240);
    expect(readShiftState({ ...lineCtx, line_id: 'L-02' }).count).toBe(240);
  });

  it('enriches each capture with id + undone flag in recent_captures', async () => {
    const payload = await buildCapturePayload(baseInput);
    const { capture } = await persistCaptureLocally(payload, lineCtx);
    expect(capture.id).toBeTruthy();
    expect(capture.undone).toBe(false);

    const recents = localStore.get('recent_captures', []);
    expect(recents).toHaveLength(1);
    expect(recents[0].id).toBe(capture.id);
  });

  it('applyUndo decrements keyed shift_state AND marks the row undone in recent_captures', async () => {
    const payload = await buildCapturePayload(baseInput);
    const { capture } = await persistCaptureLocally(payload, lineCtx);
    openUndoWindow(capture, lineCtx, () => 1000);
    expect(applyUndo(() => 1500)).toBe(true);
    const state = readShiftState(lineCtx);
    expect(state.count).toBe(0);
    expect(state.scrap).toBe(0);
    expect(state.downtime).toBe(0);
    const recents = localStore.get('recent_captures', []);
    expect(recents[0].undone).toBe(true);
    expect(recents[0].undone_at).toBeTruthy();
  });

  it('resetShiftState wipes all keyed shift_state buckets + recent_captures', async () => {
    const a = await buildCapturePayload({ ...baseInput, line_id: 'L-01' });
    const b = await buildCapturePayload({ ...baseInput, line_id: 'L-02' });
    await persistCaptureLocally(a, { ...lineCtx, line_id: 'L-01' });
    await persistCaptureLocally(b, { ...lineCtx, line_id: 'L-02' });
    resetShiftState();
    const s = readShiftState({ ...lineCtx, line_id: 'L-01' });
    expect(s.count).toBe(0);
    expect(s.scrap).toBe(0);
    expect(s.downtime).toBe(0);
    expect(localStore.get('recent_captures', [])).toEqual([]);
  });
});
