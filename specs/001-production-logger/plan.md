# Implementation Plan: Production Logger

**Branch**: `001-production-logger` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-production-logger/spec.md`

## Summary

Local-first tablet web app for hourly production capture (units, scrap,
downtime) on a factory floor with two production lines (#1 60ml Neomed
Syringe, #2 35ml Neomed Syringe). Operators capture; line leaders watch
a live Tablero; plant managers review OEE/Availability/Performance/Quality
KPIs and manage catalogs. localStorage is the source of truth on each
tablet; Supabase (managed Postgres + REST + RLS) is the central store.
Push queue + paginated pull (30-second cycle, 5-minute watermark overlap)
reconcile data across devices. Dead-letter resolution, per-manager PIN
auth, and a Salud del Sistema panel make operational issues visible.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2022 modules), HTML5, CSS3.
No frontend framework. Type-checking via TypeScript in `checkJs` mode
over JSDoc annotations (`tsc --noEmit`).

**Primary Dependencies**:
- `@supabase/supabase-js` (REST + Realtime client)
- Charting: `chart.js` (KPI charts + sparklines)
- i18n: lightweight in-house string table (no library)
- Dev: Vite (build + dev server, framework-agnostic), Vitest (test
  runner), Playwright (e2e), ESLint + Prettier, axe-core (a11y),
  lighthouse-ci (perf budgets)

**Storage**:
- Tablet: `localStorage` (source of truth) + IndexedDB for the push
  queue and dead-letter (avoid 5MB localStorage cap as queue grows)
- Central: Supabase Postgres with Row Level Security (anon
  INSERT/SELECT on data tables; anon DELETE limited to last 36h)
- Tables: `captures`, `dead_letter`, `events`, `config` (single-row
  catalog), `audit_log`, `tablet_health`

**Testing**:
- Unit: Vitest + jsdom (KPI math, validators, queue state machine,
  i18n, time/shift logic)
- Contract: Vitest tests hitting a local Supabase (`supabase start`)
  against the published SQL migrations and RLS policies
- Integration: Vitest + jsdom simulating capture → local → sync →
  dashboard pull, including offline/online toggles and dead-letter
  paths
- E2E: Playwright smoke for P1 stories (Operator capture, Tablero)
  on tablet-class viewport against a seeded Supabase

**Target Platform**:
- Operator: tablet browser (Android Chrome / iPadOS Safari, last 2
  major versions), 1024×768 minimum
- Line leader: laptop / phone browser
- Plant manager: laptop browser
- Deployment: Vercel static hosting, Supabase managed service

**Project Type**: Web app (static front end + managed BaaS)

**Performance Goals**:
- Capture-tap → success confirmation: **≤200ms p95** on deployed
  tablet hardware (per spec SC-001a, constitution Principle IV INP)
- Tablero refresh interaction (when manually pulled): ≤200ms render
- Sync visibility: capture committed locally → visible on Tablero on
  any device **within 30s p95** (per SC-002)
- Offline → online drain: queued captures committed within 30s of
  reconnect (per SC-003)
- Cold tablet boot → capture-ready: **≤5s** (per SC-007)
- Largest Contentful Paint on the operator page (cold): **≤2.5s** on
  the deployed tablet hardware (constitution Principle IV)
- Initial JS payload per route: **≤200KB gzipped** (constitution
  Principle IV); chart.js loaded only on `graficas.html`

**Constraints**:
- Must function fully offline for an entire 8-hour shift
- No background sync may delay the success confirmation (local-first)
- Daylight-saving change crosses a shift boundary without
  miscategorizing hourly buckets
- Anon RLS only — no per-user JWT for operators; manager PIN is a
  catalog lookup, not Supabase auth
- Tablet hardware is the bottleneck; budget JS execution accordingly
- Spanish is the default UI; English toggle persists per device

**Scale/Scope**:
- Currently 2 lines; design supports up to **25 production lines and
  150 captures/hour aggregate** without architectural rework
- ~50 captures per line per shift, 3 shifts/day → ~150 captures/day
  per line → ~3,750/day plant-wide at full scale (well under
  Supabase free-tier limits)
- Historical retention: indefinite for v1; archival/purge handled
  manually by manager via Admin → Datos

## Constitution Check

*Gate: must pass before Phase 0; re-check after Phase 1.*

Derived from `.specify/memory/constitution.md` v1.0.0.

### Principle I — Code Quality

| Gate | Status | Notes |
|------|--------|-------|
| Lint + format CI gate | PASS | ESLint + Prettier wired into Vercel build; CI fails on errors |
| Type-check on every commit | PASS | `tsc --noEmit` over JSDoc-annotated JS in `checkJs` mode |
| Cyclomatic complexity ≤10/function (advisory ≤50 LOC) | PASS | ESLint `complexity` rule = 10; reviewer judgement past that |
| No commented-out / dead code | PASS | `no-dead-code` + manual review |
| Rule of Three for duplication | PASS | Documented; reviewer-enforced |

### Principle II — Testing Standards (NON-NEGOTIABLE)

| Gate | Status | Notes |
|------|--------|-------|
| TDD: tests first, observed failing | PASS | Phase 1 generates failing contract + integration tests before implementation |
| ≥80% line coverage overall | PASS | Vitest `--coverage` threshold gate in CI |
| ≥90% on critical modules | PASS | Critical: `modules/sync`, `modules/kpi`, `modules/audit`, RLS policies |
| Test pyramid (unit > integration > e2e) | PASS | Targets: ~70% unit, ~25% integration/contract, ~5% e2e (P1 stories only) |
| Determinism (no clock/network in unit) | PASS | `@sinonjs/fake-timers`; Supabase contract suite uses ephemeral local instance |
| Contract tests on every public boundary | PASS | REST contract suite per table; OpenAPI-style contracts under `contracts/` |
| Flaky-test quarantine SLA (24h / 7d) | PASS | Documented in `quickstart.md` |

### Principle III — User Experience Consistency

| Gate | Status | Notes |
|------|--------|-------|
| Single design system source of truth | PASS | `src/styles/tokens.css` with `--space-*`, `--text-*`, `--radius-*`, palette tokens |
| Uniform interaction primitives | PASS | Shared components: button, modal, toast, error-banner, confirm, destructive-action |
| WCAG 2.1 AA on every UI change | PASS | axe-core CI gate + manual keyboard pass; contrast tokens validated |
| Consistent terminology | PASS | i18n string table is the only source; lint forbids inline strings |
| Error messages: what + why + next step | PASS | Error component requires `title`, `cause`, `action` props |

### Principle IV — Performance Requirements

| Gate | Status | Notes |
|------|--------|-------|
| Capture confirm p95 ≤200ms | PASS | Local-first writes; perf test in CI; lighthouse-ci budget |
| LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 | PASS | lighthouse-ci budgets file; tablet emulation profile |
| Initial JS payload ≤200KB gz/route | PASS | Vite chunk analyzer + size-limit CI gate; chart.js dynamic-imported on `graficas.html` only |
| Sync visibility ≤30s p95 | PASS | Sync interval = 30s; integration test asserts |
| Regression gate ±10% on tracked metrics | PASS | lighthouse-ci diff against main baseline |
| Observability on every prod path | PASS | `tablet_health` table + `audit_log` + structured console logs piped to Supabase logs |

**Result**: All gates PASS. No Complexity Tracking entries required.

### Compliance Note

Spec clarified: system is **not** an official regulated record under
21 CFR Part 11 / GMP. Constitution does not impose compliance gates
beyond audit-logging, which the spec already requires.

## Project Structure

### Documentation (this feature)

```text
specs/001-production-logger/
├── plan.md              # This file
├── spec.md              # Feature spec (with Clarifications)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── captures.api.md
│   ├── config.api.md
│   ├── events.api.md
│   ├── audit_log.api.md
│   ├── dead_letter.api.md
│   ├── tablet_health.api.md
│   └── ui/
│       ├── operator-tablet.md
│       ├── tablero.md
│       └── admin.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (already passing)
└── tasks.md             # Phase 2 output (generated by /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── pages/                       # Static entry points (Vercel static)
│   ├── index.html               # Operator tablet
│   ├── dashboard.html           # Tablero (line leader)
│   ├── admin.html               # Admin tabs: Resumen | Catálogos | Configuración | Datos
│   └── graficas.html            # KPI charts (plant manager)
├── modules/
│   ├── capture/                 # Capture popup, numpad, validation, undo window
│   ├── sync/                    # Push queue (IndexedDB), paginated pull, dead-letter, watermark
│   ├── storage/                 # localStorage + IndexedDB adapters
│   ├── supabase/                # REST client wrapper, retry, idempotency
│   ├── kpi/                     # OEE / Availability / Performance / Quality math + shift accounting
│   ├── audit/                   # Audit log writer
│   ├── auth/                    # Per-manager PIN lookup + session
│   ├── health/                  # Tablet heartbeat, queue depth, delta calc
│   ├── ui/                      # Tokenized components (button, modal, toast, pace pill, status pill, sparkline)
│   ├── i18n/                    # ES/EN string tables + language toggle
│   ├── charts/                  # chart.js wrappers (dynamic-imported on graficas page)
│   └── time/                    # Plant-local time, shift boundary, DST handling
├── styles/
│   ├── tokens.css               # Design tokens (--space-*, --text-*, --radius-*, palette)
│   └── components.css
└── public/                      # PWA manifest, icons, service worker (disabled during iteration)

