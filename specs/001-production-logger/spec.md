# Feature Specification: Production Logger

**Feature Branch**: `001-production-logger`

**Created**: 2026-05-22

**Status**: Draft

**Input**: User description: Tablet-friendly, local-first production logging app
for factory floors. Operators capture units, scrap, and downtime in seconds;
line leaders see every line on one dashboard; plant managers get OEE / scrap /
downtime data for daily reviews and reporting.

## Clarifications

### Session 2026-05-22

- Q: Admin authentication model — should manager actions be attributable in the audit log? → A: Per-manager PIN. Each admin user has their own PIN and display name, registered in Catálogos. Audit log records the named manager (not a shared identity).
- Q: Compliance posture — is the system the official regulated record under 21 CFR Part 11 / GMP? → A: No. Operational only. Paper / existing ERP remains the official regulated record. The system is internal/management-use, not GMP-controlled. 21 CFR Part 11 validation, e-signatures, and validated-software requirements are out of scope for v1.
- Q: How are captures that permanently fail to sync (dead-letter) reviewed and resolved? → A: Dedicated Admin → Datos sub-panel listing dead-lettered captures with original payload and reject reason. Manager can replay (re-submit after edit) or discard. Both actions audit-logged.
- Q: What is the perceived latency target from operator tap on Capturar to the success confirmation on the tablet? → A: ≤ 200ms p95 from tap to success confirmation. Local-first: tablet confirms after local persistence; server sync runs in background and does not delay the confirmation.
- Q: What operational health signals does the system expose beyond the audit log? → A: Admin → Datos *Salud del Sistema* panel with per-tablet heartbeat, push-queue depth, dead-letter rate, last successful sync, and local-vs-server count delta. Tablero shows a warning badge when any tablet crosses a configured threshold.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operator captures hourly production (Priority: P1)

An operator standing at a production line completes the past hour's run,
walks to the tablet mounted at the line, taps **Capturar**, identifies herself
with her 5-digit employee number, types the unit count on a large numpad,
optionally adds one or more downtime rows (minutes + reason) and one or more
scrap rows (pieces + reason), and submits. The capture confirms with visible
and tactile feedback, the live shift counter updates immediately, and a
10-second undo window appears in case she mistyped.

**Why this priority**: Without operator capture there is no data. This story
is the entire input side of the system; nothing else delivers value without
it. It is the MVP.

**Independent Test**: With an operator, a line tablet, and a configured shift,
verify that a complete capture (units + scrap + downtime) is recorded, the
shift counter advances, an undo window appears for 10s, and the capture is
visible on any other device within 30s after network sync.

**Acceptance Scenarios**:

1. **Given** an active shift on Line #1 and an operator at the tablet,
   **When** the operator enters a valid 5-digit employee number and 240 units
   produced with no scrap or downtime, **Then** the shift counter increases
   by 240, a success confirmation is shown, and an undo button is visible
   for 10 seconds.
2. **Given** an invalid 4-digit employee number entered in the capture popup,
   **When** the operator attempts to submit, **Then** an inline error appears
   immediately and the capture cannot be submitted until corrected.
3. **Given** a capture was just submitted 5 seconds ago, **When** the operator
   taps **Deshacer**, **Then** the capture is removed from the shift counter
   and from all downstream views.
4. **Given** the tablet has lost network connectivity, **When** the operator
   completes a capture, **Then** the capture is recorded locally without
   blocking the operator, and it propagates to other devices within 30
   seconds of connectivity returning.
5. **Given** the shift target is 200 units and 200 units have just been
   logged, **When** the capture submits, **Then** an end-of-shift celebration
   animation plays.

---

### User Story 2 - Line leader monitors every line live (Priority: P1)

A line leader walking the floor or sitting at a desk opens the **Tablero**
view on a laptop or phone. She sees one card per active production line with
the operator's name, current shift, equipment status, current shift count,
pace indicator, 8-hour sparkline, and last-capture timestamp. A summary
strip at the top reports plant-wide totals. The view refreshes itself every
30 seconds without manual reload.

**Why this priority**: Real-time supervision is the second pillar of value;
it is what replaces the walk-to-the-line that the paper system forced.
Without it, the data is captured but not consumed.

**Independent Test**: With at least one operator capturing on at least one
line, verify that the Tablero shows the correct card content, that the pace
pill color matches the threshold rules (≥100% green, ≥90% blue, ≥70% amber,
<70% red), and that a new capture appears in the card within 30 seconds.

**Acceptance Scenarios**:

1. **Given** two production lines are running with operators logged in,
   **When** the line leader opens the Tablero, **Then** she sees two cards,
   each with operator name, status, count, pace pill, and sparkline.
