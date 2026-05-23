# Phase 1 Data Model: Production Logger

**Feature**: 001-production-logger
**Date**: 2026-05-22
**Backing store**: Supabase Postgres (managed). Tablets mirror via
localStorage (hot state) + IndexedDB (push queue, dead-letter, applied
events). All times are stored as `timestamptz` (UTC) and rendered in
plant-local time.

---

## Entity overview

| Entity | Source of truth | Mirrored to tablet? |
|--------|-----------------|---------------------|
| Production Line | `config` row (subkey `lines`) | Yes (full) |
| Shift | `config` row (subkey `shifts`) | Yes (full) |
| Operator | `config` row (subkey `operators`) | Yes (full) |
| Scrap Reason | `config` row (subkey `scrap_reasons`) | Yes (full) |
| Downtime Reason | `config` row (subkey `downtime_reasons`) | Yes (full) |
| Manager | `config` row (subkey `managers`) | Yes (PIN hash only; not plaintext) |
| Plant Settings | `config` row (subkey `plant`) | Yes (full) |
| Capture | `captures` table | Yes (current shift + 7d cache) |
| Audit Log Entry | `audit_log` table | Pull-only on Admin page |
| Day Reset Event | `events` table | Yes (idempotency-tracked) |
| Dead-Letter Capture | `dead_letter` table | Yes (count badge + Admin list) |
| Tablet Health Signal | `tablet_health` table | Yes (heartbeat write) |
| KPI Snapshot | Derived (not stored) | Computed client-side |

---

## `config` (single-row catalog table)

One row identified by `id = 1`. All catalog edits are JSON merges
against this row's `data` column; the `updated_at` advances on every
write and drives the catalog sync watermark.

```sql
create table public.config (
  id           int primary key default 1,
  data         jsonb not null,
  updated_at   timestamptz not null default now()
);
```

**`data` schema (TypeScript-style)**:

```ts
{
  plant: {
    timezone: "America/Mexico_City",
    default_language: "es" | "en",
    hourly_alert_audio: boolean
  },
  lines: Array<{
    id: string,                 // e.g. "L-01"
    display_name: string,       // "Línea #1 — Jeringa Neomed 60ml"
    hourly_target: number,      // units/hour
    assigned_tablet_id: string | null,
    active: boolean
  }>,
  shifts: Array<{
    id: string,                 // "S-MORNING"
    name: string,               // "Turno Matutino"
    start: "HH:mm",             // plant-local civil time
    end: "HH:mm",
    breaks: Array<{ name: string, start: "HH:mm", end: "HH:mm" }>
  }>,
  operators: Array<{
    employee_number: string,    // exactly 5 digits, primary key
    display_name: string,
    active: boolean
  }>,
  scrap_reasons: Array<{
    id: string,
    name: string,               // "Pistón roto"
    active: boolean,
    sort_order: number
  }>,
  downtime_reasons: Array<{
    id: string,
    name: string,               // "Junta de producción"
    active: boolean,
    sort_order: number
  }>,
  managers: Array<{
    id: string,                 // uuid
    display_name: string,       // "Laura Méndez"
    pin_hash: string,           // sha256(pin + salt)
    active: boolean,
    created_at: string          // ISO timestamp
  }>,
  health_thresholds: {
    heartbeat_max_age_seconds: 300,
    queue_depth_max: 50,
    delta_max: 0
  }
}
```

**Validation rules**:
- `lines[].id` unique; `lines[].hourly_target > 0`.
- `operators[].employee_number` matches `^\d{5}$`; unique.
- `managers[].pin_hash` is SHA-256 hex; plain PIN never stored.
- `shifts[].start` and `shifts[].end` differ; breaks lie within shift.
- `scrap_reasons[].id` and `downtime_reasons[].id` unique within type.

**State transitions**:
- Adding/removing items from any list propagates to every device on
  next pull cycle.
- Deactivating (`active: false`) leaves historical references intact;
  the entity is just hidden from new dropdowns.

