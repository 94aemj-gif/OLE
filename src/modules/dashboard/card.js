// @ts-check
import { createStatusPill } from '../ui/status-pill.js';
import { createPacePill } from '../ui/pace-pill.js';
import { createSparkline } from '../ui/sparkline.js';
import { t } from '../i18n/index.js';

/**
 * Render a single line card (Worximity Dense layout).
 */
export function createLineCard(line) {
  const root = document.createElement('article');
  root.className = 'line-card';

  const header = document.createElement('header');
  const titleWrap = document.createElement('div');
  const title = document.createElement('h2');
  title.textContent = line.display_name;
  const sub = document.createElement('div');
  sub.className = 'sub';
  titleWrap.append(title, sub);
  const status = createStatusPill('operacion');
  header.append(titleWrap, status.el);
  root.append(header);

  const count = document.createElement('div');
  count.className = 'count';
  count.textContent = '0';
  root.append(count);

  const progress = document.createElement('div');
  progress.className = 'progress';
  progress.style.height = '8px';
  progress.style.background = 'var(--border)';
  progress.style.borderRadius = 'var(--radius-pill)';
  progress.style.overflow = 'hidden';
  const progressFill = document.createElement('span');
  progressFill.style.display = 'block';
  progressFill.style.height = '100%';
  progressFill.style.background = 'var(--accent)';
  progressFill.style.width = '0%';
  progress.append(progressFill);
  root.append(progress);

  const sparkSlot = document.createElement('div');
  root.append(sparkSlot);

  const meta = document.createElement('div');
  meta.style.display = 'flex';
  meta.style.justifyContent = 'space-between';
  meta.style.color = 'var(--text-muted)';
  meta.style.fontSize = 'var(--text-sm)';
  const lastEl = document.createElement('span');
  const scrapEl = document.createElement('span');
  meta.append(lastEl, scrapEl);
  root.append(meta);

  const paceRow = document.createElement('div');
  paceRow.className = 'pace-row';
  const paceLbl = document.createElement('span');
  paceLbl.textContent = 'Pace';
  const pace = createPacePill(0);
  paceRow.append(paceLbl, pace.el);
  root.append(paceRow);

  function renderLast(state) {
    if (
      state.lastCaptureAt &&
      state.lastCaptureUnits !== null &&
      state.lastCaptureUnits !== undefined
    ) {
      const at = new Date(state.lastCaptureAt).toLocaleTimeString();
      lastEl.innerHTML = `${t('card.last')}: <strong>${at} · ${state.lastCaptureUnits}</strong>`;
    } else {
      lastEl.textContent = t('card.no.activity');
    }
  }
  function renderScrap(state) {
    if (state.scrap !== null && state.scrap !== undefined) {
      scrapEl.innerHTML = `Scrap <strong>${state.scrap}</strong>`;
    } else {
      scrapEl.textContent = '';
    }
  }
  function update(state) {
    sub.textContent = `${t('card.operator')}: ${state.operatorName ?? '—'} · ${t('card.shift')} ${state.shiftName ?? '—'}`;
    count.textContent = formatNumber(state.count);
    pace.setPercent(state.pacePercent);
    status.setState(state.status ?? 'operacion');
    if (state.target && state.target > 0) {
      const pct = Math.min((state.count / state.target) * 100, 100);
      progressFill.style.width = `${pct}%`;
    }
    sparkSlot.innerHTML = '';
    sparkSlot.append(createSparkline(state.sparkline, { arialabel: 'tendencia 8h' }));
    renderLast(state);
    renderScrap(state);
  }

  return { el: root, update };
}

function formatNumber(n) {
  const num = Math.round(n);
  return num.toLocaleString('es-MX').replace(/,/g, ' ');
}
