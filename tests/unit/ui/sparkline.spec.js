import { describe, it, expect } from 'vitest';
import { createSparkline } from '@/modules/ui/sparkline.js';

describe('sparkline', () => {
  it('renders an SVG with a path when series has data', () => {
    const svg = createSparkline([1, 3, 2, 5, 4]);
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.querySelector('path')).not.toBeNull();
  });

  it('renders an empty SVG when series is empty', () => {
    const svg = createSparkline([]);
    expect(svg.querySelector('path')).toBeNull();
  });

  it('sets aria-label when supplied', () => {
    const svg = createSparkline([1, 2], { arialabel: 'trend up' });
    expect(svg.getAttribute('aria-label')).toBe('trend up');
  });
});