2. **Given** a line is producing at 95% of its target rate, **When** the
   Tablero card renders, **Then** the pace pill is blue.
3. **Given** the Tablero is left open on a laptop, **When** 30 seconds pass
   after the last refresh, **Then** the cards re-fetch and update without
   user interaction.
4. **Given** a line has had no captures for over 60 minutes, **When** the
   Tablero renders, **Then** the card visually marks the line as stale or
   idle so the leader can investigate.

---

### User Story 3 - Plant manager reviews daily performance and OEE (Priority: P2)

At the end of a shift or the start of the next day, a plant manager opens
the **Gráficas** view on a laptop. She sees live OEE, Availability,
Performance, and Quality KPIs for the chosen day, an hourly-vs-target chart,
a cumulative-vs-target line, a scrap-by-hour bar chart, and a 14-day × 24-hour
production heatmap. From the **Admin → Resumen** tab she pulls the per-day
session history and the filtered audit log. She exports an end-of-shift
summary to CSV for the operations review.

**Why this priority**: Daily reviews and reporting are the third pillar of
value. They convert captured data into management decisions. They are P2
because they consume data already produced by P1 stories.

**Independent Test**: With at least one full day of capture data, verify
that OEE / Availability / Performance / Quality compute correctly against
the configured shift, target, and downtime, that all four charts render,
and that the CSV export contains the displayed totals.

**Acceptance Scenarios**:

1. **Given** a shift with 480 minutes of planned time, 60 minutes of logged
   downtime, 1800 units produced against a target of 2000, and 50 scrap
   pieces, **When** the manager opens Gráficas for that shift,
   **Then** Availability = 87.5%, Performance computed from units vs target
   on running time, Quality = (1800 − 50) / 1800 ≈ 97.2%, and OEE is the
   product of the three.
2. **Given** the manager picks a date on the weekstrip in Admin → Resumen,
   **When** the page renders, **Then** she sees every session, every
   capture, and a filterable audit log for that day.
3. **Given** the end-of-shift summary popup is open, **When** the manager
   clicks **Exportar CSV**, **Then** a CSV downloads with one row per
   capture and aggregate rows for totals, OEE, and downtime.

---

### User Story 4 - Plant manager manages catalogs and lines (Priority: P2)

The plant manager opens **Admin → Catálogos** to add a new production line,
edit shift definitions and break windows, register a new operator with a
5-digit employee number, or add a new scrap or downtime reason. Edits
propagate to every tablet within the next sync cycle so operators see the
new catalog without redeploying anything.

**Why this priority**: The catalog drives every other surface (operator
dropdowns, dashboards, KPIs). Without manageable catalogs the system
ossifies; with them it survives reorganizations, new product lines, and
turnover.

**Independent Test**: Add a new scrap reason from one device; verify it
appears in the operator scrap row dropdown on the line tablet within the
next sync cycle without reload, and that subsequent captures using that
reason render correctly on the Tablero and Gráficas.

**Acceptance Scenarios**:

1. **Given** the manager adds a new operator "Empleado 12345 — Ana López",
   **When** the operator next enters 12345 at the line tablet, **Then** the
   capture is accepted and the Tablero card shows "Ana López".
2. **Given** the manager edits the morning shift to start 30 minutes earlier,
   **When** the next capture window opens on the line tablet, **Then** the
   shift counter resets and recomputes the hourly target based on the new
   shift length.
3. **Given** a downtime reason "Cambio de molde" is removed from the catalog,
   **When** an operator opens the downtime selector, **Then** the removed
   reason is no longer offered, and historical captures still display the
   reason name correctly.

---

### User Story 5 - Plant manager resets day data safely (Priority: P3)

When a test run, training day, or data-quality issue contaminates today's
captures, the plant manager opens **Admin → Datos** and triggers **Reset
Día Actual**. Today's captures are deleted server-side, and every tablet in
the plant clears its local copy of today's data on the next sync. The
audit log records who initiated the reset and when.

**Why this priority**: This is a recovery action used rarely. It is P3
because nothing in the daily workflow depends on it, but its absence makes
the dataset unstable when mistakes accumulate.

**Independent Test**: Trigger Reset Día Actual on the laptop; verify that
the line tablet's shift counter resets to zero within 30 seconds, that
today's captures no longer appear in Tablero or Gráficas, and that the
audit log contains a "RESET_DAY" entry with the manager's identifier and
timestamp.

**Acceptance Scenarios**:

1. **Given** the manager initiates Reset Día Actual at 11:00 with the
   confirmation prompt accepted, **When** the operation completes,
   **Then** all captures with timestamps later than 00:00 of the current
   plant day are removed across all devices within 30 seconds.
