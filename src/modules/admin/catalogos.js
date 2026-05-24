// @ts-check
import { mergeCatalog, patchCatalog, readLocalCatalog } from './catalog-store.js';
import { createButton } from '../ui/button.js';
import { showToast } from '../ui/toast.js';
import { buildAuditEntry } from '../audit/writer.js';

const SECTIONS = [
  {
    title: 'Líneas',
    listKey: 'lines',
    entityType: 'line',
    keyField: 'id',
    fields: [
      { key: 'id', label: 'ID' },
      { key: 'display_name', label: 'Nombre' },
      { key: 'hourly_target', label: 'Meta/hr', type: 'number', align: 'right' }
    ]
  },
  {
    title: 'Operadores',
    listKey: 'operators',
    entityType: 'operator',
    keyField: 'employee_number',
    fields: [
      { key: 'employee_number', label: 'N° (5 dígitos)' },
      { key: 'display_name', label: 'Nombre' }
    ]
  },
  {
    title: 'Razones de merma',
    listKey: 'scrap_reasons',
    entityType: 'reason',
    keyField: 'id',
    fields: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nombre' },
      { key: 'sort_order', label: 'Orden', type: 'number', align: 'right' }
    ]
  },
  {
    title: 'Razones de tiempo muerto',
    listKey: 'downtime_reasons',
    entityType: 'reason',
    keyField: 'id',
    fields: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nombre' },
      { key: 'sort_order', label: 'Orden', type: 'number', align: 'right' }
    ]
  }
];

/**
 * @param {{container:HTMLElement, client:any, getManager:()=>{id:string,display_name:string}|null}} cfg
 */
export function renderCatalogos(cfg) {
  cfg.container.innerHTML = '';
  const catalog = readLocalCatalog();
  if (!catalog) {
    emptyState(cfg.container, 'Catálogo no cargado todavía. Abre la app en una tablet primero.');
    return { refresh() {} };
  }
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gap = 'var(--space-4)';
  for (const section of SECTIONS) {
    grid.append(renderSection(cfg, section, catalog[section.listKey] ?? []));
  }
  cfg.container.append(grid);
  return { refresh() {} };
}

function renderSection(cfg, section, rows) {
  const wrap = document.createElement('section');
  wrap.className = 'panel-section';

  const header = document.createElement('header');
  const h = document.createElement('h2');
  h.textContent = section.title;
  const count = document.createElement('span');
  count.className = 'count';
  const active = rows.filter((r) => r.active !== false).length;
  count.textContent = `${active} activos`;
  header.append(h, count);
  wrap.append(header);

  const table = document.createElement('table');
  table.className = 'data';
  const headRow = document.createElement('tr');
  for (const f of section.fields) {
    const th = document.createElement('th');
    th.textContent = f.label;
    if (f.align === 'right') th.style.textAlign = 'right';
    headRow.append(th);
  }
  const statusTh = document.createElement('th');
  statusTh.textContent = 'Estado';
  headRow.append(statusTh);
  const thead = document.createElement('thead');
  thead.append(headRow);
  table.append(thead);

  const body = document.createElement('tbody');
  if (rows.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="${section.fields.length + 1}" style="color: var(--text-muted); text-align:center; padding: 24px">Sin entradas. Agrega la primera abajo.</td>`;
    body.append(tr);
  } else {
    for (const row of rows) body.append(renderRow(cfg, section, row));
  }
  table.append(body);
  const scroll = document.createElement('div');
  scroll.className = 'table-scroll';
  scroll.append(table);
  wrap.append(scroll);

  wrap.append(renderAddForm(cfg, section));
  return wrap;
}

function renderRow(cfg, section, row) {
  const tr = document.createElement('tr');
  for (const f of section.fields) {
    const td = document.createElement('td');
    td.textContent = String(row[f.key] ?? '');
    if (f.align === 'right') {
      td.style.textAlign = 'right';
      td.style.fontVariantNumeric = 'tabular-nums';
    }
    tr.append(td);
  }
  const statusTd = document.createElement('td');
  const statusPill = document.createElement('span');
  statusPill.className = 'status-pill';
  if (row.active === false) {
    statusPill.dataset.state = 'inactivo';
    statusPill.textContent = 'Inactivo';
  } else {
    statusPill.dataset.state = 'operacion';
    statusPill.textContent = 'Activo';
  }
  statusTd.append(statusPill);
  tr.append(statusTd);
  return tr;
}

function renderAddForm(cfg, section) {
  const form = document.createElement('form');
  form.style.display = 'grid';
  form.style.gridTemplateColumns = `repeat(auto-fit, minmax(140px, 1fr))`;
  form.style.gap = 'var(--space-2)';
  form.style.padding = 'var(--space-3) var(--space-4)';
  form.style.background = 'var(--surface-soft)';
  form.style.borderTop = '1px solid var(--border)';

  const inputs = {};
  for (const f of section.fields) {
    const input = document.createElement('input');
    input.placeholder = f.label;
    input.type = f.type ?? 'text';
    input.style.padding = '8px 12px';
    input.style.border = '1px solid var(--border)';
    input.style.borderRadius = 'var(--radius-sm)';
    input.style.fontSize = 'var(--text-sm)';
    input.style.background = 'var(--surface)';
    if (f.align === 'right') input.style.textAlign = 'right';
    inputs[f.key] = input;
    form.append(input);
  }
  const submit = createButton({
    label: '+ Agregar',
    kind: 'primary',
    onClick: (ev) => {
      ev?.preventDefault?.();
      const row = { active: true };
      let allFilled = true;
      for (const f of section.fields) {
        const raw = inputs[f.key].value;
        if (!raw) allFilled = false;
        row[f.key] = f.type === 'number' ? Number(raw) : raw;
      }
      if (!allFilled) {
        showToast('Completa todos los campos');
        return;
      }
      void upsertList(cfg, section.listKey, row, section.entityType, row[section.keyField]).then(
        () => {
          for (const f of section.fields) inputs[f.key].value = '';
        }
      );
    }
  });
  submit.style.minHeight = '36px';
  form.append(submit);
  return form;
}

async function upsertList(cfg, listKey, row, entityType, entityId) {
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
      action: 'CATALOG_EDIT',
      entityType,
      entityId: entityId ?? null,
      detail: { listKey, row }
    })
  );
  showToast('Cambios guardados');
}

function emptyState(container, msg) {
  const p = document.createElement('p');
  p.style.padding = 'var(--space-6)';
  p.style.color = 'var(--text-muted)';
  p.style.fontSize = 'var(--text-sm)';
  p.style.background = 'var(--surface)';
  p.style.borderRadius = 'var(--radius-md)';
  p.style.border = '1px solid var(--border)';
  p.textContent = msg;
  container.append(p);
}
