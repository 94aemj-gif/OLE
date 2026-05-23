import { describe, it, expect, vi, beforeEach } from 'vitest';
import { patchCatalog, mergeCatalog } from '@/modules/admin/catalog-store.js';

let server;

function client() {
  return {
    getConfig: vi.fn(async () => ({ status: 200, body: [server] })),
    patchConfig: vi.fn(async (data) => {
      server = { ...server, data, updated_at: server.updated_at === 'T1' ? 'T2' : 'T3' };
      return { status: 200, body: [server] };
    })
  };
}

beforeEach(() => {
  globalThis.localStorage.clear();
  server = {
    data: {
      scrap_reasons: [{ id: 'SR-01', name: 'Pistón roto', active: true, sort_order: 1 }]
    },
    updated_at: 'T1'
  };
});

describe('admin → catalog propagation', () => {
  it('adding a scrap reason is visible on second device after pull', async () => {
    const c1 = client();
    const r = await patchCatalog(c1, (data) =>
      mergeCatalog(data, {
        scrap_reasons: [{ id: 'SR-02', name: 'Empaque defectuoso', active: true, sort_order: 2 }]
      })
    );
    expect(r.ok).toBe(true);
    expect(server.data.scrap_reasons.map((r2) => r2.id)).toEqual(['SR-01', 'SR-02']);

    // simulate a second device's pull: getConfig returns the latest row
    const c2 = client();
    const fresh = await c2.getConfig();
    const data = fresh.body[0].data;
    expect(data.scrap_reasons.find((r2) => r2.id === 'SR-02')).toBeTruthy();
  });
});
