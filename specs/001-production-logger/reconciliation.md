# Reconciliation — PRD vs Implementation

**Date:** 2026-05-31
**Trigger:** PRD revision ("Hour-by-Hour Production Control Board") reviewed against
the built code on branch `001-production-logger` (commit `d5c6b9c`).

The implementation built a robust capture + offline-sync + OEE platform but skipped
the PRD's core domain model (SKU + Run). This document records the gaps, the locked
design decisions, and the phased plan to graft SKU + Run onto the existing event model
without discarding the capture/sync/audit work.

---

## Gaps found

### Critical (PRD requires, code lacks)
1. **SKU / Product entity — absent.** PRD §5 makes Product core, with
   `standard_target_per_hour` per SKU. Code has none; target lives on the Line
   (`config.lines[].hourly_target`). Catalog of 16–50 SKUs unmodeled.
2. **Run / mid-shift SKU change — absent.** `captures` has no `product_id`/`run_id`.
   No Run concept. PRD calls this "the structural decision that shapes everything."
3. **Break-proportional per-SKU target — impossible as built.** PRD §6
   `target = SKU.standard_target_per_hour × (productive_min/60)`. Code target is flat
   per-line; only whole-shift `plannedMinutes` exists, no per-slot productive minutes.
3b. **Mandatory-cause-on-miss — NOT built.** PRD §6 forces a downtime code when an hour
   saves below target. No such enforcement existed (corrected in P3).
4. **`units_produced` semantics inverted (bug).** `kpi/snapshot.js` computes
   `goodUnits = units_produced − scrap`, treating the operator's number as TOTAL.
   PRD §6: operator enters GOOD; `total = good + scrap`. Breaks Acceptance #2.
5. **Roles — 2-tier not 3-tier.** Code has operators (no role) + managers. PRD §3/§11
   needs capturist / **viewer** (read-only) / admin.

### Scope drift (code has, PRD says skip)
6. **Offline-first sync** (`idb-store`, `push-queue`, `pull`, `dead_letter`,
   `tablet_health`) — PRD §12 said "always online, no offline mode required."
7. **Full OEE** (`kpi/oee|availability|performance|quality`) — PRD §13 said "do not
   build OEE now."
8. **Tablet-health + dead-letter admin** — outside MVP scope.

---

## Locked decisions

- **D1 — Target owner = SKU.** Move `hourly_target` off Line onto
  `Product.standard_target_per_hour`. Same target across lines (PRD §6).
- **D2 — Runs are DERIVED, not a table.** Each capture stamps `product_id`. A Run =
  contiguous hours with the same product. "Change SKU" switches the active product;
  subsequent captures carry the new id. Shift-close summary groups by `product_id`.
  No new table — fits the event/jsonb model and still satisfies Acceptance #4.
- **D3 — Keep offline-sync, OEE, tablet-health.** Done, works, dormant. They exceed
  MVP but ripping them out is wasted churn. IT may disable offline later; OEE activates
  when its post-MVP phase arrives.

---

## Phased plan (critical path: P1 → P2 → P3 → P4)

**P1 — Catalog + schema**
- Add `config.products[]`: `{id, name, sku_code, standard_target_per_hour, active}`.
- Make products selectable per line (or global list; operator picks active SKU).
- Add `product_id` to capture payload + `captures` table (nullable; backfill old rows null).
- Add `role` to `config.operators[]` (default `capturist`); add `viewer`.

**P2 — Target engine + good/scrap fix**
- New `slotProductiveMinutes(slot, breaks)` — per-hour productive minutes from break overlap.
- `calculated_target = round(product.standard_target_per_hour × productive_min / 60)`.
- Fix inversion: `units_produced` = actual_good; `goodUnits = units_produced`;
  `total = good + scrap`. Patch `kpi/snapshot.js`.
- `efficiency = good / calculated_target`.

**P3 — Capture screen (§7.1)** — DONE
- Header: active SKU selector ("Change SKU" = pick a different SKU) sets `product_id`.
- Per-hour target shows `calculated_target` (break-adjusted SKU target), not flat line ×8.
- Mandatory-cause-on-miss BUILT here (`capture/miss.js`). It was NOT previously
  implemented — the earlier "already built" note was wrong. Save is blocked when good
  < hour target and no downtime cause is present.

**P4 — Run grouping + shift-close summary (§7.5)** — DONE
- `capture/runs.js`: `deriveRuns` (contiguous-by-product_id) + `summarizeRuns`
  (per-run good/scrap/downtime + break-adjusted target + efficiency).
- End-of-shift popup renders a per-SKU run table; CSV export gains a product_id
  column. Unblocks Acceptance #4.

**P5 — History (§7.6)** — DONE (core analytics + Pareto wired)
- `analysis/history.js`: `windowTotals`, `compareWindows` (shift/day/week side by
  side), `trendBySku`, `downtimePareto` — all pure + unit-tested.
- Resumen tab gains a historical "Paro por Causa (Pareto)" panel for the selected day.
- Dedicated `/historial` screen: compare windows (by día/turno/semana) as a table +
  grouped bar chart, plus a per-SKU trend line chart. `analysis/windows.js`
  (`buildWindows`) groups captures into comparison windows.

**P6 — Viewer role gating** — DONE
- `validateCapture` rejects an operator whose role is `viewer` (`viewer_readonly`);
  the capture modal shows "Solo lectura — no puede capturar" on PIN entry.
- Config/admin remain PIN-gated (managers only), so capturists already cannot open
  config (Acceptance #7).
- NOTE: enforcement is client-side. The captures API keys on operator_number only
  and does not know roles; server-side role enforcement is future work.

### Acceptance coverage
- P2 → #1, #2 · P3 → #2 (UI) · P4 → #4 · P1+P6 → #7 · P5 → #8 · rest already pass-ish.

### Untouched
offline sync · OEE · tablet-health · dead-letter · audit · i18n · day-reset.
