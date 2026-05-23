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
  const list = document.createElement('div');
  cfg.container.append(list);

  async function refresh() {
    list.innerHTML = '';
    let rows = [];
    try {
      const res = await cfg.client.listDeadLetter();
      rows = Array.isArray(res.body) ? res.body : [];
    } catch (err) {
      console.warn('dead-letter fetch failed', err);
    }
    if (rows.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'Sin capturas pendientes.';
      empty.style.color = 'var(--color-text-muted)';
      list.append(empty);
      return;
    }
    for (const row of rows) list.append(renderRow(row));
  }

  function renderRow(row) {
    const card = document.createElement('div');
    card.className = 'panel';
    card.style.marginBottom = 'var(--space-3)';
    const head = document.createElement('div');
    head.style.display = 'flex';
    head.style.justifyContent = 'space-between';
    head.style.gap = 'var(--space-3)';
    const summary = document.createElement('div');
    summary.innerHTML =
      `<strong>${row.line_id}</strong> · op ${row.operator_number ?? '?'} · ` +
      `${new Date(row.client_timestamp).toLocaleString()}<br/>` +
      `<small style="color:var(--color-text-muted)">${row.reject_reason}</small>`;
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = 'var(--space-2)';

    actions.append(
      createButton({
        label: 'Reintentar',
        kind: 'primary',
        onClick: () => onReplay(row)
      }),
      createButton({ label: 'Descartar', kind: 'danger', onClick: () => onDiscard(row) })
    );
    head.append(summary, actions);
    card.append(head);
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
