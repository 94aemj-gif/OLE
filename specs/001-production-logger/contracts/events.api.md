# Contract: `events` REST API

Used for cross-device broadcasts. Currently one event kind:
`day_reset`.

## POST `/rest/v1/events`

Issue a new event. Triggered by the manager via Admin → Datos.

**Request body**:
```json
{
  "kind": "day_reset",
  "payload": {
    "plant_day_start": "2026-05-22T05:00:00.000Z",
    "plant_day_end":   "2026-05-23T04:59:59.999Z"
  },
  "issued_by": "<manager-uuid>"
}
```

**Success** — `201 Created`, body includes generated `id`.

The day-reset action MUST sequence:
1. DELETE captures within the plant day (RLS-gated; ≤36h).
2. POST event row.
3. POST `audit_log` entry `DAY_RESET` referencing the event id.

## GET `/rest/v1/events`

Pull recent events for idempotent local application.

**Query parameters**:
- `issued_at=gte.<iso>` — required (watermark)
- `order=issued_at.asc`

## Contract tests (under `tests/contract/events.spec.ts`)

1. POST `day_reset` returns 201; GET with watermark returns the row.
2. A tablet that has the event id in its `applied_events` set MUST
   NOT re-apply the reset (integration test, not contract).
3. Day-reset that omits the paired DELETE leaves captures intact —
   integration helper MUST fail closed.
