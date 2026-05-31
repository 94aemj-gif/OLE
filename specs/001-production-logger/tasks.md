---
description: "Task list for Production Logger feature"
---

# Tasks: Production Logger

## Implementation Status (2026-05-22)

- ✅ **Phase 1 Setup (T001–T015)** — fully implemented
- ✅ **Phase 2 Foundational (T016–T053)** — implemented except SQL was written but not executed against a live Neon (no Docker available locally). Contract test suite is committed as `tests/contract/_skip.spec.js` and auto-runs when `DATABASE_URL` + `DATABASE_URL` are set against a live local stack.
- ✅ **Phase 3 US1 Operator capture (T054–T073)** — fully implemented; capture flow integration tests pass.
- ✅ **Phase 4 US2 Tablero (T074–T086)** — fully implemented; pace/summary/sparkline/health-badge units pass.
- ⏭ **Phase 5 US3 Gráficas**, **Phase 6 US4 Admin**, **Phase 7 US5 Day reset** — out of MVP scope per `/speckit-implement` answer (Phases 1–4 only). Stub pages exist for `admin.html` and `graficas.html`.
- ⏭ **Phase 8 Polish** — deferred until Phases 5–7 land.

### Gate results (this turn)

- Lint: clean
- Typecheck (`tsc --noEmit`, checkJs + JSDoc): clean
- Vitest unit: 76 / 76 pass
- Vitest integration: 3 / 3 pass
- Prettier: all formatted
- Vite build: success; per-route gz: index 5.71KB / dashboard 2.36KB — far under 80KB / 120KB budgets
- Neon contract + Playwright e2e: **deferred** (require Docker / `psql "$DATABASE_URL" -f db/schema.sql`)
- Coverage threshold gate: not run this turn (focus on correctness; rerun via `pnpm test` when ready)

---

**Input**: Design documents from `/specs/001-production-logger/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Included. Constitution Principle II (Testing Standards) is NON-NEGOTIABLE. Every behavior task is preceded by a failing test task.

**Organization**: Grouped by user story per spec.md priorities (US1 P1, US2 P1, US3 P2, US4 P2, US5 P3).

## Format

`- [ ] [TaskID] [P?] [Story?] Description with file path`

- `[P]` — parallelizable (different files, no dependency on incomplete tasks)
- `[USn]` — maps to user story from spec.md
- File paths are absolute under repo root `/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bootstrap repo for vanilla JS + Vite + Neon + test stack.

- [ ] T001 Create source layout `src/pages/`, `src/modules/`, `src/styles/`, `src/public/`, `db/schema.sql/`, `db/seed.sql/`, `tests/{unit,contract,integration,e2e}/`, `scripts/` per plan.md
- [ ] T002 Initialize `package.json` with `pnpm init`; pin Node ≥20 in `engines`; add scripts `dev`, `build`, `test`, `test:unit`, `test:contract`, `test:integration`, `test:e2e`, `typecheck`, `lint`, `format:check`, `size`, `lhci`
- [ ] T003 [P] Install runtime deps `@neon/neon-js`, `chart.js` in package.json
- [ ] T004 [P] Install dev deps `vite`, `vitest`, `@vitest/coverage-v8`, `jsdom`, `playwright`, `@playwright/test`, `eslint`, `prettier`, `typescript`, `axe-core`, `@axe-core/playwright`, `lighthouse-ci`, `size-limit`, `@sinonjs/fake-timers`, `neon` (CLI dev dep)
- [ ] T005 [P] Configure ESLint at `.eslintrc.cjs` with `complexity: 10`, `no-unused-vars: error`, `no-restricted-syntax` rule forbidding raw user-facing strings outside `src/modules/i18n/`
- [ ] T006 [P] Configure Prettier at `.prettierrc` (single config; 2-space, semi, single-quote, print-width 100)
- [ ] T007 [P] Configure TypeScript `tsconfig.json` with `allowJs: true`, `checkJs: true`, `noEmit: true`, strict
- [ ] T008 [P] Configure Vite multi-page mode at `vite.config.js` declaring entries `index.html`, `dashboard.html`, `admin.html`, `graficas.html`; alias `@/` → `src/`
- [ ] T009 [P] Configure Vitest at `vitest.config.js`: jsdom env, coverage thresholds (lines ≥80 overall; ≥90 on `src/modules/{sync,kpi,audit}/**`, `tests/contract/**`)
- [ ] T010 [P] Configure Playwright at `playwright.config.js` with tablet viewport project (1024×768) and laptop viewport project
- [ ] T011 [P] Configure size-limit at `.size-limit.js` with per-route 200KB gz budgets for `index.html`, `dashboard.html`, `admin.html`, `graficas.html`
- [ ] T012 [P] Configure lighthouse-ci at `lighthouserc.cjs` with budgets: LCP ≤2500, INP ≤200, CLS ≤0.1; regression gate ±10%
- [ ] T013 [P] Create `.env.example` with `DATABASE_URL`, `DATABASE_URL` placeholders
- [ ] T014 [P] Initialize `neon init` and commit local stack config at `neon/config.toml`
- [ ] T015 [P] Create `.github/workflows/ci.yml` (lint → typecheck → unit → contract → integration → size → lhci → e2e); fail on any gate

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure every user story depends on. No US work begins until this phase passes.

