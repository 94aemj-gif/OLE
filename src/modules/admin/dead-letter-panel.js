// @ts-check
import { buildAuditEntry } from '../audit/writer.js';

/**
 * Replay a dead-letter row.
 *  1. POST a fresh `captures` insert with the edited payload.
 *  2. PATCH the dead_letter row to state=replayed.
 *  3. POST audit DEAD_LETTER_REPLAY.
 *
 * @param {any} client
 * @param {Object} ctx
 * @param {{id:string, original_payload:any}} ctx.deadLetter
 * @param {any} ctx.editedPayload
 * @param {{id:string, display_name:string}} ctx.manager
 */
export async function replayDeadLetter(client, ctx) {
  await client.insertCapture(ctx.editedPayload);
  await client.patchDeadLetter(ctx.deadLetter.id, {
    state: 'replayed',
    resolved_by: ctx.manager.id,
    resolved_at: new Date().toISOString()
  });
  await client.insertAudit(
    buildAuditEntry({
      actorType: 'manager',
      actorId: ctx.manager.id,
      actorName: ctx.manager.display_name,
      action: 'DEAD_LETTER_REPLAY',
      entityType: 'capture',
      entityId: ctx.deadLetter.id,
      detail: {
        original_payload: ctx.deadLetter.original_payload,
        replayed_payload: ctx.editedPayload
      }
    })
  );
}

/**
 * @param {any} client
 * @param {{deadLetter:{id:string, original_payload:any}, manager:{id:string, display_name:string}}} ctx
 */
export async function discardDeadLetter(client, ctx) {
  await client.patchDeadLetter(ctx.deadLetter.id, {
    state: 'discarded',
    resolved_by: ctx.manager.id,
    resolved_at: new Date().toISOString()
  });
  await client.insertAudit(
    buildAuditEntry({
      actorType: 'manager',
      actorId: ctx.manager.id,
      actorName: ctx.manager.display_name,
      action: 'DEAD_LETTER_DISCARD',
      entityType: 'capture',
      entityId: ctx.deadLetter.id,
      detail: { original_payload: ctx.deadLetter.original_payload }
    })
  );
}
