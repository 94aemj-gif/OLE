import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pullCapturesOnce, _internals } from '@/modules/sync/pull.js';
import { localStore } from '@/modules/storage/local-store.js';

describe('pull watermark', () => {
  beforeEach(() => globalThis.localStorage.clear());

  it('uses Date(0) when watermark is unset', async () => {
    const client = {
      listCaptures: vi.fn(async ({ watermarkIso }) => {
        expect(watermarkIso).toBe(new Date(0).toISOString());
        return { status: 200, body: [] };
      })
    };
    await pullCapturesOnce(client, () => {});
  });

  it('subtracts 5 minute overlap from stored watermark', async () => {
    localStore.set(
      _internals.WATERMARK_KEY.split(':')[1]
        ? 'sync:captures_watermark'.split(':')[1]
        : 'captures_watermark',
      null
    );
    localStore.set('sync:captures_watermark'.replace(/^ole:/, ''), '2026-05-22T14:00:00.000Z');
    // Direct set to the namespaced key:
    globalThis.localStorage.setItem('ole:sync:captures_watermark', '"2026-05-22T14:00:00.000Z"');
    const client = {
      listCaptures: vi.fn(async ({ watermarkIso }) => {
        expect(watermarkIso).toBe('2026-05-22T13:55:00.000Z');
        return { status: 200, body: [] };
      })
    };
    await pullCapturesOnce(client, () => {});
  });

  it('advances watermark to newest row updated_at', async () => {
    const client = {
      listCaptures: vi.fn(async () => ({
        status: 200,
        body: [
          { id: 'a', updated_at: '2026-05-22T14:00:01.000Z' },
          { id: 'b', updated_at: '2026-05-22T14:00:05.000Z' }
        ]
      }))
    };
    const apply = vi.fn();
    await pullCapturesOnce(client, apply);
    expect(apply).toHaveBeenCalledWith([
      { id: 'a', updated_at: '2026-05-22T14:00:01.000Z' },
      { id: 'b', updated_at: '2026-05-22T14:00:05.000Z' }
    ]);
    expect(globalThis.localStorage.getItem('ole:sync:captures_watermark')).toBe(
      '"2026-05-22T14:00:05.000Z"'
    );
  });

  it('advances watermark to now() when result empty', async () => {
    const client = {
      listCaptures: vi.fn(async () => ({ status: 200, body: [] }))
    };
    await pullCapturesOnce(
      client,
      () => {},
      () => Date.parse('2026-05-22T14:00:00.000Z')
    );
    expect(globalThis.localStorage.getItem('ole:sync:captures_watermark')).toBe(
      '"2026-05-22T14:00:00.000Z"'
    );
  });
});
