// @ts-check
import { mergeCatalog, patchCatalog, readLocalCatalog } from './catalog-store.js';
import { createButton } from '../ui/button.js';
import { showToast } from '../ui/toast.js';
import { buildAuditEntry } from '../audit/writer.js';

/**
 * Render the Catálogos sub-section editor as a single page.
 * Keeps each list editable with add / save buttons; reads from local cache,
 * writes via catalog-store.patchCatalog.
 *
 * @param {{container:HTMLElement, client:any, getManager:()=>{id:string,display_name:string}|null}} cfg
 */
export function renderCatalogos(cfg) {
  cfg.container.innerHTML = '';
  const catalog = readLocalCatalog();
  if (!catalog) {
    cfg.container.textContent = 'Catálogo no cargado todavía.';
    return { refresh() {} };
  }

  cfg.container.append(
    listEditor({
      title: 'Líneas',
      rows: catalog.lines ?? [],
      fields: [
        { key: 'id', label: 'ID' },
        { key: 'display_name', label: 'Nombre' },
        { key: 'hourly_target', label: 'Meta/hr', type: 'number' }
      ],
      onAdd: (row) => upsertList(cfg, 'lines', { ...row, active: true }, 'CATALOG_EDIT', 'line'),
      onDeactivate: (row) =>
        upsertList(cfg, 'lines', { id: row.id, active: false }, 'CATALOG_EDIT', 'line')
    })
  );
  cfg.container.append(
    listEditor({
      title: 'Operadores',
      rows: catalog.operators ?? [],
      fields: [
        { key: 'employee_number', label: 'N° (5 dígitos)' },
        { key: 'display_name', label: 'Nombre' }
      ],
      onAdd: (row) =>
        upsertList(cfg, 'operators', { ...row, active: true }, 'CATALOG_EDIT', 'operator'),
      onDeactivate: (row) =>
        upsertList(
          cfg,
          'operators',
          { employee_number: row.employee_number, active: false },
          'CATALOG_EDIT',
          'operator'
        )
    })
  );
  cfg.container.append(
    listEditor({
      title: 'Razones de merma',
      rows: catalog.scrap_reasons ?? [],
      fields: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Nombre' },
        { key: 'sort_order', label: 'Orden', type: 'number' }
      ],
      onAdd: (row) =>
        upsertList(cfg, 'scrap_reasons', { ...row, active: true }, 'CATALOG_EDIT', 'reason'),
      onDeactivate: (row) =>
        upsertList(cfg, 'scrap_reasons', { id: row.id, active: false }, 'CATALOG_EDIT', 'reason')
    })
  );
  cfg.container.append(
    listEditor({
      title: 'Razones de tiempo muerto',
      rows: catalog.downtime_reasons ?? [],
      fields: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Nombre' },
        { key: 'sort_order', label: 'Orden', type: 'number' }
      ],
      onAdd: (row) =>
        upsertList(cfg, 'downtime_reasons', { ...row, active: true }, 'CATALOG_EDIT', 'reason'),
      onDeactivate: (row) =>
        upsertList(cfg, 'downtime_reasons', { id: row.id, active: false }, 'CATALOG_EDIT', 'reason')
    })
  );

  return { refresh() {} };
}

async function upsertList(cfg, listKey, row, action, entityType) {
  const manager = cfg.getManager();
  if (!manager) {
    showToast('Sesión requerida');
    return;
  }
  const res = await patchCatalog(cfg.client, (data) => mergeCatalog(data, { [listKey]: [row] }));
  if (!res.ok) {
    showToast('Conflicto — refresca y reintenta');
    return;
  }
  await cfg.client.insertAudit(
    buildAuditEntry({
      actorType: 'manager',
      actorId: manager.id,
      actorName: manager.display_name,
      action,
      entityType,
      entityId: row.id ?? row.employee_number ?? null,
      detail: { listKey, row }
    })
  );
  showToast('Cambios guardados');
}

function listEditor({ title, rows, fields, onAdd, onDeactivate }) {
  const section = document.createElement('section');
  section.style.marginBottom = 'var(--space-6)';
  const h = document.createElement('h3');
  h.textContent = title;
  section.append(h);

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.marginBottom = 'var(--space-3)';
  const head = document.createElement('thead');
  head.innerHTML = `<tr>${fields.map((f) => `<th>${f.label}</th>`).join('')}<th>Activo</th><th></th></tr>`;
  table.append(head);
  const body = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      fields.map((f) => `<td>${row[f.key] ?? ''}</td>`).join('') +
      `<td>${row.active === false ? 'No' : 'Sí'}</td>`;
    const actionCell = document.createElement('td');
    if (row.active !== false) {
      actionCell.append(
        createButton({
          label: 'Desactivar',
          kind: 'danger',
          onClick: () => onDeactivate(row)
        })
      );
    }
    tr.append(actionCell);
    body.append(tr);
  }
  table.append(body);
  section.append(table);

  const form = document.createElement('form');
  form.style.display = 'flex';
  form.style.gap = 'var(--space-2)';
  form.style.flexWrap = 'wrap';
  const inputs = {};
  for (const f of fields) {
    const input = document.createElement('input');
    input.placeholder = f.label;
    input.type = f.type ?? 'text';
    inputs[f.key] = input;
    form.append(input);
  }
  const submit = createButton({
    label: 'Agregar',
    kind: 'primary',
    onClick: (ev) => {
      ev?.preventDefault?.();
      const row = {};
      for (const f of fields) {
        row[f.key] = f.type === 'number' ? Number(inputs[f.key].value) : inputs[f.key].value;
      }
      onAdd(row);
    }
  });
  form.append(submit);
  section.append(form);
  return section;
}
