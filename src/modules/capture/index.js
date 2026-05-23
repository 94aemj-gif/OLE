// @ts-check
import { openCaptureModal } from './modal.js';
import { buildCapturePayload } from './payload.js';
import { persistCaptureLocally } from './local.js';
import { openUndoWindow } from './undo.js';
import { showToast } from '../ui/toast.js';
import { t } from '../i18n/index.js';
import { buildAuditEntry } from '../audit/writer.js';
import { celebrateEndOfShift } from './end-of-shift.js';

/**
 * @param {Object} ctx
 * @param {Object} ctx.catalog
 * @param {string} ctx.line_id
 * @param {string} ctx.shift_id
 * @param {string} ctx.client_id
 * @param {string} ctx.timezone
 * @param {number} ctx.target
 * @param {(entry:any)=>Promise<void>|void} ctx.appendAudit
 * @param {(state:any)=>void} ctx.onState
 */
export function openCapture(ctx) {
  return openCaptureModal({
    catalog: ctx.catalog,
    onSubmit: async (input) => {
      const payload = await buildCapturePayload({
        line_id: ctx.line_id,
        shift_id: ctx.shift_id,
        client_id: ctx.client_id,
        timezone: ctx.timezone,
        employee_number: input.employee_number,
        units_produced: input.units_produced,
        scrap_rows: input.scrap_rows,
        downtime_rows: input.downtime_rows,
        client_timestamp: new Date().toISOString()
      });
      const state = await persistCaptureLocally(payload);
      openUndoWindow(payload);
      const op = ctx.catalog.operators.find((o) => o.employee_number === input.employee_number);
      await ctx.appendAudit(
        buildAuditEntry({
          actorType: 'operator',
          actorId: input.employee_number,
          actorName: op?.display_name ?? input.employee_number,
          action: 'CAPTURE_CREATE',
          entityType: 'capture',
          entityId: payload.payload_hash,
          detail: {
            line_id: ctx.line_id,
            units: payload.units_produced,
            scrap: payload.scrap_rows.length,
            downtime: payload.downtime_rows.length
          }
        })
      );
      showToast(t('capture.success'));
      ctx.onState(state);
      if (state.count >= ctx.target && state.count - payload.units_produced < ctx.target) {
        celebrateEndOfShift({ message: '🎉 ¡Objetivo alcanzado!' });
      }
    }
  });
}
