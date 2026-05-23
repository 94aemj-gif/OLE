// @ts-check
import { applyTranslations, getLang, setLang } from '../i18n/index.js';
import { buildSnapshot, snapshotCached } from '../kpi/snapshot.js';
import { unitsByHour, cumulative, scrapByHour, heatmap } from '../kpi/buckets.js';
import {
  renderHourlyVsTarget,
  renderCumulativeVsTarget,
  renderScrapByHour,
  renderHeatmap
} from '../charts/index.js';
import { plantDayRange } from '../time/plant-day.js';
import { findActiveShift } from '../time/shift.js';
import { makeSupabaseClient } from '../supabase/client.js';
import { localStore } from '../storage/local-store.js';
import { openEosPopup } from './eos-popup.js';
import { createButton } from '../ui/button.js';

applyTranslations();
document.getElementById('langToggle')?.addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
  location.reload();
});

const fallbackCatalog = {
  plant: { timezone: 'America/Mexico_City' },
  lines: [
    { id: 'L-01', display_name: 'Línea #1 — Jeringa Neomed 60ml', hourly_target: 250 },
    { id: 'L-02', display_name: 'Línea #2 — Jeringa Neomed 35ml', hourly_target: 300 }
  ],
  shifts: [
    { id: 'S-MORNING', name: 'Matutino', start: '06:00', end: '14:00', breaks: [] },
    { id: 'S-EVENING', name: 'Vespertino', start: '14:00', end: '22:00', breaks: [] },
    { id: 'S-NIGHT', name: 'Nocturno', start: '22:00', end: '06:00', breaks: [] }
  ]
};

const catalog = localStore.get('catalog', fallbackCatalog);
const timezone = catalog.plant.timezone;

const lineSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('lineSelect'));
if (lineSelect) {
  for (const line of catalog.lines) {
    const opt = document.createElement('option');
    opt.value = line.id;
    opt.textContent = line.display_name;
    lineSelect.append(opt);
  }
  lineSelect.value = catalog.lines[0]?.id ?? '';
}

const eosBtn = document.getElementById('eosBtn');
if (eosBtn) {
  const btn = createButton({
    label: 'Resumen de fin de turno',
    kind: 'primary',
    onClick: () => render({ openEos: true })
  });
  eosBtn.replaceWith(btn);
  btn.id = 'eosBtn';
}

lineSelect?.addEventListener('change', () => void render());
document.getElementById('refreshBtn')?.addEventListener('click', () => void render());

async function fetchCaptures(sinceIso) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return localStore.get('recent_captures', []);
  try {
    const client = makeSupabaseClient({ url, anonKey: key });
    const res = await client.listCaptures({ watermarkIso: sinceIso });
    return Array.isArray(res.body) ? res.body : [];
  } catch (err) {
    console.warn('graficas fetch failed; falling back to local cache', err);
    return localStore.get('recent_captures', []);
  }
}

function selectContext() {
  const now = new Date();
  const { startIso, endIso } = plantDayRange(now, timezone);
  const shift = findActiveShift(now, catalog.shifts, timezone) ?? catalog.shifts[0];
  const lineId = lineSelect?.value ?? catalog.lines[0].id;
  const line = catalog.lines.find((l) => l.id === lineId);
  return { startIso, endIso, shift, lineId, line };
}

function buildDataSets({ todayCaps, lineCaps, startIso, line }) {
  const hourLabels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const hourly = unitsByHour(todayCaps, startIso);
  const cum = cumulative(hourly);
  const cumTarget = cum.map((_, i) => (line?.hourly_target ?? 0) * (i + 1));
  const scrap = scrapByHour(todayCaps, startIso);
  const heat = heatmap(lineCaps, startIso, 14);
  return { hourLabels, hourly, cum, cumTarget, scrap, heat };
}

async function paintCharts(data, line) {
  const hourlyCanvas = /** @type {HTMLCanvasElement|null} */ (
    document.getElementById('hourlyChart')
  );
  const cumCanvas = /** @type {HTMLCanvasElement|null} */ (
    document.getElementById('cumulativeChart')
  );
  const scrapCanvas = /** @type {HTMLCanvasElement|null} */ (document.getElementById('scrapChart'));
  if (hourlyCanvas) {
    destroyExisting(hourlyCanvas);
    await renderHourlyVsTarget(hourlyCanvas, {
      labels: data.hourLabels,
      data: data.hourly,
      target: line?.hourly_target ?? 0,
      label: 'Producción/hr'
    });
  }
  if (cumCanvas) {
    destroyExisting(cumCanvas);
    await renderCumulativeVsTarget(cumCanvas, {
      labels: data.hourLabels,
      actual: data.cum,
      target: data.cumTarget
    });
  }
  if (scrapCanvas) {
    destroyExisting(scrapCanvas);
    await renderScrapByHour(scrapCanvas, { labels: data.hourLabels, data: data.scrap });
  }
}

function paintHeatmap(heat, startIso) {
  const heatSlot = document.getElementById('heatmap');
  if (!heatSlot) return;
  heatSlot.innerHTML = '';
  const dayLabels = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.parse(startIso) - (13 - i) * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
  });
  heatSlot.append(renderHeatmap(heat, dayLabels));
}

async function render(opts = {}) {
  const ctx = selectContext();
  const heatmapStartIso = new Date(
    Date.parse(ctx.startIso) - 13 * 24 * 60 * 60 * 1000
  ).toISOString();
  const captures = await fetchCaptures(heatmapStartIso);
  const lineCaps = captures.filter((c) => c.line_id === ctx.lineId);
  const todayCaps = lineCaps.filter(
    (c) => c.hour_bucket >= ctx.startIso && c.hour_bucket < ctx.endIso
  );

  const snapshot = snapshotCached(
    `${ctx.lineId}:${ctx.shift.id}:${ctx.startIso}:${todayCaps.length}`,
    () =>
      buildSnapshot({
        captures: todayCaps,
        shift: ctx.shift,
        hourlyTarget: ctx.line?.hourly_target ?? 0,
        window: { lineId: ctx.lineId, date: ctx.startIso }
      })
  );

  setText('kpiOee', `${(snapshot.oee * 100).toFixed(1)}%`);
  setText('kpiAvailability', `${(snapshot.availability * 100).toFixed(1)}%`);
  setText('kpiPerformance', `${(snapshot.performance * 100).toFixed(1)}%`);
  setText('kpiQuality', `${(snapshot.quality * 100).toFixed(1)}%`);

  const data = buildDataSets({ todayCaps, lineCaps, startIso: ctx.startIso, line: ctx.line });
  await paintCharts(data, ctx.line);
  paintHeatmap(data.heat, ctx.startIso);

  if (opts.openEos) {
    openEosPopup({ snapshot, captures: todayCaps, lineId: ctx.lineId, shiftId: ctx.shift.id });
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function destroyExisting(canvas) {
  const Chart = /** @type {any} */ (globalThis).Chart;
  if (!Chart || !Chart.getChart) return;
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
}

void render();
setInterval(() => void render(), 30_000);
