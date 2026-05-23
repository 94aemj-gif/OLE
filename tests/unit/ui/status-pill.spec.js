import { describe, it, expect } from 'vitest';
import { createStatusPill } from '@/modules/ui/status-pill.js';

describe('status pill', () => {
  it('renders with default state operacion', () => {
    const { el } = createStatusPill();
    expect(el.dataset.state).toBe('operacion');
    expect(el.textContent.length).toBeGreaterThan(0);
  });

  it('coerces unknown state to inactivo', () => {
    const { el, setState } = createStatusPill();
    setState('foo');
    expect(el.dataset.state).toBe('inactivo');
  });

  it('switches to mantenimiento and averia', () => {
    const { el, setState } = createStatusPill();
    setState('mantenimiento');
    expect(el.dataset.state).toBe('mantenimiento');
    setState('averia');
    expect(el.dataset.state).toBe('averia');
  });
});
