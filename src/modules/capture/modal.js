// @ts-check
import { openModal } from '../ui/modal.js';
import { createButton } from '../ui/button.js';
import { createErrorBanner } from '../ui/error-banner.js';
import { createNumpad } from './numpad.js';
import { createScrapRowEditor } from './scrap-rows.js';
import { createDowntimeRowEditor } from './downtime-rows.js';
import { t } from '../i18n/index.js';
import { validateCapture } from './validate.js';

/**
 * @param {Object} cfg
 * @param {Object} cfg.catalog
 * @param {(input:any) => void|Promise<void>} cfg.onSubmit
 */
export function openCaptureModal(cfg) {
  const body = document.createElement('div');

  // Section A: identification + units
  const employeeLabel = document.createElement('p');
  employeeLabel.textContent = t('capture.employee.label');
  body.append(employeeLabel);
  const employeePad = createNumpad({ maxLength: 5 });
  body.append(employeePad.el);

  const unitsLabel = document.createElement('p');
  unitsLabel.textContent = t('capture.units.label');
  unitsLabel.style.marginTop = 'var(--space-4)';
  body.append(unitsLabel);
  const unitsPad = createNumpad({ maxLength: 6 });
  body.append(unitsPad.el);

  // Section B: downtime
  const dtTitle = document.createElement('h3');
  dtTitle.textContent = t('capture.downtime.section');
  dtTitle.style.marginTop = 'var(--space-6)';
  body.append(dtTitle);
  const downtime = createDowntimeRowEditor(cfg.catalog.downtime_reasons);
  body.append(downtime.el);

  // Section C: scrap
  const scTitle = document.createElement('h3');
  scTitle.textContent = t('capture.scrap.section');
  scTitle.style.marginTop = 'var(--space-6)';
  body.append(scTitle);
  const scrap = createScrapRowEditor(cfg.catalog.scrap_reasons);
  body.append(scrap.el);

  const errorSlot = document.createElement('div');
  body.append(errorSlot);

  // Footer
  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.justifyContent = 'flex-end';
  footer.style.gap = 'var(--space-3)';
  footer.style.marginTop = 'var(--space-6)';

  const modalRef = { close: () => {} };
  const cancel = createButton({ label: t('capture.cancel'), onClick: () => modalRef.close() });
  const save = createButton({
    label: t('capture.save'),
    kind: 'primary',
    onClick: async () => {
      const input = {
        employee_number: employeePad.value,
        units_produced: Number(unitsPad.value) || 0,
        scrap_rows: scrap.rows,
        downtime_rows: downtime.rows
      };
      errorSlot.innerHTML = '';
      const result = validateCapture(input, cfg.catalog);
      if (!result.ok) {
        const err = result.errors[0];
        errorSlot.append(
          createErrorBanner({
            title: t('error.employee.invalid'),
            cause: codeLabel(err),
            action: t('error.offline')
          })
        );
        return;
      }
      await cfg.onSubmit(input);
      modalRef.close();
    }
  });
  footer.append(cancel, save);

  const modal = openModal({ title: t('capture.title'), body, footer });
  modalRef.close = modal.close;
  return modal;
}

function codeLabel(err) {
  if (err.field === 'employee_number' && err.code === 'invalid_format')
    return t('error.employee.invalid');
  if (err.field === 'employee_number' && err.code === 'unknown') return t('error.employee.unknown');
  if (err.code === 'empty_capture') return t('error.units.zero');
  if (err.code === 'exceeds_units') return t('error.scrap.exceeds');
  return err.code;
}
