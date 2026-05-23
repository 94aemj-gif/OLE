# Quickstart — Production Logger

Audience: a new engineer joining the feature. Goal: get from `git
clone` to a working capture on a local tablet emulator in under
15 minutes.

## 1. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 20 LTS | Vite, Vitest, Playwright |
| pnpm | ≥ 9 | Package manager |
| Docker Desktop | latest | Local Supabase stack |
| Supabase CLI | ≥ 1.180 | `supabase start`, migrations |
| Playwright browsers | latest | E2E tests |

```bash
brew install node@20 pnpm docker supabase/tap/supabase
pnpm dlx playwright install
```

## 2. Bootstrap

```bash
git clone <repo>
cd OLE
git checkout 001-production-logger
pnpm install
cp .env.example .env.local        # populate SUPABASE_URL + SUPABASE_ANON_KEY for local stack
supabase start                     # spins up local Supabase
supabase db reset                  # applies migrations + seed
pnpm dev                           # opens Vite on http://localhost:5173
```

Pages:
- `/index.html` — operator tablet (open in tablet emulator)
- `/dashboard.html` — Tablero
- `/admin.html` — admin (default PIN seeded: `1234` → "Maestro de Pruebas")
- `/graficas.html` — KPIs (gated by manager PIN)

## 3. First successful capture

1. Open `http://localhost:5173/index.html?line=L-01`.
2. Tap **Capturar**.
3. Enter employee number `12345` (seeded as Ana López).
4. Enter 240 units, leave scrap and downtime empty.
5. Tap **Guardar**.
6. Counter jumps to 240; toast confirms; **Deshacer** chip appears
   for 10s.
7. Open `http://localhost:5173/dashboard.html` in another tab.
8. Within 30s the Tablero card for Línea #1 shows 240 units.

## 4. Running the test suite

```bash
pnpm test:unit            # Vitest unit only
pnpm test:contract        # Vitest contract suite (requires supabase start)
pnpm test:integration     # capture → sync → dashboard flows
pnpm test:e2e             # Playwright P1 smoke
pnpm test                 # all of the above + coverage
pnpm typecheck            # tsc --noEmit over JSDoc
pnpm lint && pnpm format:check
pnpm size                 # size-limit; fails if any route > 200KB gz
pnpm lhci                 # lighthouse-ci budgets
```

Coverage thresholds (per constitution Principle II):
- Overall ≥ 80% lines
- `src/modules/sync`, `src/modules/kpi`, `src/modules/audit`, RLS
  policy tests ≥ 90% lines

## 5. Common workflows

### Adding a downtime reason

1. Open `/admin.html` → Catálogos → Razones de tiempo muerto.
2. Add the reason; save.
3. Reload `/index.html` after 30s; the new reason appears in the
   downtime dropdown.

### Reproducing offline → online sync

1. In Chrome DevTools, set the operator tab to Offline.
2. Submit 3 captures.
3. Push-queue depth in `tablet_health` (or in IndexedDB inspector)
   shows 3.
4. Re-enable network.
5. Within 30s the queue drains; Tablero shows the captures.

### Triggering and reviewing a dead-letter

1. Manually break a capture by hand-editing the queue to set
   `scrap_rows[0].pieces > units_produced`.
2. The push attempt receives 422; row moves to dead-letter.
3. Open `/admin.html` → Datos → Capturas Pendientes — the row is
   listed.
4. Click **Reintentar**, fix the payload, submit; row resolves to
   `replayed`.

## 6. Pre-merge checklist (Quality Gates from constitution)

- [ ] `pnpm lint && pnpm format:check && pnpm typecheck` clean
- [ ] `pnpm test` green; coverage thresholds met
- [ ] `pnpm size` under budget
- [ ] `pnpm lhci` budgets met (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1)
- [ ] axe-core e2e a11y check zero new violations
- [ ] Audit log entries verified for any new destructive action
- [ ] Public API or user-visible behavior changes have a paired
      spec/changelog update

## 7. Flaky test policy

- Quarantine within 24h (move to `tests/_quarantine/` + open issue).
- Fix or delete within 7 days. No exceptions.

## 8. Production deployment

```bash
pnpm build                # vite build → dist/
vercel deploy --prod       # Vercel CLI; SUPABASE_URL + SUPABASE_ANON_KEY in Vercel env
supabase db push --linked  # apply migrations to managed Supabase
```

Service worker stays disabled (`public/sw.js` is a no-op) during
active iteration to avoid stale caches on the tablets. Enable in a
later phase once cache invalidation is wired up.

## 9. Security notes (operational)

- Anon key is shipped to the tablet — that is the design. RLS does
  the real enforcement.
- `anon DELETE` on `captures` is bounded to last 36h (RLS WHERE
  clause). Verify the policy is present after any migration: run
  `tests/contract/captures.spec.ts` test #5.
- Manager PINs are hashed (SHA-256 + salt). Plain PIN is never
  persisted; only ever lives in memory during entry.
- Spec compliance posture: not the official regulated record.
  Treat captures as operational data, not GMP-controlled. Promotion
  to controlled record requires re-baseline (see spec Assumptions).
