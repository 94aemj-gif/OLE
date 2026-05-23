// @ts-check
import { createButton } from '../ui/button.js';
import { createErrorBanner } from '../ui/error-banner.js';
import { createNumpad } from './numpad.js';
import { createScrapRowEditor } from './scrap-rows.js';
import { createDowntimeRowEditor } from './downtime-rows.js';
import { t } from '../i18n/index.js';
import { validateCapture } from './validate.js';

/**
 * Open the Worximity-Dense capture modal.
 *
 * @param {Object} cfg
 * @param {Object} cfg.catalog
 * @param {{id:string, display_name?:string, hourly_target?:number}=} cfg.line
 * @param {{id:string, name?:string, start?:string, end?:string}=} cfg.shift
 * @param {(input:any) => void|Promise<void>} cfg.onSubmit
 */
export function openCaptureModal(cfg) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const modal = document.createElement('div');
  modal.className = 'modal capture';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  backdrop.append(modal);
  document.body.append(backdrop);

  const modalRef = { close: () => backdrop.remove() };
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) modalRef.close();
  });

  modal.append(
    renderHead(modalRef, cfg),
    renderContext(cfg),
    renderBody(cfg, modalRef),
    renderFooter()
  );

  return modalRef;
}

function renderHead(modalRef, cfg) {
  const head = document.createElement('header');
  head.className = 'capture-head';
  const titleWrap = document.createElement('div');
  const h = document.createElement('h2');
  h.textContent = t('capture.title');
  const sub = document.createElement('div');
  sub.className = 'sub';
  sub.textContent = cfg.line?.display_name ?? '';
  titleWrap.append(h, sub);
  head.append(titleWrap);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'close';
  close.textContent = '×';
  close.addEventListener('click', () => modalRef.close());
  head.append(close);
  return head;
}

function shiftLabel(shift) {
  const name = shift?.name ?? shift?.id ?? '—';
  const range = shift?.start && shift?.end ? `${shift.start}–${shift.end}` : '';
  return { value: name, sub: range };
}

function contextItems(cfg) {
  const sl = shiftLabel(cfg.shift);
  return [
    { id: 'ctxOperator', cls: 'identity', label: 'Operadora', value: '—', sub: '' },
    { id: 'ctxShift', label: 'Turno', value: sl.value, sub: sl.sub },
    { id: 'ctxAccum', label: 'Acumulado del turno', value: '—', sub: '' },
    {
      id: 'ctxTarget',
      label: 'Objetivo del turno',
      value: String((cfg.line?.hourly_target ?? 0) * 8),
      sub: ''
    }
  ];
}

function renderContext(cfg) {
  const ctx = document.createElement('section');
  ctx.className = 'capture-context';
  ctx.id = 'captureContext';
  for (const item of contextItems(cfg)) {
    const div = document.createElement('div');
    div.className = 'item' + (item.cls ? ' ' + item.cls : '');
    div.id = item.id;
    const subHtml = item.sub ? ` <small>${item.sub}</small>` : '';
    div.innerHTML = `<div class="l">${item.label}</div><div class="v">${item.value}${subHtml}</div>`;
    ctx.append(div);
  }
  return ctx;
}

function renderBody(cfg, modalRef) {
  const body = document.createElement('section');
  body.className = 'capture-body';
  body.append(renderHero(cfg, modalRef), renderRail(cfg, modalRef));
  return body;
}

function renderHero(cfg, modalRef) {
  const hero = document.createElement('div');
  hero.className = 'capture-hero';

  const empLabel = document.createElement('p');
  empLabel.className = 'step-label';
  empLabel.textContent = t('capture.employee.label');
  hero.append(empLabel);

  const empWrap = document.createElement('div');
  empWrap.className = 'employee-input';
  const empInput = document.createElement('input');
  empInput.type = 'text';
  empInput.inputMode = 'numeric';
  empInput.maxLength = 5;
  empInput.placeholder = '• • • • •';
  empInput.autocomplete = 'off';
  empInput.id = 'captureEmployeeInput';
  const empName = document.createElement('div');
  empName.className = 'resolved-name';
  empName.id = 'captureResolvedName';
  empWrap.append(empInput, empName);
  hero.append(empWrap);

  empInput.addEventListener('input', () => {
    empInput.value = empInput.value.replace(/\D/g, '').slice(0, 5);
    if (empInput.value.length !== 5) {
      empInput.classList.remove('invalid');
      empName.classList.remove('error');
      empName.textContent = '';
      updateContextOperator(null);
      return;
    }
    const op = cfg.catalog.operators?.find((o) => o.employee_number === empInput.value && o.active);
    if (op) {
      empInput.classList.remove('invalid');
      empName.classList.remove('error');
      empName.textContent = `✓ ${op.display_name}`;
      updateContextOperator(op);
    } else {
      empInput.classList.add('invalid');
      empName.classList.add('error');
      empName.textContent = t('error.employee.unknown');
      updateContextOperator(null);
    }
  });

  const unitsLabel = document.createElement('p');
  unitsLabel.className = 'step-label';
  unitsLabel.textContent = t('capture.units.label');
  hero.append(unitsLabel);

  const unitsDisplay = document.createElement('div');
  unitsDisplay.className = 'units-display';
  unitsDisplay.textContent = '0';
  hero.append(unitsDisplay);

  const unitsPad = createNumpad({
    maxLength: 6,
    onChange: (v) => {
      unitsDisplay.textContent = v || '0';
    }
  });
  // remove numpad's own internal display since we have units-display above
  const internalDisplay = unitsPad.el.querySelector('.numpad-display');
  if (internalDisplay) internalDisplay.remove();
  hero.append(unitsPad.el);

  const errorSlot = document.createElement('div');
  errorSlot.id = 'captureErrorSlot';
  hero.append(errorSlot);

  // stash refs on modalRef for footer-rail wiring
  modalRef._empInput = empInput;
  modalRef._unitsPad = unitsPad;
  modalRef._errorSlot = errorSlot;
  return hero;
}

