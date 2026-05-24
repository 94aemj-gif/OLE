// @ts-check
import { applyTranslations, getLang, setLang } from '../i18n/index.js';
import { createLineCard } from './card.js';
import { computePace } from './pace.js';
import { computeSummary } from './summary.js';
import { rolling } from './sparkline-data.js';
import { findActiveShift, hoursElapsedInShift } from '../time/shift.js';
import { localStore } from '../storage/local-store.js';
import { loadOrSeedCatalog } from '../storage/fallback-catalog.js';

applyTranslations();
document.getElementById('langToggle')?.addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
  location.reload();
});

const catalog = loadOrSeedCatalog();
const timezone = catalog.plant.timezone;

const cards = new Map();
const grid = document.getElementById('grid');
for (const line of catalog.lines) {
  const card = createLineCard(line);
  cards.set(line.id, card);
  grid?.append(card.el);
}

function groupByLine(captures) {
  const byLine = new Map();
  for (const c of captures) {
    if (c.undone) continue;
    const list = byLine.get(c.line_id) ?? [];
    list.push(c);
    byLine.set(c.line_id, list);
  }
  return byLine;
}

function totalsFor(lineCaps) {
  const count = lineCaps.reduce((acc, c) => acc + c.units_produced, 0);
  const scrap = lineCaps.reduce(
    (acc, c) => acc + (c.scrap_rows ?? []).reduce((a, r) => a + (r.pieces || 0), 0),
    0
  );
  return { count, scrap };
}

function lastCaptureMeta(lineCaps) {
  const last = lineCaps
    .slice()
    .sort((a, b) => Date.parse(b.client_timestamp) - Date.parse(a.client_timestamp))[0];
  const operator =
    catalog.operators?.find((o) => o.employee_number === last?.operator_number) ?? null;
  const stale = !last || Date.now() - Date.parse(last.client_timestamp) > 60 * 60 * 1000;
  return { last, operator, stale };
}

function buildCardState({ line, lineCaps, shift, hours, now }) {
  const { count, scrap } = totalsFor(lineCaps);
  const { percent } = computePace({
    actual: count,
    targetPerHour: line.hourly_target,
    hoursElapsed: hours
  });
  const { last, operator, stale } = lastCaptureMeta(lineCaps);
  return {
    cardState: {
      operatorName: operator?.display_name ?? last?.operator_number,
      shiftName: shift.name ?? shift.id,
      count,
      scrap,
      target: line.hourly_target * 8,
      pacePercent: percent,
      status: stale ? 'inactivo' : 'operacion',
      sparkline: rolling(lineCaps, now, 8),
      lastCaptureAt: last?.client_timestamp,
      lastCaptureUnits: last?.units_produced
    },
    summaryRow: { line_id: line.id, count, scrap, pace: percent }
  };
}

let firstRefreshDone = false;
async function refresh() {
  const now = new Date();
  const shift = findActiveShift(now, catalog.shifts, timezone) ?? catalog.shifts[0];
  const hours = hoursElapsedInShift(now, shift, timezone);
  if (!firstRefreshDone) {
    for (const card of cards.values()) card.el.classList.add('is-loading');
  }
  const captures = await fetchCaptures();
  for (const card of cards.values()) card.el.classList.remove('is-loading');
  firstRefreshDone = true;
  showOrHidePlantEmpty(captures.length === 0);
  const byLine = groupByLine(captures);
  const lineSummaries = [];
  for (const line of catalog.lines) {
    const { cardState, summaryRow } = buildCardState({
      line,
      lineCaps: byLine.get(line.id) ?? [],
      shift,
      hours,
      now
    });
    cards.get(line.id)?.update(cardState);
    lineSummaries.push(summaryRow);
  }
  const summary = computeSummary(lineSummaries);
  setText('summaryProduction', String(summary.totalProduction));
  setText('summaryScrap', String(summary.totalScrap));
  setText('summaryLines', `${summary.linesActive}/${summary.linesTotal}`);
  setText('summaryPace', `${Math.round(summary.avgPace)}%`);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showOrHidePlantEmpty(isEmpty) {
  let banner = document.getElementById('plantEmptyBanner');
  if (isEmpty) {
    if (banner) return;
    banner = document.createElement('div');
    banner.id = 'plantEmptyBanner';
    banner.className = 'empty-state';
    banner.style.margin = 'var(--space-4) var(--space-6) 0';
    banner.innerHTML =
      '<span class="icon">📭</span><strong>Sin capturas en las últimas 8 horas</strong>' +
      '<span>Las líneas aparecerán activas en cuanto las tablets envíen la primera captura.</span>';
    grid?.parentElement?.insertBefore(banner, grid);
  } else if (banner) {
    banner.remove();
  }
}

async function fetchCaptures() {
  return localStore.get('recent_captures', []);
}

void refresh();
setInterval(() => {
  if (document.visibilityState !== 'visible') return;
  void refresh();
}, 30_000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void refresh();
});
document.getElementById('refreshBtn')?.addEventListener('click', () => void refresh());
