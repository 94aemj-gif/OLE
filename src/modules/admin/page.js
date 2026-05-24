// @ts-check
import { applyTranslations, getLang, setLang } from '../i18n/index.js';
import { verifyPin } from '../auth/pin.js';
import { openSession, readSession, closeSession } from '../auth/session.js';
import { makeSupabaseClient } from '../supabase/client.js';
import { makeLocalClient } from '../supabase/local-client.js';
import { readLocalCatalog } from './catalog-store.js';
import { showToast } from '../ui/toast.js';
import { createButton } from '../ui/button.js';
import { renderCatalogos } from './catalogos.js';
import { renderConfiguracion } from './configuracion.js';
import { renderResumen } from './resumen.js';
import { renderSaludPanel } from './salud-panel.js';
import { renderDeadLetterView } from './dead-letter-view.js';
import { destructiveConfirm } from '../ui/destructive-confirm.js';
import { triggerDayReset } from '../reset/sequence.js';
import { loadOrSeedCatalog } from '../storage/fallback-catalog.js';

// Ensure the in-memory fallback catalog (including a seeded manager with
// PIN 1234) is persisted to localStorage so the PIN gate works without
// Supabase env vars.
loadOrSeedCatalog();

applyTranslations();
document.getElementById('langToggle')?.addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
  location.reload();
});

const TABS = ['resumen', 'catalogos', 'configuracion', 'datos'];
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const client = url && key ? makeSupabaseClient({ url, anonKey: key }) : makeLocalClient();

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

function syncTabState(safeTab) {
  location.hash = `#${safeTab}`;
  document.querySelectorAll('[data-tab]').forEach((el) => {
    el.classList.toggle('is-active', el.getAttribute('data-tab') === safeTab);
  });
}

function showTabError(safeTab, err) {
  if (!tabContent) return;
  console.error('admin tab render failed', err);
  tabContent.innerHTML =
    '<div class="empty-state" style="margin: 16px">' +
    '<span class="icon">⚠</span>' +
    `<strong>Error al cargar ${safeTab}</strong>` +
    `<span>${err instanceof Error ? err.message : String(err)}</span>` +
    '</div>';
}

function setActiveTab(tab) {
  const safeTab = TABS.includes(tab) ? tab : 'resumen';
  syncTabState(safeTab);
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
  try {
    TAB_RENDERERS[safeTab]({ container: tabContent, client, getManager, timezone, manager });
  } catch (err) {
    showTabError(safeTab, err);
  }
}

function renderDatos({ container, client, getManager, timezone, manager }) {
  container.innerHTML = '';

  // Reset Día Actual
  const resetSection = document.createElement('section');
  resetSection.className = 'panel-section reset-section';
  const resetHead = document.createElement('header');
  const resetH2 = document.createElement('h2');
  resetH2.textContent = 'Reset Día Actual';
  const resetTag = document.createElement('span');
  resetTag.className = 'count tag-crit';
  resetTag.textContent = 'Destructivo';
  resetHead.append(resetH2, resetTag);
  resetSection.append(resetHead);
  const resetBody = document.createElement('div');
  resetBody.className = 'reset-body';
  const resetHelp = document.createElement('p');
  resetHelp.className = 'help-text';
  resetHelp.textContent =
    'Elimina todas las capturas de hoy en todos los dispositivos y envía un broadcast para limpiar el estado local.';
  resetBody.append(
    resetHelp,
    createButton({
      label: 'Reset Día Actual',
      kind: 'danger',
      onClick: () => openResetFlow({ client, getManager, timezone })
    })
  );
  resetSection.append(resetBody);

  // Dead-letter slot (the view internally wraps in its own .panel-section)
  const dlSlot = document.createElement('div');
  // Salud slot (the view internally wraps in its own .panel-section)
  const saludSlot = document.createElement('div');

  const stack = document.createElement('div');
  stack.style.display = 'grid';
  stack.style.gap = 'var(--space-4)';
  stack.append(resetSection, dlSlot, saludSlot);
  container.append(stack);
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
      try {
        await triggerDayReset({ client, manager, timezone });
        showToast('Día reiniciado');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Error: ${msg}`);
      }
    }
  });
}