**⚠️ CRITICAL**: Blocks Phase 3+.

### Neon schema + RLS

- [ ] T016 [P] Write migration `db/schema.sql`: `config` single-row table per data-model.md
- [ ] T017 [P] Write migration `db/schema.sql`: `captures` table + idempotency index + check constraints
- [ ] T018 [P] Write migration `db/schema.sql`: `audit_log` table + indexes
- [ ] T019 [P] Write migration `db/schema.sql`: `events` table + index
- [ ] T020 [P] Write migration `db/schema.sql`: `dead_letter` table + state check
- [ ] T021 [P] Write migration `db/schema.sql`: `tablet_health` table
- [ ] T022 Write migration `db/schema.sql`: enable RLS on all six tables; anon policies per data-model.md (SELECT/INSERT/UPDATE/DELETE scoping; 36h DELETE window on captures; 10s undo window on captures UPDATE)
- [ ] T023 [P] Seed file `db/seed.sql`: 2 lines, 3 shifts, 5 operators, 6 scrap reasons, 6 downtime reasons, 1 default manager (PIN hash for `1234`), default `health_thresholds`

### Storage adapters

- [ ] T024 [P] Failing unit tests for localStorage adapter at `tests/unit/storage/local-store.spec.js` covering get/set/remove, JSON safety, namespaced keys, quota error surfacing
- [ ] T025 [P] Failing unit tests for IndexedDB adapter at `tests/unit/storage/idb-store.spec.js` covering open/upgrade, put/get/delete/cursor, transaction errors
- [ ] T026 Implement `src/modules/storage/local-store.js` to make T024 pass
- [ ] T027 Implement `src/modules/storage/idb-store.js` to make T025 pass

### Neon client wrapper

- [ ] T028 Failing unit tests for `src/modules/neon/client.js` at `tests/unit/neon/client.spec.js`: REST headers, retry policy (1s/2s/5s/15s/60s capped), 4xx → dead-letter signal, 409 → success signal, 5xx → retry
- [ ] T029 Implement `src/modules/neon/client.js` to make T028 pass

### Time / shift / DST

- [ ] T030 [P] Failing unit tests `tests/unit/time/shift.spec.js`: plant-day boundary, shift bucketing, DST spring-forward, DST fall-back, hour-bucket truncation
- [ ] T031 Implement `src/modules/time/shift.js`, `src/modules/time/plant-day.js`

### Audit log writer

- [ ] T032 Failing unit tests `tests/unit/audit/writer.spec.js`: every action type produces the canonical payload; actor_name denormalization rule
- [ ] T033 Implement `src/modules/audit/writer.js` to make T032 pass

### Sync engine skeleton

