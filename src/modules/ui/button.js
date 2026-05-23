// @ts-check
export function createButton({ label, kind = 'default', glow = false, onClick }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn';
  if (kind === 'primary') btn.classList.add('btn-primary');
  if (kind === 'danger') btn.classList.add('btn-danger');
  if (glow) btn.classList.add('glow');
  btn.textContent = label;
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}
