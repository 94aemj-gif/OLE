// @ts-check
import { openModal } from '../ui/modal.js';
import { createButton } from '../ui/button.js';
import { buildCaptureCsv, downloadCsv } from '../export/csv.js';

/**
 * @param {{snapshot:any, captures:any[], lineId:string, shiftId:string}} cfg
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
