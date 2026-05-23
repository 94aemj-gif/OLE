// @ts-check
const ANIM_MS = 600;

export function createCounter() {
  const el = document.createElement('div');
  el.className = 'count';
  el.setAttribute('aria-live', 'polite');
  el.textContent = '0';
  let current = 0;

  function set(target) {
    const from = current;
    const delta = target - from;
    if (delta === 0) return;
    const start = performance.now();
    function frame(t) {
      const k = Math.min((t - start) / ANIM_MS, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      const value = Math.round(from + delta * eased);
      el.textContent = String(value);
      if (k < 1) requestAnimationFrame(frame);
      else current = target;
    }
    requestAnimationFrame(frame);
  }

  return { el, set };
}
