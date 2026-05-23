// @ts-check
export function paceTier(percent) {
  if (percent >= 100) return 'ok';
  if (percent >= 90) return 'warn';
  if (percent >= 70) return 'alert';
  return 'crit';
}

export function createPacePill(initialPercent = 100) {
  const el = document.createElement('span');
  el.className = 'pace-pill';
  setPercent(initialPercent);
  return { el, setPercent };

  function setPercent(percent) {
    const pct = Number.isFinite(percent) ? Math.max(percent, 0) : 0;
    el.dataset.tier = paceTier(pct);
    el.textContent = `${Math.round(pct)}%`;
  }
}
