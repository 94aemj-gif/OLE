import { describe, it, expect, beforeEach } from 'vitest';
import { localStore } from '@/modules/storage/local-store.js';

describe('localStore', () => {
  beforeEach(() => globalThis.localStorage.clear());

  it('round-trips JSON values via namespaced keys', () => {
    localStore.set('foo', { a: 1, b: [2, 3] });
    expect(localStore.get('foo')).toEqual({ a: 1, b: [2, 3] });
    expect(globalThis.localStorage.getItem('ole:foo')).toBe('{"a":1,"b":[2,3]}');
  });

  it('returns fallback when key is missing', () => {
    expect(localStore.get('missing', 'default')).toBe('default');
    expect(localStore.get('missing')).toBeNull();
  });

  it('returns fallback when stored value is corrupt JSON', () => {
    globalThis.localStorage.setItem('ole:bad', 'not-json{');
    expect(localStore.get('bad', 'fallback')).toBe('fallback');
  });

  it('removes a single key', () => {
    localStore.set('foo', 1);
    localStore.remove('foo');
    expect(localStore.get('foo')).toBeNull();
  });

  it('clears only namespaced keys', () => {
    localStore.set('a', 1);
    globalThis.localStorage.setItem('other:b', '2');
    localStore.clearNamespace();
    expect(localStore.get('a')).toBeNull();
    expect(globalThis.localStorage.getItem('other:b')).toBe('2');
  });
});
