# Contract: `tablet_health` REST API

Per-tablet operational signal. One row per tablet, upserted every
~30 seconds while the tablet is awake.

## POST/UPSERT `/rest/v1/tablet_health` (Prefer: `resolution=merge-duplicates`)

**Request body**:
```json
{
  "tablet_id": "tablet-uuid-…",
  "assigned_line_id": "L-01",
  "last_heartbeat": "2026-05-22T14:00:30.000Z",
  "push_queue_depth": 0,
  "dead_letter_24h": 0,
  "last_successful_sync": "2026-05-22T14:00:25.000Z",
  "local_vs_server_delta": 0,
  "app_version": "1.0.0"
}
```

**Success** — `201 Created` or `200 OK` (depending on insert vs
merge). Tablet MUST send this even when offline-recovering, on the
first successful network round trip.

## GET `/rest/v1/tablet_health`

Pulled by Tablero (for the warning badge) and by Admin → Datos →
Salud del Sistema.

**Query parameters**:
- `last_heartbeat=gte.<iso>` — optional (filter to recent)
- `order=tablet_id.asc`

## Contract tests (under `tests/contract/tablet_health.spec.ts`)

1. UPSERT with the same `tablet_id` updates the row in place.
2. GET returns all rows sorted by `tablet_id`.
3. `app_version` mismatch between tablets is detectable from the
   response payload.
