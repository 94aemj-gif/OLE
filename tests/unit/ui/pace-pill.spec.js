import { describe, it, expect } from 'vitest';
import { paceTier, createPacePill } from '@/modules/ui/pace-pill.js';

describe('paceTier', () => {
  it('green ≥100, blue ≥90, amber ≥70, red <70', () => {
    expect(paceTier(105)).toBe('ok');
    expect(paceTier(100)).toBe('ok');
    expect(paceTier(95)).toBe('warn');
    expect(paceTier(90)).toBe('warn');
    expect(paceTier(80)).toBe('alert');
    expect(paceTier(70)).toBe('alert');
    expect(paceTier(69.9)).toBe('crit');
    expect(paceTier(0)).toBe('crit');
  });
});

describe('createPacePill', () => {
  it('renders rounded percent + sets data-tier', () => {
    const { el, setPercent } = createPacePill(82.4);
    expect(el.dataset.tier).toBe('alert');
    expect(el.textContent).toBe('82%');
    setPercent(105);
    expect(el.dataset.tier).toBe('ok');
    expect(el.textContent).toBe('105%');
  });

  it('clamps negative or invalid input to 0%', () => {
    const { el, setPercent } = createPacePill();
    setPercent(-5);
    expect(el.dataset.tier).toBe('crit');
    setPercent(NaN);
    expect(el.dataset.tier).toBe('crit');
  });
});
