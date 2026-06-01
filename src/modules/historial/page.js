// @ts-check
import { applyTranslations, getLang, setLang } from '../i18n/index.js';
import { loadOrSeedCatalog } from '../storage/fallback-catalog.js';
import { localStore } from '../storage/local-store.js';
import { buildWindows } from '../analysis/windows.js';
import { compareWindows, trendBySku } from '../analysis/history.js';
import { renderCompareBars, renderSkuTrend } from '../charts/index.js';
import { startRemoteSync, SYNC_APPLIED_EVENT } from '../sync/bootstrap.js';

applyTranslations();
startRemoteSync();
document.getElementById('langToggle')?.addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
  location.reload();
});

const catalog = loadOrSeedCatalog();
const timezone = catalog.plant.timezone;

const lineSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('lineSelect'));
const groupSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('groupSelect'));

if (lineSelect) {
  for (const line of catalog.lines) {
    const opt = document.createElement('option');
    opt.value = line.id;
    opt.textContent = line.display_name;
    lineSelect.append(opt);
  }
  lineSelect.value = catalog.lines[0]?.id ?? '';
}

lineSelect?.addEventListener('change', () => void render());
groupSelect?.addEventListener('change', () => void render());
document.getElementById('refreshBtn')?.addEventListener('click', () => void render());
window.addEventListener(SYNC_APPLIED_EVENT, () => void render());

function lineProducts(line) {
  return (catalog.products ?? []).filter((p) => (line?.product_ids ?? []).includes(p.id));
}

function fmt(n) {
  return new Intl.NumberFormat().format(n);
}

function renderCompareTable(rows) {
  const slot = document.getElementById('compareTable');
  if (!slot) return;
  if (!rows.length) {
    slot.innerHTML = '<p class="empty-state" style="padding:16px">Sin datos para comparar.</p>';
    return;
  }
  const head = `<thead><tr>
    <th>Ventana</th>
    <th style="text-align:right">Bueno</th>
    <th style="text-align:right">Objetivo</th>
    <th style="text-align:right">Efic.</th>
    <th style="text-align:right">Merma</th>
    <th style="text-align:right">T. muerto</th>
  </tr></thead>`;
  const body = rows
    .map((r) => {
      const eff = r.efficiency === null ? '—' : `${r.efficiency.toFixed(0)}%`;
      const tgt = r.target > 0 ? fmt(r.target) : '—';
      return `<tr>
        <td><strong>${r.label}</strong></td>
        <td style="text-align:right;font-variant-numeric:tabular-nums"><strong>${fmt(r.good)}</strong></td>
        <td style="text-align:right;font-variant-numeric:tabular-nums">${tgt}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums">${eff}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums;color:var(--crit)">${fmt(r.scrap)}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums">${r.downtime} min</td>
      </tr>`;
    })
    .join('');
  slot.innerHTML = `<div class="table-scroll"><table class="data">${head}<tbody>${body}</tbody></table></div>`;
}

/** Align per-SKU series onto a shared sorted bucket axis (null where missing). */
function alignTrend(trend) {
  const buckets = [...new Set(trend.flatMap((t) => t.series.map((s) => s.bucket)))].sort();
  const series = trend.map((t) => {
    const byBucket = new Map(t.series.map((s) => [s.bucket, s.good]));
    return { name: t.product_name, data: buckets.map((b) => byBucket.get(b) ?? null) };
  });
  return { labels: buckets, series };
}

async function render() {
  const lineId = lineSelect?.value ?? catalog.lines[0]?.id;
  const grouping = /** @type {'day'|'shift'|'week'} */ (groupSelect?.value ?? 'day');
  const line = catalog.lines.find((l) => l.id === lineId);
  const products = lineProducts(line);

  const all = localStore.get('recent_captures', []);
  const lineCaps = all.filter((c) => c.line_id === lineId);

  // Compare windows
  const windows = buildWindows(lineCaps, grouping);
  const rows = compareWindows(windows, { products, shifts: catalog.shifts, timezone });
  renderCompareTable(rows);
  const compareCanvas = /** @type {HTMLCanvasElement|null} */ (
    document.getElementById('compareChart')
  );
  if (compareCanvas) {
    await renderCompareBars(compareCanvas, {
      labels: rows.map((r) => r.label),
      good: rows.map((r) => r.good),
      target: rows.map((r) => r.target)
    });
  }

  // SKU trend
  const trend = alignTrend(trendBySku(lineCaps, { products }));
  const trendCanvas = /** @type {HTMLCanvasElement|null} */ (
    document.getElementById('trendChart')
  );
  if (trendCanvas) await renderSkuTrend(trendCanvas, trend);
}

void render();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void render();
});
