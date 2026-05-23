import { describe, it, expect, vi } from 'vitest';
import { buildAuditEntry, makeAuditWriter } from '@/modules/audit/writer.js';

describe('audit writer', () => {
  it('builds a canonical entry with denormalized actor_name', () => {
    const e = buildAuditEntry({
      actorType: 'operator',
      actorId: '12345',
      actorName: 'Ana López',
      action: 'CAPTURE_CREATE',
      entityType: 'capture',
      entityId: 'cap-1',
      detail: { units: 240 }
    });
    expect(e).toEqual({
      actor_type: 'operator',
      actor_id: '12345',
      actor_name: 'Ana López',
      action: 'CAPTURE_CREATE',
      entity_type: 'capture',
      entity_id: 'cap-1',
      detail: { units: 240 }
    });
  });

  it('rejects unknown action types', () => {
    expect(() =>
      buildAuditEntry({
        actorType: 'system',
        actorId: 's',
        actorName: 'system',
        action: 'UNKNOWN'
      })
    ).toThrow(/Unknown audit action/);
  });

  it('requires actor_name', () => {
    expect(() =>
      buildAuditEntry({
        actorType: 'operator',
        actorId: '12345',
        actorName: '',
        action: 'CAPTURE_CREATE'
      })
    ).toThrow(/actor_name required/);
  });

  it('writer.write forwards to client.insertAudit', async () => {
    const client = { insertAudit: vi.fn(async () => ({ status: 201, body: null })) };
    const writer = makeAuditWriter(client);
    await writer.write({
      actorType: 'manager',
      actorId: 'mgr-1',
      actorName: 'Laura',
      action: 'CATALOG_EDIT'
    });
    expect(client.insertAudit).toHaveBeenCalledOnce();
    const arg = client.insertAudit.mock.calls[0][0];
    expect(arg.action).toBe('CATALOG_EDIT');
    expect(arg.actor_name).toBe('Laura');
  });
});
