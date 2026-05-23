// @ts-check
import { createStatusPill } from '../ui/status-pill.js';
import { createPacePill } from '../ui/pace-pill.js';
import { createSparkline } from '../ui/sparkline.js';
import { t } from '../i18n/index.js';

/**
 * Render a single line card. Returns the root element and an `update(state)` function.
 */
export function createLineCard(line) {
  const root = document.createElement('article');
  root.className = 'line-card';

  const header = document.createElement('header');
  const title = document.createElement('strong');
  title.textContent = line.display_name;
  const status = createStatusPill('operacion');
  header.append(title, status.el);
  root.append(header);

  const operatorRow = document.createElement('p');
  operatorRow.style.color = 'var(--color-text-muted)';
  operatorRow.style.margin = '0';
  root.append(operatorRow);

  const shiftRow = document.createElement('p');
  shiftRow.style.color = 'var(--color-text-muted)';
  shiftRow.style.margin = '0';
  root.append(shiftRow);

  const count = document.createElement('div');
  count.className = 'count';
  count.textContent = '0';
  root.append(count);

  const pace = createPacePill(0);
  root.append(pace.el);

  const sparkSlot = document.createElement('div');
  root.append(sparkSlot);

  const last = document.createElement('p');
  last.style.color = 'var(--color-text-muted)';
  last.style.margin = '0';
  root.append(last);

  function update(state) {
    operatorRow.textContent = `${t('card.operator')}: ${state.operatorName ?? '—'}`;
    shiftRow.textContent = `${t('card.shift')}: ${state.shiftName ?? '—'}`;
    count.textContent = String(state.count);
    pace.setPercent(state.pacePercent);
    status.setState(state.status ?? 'operacion');
    sparkSlot.innerHTML = '';
    const svg = createSparkline(state.sparkline, { arialabel: 'tendencia 8h' });
    sparkSlot.append(svg);
    if (
      state.lastCaptureAt &&
      state.lastCaptureUnits !== null &&
      state.lastCaptureUnits !== undefined
    ) {
      const at = new Date(state.lastCaptureAt).toLocaleTimeString();
      last.textContent = `${t('card.last')}: ${at} — ${state.lastCaptureUnits}`;
    } else {
      last.textContent = t('card.no.activity');
    }
  }

  return { el: root, update };
}