---

## `captures`

Every operator capture lands here.

```sql
create table public.captures (
  id                 uuid primary key default gen_random_uuid(),
  line_id            text not null,
  operator_number    text not null check (operator_number ~ '^\d{5}$'),
  client_timestamp   timestamptz not null,         -- when the tablet recorded
  server_timestamp   timestamptz not null default now(),
  shift_id           text not null,
  hour_bucket        timestamptz not null,         -- truncated to hour, plant-local
  units_produced     int  not null check (units_produced >= 0),
  scrap_rows         jsonb not null default '[]',  -- [{ reason_id, pieces, note? }]
  downtime_rows      jsonb not null default '[]',  -- [{ reason_id, minutes, note? }]
  payload_hash       text not null,                -- sha256 of canonical payload
  client_id          text not null,                -- tablet uuid
  undone             boolean not null default false,
  undone_at          timestamptz,
  updated_at         timestamptz not null default now()
);

create unique index captures_idempotency
  on public.captures (line_id, operator_number, client_timestamp, payload_hash);

create index captures_updated_at_idx on public.captures (updated_at);
create index captures_hour_bucket_idx on public.captures (line_id, hour_bucket);
```

**Validation rules**:
- `units_produced + Σ scrap_rows.pieces > 0` (zero-everything capture
  rejected — see edge case).
- Σ `scrap_rows.pieces` ≤ `units_produced` (scrap cannot exceed
  produced units in one capture).
- `scrap_rows[].reason_id` must exist in `config.scrap_reasons` at
  time of capture (validated client-side).
- `downtime_rows[].reason_id` must exist in `config.downtime_reasons`.
- `undone` is a soft delete; undone captures are filtered out of all
  totals and KPIs.

**State transitions**:
- `pending` (in IndexedDB push queue, not yet POSTed)
- `committed` (server-side, `undone = false`)
- `undone` (within 10s window, soft-deleted)
- `dead-lettered` (4xx from server; moved to `dead_letter` table)

---

## `audit_log`

Append-only record of every state-changing action.

```sql
create table public.audit_log (
  id              uuid primary key default gen_random_uuid(),
  occurred_at     timestamptz not null default now(),
  actor_type      text not null check (actor_type in ('operator', 'manager', 'system')),
  actor_id        text not null,           -- employee_number for operator, manager.id for manager
  actor_name      text not null,           -- denormalized display name for read-time stability
  action          text not null,           -- 'CAPTURE_CREATE', 'CAPTURE_UNDO', 'CATALOG_EDIT',
                                           -- 'DAY_RESET', 'DEAD_LETTER_REPLAY', 'DEAD_LETTER_DISCARD',
                                           -- 'MANAGER_PIN_ROTATE', 'MANAGER_DEACTIVATE'
  entity_type     text,                    -- 'capture' | 'line' | 'operator' | 'reason' | 'manager' | null
  entity_id       text,
  detail          jsonb not null default '{}'
);

create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index audit_log_actor_idx on public.audit_log (actor_type, actor_id);
```

**Validation rules**:
- Every destructive admin action writes exactly one entry.
- Bulk operations (e.g., day reset) write one entry per logical
  action, not per affected row.

---

## `events`

Cross-device broadcasts (currently only `day_reset`).

```sql
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('day_reset')),
  payload      jsonb not null,
  issued_at    timestamptz not null default now(),
  issued_by    text not null            -- manager.id
);

create index events_kind_issued_idx on public.events (kind, issued_at desc);
```

**Tablet-side**: `applied_events` set in localStorage tracks
processed `event.id` values; an event is applied at most once per
device.

---

## `dead_letter`

Captures the server rejected (4xx) or that exceeded retry budget.

