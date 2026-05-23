<!--
Sync Impact Report
==================
Version change: (uninitialized template) → 1.0.0
Bump rationale: Initial ratification of the project constitution. MAJOR version
established because this is the first authoritative governance document.

Modified principles:
- [PRINCIPLE_1_NAME] → I. Code Quality
- [PRINCIPLE_2_NAME] → II. Testing Standards (NON-NEGOTIABLE)
- [PRINCIPLE_3_NAME] → III. User Experience Consistency
- [PRINCIPLE_4_NAME] → IV. Performance Requirements
- [PRINCIPLE_5_NAME] → REMOVED (template default not adopted; project converges on
  four focused principles per ratification scope)

Added sections:
- Quality Gates & Standards (replaces [SECTION_2_NAME])
- Development Workflow & Review (replaces [SECTION_3_NAME])
- Governance (filled with concrete rules)

Removed sections:
- 5th principle slot (not adopted in initial ratification)

Templates requiring updates:
- ✅ .specify/memory/constitution.md (this file)
- ⚠ .specify/templates/plan-template.md — "Constitution Check" section is a
  placeholder; align Constitution Check gates with the four principles below
  the next time `/speckit-plan` is invoked.
- ⚠ .specify/templates/spec-template.md — Success Criteria section should
  reference measurable performance and UX consistency metrics defined here.
- ⚠ .specify/templates/tasks-template.md — Polish phase should explicitly
  include performance budget verification and UX consistency audit tasks.
- ✅ .specify/templates/checklist-template.md — no constitution references
  detected; no change required.
- ✅ .specify/extensions.yml — orthogonal to principle content; no change.

Follow-up TODOs:
- None. Ratification date set to today (2026-05-22).
-->

# OLE Constitution

## Core Principles

### I. Code Quality

All production code MUST be readable, maintainable, and consistent. The following
rules are non-negotiable:

- Static analysis (linter + formatter + type checker where the language supports it)
  MUST pass on every commit; CI MUST fail builds on lint, format, or type errors.
- Public functions, exported types, and modules MUST have names that communicate
  intent; comments are reserved for non-obvious *why*, never *what*.
- Cyclomatic complexity per function SHOULD remain ≤ 10; functions exceeding 50
  source lines MUST be justified in the PR description or refactored.
- Duplication MUST be removed once a third instance appears (Rule of Three);
  premature abstraction before that threshold is rejected.
- Dead code, commented-out blocks, and unused exports MUST be deleted, not
  preserved "for later".

**Rationale**: Readability multiplies every other engineering activity (review,
debugging, onboarding, refactoring). Enforcing it mechanically via CI removes
subjective debate and keeps reviewer attention on logic, not style.

### II. Testing Standards (NON-NEGOTIABLE)

Tests are a first-class deliverable. The following rules are non-negotiable:

- Test-first discipline: tests for new behavior MUST be written and observed
  failing before the implementation lands (Red → Green → Refactor).
- Coverage thresholds: line coverage MUST be ≥ 80% overall and ≥ 90% for any
  module classified as critical (auth, billing, data persistence, security).
  CI MUST fail builds that drop coverage below threshold.
- Test pyramid: unit tests dominate; integration tests cover module contracts
  and external boundaries; end-to-end tests cover priority-1 user journeys only.
- Determinism: tests MUST NOT depend on wall-clock time, network, or shared
  mutable fixtures. Flaky tests MUST be quarantined within 24h and fixed or
  deleted within 7 days.
- Contract tests are required for every public API boundary (HTTP, RPC, SDK).
  Breaking contract changes MUST bump the consumer-visible version.

**Rationale**: Tests are the only durable specification of system behavior.
Writing them first forces interface clarity; enforcing thresholds prevents the
slow erosion that makes legacy code unsafe to change.

### III. User Experience Consistency

User-facing surfaces MUST behave predictably across the product. The following
rules are non-negotiable:

- A single design system / component library MUST be the source of truth for
  visual elements, typography, spacing, and interaction patterns. Ad-hoc
  styling that bypasses the design system MUST be justified in the PR.
- Interaction primitives (loading, empty, error, success, confirmation,
  destructive-action warning) MUST be implemented uniformly. Inventing a new
  pattern requires updating the design system, not a one-off implementation.
- Accessibility MUST meet WCAG 2.1 AA at minimum: keyboard navigability,
  semantic markup, sufficient contrast, focus management, and screen-reader
  labels are required for every shipped UI change.
- Copy and microcopy MUST follow the project voice guide; terminology MUST be
  consistent (e.g., "user" vs. "account" vs. "member" — pick one and enforce).
