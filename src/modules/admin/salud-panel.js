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
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  const head = document.createElement('thead');
  head.innerHTML = `
    <tr>
      <th>Tablet</th><th>Línea</th><th>Heartbeat</th>
      <th>Cola</th><th>Dead-letter 24h</th><th>Último sync</th>
      <th>Δ local/srv</th><th>Versión</th>
    </tr>`;
  table.append(head);
  const body = document.createElement('tbody');
  table.append(body);
  cfg.container.append(table);

  async function refresh() {
    body.innerHTML = '';
    let rows = [];
    try {
      const res = await cfg.client.listTabletHealth();
      rows = Array.isArray(res.body) ? res.body : [];
    } catch (err) {
      console.warn('salud fetch failed', err);
    }
    const now = new Date();
    for (const row of rows) {
      const tr = document.createElement('tr');
      const flags = evaluateRow(row, cfg.thresholds, now);
      tr.append(
        td(row.tablet_id),
        td(row.assigned_line_id ?? '—'),
        td(formatTime(row.last_heartbeat), flags.heartbeatStale),
        td(String(row.push_queue_depth), flags.queueHigh),
        td(String(row.dead_letter_24h), flags.deadLetterPresent),
        td(row.last_successful_sync ? formatTime(row.last_successful_sync) : '—'),
        td(String(row.local_vs_server_delta), flags.deltaHigh),
        td(row.app_version)
      );
      body.append(tr);
    }
  }

  refresh();
  const interval = setInterval(refresh, 30_000);
  return { refresh, stop: () => clearInterval(interval) };
}

function td(text, warn = false) {
  const cell = document.createElement('td');
  cell.textContent = text;
  cell.style.padding = '8px 12px';
  cell.style.borderBottom = '1px solid var(--color-border)';
  if (warn) cell.style.background = '#fee2e2';
  return cell;
}

function formatTime(iso) {
  return new Date(iso).toLocaleString();
}
