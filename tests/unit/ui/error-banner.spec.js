import { describe, it, expect } from 'vitest';
import { createErrorBanner } from '@/modules/ui/error-banner.js';

describe('error banner', () => {
  it('renders title + cause + action as required by Principle III', () => {
    const el = createErrorBanner({
      title: 'No se pudo guardar',
      cause: 'Red fuera de línea',
      action: 'Captura quedará en cola'
    });
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.textContent).toContain('No se pudo guardar');
    expect(el.textContent).toContain('Red fuera de línea');
    expect(el.textContent).toContain('Captura quedará en cola');
  });
});
