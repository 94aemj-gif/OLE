// @ts-check
import { applyTranslations, setLang, getLang } from '../i18n/index.js';
import { createStatusPill } from '../ui/status-pill.js';
import { createCounter } from '../capture/counter.js';
import { openCapture } from '../capture/index.js';
import { readShiftState, _internals as localInternals } from '../capture/local.js';
import { readPendingUndo, applyUndo } from '../capture/undo.js';
import { showToast } from '../ui/toast.js';
import { startHourAlert } from '../capture/hour-alert.js';
import { findActiveShift } from '../time/shift.js';
import { makeSupabaseClient } from '../supabase/client.js';
import { createSyncLoop } from '../sync/index.js';
import { makeAuditWriter } from '../audit/writer.js';
import { localStore } from '../storage/local-store.js';

const CATALOG_KEY = 'catalog';
const LINE_PARAM = new URLSearchParams(location.search).get('line') ?? 'L-01';

applyTranslations();
document.getElementById('langToggle')?.addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
  location.reload();
});

const fallbackCatalog = {
  plant: { timezone: 'America/Mexico_City', default_language: 'es', hourly_alert_audio: true },
  lines: [
    {
      id: 'L-01',
      display_name: 'Línea #1 — Jeringa Neomed 60ml',
      hourly_target: 250,
      active: true
    },
    { id: 'L-02', display_name: 'Línea #2 — Jeringa Neomed 35ml', hourly_target: 300, active: true }
  ],
  shifts: [
    { id: 'M', name: 'Matutino', start: '06:00', end: '14:00', breaks: [] },
    { id: 'E', name: 'Vespertino', start: '14:00', end: '22:00', breaks: [] },
    { id: 'N', name: 'Nocturno', start: '22:00', end: '06:00', breaks: [] }
  ],
  operators: [
    { employee_number: '12345', display_name: 'Ana López', active: true },
    { employee_number: '12346', display_name: 'Luis Torres', active: true }
  ],
  scrap_reasons: [
    { id: 'SR-01', name: 'Pistón roto', active: true, sort_order: 1 },
    { id: 'SR-02', name: 'Empaque defectuoso', active: true, sort_order: 2 }
  ],
  downtime_reasons: [
    { id: 'DR-01', name: 'Junta de producción', active: true, sort_order: 1 },
    { id: 'DR-02', name: 'Cambio de material', active: true, sort_order: 2 }
  ],
  managers: [],
  health_thresholds: { heartbeat_max_age_seconds: 300, queue_depth_max: 50, delta_max: 0 }
};

const catalog = localStore.get(CATALOG_KEY, fallbackCatalog);
const line = catalog.lines.find((l) => l.id === LINE_PARAM) ?? catalog.lines[0];
const timezone = catalog.plant.timezone;
const shift = findActiveShift(new Date(), catalog.shifts, timezone) ?? catalog.shifts[0];

const lineNameEl = document.getElementById('lineName');
if (lineNameEl) lineNameEl.textContent = line.display_name;

const status = createStatusPill('operacion');
document.getElementById('statusPillSlot')?.append(status.el);

const counter = createCounter();
const counterSlot = document.getElementById('counterSlot');
if (counterSlot) {
  counterSlot.innerHTML = '';
  counterSlot.append(counter.el);
}

function refreshState() {
  const state = readShiftState();
  counter.set(state.count);
  const progress = document.getElementById('progressBar');
  if (progress) {
    const targetForShift = line.hourly_target * 8;
    const pct = Math.min((state.count / targetForShift) * 100, 100);
    progress.style.width = `${pct}%`;
  }
  const last = document.getElementById('lastCapture');
  if (last && state.last_capture) {
    const at = new Date(state.last_capture.at);
    last.textContent = `${at.toLocaleTimeString()} — ${state.last_capture.units}`;
  }
  refreshUndoUI();
}

function refreshUndoUI() {
  document.getElementById('undoChip')?.remove();
  const pending = readPendingUndo();
  if (!pending) return;
  const chip = document.createElement('button');
  chip.id = 'undoChip';
  chip.className = 'btn';
  chip.style.position = 'fixed';
  chip.style.bottom = 'var(--space-6)';
  chip.style.right = 'var(--space-6)';
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
    target: line.hourly_target * 8,
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

// Try to start sync against env-configured Supabase, no-op if unset
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (url && key) {
  const client = makeSupabaseClient({ url, anonKey: key });
  const writer = makeAuditWriter(client);
  void writer; // wiring done; capture orchestrator gets writer via context in future
  const { handleEventLocally } = await import('../reset/apply.js');
  const loop = createSyncLoop({
    client,
    applyCaptures: () => {
      refreshState();
    },
    applyEvent: (event) => {
      handleEventLocally(event);
      refreshState();
    }
  });
  loop.start();
}

if (localInternals.SHIFT_STATE_KEY) {
  // no-op; ensures local module is included
}
