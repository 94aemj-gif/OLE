// @ts-check
import { openModal } from './modal.js';
import { createButton } from './button.js';

/**
 * @param {{title:string, body:string, confirmKeyword:string, confirmLabel?:string, onConfirm:()=>any}} cfg
 */
export function destructiveConfirm(cfg) {
  const body = document.createElement('div');
  const p = document.createElement('p');
  p.textContent = cfg.body;
  const input = document.createElement('input');
  input.className = 'dest-confirm-input';
  input.placeholder = `Escribe ${cfg.confirmKeyword} para confirmar`;
  body.append(p, input);

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.gap = 'var(--space-3)';
  footer.style.justifyContent = 'flex-end';
  footer.style.marginTop = 'var(--space-4)';

  const modalRef = { close: () => {} };
  const cancel = createButton({ label: 'Cancelar', onClick: () => modalRef.close() });
  const confirm = createButton({
    label: cfg.confirmLabel ?? 'Confirmar',
    kind: 'danger',
    onClick: async () => {
      await cfg.onConfirm();
      modalRef.close();
    }
  });
  confirm.disabled = true;
  input.addEventListener('input', () => {
    confirm.disabled = input.value.trim() !== cfg.confirmKeyword;
  });
  footer.append(cancel, confirm);

  const modal = openModal({ title: cfg.title, body, footer });
  modalRef.close = modal.close;
  return modal;
}
