# Contract: `config` REST API

Single-row catalog at `${DATABASE_URL}/rest/v1/config?id=eq.1`.

## GET `/rest/v1/config?id=eq.1`

Pull current catalog. Returned shape conforms to the `data` JSON
schema documented in `data-model.md`.

**Success** — `200 OK`, body: `[{ id: 1, data: {...}, updated_at: "<iso>" }]`.

## PATCH `/rest/v1/config?id=eq.1`

Merge an update into `data`. Front-end gates this behind a valid
manager PIN; RLS does not.

**Request body**: `{ "data": { ...partial merge... }, "updated_at": "<iso>" }`

Every PATCH MUST also POST an `audit_log` entry with
`action = 'CATALOG_EDIT'` and a `detail.diff` field that summarizes
the change. The front end SHOULD wrap both writes in a single
transaction-like helper that fails closed if the audit write fails.

**Errors**:
| Code | Condition |
|------|-----------|
| `400` | JSON schema violation in `data` |
| `409` | Optimistic concurrency conflict (server `updated_at` newer) — client refetches and retries |

## Contract tests (under `tests/contract/config.spec.ts`)

1. GET returns row with the seeded catalog.
2. PATCH with a valid `operators` addition merges and bumps
   `updated_at`.
3. PATCH that adds an operator with a 4-digit `employee_number` is
   rejected by client-side validation before reaching server.
4. PATCH without a paired `audit_log` insert fails the
   transactional helper.
5. Concurrent PATCH from two managers → second receives 409; client
   refetches, replays merge, retries.