2. **Given** a reset has just completed, **When** the manager opens the
   audit log, **Then** a single entry is visible with the action, manager
   identifier, timestamp, and the count of records removed.
3. **Given** a tablet was offline during the reset broadcast, **When** the
   tablet reconnects, **Then** it receives the reset event and wipes
   today's local data before resuming normal capture.

---

### Edge Cases

- Operator enters an employee number that does not exist in the catalog →
  capture is rejected with a clear error pointing to the operator catalog.
- Operator submits a capture with 0 units, 0 scrap, 0 downtime → capture is
  rejected (nothing to record).
- Two operators on the same line submit captures within seconds of each
  other → both captures are recorded; the audit log preserves order.
- Network drops mid-submission → capture is queued locally, retried on
  reconnect, and a permanent-failure capture is moved to a dead-letter view
  the manager can resolve manually.
- Daylight-saving change crosses a shift boundary → shift accounting uses
  plant-local civil time and does not double-count or skip an hour.
- Tablet clock drifts more than 5 minutes from server → app warns the
  operator and refuses captures until time is corrected, to prevent
  miscategorized hourly buckets.
- Operator captures the same hour twice → second capture is accepted
  additively; the audit log makes the duplication discoverable.
- Hourly target is mid-shift edited downward → already-logged hours retain
  their original target context for historical pace; future hours use the
  new target.
- Scrap pieces exceed units produced in the same capture → capture is
  rejected with an inline error.
- Undo invoked after the 10-second window → undo is rejected; manager-side
  correction is required via Admin → Datos.

## Requirements *(mandatory)*

### Functional Requirements

**Capture (operator)**

- **FR-001**: System MUST allow an operator to record a capture consisting
  of a 5-digit employee number, a non-zero unit count, zero or more
  downtime rows (minutes + categorized reason), and zero or more scrap
  rows (pieces + categorized reason).
- **FR-002**: System MUST validate the 5-digit employee number against the
  operator catalog before accepting a capture, with live error feedback as
  the operator types.
- **FR-003**: System MUST provide a 10-second undo window after every
  capture during which the capture can be reversed with one tap.
- **FR-004**: System MUST allow captures to be submitted while the tablet
  is offline, persisting them locally without data loss.
- **FR-005**: System MUST automatically synchronize locally captured data to
  the central store within 30 seconds of network availability.
- **FR-006**: System MUST prompt the operator with a visible alert at the
  top of every hour to remind them to log the past hour's run.
- **FR-007**: System MUST display the current shift's running production
  total in a large, glanceable counter visible from at least 3 meters away.
- **FR-008**: System MUST display equipment status as one of: *En operación*,
  *Inactivo*, *Mantenimiento*, *Avería*, with a pulsing visual treatment
  reflecting the active state.
- **FR-009**: System MUST trigger an end-of-shift celebration when the
  shift target is reached or exceeded.

**Live monitoring (line leader)**

- **FR-010**: System MUST present a Tablero view with one card per active
  production line showing operator name, current shift, status pill,
  current shift count, pace pill, 8-hour sparkline, and last-capture
  timestamp and quantity.
- **FR-011**: Pace pill color MUST be green for ≥100% of target pace, blue
  for ≥90%, amber for ≥70%, red for <70%, computed against
  target-per-hour × hours elapsed in the current shift.
- **FR-012**: Tablero MUST display plant-wide summary tiles at the top:
  total production, total scrap, lines active, and average pace.
- **FR-013**: Tablero MUST auto-refresh every 30 seconds without user
  interaction.

**Management & reporting (plant manager)**

- **FR-014**: System MUST provide an Admin area with four tabs: Resumen,
  Catálogos, Configuración, Datos.
- **FR-015**: Resumen MUST include a per-day session history selectable via
  a weekstrip date picker, and a filtered audit log of every captured,
  edited, undone, and reset action.
- **FR-016**: Catálogos MUST allow creation, edit, and removal of lines,
  shifts (with named break windows), operators, scrap reasons, and
  downtime reasons, with edits propagated to every device on the next
  sync cycle.
- **FR-017**: Configuración MUST allow setting hourly target, device-to-line
  assignment, security controls, and alert audio toggle.
- **FR-018**: Datos MUST provide a *Reset Día Actual* action that, after
  explicit confirmation, removes today's captures across all devices and
  records the action in the audit log.
- **FR-018a**: Datos MUST include a *Capturas Pendientes* (dead-letter)
  sub-panel listing every capture that permanently failed to sync. Each
  row MUST display the originating line, operator employee number,
  timestamp, full original payload (units, scrap rows, downtime rows),
  and the reject reason returned by the server.
