import { describe, it, expect, vi, beforeEach } from 'vitest';
import { replayDeadLetter } from '@/modules/admin/dead-letter-panel.js';

const MANAGER = { id: 'mgr-1', display_name: 'Laura' };

beforeEach(() => globalThis.localStorage.clear());

describe('dead-letter replay end-to-end', () => {
  it('insert capture → patch dead-letter → write audit (in that order)', async () => {
    const calls = [];
    const client = {
      insertCapture: vi.fn(async () => {
        calls.push('insertCapture');
        return { status: 201, body: [{}] };
      }),
      patchDeadLetter: vi.fn(async () => {
        calls.push('patchDeadLetter');
        return { status: 200, body: [{}] };
      }),
      insertAudit: vi.fn(async () => {
        calls.push('insertAudit');
        return { status: 201, body: null };
      })
    };
    await replayDeadLetter(client, {
      deadLetter: { id: 'dl-1', original_payload: { units_produced: 240 } },
      editedPayload: { units_produced: 230 },
      manager: MANAGER
    });
    expect(calls).toEqual(['insertCapture', 'patchDeadLetter', 'insertAudit']);
  });
});
