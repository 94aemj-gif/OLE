# Contract: `dead_letter` REST API

Captures that permanently failed to sync land here.

## POST `/rest/v1/dead_letter`

Issued by the tablet when a capture POST receives a 4xx other than
`409 Conflict`, or when retry budget is exhausted.

**Request body**:
```json
{
  "original_payload": { ...full capture body... },
  "line_id": "L-01",
  "operator_number": "12345",
  "client_timestamp": "2026-05-22T14:00:00.000Z",
  "client_id": "tablet-uuid-…",
  "reject_reason": "422: scrap exceeds units"
}
```

**Success** — `201 Created`. Tablet MUST also write an
`audit_log` entry `DEAD_LETTER_CREATE`.

## PATCH `/rest/v1/dead_letter?id=eq.<uuid>`

Manager-initiated resolution.

**Request body** for replay:
```json
{ "state": "replayed", "resolved_by": "<manager-uuid>", "resolved_at": "<iso>" }
```

**Request body** for discard:
```json
{ "state": "discarded", "resolved_by": "<manager-uuid>", "resolved_at": "<iso>" }
```

State transitions accepted: `pending → replayed`, `pending → discarded`.
Any other transition rejected by application logic and by a CHECK
constraint at the DB level.

## GET `/rest/v1/dead_letter`

**Query parameters**:
- `state=eq.pending` — default for Admin → Datos panel
- `order=client_timestamp.desc`
- `limit=100`

## Contract tests (under `tests/contract/dead_letter.spec.ts`)

1. POST with full payload → 201.
2. PATCH `pending → replayed` succeeds; immediate PATCH back to
   `pending` rejected.
3. PATCH `replayed → discarded` rejected.
4. GET filters by `state=eq.pending` returns only unresolved entries.
