import { describe, it } from 'vitest';

const HAVE_DB = !!process.env.DATABASE_URL;
const desc = HAVE_DB ? describe : describe.skip;

desc('contract suite gate', () => {
  it('runs only when DATABASE_URL is set against a live Postgres (Neon or local) instance', () => {
    // Real contract tests in this folder require:
    //   1. A reachable Postgres URL exported as DATABASE_URL
    //   2. `psql "$DATABASE_URL" -f db/schema.sql` to apply schema
    //   3. Optional: `psql "$DATABASE_URL" -f db/seed.sql` to seed catalog
    // See contracts/*.api.md for the per-endpoint cases.
  });
});
