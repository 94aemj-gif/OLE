// @ts-check
import { openModal } from '../ui/modal.js';
import { createButton } from '../ui/button.js';
import { buildCaptureCsv, downloadCsv } from '../export/csv.js';
import { summarizeRuns } from '../capture/runs.js';

/**
 * @param {{snapshot:any, captures:any[], lineId:string, shiftId:string,
 *          products?:any[], shift?:any, timezone?:string}} cfg
 */
export function openEosPopup(cfg) {
  const body = document.createElement('div');
  body.style.display = 'grid';
  body.style.gap = 'var(--space-3)';
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
  grid.style.gap = 'var(--space-3)';
  const tile = (label, value) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'summary-tile';
    const l = document.createElement('span');
    l.className = 'label';
    l.textContent = label;
    const v = document.createElement('span');
    v.className = 'value';
    v.textContent = value;
    wrapper.append(l, v);
    return wrapper;
  };
  grid.append(
    tile('Producción', String(cfg.snapshot.unitsProduced)),
    tile('Merma', String(cfg.snapshot.scrapUnits)),
    tile('Tiempo muerto', `${cfg.snapshot.downtimeMinutes} min`),
    tile('OEE', `${(cfg.snapshot.oee * 100).toFixed(1)}%`),
    tile('Disponibilidad', `${(cfg.snapshot.availability * 100).toFixed(1)}%`),
    tile('Rendimiento', `${(cfg.snapshot.performance * 100).toFixed(1)}%`),
    tile('Calidad', `${(cfg.snapshot.quality * 100).toFixed(1)}%`)
  );
  body.append(grid);

  // Per-run / per-SKU breakdown (PRD §7.5). Shows each SKU run when the SKU
  // changed mid-shift; hidden when no SKU data is available.
  const runs = summarizeRuns({
    captures: cfg.captures,
    products: cfg.products ?? [],
    shift: cfg.shift,
    timezone: cfg.timezone
  });
  if (runs.length && runs.some((r) => r.product_id)) {
    body.append(renderRunTable(runs));
  }

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.justifyContent = 'flex-end';
  footer.style.gap = 'var(--space-3)';
  footer.style.marginTop = 'var(--space-4)';

  const modalRef = { close: () => {} };
  const close = createButton({ label: 'Cerrar', onClick: () => modalRef.close() });
  const csv = createButton({
    label: 'Exportar CSV',
    kind: 'primary',
    onClick: () => {
      const contents = buildCaptureCsv({ captures: cfg.captures, snapshot: cfg.snapshot });
      const filename = `eos_${cfg.lineId}_${cfg.shiftId}_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(filename, contents);
    }
  });
  footer.append(close, csv);

  const modal = openModal({ title: 'Resumen de fin de turno', body, footer });
  modalRef.close = modal.close;
  return modal;
}

function renderRunTable(runs) {
  const wrap = document.createElement('div');
  wrap.className = 'run-summary';
  const title = document.createElement('h3');
  title.textContent = 'Corridas por SKU';
  wrap.append(title);

  const table = document.createElement('table');
  table.className = 'run-table';
  const head = document.createElement('tr');
  for (const h of ['SKU', 'Horas', 'Buenas', 'Merma', 'T. muerto', 'Objetivo', 'Efic.']) {
    const th = document.createElement('th');
    th.textContent = h;
    head.append(th);
  }
  table.append(head);

  for (const r of runs) {
    const tr = document.createElement('tr');
    const eff = r.efficiency === null ? '—' : `${r.efficiency.toFixed(0)}%`;
    const cells = [r.product_name, r.hours, r.good, r.scrap, `${r.downtime} min`, r.target || '—', eff];
    for (const c of cells) {
      const td = document.createElement('td');
      td.textContent = String(c);
      tr.append(td);
    }
    table.append(tr);
  }
  wrap.append(table);
  return wrap;
}
