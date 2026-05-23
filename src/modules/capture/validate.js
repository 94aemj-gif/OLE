// @ts-check
const EMPLOYEE_REGEX = /^\d{5}$/;

/**
 * @param {Object} input
 * @param {string} input.employee_number
 * @param {number} input.units_produced
 * @param {Array<{reason_id:string,pieces:number}>} input.scrap_rows
 * @param {Array<{reason_id:string,minutes:number}>} input.downtime_rows
 * @param {Object} catalog
 * @param {Array<{employee_number:string,active:boolean}>} catalog.operators
 * @param {Array<{id:string,active:boolean}>} catalog.scrap_reasons
 * @param {Array<{id:string,active:boolean}>} catalog.downtime_reasons
 */
function validateEmployee(input, catalog, errors) {
  if (!EMPLOYEE_REGEX.test(input.employee_number)) {
    errors.push({ field: 'employee_number', code: 'invalid_format' });
    return;
  }
  const known = catalog.operators.some(
    (o) => o.employee_number === input.employee_number && o.active
  );
  if (!known) errors.push({ field: 'employee_number', code: 'unknown' });
}

function validateTotals(input, errors) {
  const units = Number(input.units_produced);
  if (!Number.isInteger(units) || units < 0) {
    errors.push({ field: 'units_produced', code: 'invalid' });
  }
  const scrap = (input.scrap_rows ?? []).reduce((acc, r) => acc + (r.pieces || 0), 0);
  const downtime = (input.downtime_rows ?? []).reduce((acc, r) => acc + (r.minutes || 0), 0);
  if (units + scrap + downtime === 0) {
    errors.push({ field: 'units_produced', code: 'empty_capture' });
  }
  if (scrap > units) {
    errors.push({ field: 'scrap_rows', code: 'exceeds_units' });
  }
}

function validateRows(rows, reasons, field, qtyKey, errors) {
  for (const row of rows ?? []) {
    const known = reasons.some((r) => r.id === row.reason_id && r.active);
    if (!known) errors.push({ field, code: 'unknown_reason', reason: row.reason_id });
    if (!Number.isInteger(row[qtyKey]) || row[qtyKey] < 0) {
      errors.push({ field, code: `invalid_${qtyKey}` });
    }
  }
}

export function validateCapture(input, catalog) {
  const errors = [];
  validateEmployee(input, catalog, errors);
  validateTotals(input, errors);
  validateRows(input.scrap_rows, catalog.scrap_reasons, 'scrap_rows', 'pieces', errors);
  validateRows(input.downtime_rows, catalog.downtime_reasons, 'downtime_rows', 'minutes', errors);
  return { ok: errors.length === 0, errors };
}
