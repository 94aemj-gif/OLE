# Contract: `audit_log` REST API

Append-only audit trail. Anon role can SELECT and INSERT; UPDATE and
DELETE are blocked by RLS.

## POST `/rest/v1/audit_log`

**Request body**:
```json
{
  "actor_type": "operator" | "manager" | "system",
  "actor_id":   "12345" | "<manager-uuid>" | "system",
  "actor_name": "Ana López" | "Laura Méndez" | "system",
  "action":     "CAPTURE_CREATE" | "CAPTURE_UNDO" | "CATALOG_EDIT" |
                "DAY_RESET" | "DEAD_LETTER_REPLAY" |
                "DEAD_LETTER_DISCARD" | "MANAGER_PIN_ROTATE" |
                "MANAGER_DEACTIVATE",
  "entity_type": "capture" | "line" | "operator" | "reason" | "manager" | null,
  "entity_id":   "<id>" | null,
  "detail":     { ... }
}
```

**Success** — `201 Created`.

## GET `/rest/v1/audit_log`

**Query parameters**:
- `occurred_at=gte.<iso>` and `occurred_at=lt.<iso>` — required for
  Admin → Resumen filtering
- `actor_type=eq.<type>` — optional
- `action=in.(...)` — optional
- `order=occurred_at.desc`
- `limit=200` — required ceiling for paginated UI

## Contract tests (under `tests/contract/audit_log.spec.ts`)

1. POST a valid entry → 201; PATCH the same id → 403 (RLS).
2. POST without `actor_name` → 400.
3. GET with date filter returns descending by `occurred_at`.