- **FR-018b**: From the dead-letter panel a manager MUST be able to
  (a) **Reintentar** — edit the payload and re-submit it as a new capture,
  or (b) **Descartar** — permanently dismiss the entry. Both actions MUST
  be recorded in the audit log with the manager's display name, the
  original capture identifier, and the chosen action.
- **FR-018c**: Dead-letter captures MUST NOT be counted in shift totals,
  Tablero pace, or Gráficas KPIs until a manager replays them. The
  dead-letter count MUST be exposed as a numeric badge in the Admin nav
  so its existence is visible without entering the panel.
- **FR-018d**: Datos MUST include a *Salud del Sistema* panel exposing,
  per registered tablet: last-heartbeat timestamp, push-queue depth,
  cumulative dead-letter count for the past 24h, last successful sync
  timestamp, and the absolute delta between local capture count and
  server-side capture count for today. The panel MUST refresh at least
  every 30 seconds.
- **FR-018e**: Tablero MUST display a single plant-wide health warning
  badge whenever any tablet's heartbeat is older than 5 minutes, push
  queue depth exceeds 50, dead-letter count is non-zero, or local-vs-server
  delta exceeds 0. Clicking the badge MUST link to the *Salud del Sistema*
  panel. Thresholds MUST be editable in Configuración.
- **FR-019**: System MUST compute and display OEE, Availability, Performance,
  and Quality KPIs for any selected shift, using the standard formulas
  (Availability = run time / planned time; Performance = actual /
  theoretical output during run time; Quality = good units / total units;
  OEE = Availability × Performance × Quality).
- **FR-020**: System MUST render an hourly-vs-target bar chart, a
  cumulative-vs-target line chart, a scrap-by-hour bar chart, and a
  14-day × 24-hour production heatmap for the selected period.
- **FR-021**: System MUST produce an end-of-shift summary popup with totals,
  OEE, and downtime breakdown, downloadable as CSV.

**Data integrity & sync**

- **FR-022**: System MUST tolerate complete loss of network for the
  duration of a full shift without blocking captures or losing data.
- **FR-023**: System MUST recover from device outages by reconciling
  captures on the next successful sync, with no duplicate records.
- **FR-024**: System MUST record an audit log entry for every capture,
  undo, edit, catalog change, and day reset, including the actor
  identifier and timestamp. For manager-initiated actions, the actor
  identifier MUST be the specific manager's display name (resolved from
  their PIN), not a shared identity.
- **FR-025**: System MUST restrict destructive operations to manager-level
  users; operators MUST NOT be able to reset the day or edit catalogs.
- **FR-025a**: System MUST authenticate managers by per-user PIN, each
  registered with a display name in Catálogos. Entering Admin requires a
  valid manager PIN; the resolved manager's display name is attached to
  every action taken in that session and persisted to the audit log.
- **FR-025b**: System MUST allow plant managers to create, rotate, and
  deactivate manager PINs. A deactivated manager PIN MUST be rejected
  immediately on next use across all devices on the next sync cycle.

**Localization & accessibility**

- **FR-026**: System MUST be available in Spanish and English with an
  on-screen language toggle that persists per device.
- **FR-027**: System MUST be usable on tablet, laptop, and phone form
  factors with no functional regression on any of them.

### Key Entities

- **Production Line**: A physical line on the plant floor. Attributes:
  identifier, display name, current assigned tablet, hourly target,
  current status. Relationships: zero or one current operator, many
  captures, many sessions.
- **Operator**: A worker authorized to log captures. Attributes: 5-digit
  employee number, display name, active flag. Relationships: many
  captures.
- **Shift**: A named block of plant time with breaks. Attributes: name,
  start, end, planned duration, list of break windows.
- **Capture**: A single hourly log submitted by an operator. Attributes:
  timestamp, line, operator, units produced, list of downtime rows
  (minutes + reason), list of scrap rows (pieces + reason), undo deadline.
- **Scrap Reason**: A categorized cause attributable to scrap. Attributes:
  name, active flag, sort order.
- **Downtime Reason**: A categorized cause attributable to downtime.
  Attributes: name, active flag, sort order.
- **Session**: The aggregate of captures by one operator on one line during
  one shift. Computed from Captures; used in Resumen.
- **Manager**: An admin-level user authorized to edit catalogs, reset days,
  and review reports. Attributes: display name, PIN, active flag, created-at.
  Relationships: many audit log entries.
- **Audit Log Entry**: A record of any state-changing action. Attributes:
  action type, actor identifier (operator employee number or manager
  display name), timestamp, affected entity reference, free-text detail.
