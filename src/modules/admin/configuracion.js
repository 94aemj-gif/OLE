// @ts-check
import { mergeCatalog, patchCatalog, readLocalCatalog } from './catalog-store.js';
import { showToast } from '../ui/toast.js';
import { buildAuditEntry } from '../audit/writer.js';
import { createButton } from '../ui/button.js';

/**
 * Render Configuración tab.
 *
 * @param {{container:HTMLElement, client:any, getManager:()=>{id:string,display_name:string}|null}} cfg
 */
export function renderConfiguracion(cfg) {
  cfg.container.innerHTML = '';
  const catalog = readLocalCatalog();
  if (!catalog) {
    cfg.container.textContent = 'Catálogo no cargado todavía.';
    return;
  }

  cfg.container.append(thresholdsBlock(cfg, catalog));
  cfg.container.append(audioBlock(cfg, catalog));
}

function thresholdsBlock(cfg, catalog) {
  const section = document.createElement('section');
  section.innerHTML = '<h3>Umbrales de salud</h3>';
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
  grid.style.gap = 'var(--space-3)';

  const t = catalog.health_thresholds ?? {
    heartbeat_max_age_seconds: 300,
    queue_depth_max: 50,
    delta_max: 0
  };
  const heartbeat = numericInput('Heartbeat máx (seg)', t.heartbeat_max_age_seconds);
  const queue = numericInput('Cola máx', t.queue_depth_max);
  const delta = numericInput('Delta máx', t.delta_max);
  grid.append(heartbeat.wrapper, queue.wrapper, delta.wrapper);

  section.append(
    grid,
    createButton({
      label: 'Guardar umbrales',
      kind: 'primary',
      onClick: async () => {
        const manager = cfg.getManager();
        if (!manager) return showToast('Sesión requerida');
        const res = await patchCatalog(cfg.client, (data) =>
          mergeCatalog(data, {
            health_thresholds: {
              heartbeat_max_age_seconds: heartbeat.value(),
              queue_depth_max: queue.value(),
              delta_max: delta.value()
            }
          })
        );
        if (!res.ok) return showToast('Conflicto — refresca y reintenta');
        await cfg.client.insertAudit(
          buildAuditEntry({
            actorType: 'manager',
            actorId: manager.id,
            actorName: manager.display_name,
            action: 'CATALOG_EDIT',
            entityType: null,
            entityId: 'health_thresholds',
            detail: {
              heartbeat_max_age_seconds: heartbeat.value(),
              queue_depth_max: queue.value(),
              delta_max: delta.value()
            }
          })
        );
        showToast('Umbrales guardados');
      }
    })
  );
  return section;
}

function audioBlock(cfg, catalog) {
  const section = document.createElement('section');
  section.style.marginTop = 'var(--space-6)';
  section.innerHTML = '<h3>Alerta horaria</h3>';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = catalog.plant?.hourly_alert_audio !== false;
  const label = document.createElement('label');
  label.style.display = 'flex';
  label.style.gap = 'var(--space-2)';
  label.style.alignItems = 'center';
  label.append(checkbox, document.createTextNode('Audio activado'));
  section.append(label);
  section.append(
    createButton({
      label: 'Guardar',
      onClick: async () => {
        const manager = cfg.getManager();
        if (!manager) return showToast('Sesión requerida');
        const res = await patchCatalog(cfg.client, (data) =>
          mergeCatalog(data, { plant: { hourly_alert_audio: checkbox.checked } })
        );
        if (!res.ok) return showToast('Conflicto — refresca y reintenta');
        await cfg.client.insertAudit(
          buildAuditEntry({
            actorType: 'manager',
            actorId: manager.id,
            actorName: manager.display_name,
            action: 'CATALOG_EDIT',
            entityType: null,
            entityId: 'plant.hourly_alert_audio',
            detail: { value: checkbox.checked }
          })
        );
        showToast('Guardado');
      }
    })
  );
  return section;
}

function numericInput(label, value) {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'grid';
  wrapper.style.gap = 'var(--space-1)';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.value = String(value);
  wrapper.append(lbl, input);
  return { wrapper, value: () => Number(input.value) || 0 };
}
