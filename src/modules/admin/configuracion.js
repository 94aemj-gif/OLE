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
    emptyState(cfg.container, 'Catálogo no cargado todavía.');
    return;
  }

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gap = 'var(--space-4)';
  grid.append(thresholdsBlock(cfg, catalog), audioBlock(cfg, catalog));
  cfg.container.append(grid);
}

function thresholdsBlock(cfg, catalog) {
  const wrap = panel('Umbrales de salud', 'Define cuándo el badge de Salud se enciende.');

  const t = catalog.health_thresholds ?? {
    heartbeat_max_age_seconds: 300,
    queue_depth_max: 50,
    delta_max: 0
  };
  const heartbeat = numericInput('Heartbeat máx', 'segundos', t.heartbeat_max_age_seconds);
  const queue = numericInput('Cola de envío máx', 'capturas pendientes', t.queue_depth_max);
  const delta = numericInput('Delta local↔servidor', 'capturas', t.delta_max);

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';
  grid.style.gap = 'var(--space-3)';
  grid.style.padding = 'var(--space-4) var(--space-5)';
  grid.append(heartbeat.wrapper, queue.wrapper, delta.wrapper);
  wrap.append(grid);

  const footer = document.createElement('footer');
  footer.style.padding = 'var(--space-3) var(--space-5)';
  footer.style.borderTop = '1px solid var(--border)';
  footer.style.background = 'var(--surface-soft)';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'flex-end';
  footer.append(
    createButton({
      label: 'Guardar umbrales',
      kind: 'primary',
      onClick: async () => {
        const manager = cfg.getManager();
        if (!manager) {
          showToast('Sesión requerida');
          return;
        }
        const payload = {
          heartbeat_max_age_seconds: heartbeat.value(),
          queue_depth_max: queue.value(),
          delta_max: delta.value()
        };
        const res = await patchCatalog(cfg.client, (data) =>
          mergeCatalog(data, { health_thresholds: payload })
        );
        if (!res.ok) {
          showToast('Conflicto — refresca y reintenta');
          return;
        }
        await cfg.client.insertAudit(
          buildAuditEntry({
            actorType: 'manager',
            actorId: manager.id,
            actorName: manager.display_name,
            action: 'CATALOG_EDIT',
            entityType: null,
            entityId: 'health_thresholds',
            detail: payload
          })
        );
        showToast('Umbrales guardados');
      }
    })
  );
  wrap.append(footer);
  return wrap;
}

function audioBlock(cfg, catalog) {
  const wrap = panel('Alerta horaria', 'Sonido al inicio de cada hora para recordar la captura.');
  const audioOn = catalog.plant?.hourly_alert_audio !== false;

  const row = document.createElement('div');
  row.style.padding = 'var(--space-4) var(--space-5)';
  row.style.display = 'flex';
  row.style.gap = 'var(--space-4)';
  row.style.alignItems = 'center';

  const toggle = createToggle(audioOn);
  const labelTxt = document.createElement('div');
  labelTxt.innerHTML = `<div style="font-weight: 600">Audio activado</div>
    <div style="color: var(--text-muted); font-size: var(--text-sm); margin-top: 2px">
    Se reproduce un beep corto al cambio de hora en cada tablet.</div>`;
  row.append(toggle.el, labelTxt);
  wrap.append(row);

  const footer = document.createElement('footer');
  footer.style.padding = 'var(--space-3) var(--space-5)';
  footer.style.borderTop = '1px solid var(--border)';
  footer.style.background = 'var(--surface-soft)';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'flex-end';
  footer.append(
    createButton({
      label: 'Guardar',
      kind: 'primary',
      onClick: async () => {
        const manager = cfg.getManager();
        if (!manager) {
          showToast('Sesión requerida');
          return;
        }
        const value = toggle.value();
        const res = await patchCatalog(cfg.client, (data) =>
          mergeCatalog(data, { plant: { hourly_alert_audio: value } })
        );
        if (!res.ok) {
          showToast('Conflicto — refresca y reintenta');
          return;
        }
        await cfg.client.insertAudit(
          buildAuditEntry({
            actorType: 'manager',
            actorId: manager.id,
            actorName: manager.display_name,
            action: 'CATALOG_EDIT',
            entityType: null,
            entityId: 'plant.hourly_alert_audio',
            detail: { value }
          })
        );
        showToast('Guardado');
      }
    })
  );
  wrap.append(footer);
  return wrap;
}