```sql
create table public.dead_letter (
  id                  uuid primary key default gen_random_uuid(),
  original_payload    jsonb not null,
  line_id             text not null,
  operator_number     text,
  client_timestamp    timestamptz not null,
  client_id           text not null,
  reject_reason       text not null,
  state               text not null default 'pending'
                       check (state in ('pending', 'replayed', 'discarded')),
  resolved_by         text,                 -- manager.id
  resolved_at         timestamptz
);

create index dead_letter_state_idx on public.dead_letter (state, client_timestamp);
```

**State transitions**:
- `pending` → `replayed` (manager edits and re-submits as a new
  `captures` row; this row stays for audit but is removed from active
  count)
- `pending` → `discarded` (manager permanently dismisses)

---

## `tablet_health`

Per-tablet heartbeat and operational metrics. One row per tablet,
upserted by the tablet itself every 30 seconds.

```sql
create table public.tablet_health (
  tablet_id            text primary key,
  assigned_line_id     text,
  last_heartbeat       timestamptz not null,
  push_queue_depth     int not null default 0,
  dead_letter_24h      int not null default 0,
  last_successful_sync timestamptz,
  local_vs_server_delta int not null default 0,
  app_version          text not null
);
```

**Validation rules**:
- `push_queue_depth >= 0`.
- `dead_letter_24h >= 0`.
- `local_vs_server_delta >= 0` (absolute value).

---

## RLS policies (summary; full SQL under `supabase/migrations/`)

| Table | anon SELECT | anon INSERT | anon UPDATE | anon DELETE |
|-------|-------------|-------------|-------------|-------------|
| `config` | ✅ | ❌ | ✅ (front-end PIN-gated) | ❌ |
| `captures` | ✅ | ✅ | ✅ (only `undone = true`, only within 10s) | ✅ (only last 36h, front-end manager-gated) |
| `audit_log` | ✅ | ✅ | ❌ | ❌ |
| `events` | ✅ | ✅ | ❌ | ❌ |
| `dead_letter` | ✅ | ✅ | ✅ (state transitions only) | ❌ |
| `tablet_health` | ✅ | ✅ (upsert) | ✅ | ❌ |

`anon DELETE` on `captures` is scoped by `WHERE updated_at > now() - interval '36 hours'`
as a defense-in-depth net so even a misbehaving client cannot purge
the historical record. The day-reset action operates strictly inside
this 36h window.

---

## Derived: KPI Snapshot

Computed client-side; not persisted. Inputs: `captures` for the
selected window + `config.lines[].hourly_target` + `config.shifts[]`.

```ts
type KpiSnapshot = {
  window: { start: ISOString, end: ISOString, shift_id?: string, line_id?: string },
  planned_minutes: number,
  downtime_minutes: number,
  run_minutes: number,
  units_produced: number,
  scrap_units: number,
  good_units: number,
  theoretical_units: number,        // hourly_target * (run_minutes / 60)
  availability: number,             // run_minutes / planned_minutes
  performance: number,              // min(units_produced / theoretical_units, 1.0)
  quality: number,                  // good_units / units_produced (1.0 if denom 0)
  oee: number                        // availability * performance * quality
};
```

Cached in localStorage under `kpi_cache:<window-hash>` for 60s to
avoid recomputation on rapid filter changes.

---

## Cross-entity invariants

1. Every committed `captures` row has at least one corresponding
   `audit_log` entry with `action = 'CAPTURE_CREATE'`.
2. Every `captures` row with `undone = true` has a corresponding
   `audit_log` entry with `action = 'CAPTURE_UNDO'` whose
   `entity_id` equals the capture's `id`.
3. Every `dead_letter` row has a matching `audit_log` entry at
   creation (`DEAD_LETTER_CREATE`, written by the tablet) and at
   resolution (`DEAD_LETTER_REPLAY` or `DEAD_LETTER_DISCARD`).
4. Every `day_reset` event has exactly one `audit_log` entry of
   action `DAY_RESET` whose `detail.event_id` matches `events.id`.
5. `tablet_health.last_heartbeat` MUST be no older than 60s while the
   tablet is awake and online. A stale heartbeat triggers the Salud
   del Sistema warning.
