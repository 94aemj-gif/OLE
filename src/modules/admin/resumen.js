// @ts-check
/**
 * Render Resumen tab — weekstrip + session history + audit log (Worximity Dense).
 *
 * @param {{container: HTMLElement, client:any, timezone:string}} cfg
 */
export function renderResumen(cfg) {
  cfg.container.innerHTML = '';

  const weekstrip = document.createElement('div');
  weekstrip.className = 'weekstrip';
  let selectedDate = todayIso();
  buildWeekstrip(weekstrip, selectedDate, (iso) => {
    selectedDate = iso;
    weekstrip.querySelectorAll('button').forEach((b) => b.classList.remove('btn-primary'));
    weekstrip.querySelector(`button[data-iso="${iso}"]`)?.classList.add('btn-primary');
    void refresh();
  });
  cfg.container.append(weekstrip);

  const panels = document.createElement('div');
  panels.className = 'admin-panels';

  const sessions = makePanel('Historial de Sesiones', 'sessionsCount');
  const audit = makePanel('Bitácora de Movimientos', 'auditCount');
  panels.append(sessions.wrap, audit.wrap);
  cfg.container.append(panels);

  async function refresh() {
    const startIso = `${selectedDate}T00:00:00.000Z`;
    const endIso = `${selectedDate}T23:59:59.999Z`;
    const [captures, auditLog] = await Promise.all([
      cfg.client
        .listCaptures({ watermarkIso: startIso, includeUndone: true, limit: 1000 })
        .catch(() => ({ body: [] })),
      cfg.client.listAuditLog?.({ startIso, endIso, limit: 200 }).catch(() => ({ body: [] })) ?? {
        body: []
      }
    ]);
    const filtered = (captures.body ?? []).filter(
      (c) => c.hour_bucket >= startIso && c.hour_bucket <= endIso
    );
    renderSessionTable(sessions.slot, filtered, sessions.count);
    renderAuditList(audit.slot, auditLog.body ?? [], audit.count);
  }

  void refresh();
  return { refresh };
}

function buildWeekstrip(root, selectedIso, onClick) {
  const dows = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const iso = d.toISOString().slice(0, 10);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.iso = iso;
    btn.innerHTML = `<span class="dow">${dows[d.getDay()]}</span><span class="day">${String(d.getDate()).padStart(2, '0')}</span>`;
    if (iso === selectedIso) btn.classList.add('btn-primary');
    btn.addEventListener('click', () => onClick(iso));
    root.append(btn);
  }
}

function makePanel(title, countId) {
  const wrap = document.createElement('section');
  wrap.className = 'panel-section';
  const head = document.createElement('header');
  const h = document.createElement('h2');
  h.textContent = title;
  const count = document.createElement('span');
  count.className = 'count';
  count.id = countId;
  count.textContent = '—';
  head.append(h, count);
  wrap.append(head);
  const slot = document.createElement('div');
  wrap.append(slot);
  return { wrap, slot, count };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyState(slot, msg) {
  slot.innerHTML = '';
  const p = document.createElement('p');
  p.style.padding = 'var(--space-5)';
  p.style.color = 'var(--text-muted)';
  p.style.fontSize = 'var(--text-sm)';
  p.style.margin = '0';
  p.textContent = msg;
  slot.append(p);
}

function renderSessionTable(slot, rows, countEl) {
  if (rows.length === 0) {
    countEl.textContent = '0';
    emptyState(slot, 'Sin capturas en esta fecha.');
    return;
  }
  const sessions = groupBy(rows, (c) => `${c.line_id}|${c.shift_id}|${c.operator_number}`);
  countEl.textContent = `${sessions.size} sesiones`;
  slot.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'data';
  table.innerHTML = `<thead><tr>
    <th>Línea</th><th>Turno</th><th>Operador</th>
    <th style="text-align:right">Capturas</th>
    <th style="text-align:right">Unidades</th>
    <th style="text-align:right">Merma</th>
  </tr></thead>`;
  const body = document.createElement('tbody');
  for (const [key, caps] of sessions) {
    const [line_id, shift_id, operator_number] = key.split('|');
    const units = caps.reduce((a, c) => a + (c.undone ? 0 : c.units_produced || 0), 0);
    const scrap = caps.reduce(
      (a, c) => a + (c.undone ? 0 : (c.scrap_rows ?? []).reduce((b, r) => b + (r.pieces || 0), 0)),
      0
    );
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td><strong>${line_id}</strong></td>` +
      `<td>${shift_id}</td>` +
      `<td>${operator_number}</td>` +
      `<td style="text-align:right; font-variant-numeric: tabular-nums">${caps.length}</td>` +
      `<td style="text-align:right; font-variant-numeric: tabular-nums"><strong>${units}</strong></td>` +
      `<td style="text-align:right; font-variant-numeric: tabular-nums; color: var(--crit)">${scrap}</td>`;
    body.append(tr);
  }
  table.append(body);
  const scroll = document.createElement('div');
  scroll.className = 'table-scroll';
  scroll.append(table);
  slot.append(scroll);
}

const ACTION_STYLE = {
  CAPTURE_CREATE: { cls: 'create', bg: 'var(--ok-soft)', fg: 'var(--ok)' },
  CAPTURE_UNDO: { cls: 'undo', bg: 'var(--warn-soft)', fg: 'var(--warn)' },
  CATALOG_EDIT: { cls: 'edit', bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  DAY_RESET: { cls: 'reset', bg: 'var(--crit-soft)', fg: 'var(--crit)' },
  DEAD_LETTER_REPLAY: { cls: 'edit', bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  DEAD_LETTER_DISCARD: { cls: 'reset', bg: 'var(--crit-soft)', fg: 'var(--crit)' },
  DEAD_LETTER_CREATE: { cls: 'undo', bg: 'var(--warn-soft)', fg: 'var(--warn)' },
  MANAGER_PIN_ROTATE: { cls: 'edit', bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  MANAGER_DEACTIVATE: { cls: 'reset', bg: 'var(--crit-soft)', fg: 'var(--crit)' }
};

function renderAuditList(slot, rows, countEl) {
  if (rows.length === 0) {
    countEl.textContent = '0';
    emptyState(slot, 'Sin movimientos en esta fecha.');
    return;
  }
  countEl.textContent = `${rows.length}`;
  slot.innerHTML = '';
  const list = document.createElement('div');
  list.style.padding = '6px 0';
  list.style.maxHeight = '480px';
  list.style.overflowY = 'auto';
  for (const row of rows) {
    const style = ACTION_STYLE[row.action] ?? {
      bg: 'var(--surface-soft)',
      fg: 'var(--text-muted)'
    };
    const li = document.createElement('div');
    li.style.padding = '10px 18px';
    li.style.fontSize = 'var(--text-sm)';
    li.style.borderBottom = '1px solid var(--border)';
    li.innerHTML =
      `<div style="color: var(--text-muted); font-size: 11px; letter-spacing: 0.1em">` +
      `${new Date(row.occurred_at).toLocaleString()}</div>` +
      `<div style="margin-top: 4px">` +
      `<span style="background: ${style.bg}; color: ${style.fg}; padding: 2px 8px; ` +
      `border-radius: 4px; font-weight: 700; font-size: 11px; letter-spacing: 0.12em; margin-right: 8px">` +
      `${row.action}</span>${row.entity_id ?? ''}</div>` +
      `<div style="color: var(--text-muted); margin-top: 2px">${row.actor_name}</div>`;
    list.append(li);
  }
  slot.append(list);
}

function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}
