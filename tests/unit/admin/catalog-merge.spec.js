import { describe, it, expect, vi } from 'vitest';
import { mergeCatalog, patchCatalog } from '@/modules/admin/catalog-store.js';

describe('mergeCatalog', () => {
  it('merges scalar plant fields', () => {
    const base = { plant: { timezone: 'A', hourly_alert_audio: true } };
    const patched = mergeCatalog(base, { plant: { hourly_alert_audio: false } });
    expect(patched.plant).toEqual({ timezone: 'A', hourly_alert_audio: false });
  });

  it('upserts list rows by id', () => {
    const base = {
      lines: [
        { id: 'L-01', display_name: 'A', hourly_target: 100, active: true },
        { id: 'L-02', display_name: 'B', hourly_target: 200, active: true }
      ]
    };
    const patched = mergeCatalog(base, {
      lines: [
        { id: 'L-01', active: false },
        { id: 'L-03', display_name: 'C', hourly_target: 50, active: true }
      ]
    });
    expect(patched.lines).toHaveLength(3);
    const l01 = patched.lines.find((l) => l.id === 'L-01');
    expect(l01.active).toBe(false);
    expect(l01.display_name).toBe('A');
    expect(patched.lines.find((l) => l.id === 'L-03')).toBeTruthy();
  });

  it('upserts operators by employee_number when no id present', () => {
    const base = {
      operators: [{ employee_number: '12345', display_name: 'Ana', active: true }]
    };
    const patched = mergeCatalog(base, {
      operators: [{ employee_number: '12345', active: false }]
    });
    expect(patched.operators[0]).toEqual({
      employee_number: '12345',
      display_name: 'Ana',
      active: false
    });
  });
});

describe('patchCatalog optimistic concurrency', () => {
  it('returns conflict on 409 and exposes latest server row', async () => {
    const server = { data: { lines: [{ id: 'L-01', active: true }] }, updated_at: 'T1' };
    const client = {
      getConfig: vi.fn(async () => ({ status: 200, body: [server] })),
      patchConfig: vi.fn(async () => ({ status: 409, body: null }))
    };
    const r = await patchCatalog(client, (d) => ({
      ...d,
      lines: [{ id: 'L-01', active: false }]
    }));
    expect(r.ok).toBe(false);
    expect(r.code).toBe('conflict');
    expect(r.latest).toBe(server);
  });

  it('returns ok with updated row on success', async () => {
    const before = { data: { lines: [] }, updated_at: 'T1' };
    const after = { data: { lines: [{ id: 'L-01', active: true }] }, updated_at: 'T2' };
    const client = {
      getConfig: vi.fn(async () => ({ status: 200, body: [before] })),
      patchConfig: vi.fn(async () => ({ status: 200, body: [after] }))
    };
    const r = await patchCatalog(client, (d) => ({
      ...d,
      lines: [{ id: 'L-01', active: true }]
    }));
    expect(r.ok).toBe(true);
    expect(r.updated_at).toBe('T2');
    expect(r.data).toEqual(after.data);
  });
});
