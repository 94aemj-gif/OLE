# UI Contract: Admin (`/admin.html`)

Entry gated by per-manager PIN. On success, the resolved manager
display name is attached to every action in the session and to every
audit log entry.

## Tab structure

```
[Resumen] [Catálogos] [Configuración] [Datos]
```

## Resumen

- Top: weekstrip date picker (7 days, default = today).
- Left pane: **Historial de Sesiones** — per-day session table
  (one row per operator × line × shift), with totals + OEE preview.
- Right pane: **Bitácora de Movimientos** — filterable audit log
  table (filters: actor type, action, entity type, date range).
- Both panes paginated, default 50 rows/page.

## Catálogos

Sub-sections (left rail):
- Líneas (CRUD)
- Turnos (CRUD with break editor)
- Operadores (CRUD; 5-digit regex enforced inline)
- Razones de merma (CRUD with sort order)
- Razones de tiempo muerto (CRUD with sort order)
- **Managers** (CRUD; PIN entry obscured; PIN rotation; deactivate)

All edits land in `config.data` and are paired with an audit log
entry. Cross-device propagation: ≤30s.

## Configuración

- Objetivo por hora (per line)
- Asignación tablet ↔ línea
- PIN-handling: minimum length, lockout after N failed entries
- Audio de alerta hora (on/off + sample)
- Idioma por defecto (ES/EN)
- Umbrales de salud (heartbeat max-age, queue depth, delta) —
  feeds Tablero badge

## Datos

Three sub-views:

1. **Reset Día Actual** — confirmation flow that
   (a) DELETE captures for today (RLS-bounded 36h),
   (b) POST `events.day_reset`,
   (c) POST `audit_log.DAY_RESET`.
   All three MUST succeed or the action is rolled back client-side
   and surfaced as an error banner.

2. **Capturas Pendientes (dead-letter)** — list of unresolved
   `dead_letter` rows. Per row:
   - View payload + reject reason (read-only)
   - **Reintentar** — pre-fills the capture modal with the payload;
     manager edits, submits a fresh `captures` POST, then PATCHes
     dead-letter row to `replayed`, audit `DEAD_LETTER_REPLAY`.
   - **Descartar** — PATCH dead-letter to `discarded`, audit
     `DEAD_LETTER_DISCARD`. Confirmation required.
   - Numeric badge in the Admin nav reflects `state=pending` count.

3. **Salud del Sistema** — per-tablet table:
   - `tablet_id`, `assigned_line_id`, `last_heartbeat`,
     `push_queue_depth`, `dead_letter_24h`,
     `last_successful_sync`, `local_vs_server_delta`, `app_version`.
   - Cells turn amber/red when their value crosses the configured
     threshold.
   - Refresh interval: 30s (matches health upserts).

## Destructive-action confirmation primitive

Used by Reset Día Actual, Descartar dead-letter, Deactivate
manager, Delete catalog item:

```
  ┌────────────────────────────────────────────┐
  │  ⚠ Acción destructiva                       │
  │                                            │
  │  <what will happen, why, what to type>      │
  │                                            │
  │  Escribe RESET para confirmar:             │
  │  [___________________]                     │
  │                                            │
  │  [Cancelar]                    [Confirmar] │
  └────────────────────────────────────────────┘
```

Manager must type the exact action keyword (`RESET`, `DESCARTAR`,
etc.). The Confirmar button stays disabled until the input matches.

## Performance budgets (this page)

- Initial JS gzipped: ≤180KB (chart.js dynamic-imported only when
  Gráficas pop-out is opened)
- LCP cold: ≤2.5s
- Tab switch interaction: ≤150ms
