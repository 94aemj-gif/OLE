# UI Contract: Operator Tablet (`/index.html`)

## Page layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [accent stripe]                                                 │
│  Línea #1 — Jeringa Neomed 60ml          [● En operación]  ES|EN │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│      Producción del turno                                        │
│              1 845                                               │
│         ████████████░░░░░  82% del objetivo                      │
│                                                                  │
│  Última captura: 14:00 — 240 unidades                            │
│                                                                  │
│             ┌──────────────────────┐                             │
│             │      CAPTURAR         │  ← primary CTA, glow      │
│             └──────────────────────┘                             │
│                                                                  │
│  [Próxima alerta en 23:14]                                       │
└──────────────────────────────────────────────────────────────────┘
```

## Capture modal — three sections

**Section A — Identification + units**
- 5-digit numpad input for `employee_number`. Inline validation:
  red border + Spanish/English error if regex fails or unknown number.
- Numpad for `units_produced`. Big touch targets (min 64×64).

**Section B — Downtime (optional, expandable)**
- "Agregar tiempo muerto" button reveals one row.
- Each row: minutes numpad + dropdown of active downtime reasons.
- Multiple rows allowed; minus button removes a row.

**Section C — Scrap (optional, expandable)**
- "Agregar merma" button reveals one row.
- Each row: pieces numpad + dropdown of active scrap reasons.
- Validation: Σ pieces ≤ units_produced (live error if exceeded).

**Footer**
- **Cancelar** (secondary) and **Guardar** (primary).
- After Guardar: success toast + 10-second **Deshacer** chip in the
  bottom-right.

## State pills

| State | Color | Animation |
|-------|-------|-----------|
| En operación | green | slow pulse |
| Inactivo | gray | none |
| Mantenimiento | amber | medium pulse |
| Avería | red | fast pulse |

## Interaction primitives required

- Loading: skeleton on initial catalog pull only (≤500ms).
- Empty: not applicable on this page.
- Error: red banner under header with title + cause + action; e.g.
  *"No se pudo guardar la captura. Razón: la red está fuera. Acción:
  la captura quedará en cola y se enviará al reconectar."*
- Success: toast + count-up animation on counter + haptic.
- Destructive (Deshacer): single-tap, no extra confirmation
  (warranted by the 10s window).

## Accessibility

- All numpad keys keyboard-navigable.
- `aria-live="polite"` on capture counter for screen-reader updates.
- Color contrast ≥ 4.5:1 on all status pills, validated by axe.

## Performance budgets (this page)

- Initial JS gzipped: ≤80KB
- LCP on cold load (tablet hardware): ≤2.5s
- Capture tap → confirm: ≤200ms p95
- INP throughout the modal: ≤200ms
