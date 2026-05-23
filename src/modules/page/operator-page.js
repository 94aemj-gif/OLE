// @ts-check
import { applyTranslations, setLang, getLang } from '../i18n/index.js';
import { createStatusPill } from '../ui/status-pill.js';
import { createCounter } from '../capture/counter.js';
import { openCapture } from '../capture/index.js';
import { readShiftState, _internals as localInternals } from '../capture/local.js';
import { readPendingUndo, applyUndo } from '../capture/undo.js';
import { showToast } from '../ui/toast.js';
import { startHourAlert } from '../capture/hour-alert.js';
import { findActiveShift, hoursElapsedInShift } from '../time/shift.js';
import { computePace } from '../dashboard/pace.js';
import { makeSupabaseClient } from '../supabase/client.js';
import { createSyncLoop } from '../sync/index.js';
import { makeAuditWriter } from '../audit/writer.js';
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

function refreshState() {
  const state = readShiftState();
  counter.set(state.count);
  const progress = document.getElementById('progressBar');
  if (progress) {
    const pct = Math.min((state.count / targetForShift) * 100, 100);
    progress.style.width = `${pct}%`;
  }
  const last = document.getElementById('lastCapture');
  if (last && state.last_capture) {
    const at = new Date(state.last_capture.at);
    last.textContent = `${at.toLocaleTimeString()} — ${state.last_capture.units}`;
  }
  const paceTile = document.getElementById('paceTile');
  if (paceTile) {
    const hours = hoursElapsedInShift(new Date(), shift, timezone);
    const { percent } = computePace({
      actual: state.count,
      targetPerHour: line.hourly_target,
      hoursElapsed: hours
    });
    paceTile.textContent = `${Math.round(percent)}%`;
  }
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

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (url && key) {
  const client = makeSupabaseClient({ url, anonKey: key });
  const writer = makeAuditWriter(client);
  void writer;
  const { handleEventLocally } = await import('../reset/apply.js');
  const loop = createSyncLoop({
    client,
    applyCaptures: () => refreshState(),
    applyEvent: (event) => {
      handleEventLocally(event);
      refreshState();
    }
  });
  loop.start();
}

if (localInternals.SHIFT_STATE_KEY) {
  /* keep module reference */
}
