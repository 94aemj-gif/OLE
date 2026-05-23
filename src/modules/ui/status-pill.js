// @ts-check
import { t } from '../i18n/index.js';

const STATES = ['operacion', 'inactivo', 'mantenimiento', 'averia'];

export function createStatusPill(initial = 'operacion') {
  const el = document.createElement('span');
  el.className = 'status-pill';
  setState(initial);
  return { el, setState };

  function setState(state) {
    if (!STATES.includes(state)) state = 'inactivo';
    el.dataset.state = state;
    el.textContent = t(`status.${state}`);
  }
}
