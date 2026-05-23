import { describe, it, expect, vi } from 'vitest';
import { makeSupabaseClient } from '@/modules/supabase/client.js';

function makeFetch(responses) {
  let i = 0;
  return vi.fn(async () => {
    const r = responses[i] ?? responses[responses.length - 1];
    i += 1;
    return {
      status: r.status,
      text: async () => (r.body !== undefined ? JSON.stringify(r.body) : '')
    };
  });
}

const cfg = (fetchImpl) => ({
  url: 'http://localhost:54321',
  anonKey: 'anon',
  sleep: () => Promise.resolve(),
  fetchImpl
});

describe('supabase client', () => {
  it('returns 201 success on first attempt', async () => {
    const fetchImpl = makeFetch([{ status: 201, body: [{ id: 'x' }] }]);
    const client = makeSupabaseClient(cfg(fetchImpl));
    const res = await client.insertCapture({ payload_hash: 'h' });
    expect(res.status).toBe(201);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('treats 409 as success (idempotency)', async () => {
    const fetchImpl = makeFetch([{ status: 409, body: { code: '23505' } }]);
    const client = makeSupabaseClient(cfg(fetchImpl));
    const res = await client.insertCapture({ payload_hash: 'h' });
    expect(res.status).toBe(409);
  });

  it('throws permanent on 422 without retry', async () => {
    const fetchImpl = makeFetch([{ status: 422, body: { error: 'bad' } }]);
    const client = makeSupabaseClient(cfg(fetchImpl));
    await expect(client.insertCapture({ payload_hash: 'h' })).rejects.toMatchObject({
      permanent: true,
      code: 422
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries on 503 then succeeds', async () => {
    const fetchImpl = makeFetch([
      { status: 503, body: { error: 'busy' } },
      { status: 503, body: { error: 'busy' } },
      { status: 201, body: [{ id: 'x' }] }
    ]);
    const client = makeSupabaseClient(cfg(fetchImpl));
    const res = await client.insertCapture({ payload_hash: 'h' });
    expect(res.status).toBe(201);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('sends required REST headers', async () => {
    const fetchImpl = makeFetch([{ status: 201, body: null }]);
    const client = makeSupabaseClient(cfg(fetchImpl));
    await client.insertCapture({});
    const call = fetchImpl.mock.calls[0];
    expect(call[1].headers.apikey).toBe('anon');
    expect(call[1].headers.Authorization).toBe('Bearer anon');
    expect(call[1].headers['Content-Type']).toBe('application/json');
    expect(call[1].headers.Prefer).toBe('return=representation');
  });

  it('encodes watermark in GET captures URL', async () => {
    const fetchImpl = makeFetch([{ status: 200, body: [] }]);
    const client = makeSupabaseClient(cfg(fetchImpl));
    await client.listCaptures({ watermarkIso: '2026-05-22T14:00:00.000Z' });
    const url = fetchImpl.mock.calls[0][0];
    expect(url).toContain('updated_at=gte.');
    expect(url).toContain('undone=eq.false');
    expect(url).toContain('order=updated_at.asc');
    expect(url).toContain('limit=1000');
  });
});