- **KPI Snapshot**: Computed values for a chosen period — Availability,
  Performance, Quality, OEE, plus contributing inputs (planned time, run
  time, units produced, scrap, target).
- **Dead-Letter Capture**: A capture that permanently failed to sync.
  Attributes: original payload, originating line, operator employee
  number, original client timestamp, reject reason, state (pending /
  replayed / discarded), resolving manager (if any), resolution
  timestamp. Excluded from shift totals and KPIs until replayed.
- **Tablet Health Signal**: Per-device operational record. Attributes:
  tablet identifier, assigned line, last-heartbeat timestamp,
  push-queue depth, dead-letter count (24h rolling), last successful
  sync timestamp, local-vs-server capture count delta (today). Surfaced
  in *Salud del Sistema*.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can complete a capture (employee number + units
  + optional scrap + optional downtime) in under 20 seconds, including
  the time to dismiss the success confirmation.
- **SC-001a**: From the moment the operator taps **Capturar** to submit
  on the final review screen, the success confirmation appears within
  200 milliseconds at the 95th percentile on the deployed tablet
  hardware, regardless of online/offline state. Server sync runs in the
  background and MUST NOT delay this confirmation.
- **SC-002**: Captures made on any line are visible on the Tablero and in
  Gráficas on any other authorized device within 30 seconds, measured at
  the 95th percentile, while network is available.
- **SC-003**: Captures made while offline reach the central store within
  30 seconds of connectivity being restored, with zero data loss across
  100 consecutive simulated network drops.
- **SC-004**: Line leaders can answer "Is every line on pace?" in under
  10 seconds by glancing at the Tablero, validated by structured
  observation with at least 3 line leaders.
- **SC-005**: Daily reporting time (from end of shift to a manager having
  OEE, scrap, and downtime breakdown in hand) drops to under 5 minutes,
  compared to the prior paper-based baseline.
- **SC-006**: Scrap and downtime categorization rate (captures with at
  least one categorized reason among those that should have one) reaches
  ≥95% within the first two weeks of rollout per line.
- **SC-007**: System remains operable on a fresh tablet boot in under 5
  seconds to the capture-ready state, on the tablet hardware used in the
  plant.
- **SC-008**: 100% of destructive actions (day reset, capture undo,
  catalog deletion) are traceable in the audit log within 5 seconds of
  the action.
- **SC-009**: Operator misidentification (wrong employee number accepted
  for a capture) occurs in fewer than 1 in 1000 captures, measured over
  the first month.
- **SC-010**: ≥90% of operators report the capture flow is faster than
  the prior paper or whiteboard process in a post-rollout survey.

## Assumptions

- The plant operates in a single civil time zone; shift accounting uses
  plant-local time.
- The initial deployment covers two production lines (#1 60ml Neomed
  Syringe, #2 35ml Neomed Syringe); the catalog supports adding more lines
  without code changes, up to at least 25 lines without architectural
  rework.
- Operators are uniquely identified by a 5-digit numeric employee number;
  no biometric or password authentication is required for operators.
- Manager-level (admin) access uses a per-user PIN. Each admin user is
  registered in Catálogos with a display name; their PIN resolves to that
  identity for the audit log. Full SSO / per-user passwords are out of
  scope for v1.
- Network access on the plant floor is intermittent but typically present;
  the system targets full local operation during any single shift.
- Tablet clocks are kept within ±5 minutes of true time by the device OS;
  the app warns when drift exceeds this.
- Historical capture data is retained indefinitely; cleanup is performed
  manually via Admin → Datos using bounded, audited operations.
- The system is **not** the official regulated record. The plant's existing
  paper or ERP workflow remains the GMP-controlled source of truth.
  Consequently, 21 CFR Part 11 electronic-records requirements (validated
  software, e-signatures on every change, controlled retention, tamper
  evidence) are out of scope for v1. The audit log and data integrity
  guarantees in this spec serve operational trust, not regulatory
  compliance. Any later promotion of the system to "official record"
  status MUST be treated as a separate compliance project that revisits
  this assumption.
- Hourly target is uniform across the shift unless edited; per-product or
  per-hour ramped targets are out of scope for v1.
- Existing operator catalog data and prior whiteboard data will be
  manually transferred in by the plant manager during rollout; automated
  legacy import is out of scope.
- Browser-based deployment is acceptable for all roles; a native mobile
  app is not required for v1.
- Spanish is the primary language at the plant; English is provided as a
  secondary toggle but is not the default.
- A small number (≤5) of concurrent devices per line is sufficient; the
  system does not need to support dozens of simultaneous tablets per line.
