import { describe, it, expect, beforeEach } from 'vitest';
import { hashPin, verifyPin, _internals } from '@/modules/auth/pin.js';

const MANAGERS = [
  { id: 'mgr-1', display_name: 'Laura', pin_hash: null, active: true },
  { id: 'mgr-2', display_name: 'Carlos', pin_hash: null, active: false }
];

beforeEach(async () => {
  globalThis.localStorage.clear();
  MANAGERS[0].pin_hash = await hashPin('1234');
  MANAGERS[1].pin_hash = await hashPin('9999');
});

describe('hashPin', () => {
  it('returns deterministic SHA-256 hex', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(a).toBe('03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');
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
    expect(globalThis.localStorage.getItem(`ole:${_internals.LOCKOUT_KEY}`)).toBeNull();
  });
});
