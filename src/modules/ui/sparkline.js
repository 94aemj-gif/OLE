// @ts-check
/**
 * Render an SVG sparkline for a numeric series. Returns the SVG element.
 *
 * @param {number[]} series
 * @param {{width?:number,height?:number,arialabel?:string}} [opts]
 */
export function createSparkline(series, opts = {}) {
  const width = opts.width ?? 240;
  const height = opts.height ?? 48;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'sparkline');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  if (opts.arialabel) svg.setAttribute('aria-label', opts.arialabel);
  if (series.length === 0) return svg;
  const max = Math.max(...series, 1);
  const step = series.length > 1 ? width / (series.length - 1) : width;
  const path = document.createElementNS(ns, 'path');
  const d = series
    .map((v, i) => {
      const x = i * step;
      const y = height - (v / max) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  path.setAttribute('d', d);
  svg.appendChild(path);
  return svg;
}
