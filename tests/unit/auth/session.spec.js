import { describe, it, expect, beforeEach } from 'vitest';
import { openSession, readSession, closeSession, _internals } from '@/modules/auth/session.js';

beforeEach(() => globalThis.localStorage.clear());

describe('manager session', () => {
  it('opens and reads a session within TTL', () => {
    const t = 1_000_000;
    openSession({ id: 'mgr-1', display_name: 'Laura' }, () => t);
    const s = readSession(() => t + 5000);
    expect(s?.manager.display_name).toBe('Laura');
  });

  it('expires the session after TTL', () => {
    const t = 1_000_000;
    openSession({ id: 'mgr-1', display_name: 'Laura' }, () => t);
    const s = readSession(() => t + _internals.SESSION_TTL_MS + 1);
    expect(s).toBeNull();
  });

  it('closeSession clears the session', () => {
    openSession({ id: 'mgr-1', display_name: 'Laura' });
    closeSession();
    expect(readSession()).toBeNull();
  });
});
