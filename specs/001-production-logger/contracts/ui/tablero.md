# UI Contract: Tablero (`/dashboard.html`)

## Page layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [accent stripe]                                                 │
│  Tablero de Producción                  [⚠ Salud]   ES|EN  ⟳     │
├──────────────────────────────────────────────────────────────────┤
│  Producción total: 3 690  │ Merma: 12 │ Líneas activas: 2/2     │
│  Pace promedio: 93%                                              │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐│
│  │ Línea #1 — Jeringa 60ml      │  │ Línea #2 — Jeringa 35ml     ││
│  │ ● En operación               │  │ ● Mantenimiento (amber)     ││
│  │ Operador: Ana López          │  │ Operador: Luis Torres        ││
│  │ Turno: Matutino              │  │ Turno: Matutino              ││
│  │ Conteo: 1 845                │  │ Conteo: 1 845                ││
│  │ [Pace pill: 82% AMBER]       │  │ [Pace pill: 95% BLUE]        ││
│  │ ▁▂▄▅▆▇█▇ (8h sparkline)      │  │ ▆▆▇█▇█▇█ (8h sparkline)     ││
│  │ Última: 14:00 — 240          │  │ Última: 14:00 — 240          ││
│  └─────────────────────────────┘  └─────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

## Pace pill thresholds (FR-011)

| Pace (% of target × hours elapsed) | Color | Token |
|------------------------------------|-------|-------|
| ≥ 100% | green | `--color-pace-ok` |
| 90% – 99.9% | blue | `--color-pace-warn` |
| 70% – 89.9% | amber | `--color-pace-alert` |
| < 70% | red | `--color-pace-crit` |

## Auto-refresh contract

- Cards re-fetch every 30s without user interaction.
- A manual ⟳ button is present for impatient users.
- Stale line indicator: if no capture in > 60min during a defined
  shift, card adds a "Sin actividad reciente" subline.

## Health badge

- The `[⚠ Salud]` button in the header is hidden by default.
- It appears when any tablet's heartbeat is older than the
  configured threshold, queue depth exceeds threshold, dead-letter
  count > 0, or local-vs-server delta > 0.
- Clicking it deep-links to `/admin.html#datos/salud`.

## Performance budgets (this page)

- Initial JS gzipped: ≤120KB
- LCP cold: ≤2.5s
- Refresh tick interaction: ≤200ms render

## Accessibility

- Status pills carry both color and text label.
- Sparkline has an `aria-label` summarizing trend (e.g.,
  "8 horas, tendencia ascendente").
