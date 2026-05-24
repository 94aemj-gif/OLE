// @ts-check
import { applyTranslations, setLang, getLang } from '../i18n/index.js';
import { createStatusPill } from '../ui/status-pill.js';
import { createCounter } from '../capture/counter.js';
import { openCapture } from '../capture/index.js';
import { readShiftState } from '../capture/local.js';
import { readPendingUndo, applyUndo } from '../capture/undo.js';
import { plantDayRange } from '../time/plant-day.js';
import { showToast } from '../ui/toast.js';
import { startHourAlert } from '../capture/hour-alert.js';
import { findActiveShift, hoursElapsedInShift } from '../time/shift.js';
import { computePace } from '../dashboard/pace.js';
import { localStore } from '../storage/local-store.js';
import { loadOrSeedCatalog } from '../storage/fallback-catalog.js';

const LINE_PARAM = new URLSearchParams(location.search).get('line') ?? 'L-01';

applyTranslations();
document.getElementById('langToggle')?.addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
  location.reload();
});

const catalog = loadOrSeedCatalog();
const line = catalog.lines.find((l) => l.id === LINE_PARAM) ?? catalog.lines[0];
const timezone = catalog.plant.timezone;
const shift = findActiveShift(new Date(), catalog.shifts, timezone) ?? catalog.shifts[0];
const targetForShift = line.hourly_target * 8;
const plantDayIso = plantDayRange(new Date(), timezone).startIso;
const lineCtx = { line_id: line.id, shift_id: shift.id, plantDayIso };

const lineNameEl = document.getElementById('lineName');
if (lineNameEl) lineNameEl.textContent = line.display_name;

const status = createStatusPill('operacion');
document.getElementById('statusPillSlot')?.append(status.el);

const counter = createCounter();
counter.el.classList.add('count');
const counterSlot = document.getElementById('counterSlot');
if (counterSlot) {
  counterSlot.innerHTML = '';
  counterSlot.append(counter.el);
}

setTileText('targetTile', String(targetForShift));
setTileText('shiftTile', shift.name ?? shift.id);
setTileText('shiftTileSub', `${shift.start}–${shift.end}`);

function setTileText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderProgress(state) {
  const progress = document.getElementById('progressBar');
  if (!progress) return;
  const pct = Math.min((state.count / targetForShift) * 100, 100);
  progress.style.width = `${pct}%`;
  progress.parentElement?.setAttribute('aria-valuenow', String(Math.round(pct)));
}

function renderLastCapture(state) {
  const last = document.getElementById('lastCapture');
  if (!last) return;
  if (state.last_capture) {
    const at = new Date(state.last_capture.at);
    last.textContent = `${at.toLocaleTimeString()} — ${state.last_capture.units}`;
  } else {
    last.textContent = '—';
  }
}

function renderEmptyHint(state) {
  const heroEl = document.querySelector('.operator-hero');
  let hint = document.getElementById('operatorEmptyHint');
  const shouldShow = heroEl && state.count === 0 && !state.last_capture;
  if (shouldShow) {
    if (hint) return;
    hint = document.createElement('div');
    hint.id = 'operatorEmptyHint';
    hint.className = 'empty-state';
    hint.innerHTML =
      '<span class="icon">⌛</span><strong>Aún sin capturas en este turno</strong>' +
      '<span>Toca <strong>CAPTURAR</strong> al cierre de cada hora para registrar la producción.</span>';
    heroEl.append(hint);
  } else if (hint) {
    hint.remove();
  }
}

function renderPace(state) {
  const paceTile = document.getElementById('paceTile');
  if (!paceTile) return;
  const hours = hoursElapsedInShift(new Date(), shift, timezone);
  const { percent } = computePace({
    actual: state.count,
    targetPerHour: line.hourly_target,
    hoursElapsed: hours
  });
  paceTile.textContent = `${Math.round(percent)}%`;
}

function refreshState() {
  const state = readShiftState(lineCtx);
  counter.set(state.count);
  renderProgress(state);
  renderLastCapture(state);
  renderEmptyHint(state);
  renderPace(state);
  refreshUndoUI();
}

function refreshUndoUI() {
  document.getElementById('undoChip')?.remove();
  const pending = readPendingUndo();
  if (!pending) return;
  const chip = document.createElement('button');
  chip.id = 'undoChip';
  chip.className = 'undo-chip';
  chip.textContent = '↶ ' + (getLang() === 'es' ? 'Deshacer' : 'Undo');
  chip.addEventListener('click', () => {
    if (applyUndo()) {
      showToast(getLang() === 'es' ? 'Captura deshecha' : 'Capture undone');
      refreshState();
    }
  });
  document.body.append(chip);
  setTimeout(refreshUndoUI, 1000);
}

const captureBtn = document.getElementById('captureBtn');
captureBtn?.addEventListener('click', () => {
  openCapture({
    catalog,
    line_id: line.id,
    shift_id: shift.id,
    client_id: getTabletId(),
    timezone,
    plantDayIso,
    target: targetForShift,
    appendAudit: async () => {},
    onState: () => refreshState()
  });
});

function getTabletId() {
  const existing = localStore.get('tablet_id', null);
  if (existing) return existing;
  const id =
    'tablet-' + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  localStore.set('tablet_id', id);
  return id;
}

refreshState();

startHourAlert({
  enabled: () => catalog.plant.hourly_alert_audio !== false,
  onTick: (msg) => showToast(msg)
});
