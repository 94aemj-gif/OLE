// @ts-check
import { openCaptureModalWithSubmit } from './modal.js';
import { buildCapturePayload } from './payload.js';
import { persistCaptureLocally, readRecentCaptures } from './local.js';
import { openUndoWindow } from './undo.js';
import { showToast } from '../ui/toast.js';
import { t } from '../i18n/index.js';
import { buildAuditEntry } from '../audit/writer.js';
import { celebrateEndOfShift } from './end-of-shift.js';
import { computeCumulatives } from './cumulatives.js';

/**
 * @param {Object} ctx
 * @param {Object} ctx.catalog
 * @param {string} ctx.line_id
 * @param {string} ctx.shift_id
 * @param {string} ctx.client_id
 * @param {string} ctx.timezone
 * @param {string} ctx.plantDayIso
 * @param {number} ctx.target
 * @param {(entry:any)=>Promise<void>|void} ctx.appendAudit
 * @param {(state:any)=>void} ctx.onState
 */
export function openCapture(ctx) {
  const line = ctx.catalog.lines.find((l) => l.id === ctx.line_id) ?? ctx.catalog.lines[0];
  const shift = ctx.catalog.shifts.find((s) => s.id === ctx.shift_id) ?? ctx.catalog.shifts[0];
  const lineCtx = { line_id: ctx.line_id, shift_id: ctx.shift_id, plantDayIso: ctx.plantDayIso };
  const productsById = new Map((ctx.catalog.products ?? []).map((p) => [p.id, p]));
  const shiftsById = new Map((ctx.catalog.shifts ?? []).map((s) => [s.id, s]));

  const renderCum = (id, label, c) => {
    const el = document.getElementById(id);
    if (!el) return;
    const sign = c.delta >= 0 ? '+' : '';
    const cls = c.delta >= 0 ? 'ok' : 'crit';
    const tgt = c.target > 0 ? c.target : '—';
    el.innerHTML =
      `<div class="l">${label}</div>` +
      `<div class="v">${c.actual} <small>/ ${tgt}</small> ` +
      `<small class="${cls}">(${sign}${c.delta})</small></div>`;
  };
  const setAccum = () => {
    const cum = computeCumulatives({
      captures: readRecentCaptures(),
      lineId: ctx.line_id,
      shiftId: ctx.shift_id,
      dayStartIso: ctx.plantDayIso,
      dayEndIso: ctx.plantDayEndIso ?? ctx.plantDayIso,
      productsById,
      shiftsById,
      timezone: ctx.timezone
    });
    renderCum('ctxAccum', 'Acumulado del turno', cum.shift);
    renderCum('ctxDayAccum', 'Acumulado del día', cum.day);
  };

  const modal = openCaptureModalWithSubmit({
    catalog: ctx.catalog,
    line,
    shift: ctx.shift ?? shift,
    products: ctx.products ?? [],
    product_id: ctx.product_id ?? null,
    hourTargetFor: ctx.hourTargetFor,
    onSubmit: async (input) => {
      const payload = await buildCapturePayload({
        line_id: ctx.line_id,
        shift_id: ctx.shift_id,
        product_id: input.product_id ?? ctx.product_id ?? null,
        client_id: ctx.client_id,
        timezone: ctx.timezone,
        employee_number: input.employee_number,
        units_produced: input.units_produced,
        scrap_rows: input.scrap_rows,
        downtime_rows: input.downtime_rows,
        client_timestamp: new Date().toISOString()
      });
      const { state, capture } = await persistCaptureLocally(payload, lineCtx);
      openUndoWindow(capture, lineCtx);
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

  setAccum();
  return modal;
}
