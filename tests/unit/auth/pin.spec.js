import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/modules/storage/idb-store.js', () => {
  const stores = new Map();
  const ensure = (n) => (stores.has(n) ? stores.get(n) : stores.set(n, new Map()).get(n));
  return {
    idbStore: {
      async put(s, rec) {
        ensure(s).set(rec.id, rec);
        return rec;
      },
      async get(s, id) {
        return ensure(s).get(id) ?? null;
      },
      async delete(s, id) {
        ensure(s).delete(id);
      },
      async all(s) {
        return [...ensure(s).values()];
      },
      async count(s) {
        return ensure(s).size;
      },
      _reset() {
        stores.clear();
      }
    }
  };
});

const { hashPin, newSalt, verifyPin, _internals } = await import('@/modules/auth/pin.js');
const { idbStore } = await import('@/modules/storage/idb-store.js');

const MANAGERS = [
  { id: 'mgr-1', display_name: 'Laura', pin_salt: '', pin_hash: '', active: true },
  { id: 'mgr-2', display_name: 'Carlos', pin_salt: '', pin_hash: '', active: false }
];

beforeEach(async () => {
  idbStore._reset();
  MANAGERS[0].pin_salt = newSalt();
  MANAGERS[0].pin_hash = await hashPin('1234', MANAGERS[0].pin_salt);
  MANAGERS[1].pin_salt = newSalt();
  MANAGERS[1].pin_hash = await hashPin('9999', MANAGERS[1].pin_salt);
});

describe('hashPin (PBKDF2)', () => {
  it('returns deterministic hex digest for same pin+salt', async () => {
    const salt = newSalt();
    const a = await hashPin('1234', salt);
    const b = await hashPin('1234', salt);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('produces different digests for different salts', async () => {
    const a = await hashPin('1234', newSalt());
    const b = await hashPin('1234', newSalt());
    expect(a).not.toBe(b);
  });

  it('throws when salt is missing', async () => {
    await expect(hashPin('1234', '')).rejects.toThrow();
  });
});

describe('verifyPin', () => {
  it('returns ok+manager on correct PIN', async () => {
    const r = await verifyPin('1234', MANAGERS);
    expect(r).toEqual({ ok: true, manager: { id: 'mgr-1', display_name: 'Laura' } });
  });

  it('rejects an incorrect PIN', async () => {
    const r = await verifyPin('0000', MANAGERS);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('invalid');
  });

  it('rejects a deactivated manager', async () => {
    const r = await verifyPin('9999', MANAGERS);
    expect(r).toEqual({ ok: false, code: 'deactivated' });
  });

  it('locks out after 5 failures', async () => {
    const t = 1_000_000;
    const now = () => t;
    for (let i = 0; i < 5; i += 1) {
      await verifyPin('0000', MANAGERS, now);
    }
    const r = await verifyPin('1234', MANAGERS, now);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('locked');
  });

  it('clears the lockout after the window passes', async () => {
    const clock = { t: 1_000_000 };
    const now = () => clock.t;
    for (let i = 0; i < 5; i += 1) {
      await verifyPin('0000', MANAGERS, now);
    }
    clock.t += _internals.LOCKOUT_WINDOW_MS + 1;
    const r = await verifyPin('1234', MANAGERS, now);
    expect(r.ok).toBe(true);
  });

  it('clears the failure counter on successful auth', async () => {
    const t = 1_000_000;
    const now = () => t;
    await verifyPin('0000', MANAGERS, now);
    await verifyPin('1234', MANAGERS, now);
    const lockout = await idbStore.get(_internals.LOCKOUT_STORE, _internals.LOCKOUT_ID);
    expect(lockout).toBeNull();
  });
});
