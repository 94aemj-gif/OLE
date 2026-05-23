// @ts-check
export function showToast(message, ms = 1800) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = message;
  document.body.appendChild(el);
  const timeout = setTimeout(() => el.remove(), ms);
  return {
    el,
    dismiss: () => {
      clearTimeout(timeout);
      el.remove();
    }
  };
}