function panel(title, subtitle) {
  const section = document.createElement('section');
  section.className = 'panel-section';
  const head = document.createElement('header');
  const h = document.createElement('h2');
  h.textContent = title;
  const sub = document.createElement('span');
  sub.style.color = 'var(--text-muted)';
  sub.style.fontSize = 'var(--text-sm)';
  sub.style.textTransform = 'none';
  sub.style.letterSpacing = '0';
  sub.style.fontWeight = '400';
  sub.textContent = subtitle;
  head.append(h, sub);
  section.append(head);
  return section;
}

function numericInput(label, hint, value) {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'grid';
  wrapper.style.gap = '4px';

  const lbl = document.createElement('label');
  lbl.style.fontSize = 'var(--text-xs)';
  lbl.style.letterSpacing = '0.12em';
  lbl.style.textTransform = 'uppercase';
  lbl.style.color = 'var(--text-muted)';
  lbl.textContent = label;

  const input = document.createElement('input');
  input.type = 'number';
  input.value = String(value);
  input.style.padding = '10px 12px';
  input.style.border = '1px solid var(--border)';
  input.style.borderRadius = 'var(--radius-sm)';
  input.style.fontSize = 'var(--text-base)';
  input.style.fontVariantNumeric = 'tabular-nums';
  input.style.background = 'var(--surface)';

  const hintEl = document.createElement('span');
  hintEl.style.fontSize = '11px';
  hintEl.style.color = 'var(--text-muted)';
  hintEl.textContent = hint;

  wrapper.append(lbl, input, hintEl);
  return { wrapper, value: () => Number(input.value) || 0 };
}

function createToggle(initial) {
  const wrap = document.createElement('label');
  wrap.style.position = 'relative';
  wrap.style.display = 'inline-block';
  wrap.style.width = '52px';
  wrap.style.height = '30px';
  wrap.style.cursor = 'pointer';
  wrap.style.flexShrink = '0';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = initial;
  input.style.opacity = '0';
  input.style.position = 'absolute';
  input.style.inset = '0';
  input.style.margin = '0';
  input.style.cursor = 'pointer';

  const track = document.createElement('span');
  track.style.position = 'absolute';
  track.style.inset = '0';
  track.style.background = initial ? 'var(--accent)' : 'var(--border)';
  track.style.borderRadius = '999px';
  track.style.transition = 'background 120ms ease';

  const knob = document.createElement('span');
  knob.style.position = 'absolute';
  knob.style.top = '3px';
  knob.style.left = initial ? '25px' : '3px';
  knob.style.width = '24px';
  knob.style.height = '24px';
  knob.style.background = 'white';
  knob.style.borderRadius = '50%';
  knob.style.transition = 'left 120ms ease';
  knob.style.boxShadow = '0 1px 3px rgba(15,23,42,0.2)';

  wrap.append(input, track, knob);
  input.addEventListener('change', () => {
    track.style.background = input.checked ? 'var(--accent)' : 'var(--border)';
    knob.style.left = input.checked ? '25px' : '3px';
  });

  return { el: wrap, value: () => input.checked };
}

function emptyState(container, msg) {
  const p = document.createElement('p');
  p.style.padding = 'var(--space-6)';
  p.style.color = 'var(--text-muted)';
  p.style.background = 'var(--surface)';
  p.style.borderRadius = 'var(--radius-md)';
  p.style.border = '1px solid var(--border)';
  p.textContent = msg;
  container.append(p);
}
