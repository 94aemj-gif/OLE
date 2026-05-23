// @ts-check
export function openModal({ title, body, footer }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  const h2 = document.createElement('h2');
  h2.textContent = title;
  modal.appendChild(h2);
  if (body) modal.appendChild(body);
  if (footer) modal.appendChild(footer);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  function close() {
    backdrop.remove();
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  return { close, backdrop, modal };
}
