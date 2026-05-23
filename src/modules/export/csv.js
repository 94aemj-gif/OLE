// @ts-check
/**
 * Serialize captures + aggregates to CSV.
 *
 * Layout:
 *   1 header row
 *   N data rows (one per capture)
 *   blank row
 *   aggregate rows: total units, total scrap, OEE, availability, performance, quality, downtime
 *
 * @param {Object} input
 * @param {Array<any>} input.captures
 * @param {Object} input.snapshot
 */
export function buildCaptureCsv(input) {
  const header = [
    'capture_timestamp',
    'line_id',
    'operator_number',
    'shift_id',
    'units_produced',
    'scrap_pieces',
    'downtime_minutes'
  ];
  const rows = input.captures
    .filter((c) => !c.undone)
    .map((c) => [
      c.client_timestamp,
      c.line_id,
      c.operator_number,
      c.shift_id,
      c.units_produced,
      (c.scrap_rows ?? []).reduce((a, r) => a + (r.pieces || 0), 0),
      (c.downtime_rows ?? []).reduce((a, r) => a + (r.minutes || 0), 0)
    ]);
  const aggregates = [
    [],
    ['__aggregate_units_produced', input.snapshot.unitsProduced],
    ['__aggregate_scrap_units', input.snapshot.scrapUnits],
    ['__aggregate_good_units', input.snapshot.goodUnits],
    ['__aggregate_planned_minutes', input.snapshot.plannedMinutes],
    ['__aggregate_run_minutes', input.snapshot.runMinutes],
    ['__aggregate_downtime_minutes', input.snapshot.downtimeMinutes],
    ['__aggregate_availability', input.snapshot.availability.toFixed(4)],
    ['__aggregate_performance', input.snapshot.performance.toFixed(4)],
    ['__aggregate_quality', input.snapshot.quality.toFixed(4)],
    ['__aggregate_oee', input.snapshot.oee.toFixed(4)]
  ];
  return [header, ...rows, ...aggregates]
    .map((row) => row.map(escapeCsvField).join(','))
    .join('\r\n');
}

function escapeCsvField(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadCsv(filename, contents) {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
