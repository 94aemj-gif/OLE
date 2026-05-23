// @ts-check
/**
 * Render Resumen tab — weekstrip + session history + audit log.
 *
 * @param {{container: HTMLElement, client:any, timezone:string}} cfg
 */
export function renderResumen(cfg) {
  cfg.container.innerHTML = '';
  const weekstrip = document.createElement('div');
  weekstrip.style.display = 'flex';
  weekstrip.style.gap = 'var(--space-2)';
  weekstrip.style.marginBottom = 'var(--space-4)';
  let selectedDate = todayIso(cfg.timezone);

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const iso = d.toISOString().slice(0, 10);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
    if (iso === selectedDate) btn.classList.add('btn-primary');
    btn.addEventListener('click', () => {
      selectedDate = iso;
      // re-render selection state
      weekstrip.querySelectorAll('button').forEach((b) => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
      void refresh();
    });
    weekstrip.append(btn);
  }
  cfg.container.append(weekstrip);

  const sessions = document.createElement('section');
  sessions.innerHTML = '<h3>Historial de Sesiones</h3>';
  const sessionTable = document.createElement('div');
  sessions.append(sessionTable);

  const audit = document.createElement('section');
  audit.innerHTML = '<h3>Bitácora de Movimientos</h3>';
  const auditTable = document.createElement('div');
  audit.append(auditTable);

  cfg.container.append(sessions, audit);

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
    renderSessionTable(
      sessionTable,
      (captures.body ?? []).filter((c) => c.hour_bucket >= startIso && c.hour_bucket <= endIso)
    );
    renderAuditTable(auditTable, auditLog.body ?? []);
  }

  void refresh();
  return { refresh };
}

function todayIso(_timezone) {
  return new Date().toISOString().slice(0, 10);
}

function renderSessionTable(slot, rows) {
  slot.innerHTML = '';
  if (rows.length === 0) {
    slot.textContent = 'Sin capturas en esta fecha.';
    return;
  }
  const sessions = groupBy(rows, (c) => `${c.line_id}|${c.shift_id}|${c.operator_number}`);
  const table = document.createElement('table');
  table.innerHTML = `<thead><tr><th>Línea</th><th>Turno</th><th>Operador</th><th>Capturas</th><th>Unidades</th><th>Merma</th></tr></thead>`;
  const body = document.createElement('tbody');
  for (const [key, caps] of sessions) {
    const [line_id, shift_id, operator_number] = key.split('|');
    const units = caps.reduce((a, c) => a + (c.undone ? 0 : c.units_produced || 0), 0);
    const scrap = caps.reduce(
      (a, c) => a + (c.undone ? 0 : (c.scrap_rows ?? []).reduce((b, r) => b + (r.pieces || 0), 0)),
      0
    );
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${line_id}</td><td>${shift_id}</td><td>${operator_number}</td><td>${caps.length}</td><td>${units}</td><td>${scrap}</td>`;
    body.append(tr);
  }
  table.append(body);
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  slot.append(table);
}

function renderAuditTable(slot, rows) {
  slot.innerHTML = '';
  if (rows.length === 0) {
    slot.textContent = 'Sin movimientos.';
    return;
  }
  const list = document.createElement('ul');
  list.style.padding = '0';
  list.style.listStyle = 'none';
  for (const row of rows) {
    const li = document.createElement('li');
    li.style.padding = '4px 0';
    li.textContent = `[${new Date(row.occurred_at).toLocaleString()}] ${row.actor_name} · ${row.action}`;
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
