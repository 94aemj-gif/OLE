// @ts-check
import { destructiveConfirm } from '../ui/destructive-confirm.js';
import { showToast } from '../ui/toast.js';
import { discardDeadLetter, replayDeadLetter } from './dead-letter-panel.js';
import { createButton } from '../ui/button.js';

/**
 * @param {{container: HTMLElement, client:any, getManager:()=>{id:string,display_name:string}|null}} cfg
 */
export function renderDeadLetterView(cfg) {
  cfg.container.innerHTML = '';

  const wrap = document.createElement('section');
  wrap.className = 'panel-section';
  const header = document.createElement('header');
  header.innerHTML = '<h2>Capturas Pendientes</h2><span class="count" id="dlCount">—</span>';
  wrap.append(header);
  const list = document.createElement('div');
  list.style.padding = 'var(--space-3) var(--space-4)';
  wrap.append(list);
  cfg.container.append(wrap);

  async function refresh() {
    list.innerHTML = '';
    let rows = [];
    try {
      const res = await cfg.client.listDeadLetter();
      rows = Array.isArray(res.body) ? res.body : [];
    } catch (err) {
      console.warn('dead-letter fetch failed', err);
    }
    const countEl = document.getElementById('dlCount');
    if (countEl) countEl.textContent = `${rows.length}`;
    if (rows.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = '✓ Sin capturas pendientes. Todo sincronizado.';
      empty.style.color = 'var(--ok)';
      empty.style.fontSize = 'var(--text-sm)';
      empty.style.margin = 'var(--space-3) 0';
      empty.style.padding = 'var(--space-3) var(--space-4)';
      empty.style.background = 'var(--ok-soft)';
      empty.style.borderRadius = 'var(--radius-md)';
      list.append(empty);
      return;
    }
    for (const row of rows) list.append(renderRow(row));
  }

  function renderRow(row) {
    const card = document.createElement('div');
    card.style.background = 'var(--surface)';
    card.style.border = '1px solid var(--border)';
    card.style.borderLeft = '4px solid var(--crit)';
    card.style.borderRadius = 'var(--radius-md)';
    card.style.padding = 'var(--space-4)';
    card.style.marginBottom = 'var(--space-3)';
    card.style.display = 'grid';
    card.style.gridTemplateColumns = '1fr auto';
    card.style.gap = 'var(--space-3)';
    card.style.alignItems = 'center';

    const summary = document.createElement('div');
    summary.innerHTML =
      `<div style="display: flex; gap: var(--space-3); align-items: baseline">` +
      `<strong style="font-size: var(--text-base)">${row.line_id}</strong>` +
      `<span style="color: var(--text-muted); font-size: var(--text-sm)">` +
      `op ${row.operator_number ?? '?'} · ${new Date(row.client_timestamp).toLocaleString()}` +
      `</span></div>` +
      `<div style="margin-top: 6px; color: var(--crit); font-size: var(--text-sm)">` +
      `<strong>Razón:</strong> ${row.reject_reason}</div>`;
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = 'var(--space-2)';
    actions.append(
      createButton({ label: 'Reintentar', kind: 'primary', onClick: () => onReplay(row) }),
      createButton({ label: 'Descartar', kind: 'danger', onClick: () => onDiscard(row) })
    );
    card.append(summary, actions);
    return card;
  }

  function onReplay(row) {
    const manager = cfg.getManager();
    if (!manager) {
      showToast('Sesión expirada — vuelve a entrar');
      return;
    }
    destructiveConfirm({
      title: 'Reintentar captura',
      body: 'Se reinsertará el payload original como nueva captura.',
      confirmKeyword: 'REINTENTAR',
      onConfirm: async () => {
        await replayDeadLetter(cfg.client, {
          deadLetter: row,
          editedPayload: row.original_payload,
          manager
        });
        showToast('Captura re-enviada');
        await refresh();
      }
    });
  }

  function onDiscard(row) {
    const manager = cfg.getManager();
    if (!manager) {
      showToast('Sesión expirada — vuelve a entrar');
      return;
    }
    destructiveConfirm({
      title: 'Descartar captura',
      body: 'La captura se marcará como descartada (no se podrá restaurar).',
      confirmKeyword: 'DESCARTAR',
      onConfirm: async () => {
        await discardDeadLetter(cfg.client, { deadLetter: row, manager });
        showToast('Captura descartada');
        await refresh();
      }
    });
  }

  refresh();
  return { refresh };
}
