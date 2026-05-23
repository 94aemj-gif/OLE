// @ts-check
import { evaluateRow } from '../health/metrics.js';

/**
 * Render the Salud del Sistema table.
 *
 * @param {{
 *   container: HTMLElement,
 *   client: any,
 *   thresholds: {heartbeat_max_age_seconds:number, queue_depth_max:number, delta_max:number}
 * }} cfg
 */
export function renderSaludPanel(cfg) {
  cfg.container.innerHTML = '';
  const wrap = document.createElement('section');
  wrap.className = 'panel-section';
  const header = document.createElement('header');
  header.innerHTML = '<h2>Salud por tablet</h2><span class="count" id="saludCount">—</span>';
  wrap.append(header);

  const table = document.createElement('table');
  table.className = 'data';
  table.innerHTML = `<thead><tr>
    <th>Tablet</th><th>Línea</th><th>Heartbeat</th>
    <th style="text-align:right">Cola</th>
    <th style="text-align:right">Dead-letter 24h</th>
    <th>Último sync</th>
    <th style="text-align:right">Δ local/srv</th>
    <th>Versión</th>
  </tr></thead>`;
  const body = document.createElement('tbody');
  table.append(body);
  const scroll = document.createElement('div');
  scroll.className = 'table-scroll';
  scroll.append(table);
  wrap.append(scroll);
  cfg.container.append(wrap);

  async function refresh() {
    body.innerHTML = '';
    let rows = [];
    try {
      const res = await cfg.client.listTabletHealth();
      rows = Array.isArray(res.body) ? res.body : [];
    } catch (err) {
      console.warn('salud fetch failed', err);
    }
    const countEl = document.getElementById('saludCount');
    if (countEl) countEl.textContent = `${rows.length} tablets`;
    if (rows.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        `<td colspan="8" style="color: var(--text-muted); text-align: center; padding: 24px">` +
        `Sin tablets reportando — verifica que la app esté abierta en cada línea.</td>`;
      body.append(tr);
      return;
    }
    const now = new Date();
    for (const row of rows) {
      const tr = document.createElement('tr');
      const flags = evaluateRow(row, cfg.thresholds, now);
      tr.append(
        td(row.tablet_id, false, true),
        td(row.assigned_line_id ?? '—'),
        td(formatTime(row.last_heartbeat), flags.heartbeatStale),
        td(String(row.push_queue_depth), flags.queueHigh, false, true),
        td(String(row.dead_letter_24h), flags.deadLetterPresent, false, true),
        td(row.last_successful_sync ? formatTime(row.last_successful_sync) : '—'),
        td(String(row.local_vs_server_delta), flags.deltaHigh, false, true),
        td(row.app_version)
      );
      body.append(tr);
    }
  }

  refresh();
  const interval = setInterval(refresh, 30_000);
  return { refresh, stop: () => clearInterval(interval) };
}

function td(text, warn = false, mono = false, alignRight = false) {
  const cell = document.createElement('td');
  cell.textContent = text;
  if (warn) {
    cell.style.background = 'var(--crit-soft)';
    cell.style.color = 'var(--crit)';
    cell.style.fontWeight = '700';
  }
  if (mono) cell.style.fontVariantNumeric = 'tabular-nums';
  if (alignRight) cell.style.textAlign = 'right';
  return cell;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString();
}
