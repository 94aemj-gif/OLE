import { describe, it, expect, vi } from 'vitest';
import { createButton } from '@/modules/ui/button.js';

describe('button', () => {
  it('renders label and binds click handler', () => {
    const onClick = vi.fn();
    const btn = createButton({ label: 'Save', onClick });
    expect(btn.textContent).toBe('Save');
    expect(btn.type).toBe('button');
    btn.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies kind and glow modifiers', () => {
    const primary = createButton({ label: 'OK', kind: 'primary', glow: true });
    expect(primary.classList.contains('btn-primary')).toBe(true);
    expect(primary.classList.contains('glow')).toBe(true);

    const danger = createButton({ label: 'Delete', kind: 'danger' });
    expect(danger.classList.contains('btn-danger')).toBe(true);
  });
});
