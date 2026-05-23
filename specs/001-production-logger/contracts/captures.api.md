# Contract: `captures` REST API

Exposed by Supabase PostgREST at `${SUPABASE_URL}/rest/v1/captures`.
All requests carry `apikey: <SUPABASE_ANON_KEY>` and `Content-Type: application/json`.

## POST `/rest/v1/captures`

Create one capture. Idempotent under composite key
`(line_id, operator_number, client_timestamp, payload_hash)`.

**Request body**:
```json
{
  "line_id": "L-01",
  "operator_number": "12345",
  "client_timestamp": "2026-05-22T14:00:00.000Z",
  "shift_id": "S-MORNING",
  "hour_bucket": "2026-05-22T14:00:00.000Z",
  "units_produced": 240,
  "scrap_rows": [
    { "reason_id": "SR-01", "pieces": 3, "note": null }
  ],
  "downtime_rows": [
    { "reason_id": "DR-02", "minutes": 5, "note": null }
  ],
  "payload_hash": "sha256:…",
  "client_id": "tablet-uuid-…"
}
```

**Success** — `201 Created`, body: created row.

**Errors**:
| Code | Condition | Client behaviour |
|------|-----------|------------------|
| `400` | Missing required field, regex violation, JSON malformed | Move to dead-letter |
| `409` | Idempotency conflict (already exists) | Treat as success (drop from queue) |
| `422` | `units_produced + scrap > 0` violated, or scrap > units | Move to dead-letter |
| `503` | Supabase temporary unavailability | Retry with backoff |
| `5xx` (other) | Server error | Retry with backoff |

**Idempotency**: A duplicate POST with the same composite key returns
`409`; client treats `409` as success.

## GET `/rest/v1/captures`

Paginated pull for sync and dashboards.

**Query parameters**:
- `updated_at=gte.<iso>` — required (watermark with 5-minute overlap)
- `undone=eq.false` — required for Tablero/Gráficas; admin views may
  omit
- `order=updated_at.asc` — required
- `limit=1000` — required (max per request)

**Success** — `200 OK`, body: `captures[]`.

## PATCH `/rest/v1/captures?id=eq.<uuid>`

Single allowed mutation: set `undone = true` within 10s of
`server_timestamp`. RLS rejects all other updates.

**Request body**: `{ "undone": true, "undone_at": "<iso>" }`

**Errors**:
| Code | Condition |
|------|-----------|
| `403` | RLS rejected — undo window expired |
| `404` | Capture id not found |

## DELETE `/rest/v1/captures`

Used only by the day-reset action. RLS allows DELETE only on rows
with `updated_at > now() - interval '36 hours'`.

**Query**: `?hour_bucket=gte.<start-of-plant-day>&hour_bucket=lt.<start-of-next-plant-day>`

**Errors**:
| Code | Condition |
|------|-----------|
| `403` | RLS rejected — out of 36h window |

## Contract tests (under `tests/contract/captures.spec.ts`)

1. POST a valid capture → 201; subsequent identical POST → 409.
2. POST with `units_produced = 0` and empty scrap/downtime → 422.
3. POST with `scrap_rows[0].pieces > units_produced` → 422.
4. PATCH `undone = true` within 10s → 200; PATCH after 10s → 403.
5. DELETE within 36h → 204; DELETE on row older than 36h → 403.
6. GET with watermark returns ascending rows up to limit 1000.