function renderRail(cfg, modalRef) {
  const rail = document.createElement('aside');
  rail.className = 'capture-rail';

  // Downtime section
  const dtSection = document.createElement('section');
  dtSection.className = 'rail-section';
  const dtHead = document.createElement('div');
  dtHead.className = 'head';
  const dtTitle = document.createElement('h3');
  dtTitle.textContent = t('capture.downtime.section');
  const dtTotal = document.createElement('span');
  dtTotal.className = 'total warn';
  dtTotal.id = 'railDowntimeTotal';
  dtTotal.textContent = '0 min';
  dtHead.append(dtTitle, dtTotal);
  dtSection.append(dtHead);
  const downtime = createDowntimeRowEditor(cfg.catalog.downtime_reasons);
  dtSection.append(downtime.el);
  rail.append(dtSection);

  // Scrap section
  const scSection = document.createElement('section');
  scSection.className = 'rail-section';
  const scHead = document.createElement('div');
  scHead.className = 'head';
  const scTitle = document.createElement('h3');
  scTitle.textContent = t('capture.scrap.section');
  const scTotal = document.createElement('span');
  scTotal.className = 'total crit';
  scTotal.id = 'railScrapTotal';
  scTotal.textContent = '0 pcs';
  scHead.append(scTitle, scTotal);
  scSection.append(scHead);
  const scrap = createScrapRowEditor(cfg.catalog.scrap_reasons);
  scSection.append(scrap.el);
  rail.append(scSection);

  // Periodic recompute of totals
  const refreshTotals = () => {
    const dtMin = downtime.rows.reduce((a, r) => a + (r.minutes || 0), 0);
    const scPcs = scrap.rows.reduce((a, r) => a + (r.pieces || 0), 0);
    dtTotal.textContent = `${dtMin} min`;
    scTotal.textContent = `${scPcs} pcs`;
  };
  // Listen on any input change anywhere inside the rail
  rail.addEventListener('input', refreshTotals);
  rail.addEventListener('change', refreshTotals);
  rail.addEventListener('click', () => setTimeout(refreshTotals, 0));

  modalRef._downtime = downtime;
  modalRef._scrap = scrap;
  return rail;
}

function renderFooter() {
  const footer = document.createElement('footer');
  footer.className = 'capture-footer';
  const helper = document.createElement('div');
  helper.className = 'helper';
  helper.innerHTML =
    'La captura se guarda en este dispositivo y sincroniza en <strong>≤ 30 s</strong>. Tienes <strong>10 segundos</strong> para deshacer.';
  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  buttons.id = 'captureButtons';
  footer.append(helper, buttons);
  return footer;
}

function updateContextOperator(op) {
  const slot = document.getElementById('ctxOperator');
  if (!slot) return;
  const value = op ? `${op.display_name} <small>· ${op.employee_number}</small>` : '—';
  slot.innerHTML = `<div class="l">Operadora</div><div class="v">${value}</div>`;
}

function readModalInput(modalRef) {
  const empInput = /** @type {HTMLInputElement|null} */ (
    document.getElementById('captureEmployeeInput')
  );
  return {
    employee_number: empInput?.value ?? '',
    units_produced: Number(modalRef._unitsPad?.value) || 0,
    scrap_rows: modalRef._scrap?.rows ?? [],
    downtime_rows: modalRef._downtime?.rows ?? []
  };
}

function showFirstError(errorSlot, errors) {
  if (!errorSlot) return;
  errorSlot.innerHTML = '';
  const err = errors[0];
  errorSlot.append(
    createErrorBanner({
      title: t('error.employee.invalid'),
      cause: codeLabel(err),
      action: t('error.offline')
    })
  );
}

/**
 * Backwards-compatible entry point used by capture/index.js.
 * Wires Save/Cancel buttons in the footer.
 */
export function openCaptureModalWithSubmit(cfg) {
  const modalRef = openCaptureModal(cfg);
  const buttons = document.getElementById('captureButtons');
  if (!buttons) return modalRef;
  const cancel = createButton({ label: t('capture.cancel'), onClick: () => modalRef.close() });
  const save = createButton({
    label: t('capture.save') + ' →',
    kind: 'primary',
    onClick: async () => {
      const input = readModalInput(modalRef);
      const errorSlot = document.getElementById('captureErrorSlot');
      const result = validateCapture(input, cfg.catalog);
      if (!result.ok) {
        showFirstError(errorSlot, result.errors);
        return;
      }
      await cfg.onSubmit(input);
      modalRef.close();
    }
  });
  buttons.append(cancel, save);
  return modalRef;
}

function codeLabel(err) {
  if (err.field === 'employee_number' && err.code === 'invalid_format')
    return t('error.employee.invalid');
  if (err.field === 'employee_number' && err.code === 'unknown') return t('error.employee.unknown');
  if (err.code === 'empty_capture') return t('error.units.zero');
  if (err.code === 'exceeds_units') return t('error.scrap.exceeds');
  return err.code;
}
