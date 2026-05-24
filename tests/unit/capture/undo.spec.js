import { describe, it, expect, beforeEach } from 'vitest';
import { openUndoWindow, readPendingUndo, applyUndo } from '@/modules/capture/undo.js';
import { localStore } from '@/modules/storage/local-store.js';

const samplePayload = {
  payload_hash: 'h1',
  units_produced: 100,
  scrap_rows: [{ pieces: 5 }],
  downtime_rows: [{ minutes: 2 }]
};

describe('undo window', () => {
  beforeEach(() => globalThis.localStorage.clear());

  it('records a pending undo for 10s', () => {
    const pending = openUndoWindow(samplePayload, null, () => 1000);
    expect(pending.expires_at).toBe(11000);
    expect(readPendingUndo(() => 5000)).toBeTruthy();
  });

  it('applies undo within window and decrements shift state', () => {
    localStore.set('shift_state', { count: 100, scrap: 5, downtime: 2 });
    openUndoWindow(samplePayload, null, () => 1000);
    expect(applyUndo(() => 5000)).toBe(true);
    expect(localStore.get('shift_state')).toEqual({ count: 0, scrap: 0, downtime: 0 });
  });

  it('rejects undo after the window expires', () => {
    localStore.set('shift_state', { count: 100, scrap: 5, downtime: 2 });
    openUndoWindow(samplePayload, null, () => 1000);
    expect(applyUndo(() => 20000)).toBe(false);
    expect(readPendingUndo(() => 20000)).toBeNull();
  });

  it('clamps shift state to ≥0 on consecutive undos', () => {
    localStore.set('shift_state', { count: 0, scrap: 0, downtime: 0 });
    openUndoWindow(samplePayload, null, () => 1000);
    applyUndo(() => 1500);
    expect(localStore.get('shift_state')).toEqual({ count: 0, scrap: 0, downtime: 0 });
  });
});