supabase/
├── migrations/                  # SQL migrations for tables + RLS policies
└── seed/                        # Catalog seed data for tests + onboarding

tests/
├── unit/                        # Pure-function tests (KPI, validators, queue, time)
├── contract/                    # Supabase REST + RLS contract tests against local supabase
├── integration/                 # Capture → sync → dashboard flows (jsdom + fake supabase)
└── e2e/                         # Playwright smoke for P1 stories

scripts/
├── seed-supabase.mjs
├── reset-day.mjs
└── load-test-captures.mjs
```

**Structure Decision**: Web-app variant of the single-project template
(static front end + managed BaaS). The "backend" is Supabase schema +
RLS policies versioned under `supabase/`. No separate backend service
exists in v1.

## Post-Design Constitution Re-check

After producing `research.md`, `data-model.md`, `contracts/*`, and
`quickstart.md`, all four constitutional gates remain PASS:

- **I. Code Quality** — Project Structure introduces no abstractions
  beyond the four principle-driven modules (capture, sync, kpi, audit)
  and the supporting UI/i18n primitives. No premature genericization.
- **II. Testing Standards** — Each contract file under `contracts/`
  lists explicit contract tests that MUST be written and observed
  failing before the implementation lands. Coverage thresholds remain
  enforceable.
- **III. UX Consistency** — `contracts/ui/*.md` constrains every page
  to the same primitives (status pill, pace pill, destructive
  confirmation), the same token set, and the same error-message
  contract.
- **IV. Performance** — Per-route JS budgets are listed in each UI
  contract; the lighthouse-ci file in `quickstart.md` enumerates the
  full Web-Vitals + bundle gate.

No new Complexity Tracking entries arose from Phase 1.

## Complexity Tracking

*Empty — all Constitution Check gates pass without justified violations.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | — | — |
