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
import { localStore } from '../storage/local-store.js';
import { openEosPopup } from './eos-popup.js';
import { startRemoteSync, SYNC_APPLIED_EVENT } from '../sync/bootstrap.js';

applyTranslations();
startRemoteSync();
window.addEventListener(SYNC_APPLIED_EVENT, () => void render());
document.getElementById('langToggle')?.addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
  location.reload();
});

import { loadOrSeedCatalog } from '../storage/fallback-catalog.js';
const catalog = loadOrSeedCatalog();
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

document.getElementById('eosBtn')?.addEventListener('click', () => void render({ openEos: true }));

lineSelect?.addEventListener('change', () => void render());
document.getElementById('refreshBtn')?.addEventListener('click', () => void render());

async function fetchCaptures(_sinceIso) {
  return localStore.get('recent_captures', []);
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
    await renderHourlyVsTarget(hourlyCanvas, {
      labels: data.hourLabels,
      data: data.hourly,
      target: line?.hourly_target ?? 0,
      label: 'Producción/hr'
    });
  }
  if (cumCanvas) {
    await renderCumulativeVsTarget(cumCanvas, {
      labels: data.hourLabels,
      actual: data.cum,
      target: data.cumTarget
    });
  }
  if (scrapCanvas) {
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

  setKpi('Oee', 'oeeGauge', snapshot.oee);
  setKpi('Availability', 'availGauge', snapshot.availability);
  setKpi('Performance', 'perfGauge', snapshot.performance);
  setKpi('Quality', 'qualGauge', snapshot.quality);
  setText('availSub', `${Math.round(snapshot.runMinutes)}/${snapshot.plannedMinutes} min`);
  setText('perfSub', `${snapshot.unitsProduced} / ${Math.round(snapshot.theoreticalUnits)}`);
  setText('qualSub', `${snapshot.goodUnits} / ${snapshot.unitsProduced}`);

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

function setKpi(labelId, gaugeId, ratio) {
  const pct = Math.max(0, Math.min(ratio, 1)) * 100;
  setText(`kpi${labelId}`, `${pct.toFixed(1)}%`);
  const gauge = document.getElementById(gaugeId);
  if (gauge) {
    const c = 2 * Math.PI * 35;
    gauge.setAttribute('stroke-dasharray', `${(pct / 100) * c} ${c}`);
  }
}

void render();
setInterval(() => {
  if (document.visibilityState !== 'visible') return;
  void render();
}, 30_000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void render();
});