- Error messages MUST tell the user *what happened, why, and what to do next*.
  Stack traces, internal codes, or "Something went wrong" alone are rejected.

**Rationale**: Inconsistency taxes the user with re-learning the product on
every surface. Centralizing patterns reduces cognitive load, increases trust,
and makes accessibility achievable rather than aspirational.

### IV. Performance Requirements

Performance is a feature with measurable budgets, not an aspiration. The
following rules are non-negotiable:

- Backend latency budgets: p50 ≤ 100ms, p95 ≤ 300ms, p99 ≤ 1000ms for
  user-facing API endpoints under expected load. Background jobs declare and
  meet their own per-job SLOs.
- Frontend budgets (where applicable): Largest Contentful Paint ≤ 2.5s,
  Interaction to Next Paint ≤ 200ms, Cumulative Layout Shift ≤ 0.1 on the
  75th-percentile real-user session.
- Resource budgets: initial JS payload ≤ 200KB gzipped per route; server
  memory per request ≤ 256MB; no query without an index hitting > 1k rows.
- Regression gate: performance-sensitive PRs MUST include a before/after
  measurement. CI MUST fail when a tracked metric regresses by > 10% without
  written justification.
- Observability: every production code path MUST emit structured logs and
  the metrics needed to verify the budgets above. "We can't measure it" is
  not a valid excuse for missing a budget.

**Rationale**: Performance regressions compound silently and are expensive to
reverse. Defining numeric budgets converts "fast enough" from opinion into a
falsifiable check that CI can enforce.

## Quality Gates & Standards

The following gates MUST pass before any change merges to the main branch:

- **Static checks**: lint, format, type-check — zero errors, zero warnings on
  changed files.
- **Tests**: full unit + integration suite green; coverage thresholds met
  (see Principle II).
- **Security**: dependency vulnerability scan clean at HIGH/CRITICAL severity;
  secret-scanning clean.
- **Performance**: tracked metrics within budget (see Principle IV) for any
  change touching a performance-sensitive path.
- **Accessibility**: automated a11y scan (e.g., axe) reports zero new
  violations on changed UI surfaces.
- **Documentation**: public API or user-visible behavior changes MUST update
  the corresponding spec, README, or changelog entry in the same PR.

Bypassing a gate requires explicit written approval from a maintainer in the
PR and an entry in the Complexity Tracking table of the relevant plan.

## Development Workflow & Review

- **Spec-driven flow**: features follow `/speckit-specify` → `/speckit-clarify`
  → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`. Skipping a
  step requires justification in the plan.
- **Branching**: one feature per branch, named per the project's branch
  convention. Branches MUST rebase (not merge) onto main before review.
- **Code review**: every PR requires at least one reviewer who did not author
  the change. Reviewers evaluate against the four principles above; "looks
  good" without specific feedback is not an approval.
- **PR scope**: PRs SHOULD remain under ~400 lines of diff. Larger changes
  MUST be broken into stacked PRs or accompanied by a written rationale for
  the size.
- **Commits**: commit messages follow Conventional Commits. The body explains
  *why*; the diff already shows *what*.
- **Post-merge**: failing builds on main are a release blocker. The author of
  the merge MUST revert or fix-forward within 1 hour or page the on-call.

## Governance

- This constitution supersedes ad-hoc practices, individual preferences, and
  tooling defaults. When a tool's default conflicts with a principle here,
  the tool is reconfigured — not the principle.
- **Amendment procedure**: amendments are proposed via PR that updates this
  file, lists the impacted principles, and includes a Sync Impact Report
  describing downstream template changes. Amendments require approval from
  at least one maintainer who is not the proposer.
- **Versioning policy** (semantic):
  - MAJOR — backward-incompatible governance changes, removal or redefinition
    of a principle, or any change that invalidates existing compliant work.
  - MINOR — addition of a new principle, new mandatory section, or materially
    expanded guidance within an existing principle.
  - PATCH — clarifications, wording fixes, typo corrections, or
    non-semantic refinements.
- **Compliance review**: every plan generated by `/speckit-plan` MUST pass the
  Constitution Check gate aligned with the four principles. Violations MUST
  be enumerated in the Complexity Tracking table with explicit justification
  and the simpler alternative that was rejected.
- **Runtime guidance**: agent-facing guidance is maintained in
  `.specify/templates/CLAUDE.md` and project-root `CLAUDE.md`. Those files
  MUST defer to this constitution when conflicts arise.

**Version**: 1.0.0 | **Ratified**: 2026-05-22 | **Last Amended**: 2026-05-22
