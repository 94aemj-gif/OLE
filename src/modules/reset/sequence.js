// @ts-check
import { buildAuditEntry } from '../audit/writer.js';
import { plantDayRange } from '../time/plant-day.js';
import { localStore } from '../storage/local-store.js';

/**
 * Trigger a day reset. Sequenced as:
 *   1. DELETE captures within the plant day (RLS-bounded to 36h).
 *   2. POST events.day_reset row (cross-device broadcast).
 *   3. POST audit_log DAY_RESET (links the event id).
 *
 * Each step is awaited; if a step throws, no later step runs. Local
 * state is only wiped after all three succeed.
 *
 * @param {Object} ctx
 * @param {any} ctx.client
 * @param {{id:string, display_name:string}} ctx.manager
 * @param {string} ctx.timezone
 * @param {Date} [ctx.now]
 */
export async function triggerDayReset(ctx) {
  const now = ctx.now ?? new Date();
  const { startIso, endIso } = plantDayRange(now, ctx.timezone);

  await ctx.client.deleteCapturesForDay({ startIso, endIso });

  const eventRes = await ctx.client.insertEvent({
    kind: 'day_reset',
    payload: { plant_day_start: startIso, plant_day_end: endIso },
    issued_by: ctx.manager.id
  });
  const eventId = Array.isArray(eventRes.body) ? eventRes.body[0]?.id : eventRes.body?.id;

  await ctx.client.insertAudit(
    buildAuditEntry({
      actorType: 'manager',
      actorId: ctx.manager.id,
      actorName: ctx.manager.display_name,
      action: 'DAY_RESET',
      entityType: null,
      entityId: null,
      detail: { event_id: eventId, startIso, endIso }
    })
  );

  wipeLocalShift();
  return { ok: true, eventId, startIso, endIso };
}

export function wipeLocalShift() {
  localStore.remove('shift_state');
  localStore.remove('recent_captures');
  localStore.remove('capture_undo_pending');
  localStore.remove('sync:captures_watermark');
}
