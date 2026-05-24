import { describe, it, expect, beforeEach } from 'vitest';
import { makeLocalClient } from '@/modules/supabase/local-client.js';

beforeEach(() => globalThis.localStorage.clear());

describe('makeLocalClient', () => {
  it('seeds catalog from fallback on first getConfig', async () => {
    const client = makeLocalClient();
    const res = await client.getConfig();
    expect(res.status).toBe(200);
    expect(res.body[0].data.lines.length).toBeGreaterThan(0);
  });

  it('persists patchConfig and reads it back', async () => {
    const client = makeLocalClient();
    const first = await client.getConfig();
    const patched = { ...first.body[0].data, plant: { ...first.body[0].data.plant, demo: true } };
    await client.patchConfig(patched);
    const second = await client.getConfig();
    expect(second.body[0].data.plant.demo).toBe(true);
  });

  it('insertCapture assigns id + persists to recent_captures', async () => {
    const client = makeLocalClient();
    const payload = {
      line_id: 'L-01',
      shift_id: 'S-MORNING',
      hour_bucket: '2026-05-22T14:00:00.000Z',
      client_timestamp: '2026-05-22T14:30:00.000Z',
      operator_number: '12345',
      units_produced: 240,
      scrap_rows: [],
      downtime_rows: [],
      payload_hash: 'abc',
      client_id: 't-1'
    };
    const res = await client.insertCapture(payload);
    expect(res.status).toBe(201);
    expect(res.body[0].id).toBeTruthy();
    expect(res.body[0].undone).toBe(false);

    const list = await client.listCaptures();
    expect(list.body).toHaveLength(1);
    expect(list.body[0].units_produced).toBe(240);
  });

  it('patchCaptureUndo flips the undone flag on the right row', async () => {
    const client = makeLocalClient();
    const a = await client.insertCapture({
      line_id: 'L-01',
      shift_id: 'S-MORNING',
      hour_bucket: '2026-05-22T14:00:00.000Z',
      client_timestamp: '2026-05-22T14:30:00.000Z',
      operator_number: '12345',
      units_produced: 100,
      scrap_rows: [],
      downtime_rows: [],
      payload_hash: 'a',
      client_id: 't-1'
    });
    const b = await client.insertCapture({
      line_id: 'L-01',
      shift_id: 'S-MORNING',
      hour_bucket: '2026-05-22T15:00:00.000Z',
      client_timestamp: '2026-05-22T15:30:00.000Z',
      operator_number: '12345',
      units_produced: 50,
      scrap_rows: [],
      downtime_rows: [],
      payload_hash: 'b',
      client_id: 't-1'
    });
    await client.patchCaptureUndo(b.body[0].id, '2026-05-22T15:31:00.000Z');
    const visible = await client.listCaptures({ includeUndone: false });
    expect(visible.body.map((r) => r.id)).toEqual([a.body[0].id]);
  });

  it('listCaptures filters by watermarkIso', async () => {
    const client = makeLocalClient();
    await client.insertCapture({
      line_id: 'L-01',
      shift_id: 'S-MORNING',
      hour_bucket: '2026-05-21T14:00:00.000Z',
      client_timestamp: '2026-05-21T14:30:00.000Z',
      operator_number: '12345',
      units_produced: 1,
      scrap_rows: [],
      downtime_rows: [],
      payload_hash: 'old',
      client_id: 't-1'
    });
    await client.insertCapture({
      line_id: 'L-01',
      shift_id: 'S-MORNING',
      hour_bucket: '2026-05-22T14:00:00.000Z',
      client_timestamp: '2026-05-22T14:30:00.000Z',
      operator_number: '12345',
      units_produced: 2,
      scrap_rows: [],
      downtime_rows: [],
      payload_hash: 'new',
      client_id: 't-1'
    });
    const res = await client.listCaptures({ watermarkIso: '2026-05-22T00:00:00.000Z' });
    expect(res.body).toHaveLength(1);
    expect(res.body[0].payload_hash).toBe('new');
  });
});