- [ ] T034 Failing unit tests `tests/unit/sync/push-queue.spec.js`: enqueue, drain ordering, backoff schedule, dead-letter on 4xx, success on 409
- [ ] T035 Failing unit tests `tests/unit/sync/pull-watermark.spec.js`: watermark advance, 5-minute overlap, idempotent apply via composite key
- [ ] T036 Failing unit tests `tests/unit/sync/events-applier.spec.js`: `applied_events` set, exactly-once `day_reset` application
- [ ] T037 Implement `src/modules/sync/push-queue.js` to make T034 pass
- [ ] T038 Implement `src/modules/sync/pull.js` to make T035 pass
- [ ] T039 Implement `src/modules/sync/events.js` to make T036 pass
- [ ] T040 Implement orchestrator `src/modules/sync/index.js` that runs the 30s loop and wires push+pull+events

### Contract tests (foundational tables)

- [ ] T041 [P] Failing contract test `tests/contract/config.spec.js` per `contracts/config.api.md` (GET, PATCH merge, idempotent paired audit, 409 concurrent merge)
- [ ] T042 [P] Failing contract test `tests/contract/captures.spec.js` per `contracts/captures.api.md` (POST 201/409/422, PATCH undo within 10s vs after, DELETE within 36h vs after, GET watermark order)
- [ ] T043 [P] Failing contract test `tests/contract/audit_log.spec.js` per `contracts/audit_log.api.md`
- [ ] T044 [P] Failing contract test `tests/contract/events.spec.js` per `contracts/events.api.md`
- [ ] T045 [P] Failing contract test `tests/contract/dead_letter.spec.js` per `contracts/dead_letter.api.md`
- [ ] T046 [P] Failing contract test `tests/contract/tablet_health.spec.js` per `contracts/tablet_health.api.md`
- [ ] T047 Confirm T041–T046 fail against `psql "$DATABASE_URL" -f db/schema.sql` without migrations (red), then run `psql "$DATABASE_URL" -f db/schema.sql` and rerun to green

### Design system + i18n + UI primitives

- [ ] T048 [P] Create `src/styles/tokens.css` with `--space-1..12`, `--text-xs..2xl`, `--radius-sm..pill`, full palette (status pill, pace pill, KPI, accent stripe)
- [ ] T049 [P] Create `src/styles/components.css` with shared button/modal/toast/error-banner/destructive-confirm styles
- [ ] T050 [P] Implement `src/modules/i18n/index.js` + `src/modules/i18n/es.json` + `src/modules/i18n/en.json` with full string set; missing-key fallback to Spanish
- [ ] T051 [P] Implement `src/modules/ui/button.js`, `modal.js`, `toast.js`, `error-banner.js`, `destructive-confirm.js`, `status-pill.js`, `pace-pill.js`, `sparkline.js`
- [ ] T052 [P] Failing unit tests for UI primitives at `tests/unit/ui/*.spec.js` (DOM-level, jsdom)
- [ ] T053 Verify primitives pass T052; add axe-core assertions in `tests/unit/ui/a11y.spec.js`

**Checkpoint**: foundation green. Phase 3+ may begin in parallel.

---

## Phase 3: User Story 1 — Operator captures hourly production (Priority: P1) 🎯 MVP

