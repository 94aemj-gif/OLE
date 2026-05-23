import { describe, it, expect, vi } from 'vitest';
import { replayDeadLetter, discardDeadLetter } from '@/modules/admin/dead-letter-panel.js';

const MANAGER = { id: 'mgr-1', display_name: 'Laura' };
const DL = {
  id: 'dl-1',
  original_payload: { line_id: 'L-01', units_produced: 240 }
};

function makeClient() {
  return {
    insertCapture: vi.fn(async () => ({ status: 201, body: [{}] })),
    patchDeadLetter: vi.fn(async () => ({ status: 200, body: [{}] })),
    insertAudit: vi.fn(async () => ({ status: 201, body: null }))
  };
}

describe('dead-letter resolver', () => {
  it('replay: inserts new capture, patches dead-letter to replayed, audit-logs', async () => {
    const client = makeClient();
    await replayDeadLetter(client, {
      deadLetter: DL,
      editedPayload: { ...DL.original_payload, units_produced: 230 },
      manager: MANAGER
    });
    expect(client.insertCapture).toHaveBeenCalledOnce();
    expect(client.patchDeadLetter).toHaveBeenCalledWith(
      'dl-1',
      expect.objectContaining({ state: 'replayed', resolved_by: 'mgr-1' })
    );
    expect(client.insertAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DEAD_LETTER_REPLAY', actor_name: 'Laura' })
    );
  });

  it('discard: only patches dead-letter + audit; no new capture', async () => {
    const client = makeClient();
    await discardDeadLetter(client, { deadLetter: DL, manager: MANAGER });
    expect(client.insertCapture).not.toHaveBeenCalled();
    expect(client.patchDeadLetter).toHaveBeenCalledWith(
      'dl-1',
      expect.objectContaining({ state: 'discarded' })
    );
    expect(client.insertAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DEAD_LETTER_DISCARD' })
    );
  });
});
