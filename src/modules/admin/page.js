// @ts-check
import { applyTranslations, getLang, setLang } from '../i18n/index.js';
import { verifyPin } from '../auth/pin.js';
import { openSession, readSession, closeSession } from '../auth/session.js';
import { makeSupabaseClient } from '../supabase/client.js';
import { readLocalCatalog } from './catalog-store.js';
import { showToast } from '../ui/toast.js';
import { createButton } from '../ui/button.js';
import { renderCatalogos } from './catalogos.js';
import { renderConfiguracion } from './configuracion.js';
import { renderResumen } from './resumen.js';
import { renderSaludPanel } from './salud-panel.js';
import { renderDeadLetterView } from './dead-letter-view.js';
import { destructiveConfirm } from '../ui/destructive-confirm.js';
import { plantDayRange } from '../time/plant-day.js';
import { buildAuditEntry } from '../audit/writer.js';
import { localStore } from '../storage/local-store.js';

applyTranslations();
document.getElementById('langToggle')?.addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
  location.reload();
});

const TABS = ['resumen', 'catalogos', 'configuracion', 'datos'];
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const client = url && key ? makeSupabaseClient({ url, anonKey: key }) : null;

const root = document.getElementById('adminRoot');
const gate = document.getElementById('pinGate');
const tabbar = document.getElementById('tabbar');
const tabContent = document.getElementById('tabContent');
const logoutBtn = document.getElementById('logoutBtn');
const session = readSession();
if (session) showAdmin();
else showPinGate();

logoutBtn?.addEventListener('click', () => {
  closeSession();
  location.reload();
});

function showPinGate() {
  if (!gate) return;
  gate.style.display = 'grid';
  if (root) root.style.display = 'none';
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById('pinInput'));
  const submit = document.getElementById('pinSubmit');
  const errorSlot = document.getElementById('pinError');
  submit?.addEventListener('click', async () => {
    if (!input || !errorSlot) return;
    const catalog = readLocalCatalog();
    if (!catalog) {
      errorSlot.textContent = 'Catálogo no disponible — abre la app en una tablet primero.';
      return;
    }
    const result = await verifyPin(input.value, catalog.managers ?? []);
    if (result.ok === false) {
      const map = {
        invalid: 'PIN inválido',
        locked: 'Bloqueado temporalmente — intenta más tarde',
        deactivated: 'Manager desactivado'
      };
      errorSlot.textContent = map[result.code];
      return;
    }
    openSession(result.manager);
    showAdmin();
  });
}

function showAdmin() {
  if (!root || !gate || !tabbar || !tabContent) return;
  gate.style.display = 'none';
  root.style.display = 'block';
  if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  setActiveTab(location.hash.replace('#', '') || 'resumen');
  for (const tab of TABS) {
    const btn = document.querySelector(`[data-tab="${tab}"]`);
    btn?.addEventListener('click', () => setActiveTab(tab));
  }
}

const TAB_RENDERERS = {
  resumen: ({ container, client, timezone }) => renderResumen({ container, client, timezone }),
  catalogos: ({ container, client, getManager }) =>
    renderCatalogos({ container, client, getManager }),
  configuracion: ({ container, client, getManager }) =>
    renderConfiguracion({ container, client, getManager }),
  datos: ({ container, client, getManager, timezone, manager }) =>
    renderDatos({ container, client, getManager, timezone, manager })
};

function setActiveTab(tab) {
  const safeTab = TABS.includes(tab) ? tab : 'resumen';
  location.hash = `#${safeTab}`;
  document.querySelectorAll('[data-tab]').forEach((el) => {
    el.classList.toggle('btn-primary', el.getAttribute('data-tab') === safeTab);
  });
  if (!tabContent) return;
  if (!client) {
    tabContent.textContent = 'Supabase no configurado — fija VITE_SUPABASE_URL.';
    return;
  }
  const manager = readSession()?.manager ?? null;
  const getManager = () => readSession()?.manager ?? null;
  const catalog = readLocalCatalog();
  const timezone = catalog?.plant?.timezone ?? 'America/Mexico_City';
  tabContent.innerHTML = '';
  TAB_RENDERERS[safeTab]({ container: tabContent, client, getManager, timezone, manager });
}

function renderDatos({ container, client, getManager, timezone, manager }) {
  container.innerHTML = '';
  const resetSection = document.createElement('section');
  resetSection.innerHTML = '<h3>Reset Día Actual</h3>';
  resetSection.append(
    createButton({
      label: 'Reset Día Actual',
      kind: 'danger',
      onClick: () => openResetFlow({ client, getManager, timezone })
    })
  );

  const dlSection = document.createElement('section');
  dlSection.style.marginTop = 'var(--space-6)';
  dlSection.innerHTML = '<h3>Capturas Pendientes (dead-letter)</h3>';
  const dlSlot = document.createElement('div');
  dlSection.append(dlSlot);

  const saludSection = document.createElement('section');
  saludSection.style.marginTop = 'var(--space-6)';
  saludSection.innerHTML = '<h3>Salud del Sistema</h3>';
  const saludSlot = document.createElement('div');
  saludSection.append(saludSlot);

  container.append(resetSection, dlSection, saludSection);
  renderDeadLetterView({ container: dlSlot, client, getManager });
  const catalog = readLocalCatalog();
  const thresholds = catalog?.health_thresholds ?? {
    heartbeat_max_age_seconds: 300,
    queue_depth_max: 50,
    delta_max: 0
  };
  renderSaludPanel({ container: saludSlot, client, thresholds });
  // ensure manager-aware audit entries also fire later when resetting day
  void manager;
}

function openResetFlow({ client, getManager, timezone }) {
  destructiveConfirm({
    title: 'Reset Día Actual',
    body:
      'Se eliminarán todas las capturas de hoy en todos los dispositivos. ' +
      'Esta acción no se puede deshacer.',
    confirmKeyword: 'RESET',
    onConfirm: async () => {
      const manager = getManager();
      if (!manager) return showToast('Sesión requerida');
      const { startIso, endIso } = plantDayRange(new Date(), timezone);
      try {
        await client.deleteCapturesForDay({ startIso, endIso });
        const event = await client.insertEvent({
          kind: 'day_reset',
          payload: { plant_day_start: startIso, plant_day_end: endIso },
          issued_by: manager.id
        });
        const eventId = Array.isArray(event.body) ? event.body[0]?.id : event.body?.id;
        await client.insertAudit(
          buildAuditEntry({
            actorType: 'manager',
            actorId: manager.id,
            actorName: manager.display_name,
            action: 'DAY_RESET',
            entityType: null,
            entityId: null,
            detail: { event_id: eventId, startIso, endIso }
          })
        );
        // wipe local shift state too
        localStore.remove('shift_state');
        localStore.remove('recent_captures');
        showToast('Día reiniciado');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Error: ${msg}`);
      }
    }
  });
}