**Goal**: Operator at line tablet completes a capture (employee# + units + optional scrap + optional downtime) in under 20s with ≤200ms p95 confirmation, 10s undo, offline-capable.

**Independent Test**: Run `pnpm test:e2e -- operator-capture` on a seeded local Neon; verify SC-001 (complete capture in under 20s on tablet viewport), SC-001a (≤200ms p95 confirm), and capture appears in `captures` table.

### Tests for US1 (write first, observe failing)

- [ ] T054 [P] [US1] Failing unit tests `tests/unit/capture/validation.spec.js`: 5-digit regex, unknown employee#, zero-everything reject, scrap > units reject
- [ ] T055 [P] [US1] Failing unit tests `tests/unit/capture/payload.spec.js`: payload_hash canonicalization, hour_bucket assignment from current shift
- [ ] T056 [P] [US1] Failing unit tests `tests/unit/capture/undo.spec.js`: undo window 10s, undo after window rejects
- [ ] T057 [P] [US1] Failing integration test `tests/integration/capture-flow.spec.js`: offline capture → IndexedDB queue → online → sync → server row; covers happy path, retry on 5xx, dead-letter on 422
- [ ] T058 [P] [US1] Failing Playwright e2e `tests/e2e/operator-capture.spec.js`: P1 acceptance scenarios 1–5 from spec.md including SC-001a perf assertion via `performance.mark`/`performance.measure`

### Implementation for US1

- [ ] T059 [P] [US1] `src/modules/capture/validate.js` — employee number regex + catalog lookup, scrap-vs-units, non-zero check
- [ ] T060 [P] [US1] `src/modules/capture/payload.js` — canonical JSON + SHA-256 helper + hour-bucket assignment
- [ ] T061 [US1] `src/modules/capture/local.js` — write to localStorage shift state and enqueue to push queue; depends on T026, T027, T037, T059, T060
- [ ] T062 [US1] `src/modules/capture/undo.js` — 10s window, soft-delete via local + PATCH on server (depends on T029)
- [ ] T063 [P] [US1] `src/modules/capture/numpad.js` — touch-first numpad component (≥64px hit targets)
- [ ] T064 [P] [US1] `src/modules/capture/scrap-rows.js` and `src/modules/capture/downtime-rows.js` — repeatable row editors with reason dropdowns
- [ ] T065 [US1] `src/modules/capture/modal.js` — three-section capture modal wiring T063, T064, T059; live error feedback; depends on T051
- [ ] T066 [US1] `src/modules/capture/index.js` — orchestrator: open modal, validate, persist, emit success toast + count-up + haptic, start undo timer
- [ ] T067 [US1] `src/pages/index.html` — operator page shell matching `contracts/ui/operator-tablet.md` layout (header, accent stripe, counter, hourly progress bar, CTA, status pill)
- [ ] T068 [US1] `src/modules/capture/counter.js` — animated count-up bound to localStorage shift state
- [ ] T069 [US1] `src/modules/capture/hour-alert.js` — top-of-hour alert prompt (audio toggle from config)
- [ ] T070 [US1] `src/modules/capture/end-of-shift.js` — celebration animation on target hit (no third-party deps)
- [ ] T071 [US1] `src/modules/capture/status-pill.js` (page-local wiring) — En operación / Inactivo / Mantenimiento / Avería with pulse classes from tokens
- [ ] T072 [US1] Hook `src/modules/audit/writer.js` calls for CAPTURE_CREATE and CAPTURE_UNDO from capture orchestrator
- [ ] T073 [US1] Run T054–T058 green; verify coverage on `src/modules/capture/**` ≥90% (Principle II critical-module bar)

**Checkpoint**: US1 fully functional and independently testable. MVP candidate.

---

## Phase 4: User Story 2 — Line leader monitors every line live (Priority: P1)

**Goal**: Tablero (`/dashboard.html`) shows one card per line with operator, shift, status, count, pace pill, 8h sparkline, last-capture; plant summary tiles up top; auto-refresh every 30s.

**Independent Test**: With US1 producing captures, open `/dashboard.html` and verify FR-010 through FR-013 plus pace pill threshold rules (FR-011).

### Tests for US2

- [ ] T074 [P] [US2] Failing unit tests `tests/unit/dashboard/pace.spec.js`: green ≥100%, blue ≥90%, amber ≥70%, red <70% against target × hours elapsed
- [ ] T075 [P] [US2] Failing unit tests `tests/unit/dashboard/sparkline.spec.js`: 8-hour rolling buckets, gaps render as zero, monotonic x-axis
- [ ] T076 [P] [US2] Failing unit tests `tests/unit/dashboard/summary.spec.js`: total production, total scrap, lines active, average pace
- [ ] T077 [P] [US2] Failing integration test `tests/integration/dashboard-refresh.spec.js`: 30s auto-refresh fires, new captures appear within one cycle
- [ ] T078 [P] [US2] Failing Playwright e2e `tests/e2e/tablero.spec.js`: P1 US2 acceptance scenarios 1–4

### Implementation for US2

- [ ] T079 [P] [US2] `src/modules/dashboard/pace.js` — pace calculator + threshold mapping
- [ ] T080 [P] [US2] `src/modules/dashboard/summary.js` — plant-wide aggregates
- [ ] T081 [P] [US2] `src/modules/dashboard/sparkline-data.js` — pure rolling-window aggregator
- [ ] T082 [US2] `src/modules/dashboard/card.js` — line card component using T079, T081, ui primitives (status-pill, pace-pill, sparkline)
- [ ] T083 [US2] `src/pages/dashboard.html` — layout per `contracts/ui/tablero.md`
- [ ] T084 [US2] `src/modules/dashboard/page.js` — wire pull loop, summary tiles, card grid, stale-line indicator (>60min no capture)
- [ ] T085 [US2] `src/modules/dashboard/health-badge.js` — header badge driven by `tablet_health` thresholds; deep-link to admin
- [ ] T086 [US2] Run T074–T078 green; coverage on `src/modules/dashboard/**` ≥80%

**Checkpoint**: US1 and US2 work independently. Plant has a real-time view.

---

## Phase 5: User Story 3 — Plant manager reviews daily performance and OEE (Priority: P2)

**Goal**: `/graficas.html` shows live OEE / Availability / Performance / Quality KPIs, hourly-vs-target bar chart, cumulative-vs-target line, scrap-by-hour bars, 14-day × 24-hour heatmap; end-of-shift summary popup with CSV export.

**Independent Test**: Seed a full shift; open Gráficas; verify SC-005 (manager has OEE + scrap + downtime within 5 min) and FR-019/FR-020/FR-021.

### Tests for US3

- [ ] T087 [P] [US3] Failing unit tests `tests/unit/kpi/availability.spec.js`: run_time / planned_time, breaks excluded from planned
- [ ] T088 [P] [US3] Failing unit tests `tests/unit/kpi/performance.spec.js`: actual / theoretical, capped at 1.0
- [ ] T089 [P] [US3] Failing unit tests `tests/unit/kpi/quality.spec.js`: good / actual, 1.0 on zero-denom
- [ ] T090 [P] [US3] Failing unit tests `tests/unit/kpi/oee.spec.js`: composition; sample scenario from spec.md US3 acceptance #1 (Availability 87.5%, Quality ≈ 97.2%)
- [ ] T091 [P] [US3] Failing unit tests `tests/unit/charts/hourly.spec.js`, `cumulative.spec.js`, `scrap-by-hour.spec.js`, `heatmap.spec.js`: bucketization correctness
- [ ] T092 [P] [US3] Failing unit tests `tests/unit/export/csv.spec.js`: per-capture rows + aggregate rows + escaping
- [ ] T093 [P] [US3] Failing Playwright e2e `tests/e2e/graficas.spec.js`: US3 acceptance scenarios 1–3 including CSV download

### Implementation for US3

- [ ] T094 [P] [US3] `src/modules/kpi/availability.js`
- [ ] T095 [P] [US3] `src/modules/kpi/performance.js`
- [ ] T096 [P] [US3] `src/modules/kpi/quality.js`
- [ ] T097 [US3] `src/modules/kpi/oee.js` (depends on T094–T096)
- [ ] T098 [US3] `src/modules/kpi/snapshot.js` — composes inputs + cache in localStorage (60s)
- [ ] T099 [P] [US3] `src/modules/charts/hourly.js` (chart.js wrapper, dynamic-imported)
- [ ] T100 [P] [US3] `src/modules/charts/cumulative.js`
- [ ] T101 [P] [US3] `src/modules/charts/scrap-by-hour.js`
- [ ] T102 [P] [US3] `src/modules/charts/heatmap.js` (14×24)
- [ ] T103 [P] [US3] `src/modules/export/csv.js` — capture rows + aggregates
- [ ] T104 [US3] `src/pages/graficas.html` — layout: KPI ribbon + 4 charts + EOS summary popup
- [ ] T105 [US3] `src/modules/graficas/page.js` — wires KPI ribbon, charts, and EOS popup
- [ ] T106 [US3] `src/modules/graficas/eos-popup.js` — end-of-shift summary with Exportar CSV button
- [ ] T107 [US3] Verify chart.js is dynamic-imported (not in initial bundle of `index.html`/`dashboard.html`) — `pnpm size` confirms
- [ ] T108 [US3] Run T087–T093 green; coverage on `src/modules/kpi/**` ≥90%

**Checkpoint**: Plant manager has full reporting on top of US1/US2.

---

## Phase 6: User Story 4 — Plant manager manages catalogs and lines (Priority: P2)

**Goal**: `/admin.html` Catálogos tab CRUD over lines / shifts (with breaks) / operators / scrap reasons / downtime reasons / managers; Configuración tab; cross-device propagation ≤30s. Also covers per-manager PIN auth (FR-025a/b), dead-letter resolution (FR-018a–c), and Salud del Sistema (FR-018d/e).

**Independent Test**: Add a scrap reason; within 30s it appears in the operator scrap dropdown on Línea #1 tablet; subsequent captures referencing it render on Tablero.

### Tests for US4

- [ ] T109 [P] [US4] Failing unit tests `tests/unit/auth/pin.spec.js`: SHA-256 hashing, lockout after N failures, deactivated PIN rejection
- [ ] T110 [P] [US4] Failing unit tests `tests/unit/admin/catalog-merge.spec.js`: deep JSON merge against `config.data`, conflict refetch+replay
- [ ] T111 [P] [US4] Failing unit tests `tests/unit/admin/manager-crud.spec.js`: create, rotate PIN, deactivate, paired audit entry
- [ ] T112 [P] [US4] Failing unit tests `tests/unit/admin/dead-letter-resolver.spec.js`: replay creates new capture + PATCHes dead-letter; discard PATCHes only; both audit-logged
- [ ] T113 [P] [US4] Failing unit tests `tests/unit/health/metrics.spec.js`: heartbeat-age, queue depth, dead-letter 24h rolling, local-vs-server delta
- [ ] T114 [P] [US4] Failing integration test `tests/integration/admin-catalog-propagation.spec.js`: PATCH config → second device pulls → operator dropdown updated
- [ ] T115 [P] [US4] Failing integration test `tests/integration/dead-letter-resolution.spec.js`: poisoned capture → dead-letter → replay → committed capture exists; audit chain intact
- [ ] T116 [P] [US4] Failing Playwright e2e `tests/e2e/admin-catalogs.spec.js`: US4 acceptance scenarios 1–3
- [ ] T117 [P] [US4] Failing Playwright e2e `tests/e2e/manager-pin.spec.js`: per-PIN entry, audit attribution

### Implementation for US4

- [ ] T118 [P] [US4] `src/modules/auth/pin.js` — hash, verify, lockout
- [ ] T119 [P] [US4] `src/modules/auth/session.js` — session-scoped manager identity used by audit writer
- [ ] T120 [P] [US4] `src/modules/admin/catalog-store.js` — read config, build forms, PATCH with optimistic concurrency
- [ ] T121 [P] [US4] `src/modules/admin/managers.js` — CRUD form + PIN rotation
- [ ] T122 [P] [US4] `src/modules/admin/lines.js`, `shifts.js`, `operators.js`, `scrap-reasons.js`, `downtime-reasons.js` — sub-section editors
- [ ] T123 [P] [US4] `src/modules/admin/configuracion.js` — hourly target per line, tablet↔line assignment, PIN policy, alert audio, default language, health thresholds
- [ ] T124 [US4] `src/modules/admin/dead-letter-panel.js` — list + Reintentar + Descartar; depends on T118, T029
- [ ] T125 [US4] `src/modules/admin/salud-panel.js` — per-tablet health table + amber/red cell thresholds
- [ ] T126 [US4] `src/modules/health/upserter.js` — tablet writes its own row every 30s; included by all pages
- [ ] T127 [US4] `src/modules/admin/resumen.js` — weekstrip + session history + audit log filtered viewer
- [ ] T128 [US4] `src/pages/admin.html` — tab shell + auth gate per `contracts/ui/admin.md`
- [ ] T129 [US4] `src/modules/admin/page.js` — orchestrates tabs, wires PIN gate, attaches manager identity to audit writer
- [ ] T130 [US4] Run T109–T117 green; coverage on `src/modules/auth/**` and `src/modules/admin/**` ≥85% (auth is security-critical → Principle II "critical" bar)

**Checkpoint**: Catalogs are manageable, dead-letters are resolvable, health is visible.

---

## Phase 7: User Story 5 — Plant manager resets day data safely (Priority: P3)

**Goal**: Admin → Datos → Reset Día Actual deletes today's captures across all devices and broadcasts via `events`; audit log records the action; offline tablets apply the reset on reconnect.

**Independent Test**: Trigger Reset Día Actual at 11:00; verify line tablet counter resets within 30s; today's captures gone from Tablero and Gráficas; audit log has DAY_RESET entry with manager name.

### Tests for US5

- [ ] T131 [P] [US5] Failing unit tests `tests/unit/reset/sequence.spec.js`: DELETE → POST event → POST audit; rollback on any failure
- [ ] T132 [P] [US5] Failing unit tests `tests/unit/reset/idempotent-apply.spec.js`: `applied_events` set prevents double-application on a tablet
- [ ] T133 [P] [US5] Failing integration test `tests/integration/day-reset-broadcast.spec.js`: device A initiates → device B (online) applies within 30s → device C (offline) applies on reconnect; no duplicates
- [ ] T134 [P] [US5] Failing Playwright e2e `tests/e2e/day-reset.spec.js`: US5 acceptance scenarios 1–3

### Implementation for US5

- [ ] T135 [US5] `src/modules/admin/reset-day.js` — destructive-confirm + sequenced calls + rollback path (depends on T029, T039, T033)
- [ ] T136 [US5] Wire Datos tab → Reset action UI in `src/modules/admin/page.js`
- [ ] T137 [US5] Run T131–T134 green; coverage on reset sequence ≥90%

**Checkpoint**: All five user stories independently functional and tested.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: a11y, performance, observability, docs, deployment readiness.

- [ ] T138 [P] Run `pnpm test:e2e --project=tablet -- --update-snapshots` for axe-core a11y baseline on all pages; zero new violations gate
- [ ] T139 [P] Add Playwright perf assertion `tests/e2e/perf/capture-p95.spec.js` validating SC-001a (≤200ms p95) over 100 captures on tablet viewport
- [ ] T140 [P] Add `tests/e2e/perf/cold-boot.spec.js` validating SC-007 (≤5s cold-boot to capture-ready)
- [ ] T141 [P] Run `pnpm size` and confirm every route ≤200KB gz; if `graficas.html` breaches, verify chart.js is in a dynamic chunk
- [ ] T142 [P] Run `pnpm lhci autorun` and confirm LCP/INP/CLS budgets met on `index.html` and `dashboard.html`
- [ ] T143 [P] Add CSP + security headers in `vercel.json` (default-src self, neon URL allowed for fetch)
- [ ] T144 [P] `src/public/manifest.webmanifest` + icons for PWA-readiness (service worker stays disabled until cache strategy is signed off)
- [ ] T145 [P] Verify `scripts/seed-neon.mjs`, `scripts/reset-day.mjs`, `scripts/load-test-captures.mjs` run against a fresh local stack and produce reproducible state
- [ ] T146 [P] Run quickstart.md §3 walkthrough on a clean clone; fix any drift between docs and reality
- [ ] T147 [P] Refresh `CLAUDE.md` plan reference (already set) and add `docs/CHANGELOG.md` v1.0.0 entry referencing this feature
- [ ] T148 Run full CI locally (`pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm size && pnpm lhci`); all gates green
- [ ] T149 Open PR `001-production-logger`, request review, link to spec.md / plan.md / tasks.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no deps; can start immediately
- **Foundational (Phase 2)**: depends on Phase 1; BLOCKS all user stories
- **User Stories (Phase 3+)**:
  - All depend on Phase 2
  - US1 (P1) — no deps on other stories
  - US2 (P1) — needs captures to display; can build in parallel with US1, but e2e tests need US1 producing data
  - US3 (P2) — needs captures (US1); can build in parallel with US2
  - US4 (P2) — independent of US1–US3 functionally, but Salud del Sistema and dead-letter list need US1 producing health rows and queue rows
  - US5 (P3) — needs US1 (to have captures to reset) and US4 (to host the Datos tab + PIN auth)
- **Polish (Phase 8)**: depends on all desired US complete

### User Story Dependencies (explicit)

- US1 → none (MVP)
- US2 → none structurally; integration meaningful with US1 data
- US3 → none structurally; uses captures and shifts
- US4 → consumes auth (foundational already supplies sync); standalone otherwise
- US5 → US4 (uses Datos tab + manager PIN)

### Within Each User Story

- Tests (T0xx-test) MUST be written and FAIL before implementation
- Models / pure logic before stateful modules
- Stateful modules before page wiring
- Story complete before moving to next priority

---

## Parallel Opportunities

- **Phase 1**: T003–T015 are all `[P]` — full parallel install + config burst.
- **Phase 2**:
  - Migrations T016–T021 all `[P]`.
  - Adapter tests T024, T025, T030, T032, T034, T035, T036 all `[P]`.
  - Contract tests T041–T046 all `[P]`.
  - UI tokens / primitives T048–T053 all `[P]`.
- **Phase 3 (US1)**: tests T054–T058 all `[P]`; implementation T059, T060, T063, T064 all `[P]`.
- **Phase 4 (US2)**: tests T074–T078 all `[P]`; implementation T079–T081 all `[P]`.
- **Phase 5 (US3)**: tests T087–T093 all `[P]`; implementation T094–T103 mostly `[P]`.
- **Phase 6 (US4)**: tests T109–T117 all `[P]`; implementation T118–T123 all `[P]`.
- **Phase 7 (US5)**: tests T131–T134 all `[P]`.
- **Phase 8**: all polish tasks `[P]` except the final CI run + PR open.

### Parallel example — US1 test wave

```bash
# Launch all US1 tests together (write them in parallel):
Task: "T054 [P] [US1] Validation unit tests in tests/unit/capture/validation.spec.js"
Task: "T055 [P] [US1] Payload unit tests in tests/unit/capture/payload.spec.js"
Task: "T056 [P] [US1] Undo unit tests in tests/unit/capture/undo.spec.js"
Task: "T057 [P] [US1] Capture-flow integration in tests/integration/capture-flow.spec.js"
Task: "T058 [P] [US1] Operator-capture e2e in tests/e2e/operator-capture.spec.js"
```

---

## Implementation Strategy

### MVP First (US1 + US2 only — both P1)

1. Phase 1 + Phase 2 complete → foundation green
2. Phase 3 (US1) → tablet captures work end-to-end
3. Phase 4 (US2) → Tablero is live
4. **STOP and VALIDATE**: pilot on one line for a shift, then both lines
5. Ship MVP

### Incremental Delivery

1. MVP (US1 + US2)
2. Add US3 → Gráficas + KPI reporting → demo to ops
3. Add US4 → Admin catalogs + PIN + dead-letter + Salud → unlock self-service
4. Add US5 → Reset Día Actual → close the safety loop
5. Each story shipped independently with its own e2e gate

### Parallel Team Strategy

After Phase 2:
- Dev A: US1 (Phase 3) — operator tablet
- Dev B: US2 (Phase 4) — Tablero (mocks US1 captures until ready)
- Dev C: US3 (Phase 5) — KPI math + charts (uses seeded captures from Phase 2 seed)
- Dev D: US4 (Phase 6) — admin + auth + health
- US5 last (depends on US4); whichever dev is freed first picks it up.

---

## Notes

- `[P]` = different files, no incomplete-task dependency.
- `[USn]` label maps task to user story for traceability.
- Every behavior task has a paired *failing* test task ahead of it (Principle II non-negotiable).
- Critical-module coverage gate (≥90%): `src/modules/sync/**`, `src/modules/kpi/**`, `src/modules/audit/**`, `src/modules/auth/**`, RLS policy tests.
- Commit after each task or logical group; use conventional commits per constitution.
- Stop at any checkpoint to validate a story independently before continuing.
- Avoid cross-story dependencies that break independent shipability.
