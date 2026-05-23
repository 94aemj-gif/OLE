// @ts-check
export function celebrateEndOfShift({ message }) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.background = 'rgba(15, 23, 42, 0.6)';
  overlay.style.zIndex = '80';
  overlay.style.fontSize = 'var(--text-2xl)';
  overlay.style.color = 'white';
  overlay.style.textAlign = 'center';
  overlay.textContent = message;
  document.body.append(overlay);
  setTimeout(() => overlay.remove(), 3000);
}
