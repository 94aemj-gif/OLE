// @ts-check
/**
 * Dynamic chart.js loader. Lazy-imports the runtime so non-graficas pages
 * never pay the bundle cost.
 */
let chartModulePromise = null;

export async function loadChart() {
  if (!chartModulePromise) {
    chartModulePromise = import('chart.js/auto');
  }
  return chartModulePromise;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{labels:string[], data:number[], target:number, label:string}} cfg
 */
export async function renderHourlyVsTarget(canvas, cfg) {
  const { default: Chart } = await loadChart();
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: cfg.labels,
      datasets: [
        { label: cfg.label, data: cfg.data, backgroundColor: '#2563eb' },
        {
          label: 'Target',
          type: 'line',
          data: cfg.labels.map(() => cfg.target),
          borderColor: '#dc2626',
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{labels:string[], actual:number[], target:number[]}} cfg
 */
export async function renderCumulativeVsTarget(canvas, cfg) {
  const { default: Chart } = await loadChart();
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: cfg.labels,
      datasets: [
        { label: 'Cumulativo', data: cfg.actual, borderColor: '#2563eb', tension: 0.3 },
        {
          label: 'Objetivo',
          data: cfg.target,
          borderColor: '#dc2626',
          borderDash: [4, 4],
          tension: 0
        }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{labels:string[], data:number[]}} cfg
 */
export async function renderScrapByHour(canvas, cfg) {
  const { default: Chart } = await loadChart();
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: cfg.labels,
      datasets: [{ label: 'Merma', data: cfg.data, backgroundColor: '#dc2626' }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

/**
 * 14×24 heatmap implemented with a custom DOM grid (chart.js matrix plugin
 * deferred). Returns the root element.
 *
 * @param {number[][]} grid
 * @param {string[]} dayLabels
 */
export function renderHeatmap(grid, dayLabels) {
  const root = document.createElement('div');
  root.style.display = 'grid';
  root.style.gridTemplateColumns = `64px repeat(24, 1fr)`;
  root.style.gap = '2px';
  root.style.fontSize = 'var(--text-xs)';
  // header row
  root.append(makeCell('', true));
  for (let h = 0; h < 24; h += 1) root.append(makeCell(String(h).padStart(2, '0'), true));
  const max = Math.max(1, ...grid.flat());
  for (let d = 0; d < grid.length; d += 1) {
    root.append(makeCell(dayLabels[d] ?? '', true));
    for (let h = 0; h < 24; h += 1) {
      const value = grid[d][h];
      const cell = makeCell(value ? String(value) : '', false);
      const intensity = max === 0 ? 0 : value / max;
      cell.style.background = `rgba(37, 99, 235, ${intensity.toFixed(2)})`;
      if (intensity > 0.5) cell.style.color = 'white';
      root.append(cell);
    }
  }
  return root;
}

function makeCell(text, header) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.padding = '4px 6px';
  el.style.textAlign = 'center';
  el.style.background = header ? 'var(--bg)' : 'var(--surface)';
  el.style.borderRadius = 'var(--radius-sm)';
  if (header) el.style.color = 'var(--text-muted)';
  return el;
}
