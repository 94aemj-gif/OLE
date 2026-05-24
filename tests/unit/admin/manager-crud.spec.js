import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createManager, rotateManagerPin, deactivateManager } from '@/modules/admin/managers.js';

let server;

function makeClient() {
  return {
    getConfig: vi.fn(async () => ({ status: 200, body: [server] })),
    patchConfig: vi.fn(async (data) => {
      server = { ...server, data, updated_at: 'T2' };
      return { status: 200, body: [server] };
    })
  };
}

beforeEach(() => {
  server = { data: { managers: [] }, updated_at: 'T1' };
});

describe('manager CRUD', () => {
  it('creates a manager with hashed PIN', async () => {
    const client = makeClient();
    await createManager(client, { id: 'mgr-1', display_name: 'Laura', pin: '1234' });
    expect(client.patchConfig).toHaveBeenCalledOnce();
    const saved = server.data.managers[0];
    expect(saved.display_name).toBe('Laura');
    expect(saved.pin_hash).toHaveLength(64);
    expect(saved.pin_hash).not.toBe('1234'); // not plain
    expect(saved.pin_salt).toHaveLength(32);
    expect(saved.active).toBe(true);
  });

  it('rotates PIN by id (display_name preserved)', async () => {
    server.data.managers = [{ id: 'mgr-1', display_name: 'Laura', pin_hash: 'old', active: true }];
    const client = makeClient();
    await rotateManagerPin(client, { id: 'mgr-1', new_pin: '9999' });
    expect(server.data.managers[0].pin_hash).not.toBe('old');
    expect(server.data.managers[0].display_name).toBe('Laura');
  });

  it('deactivates a manager without removing the row', async () => {
    server.data.managers = [{ id: 'mgr-1', display_name: 'Laura', pin_hash: 'h', active: true }];
    const client = makeClient();
    await deactivateManager(client, { id: 'mgr-1' });
    expect(server.data.managers[0].active).toBe(false);
  });
});
