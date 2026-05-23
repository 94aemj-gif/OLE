import { describe, it } from 'vitest';

const HAVE_SUPABASE = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;
const desc = HAVE_SUPABASE ? describe : describe.skip;

desc('contract suite gate', () => {
  it('runs only when SUPABASE_URL + SUPABASE_ANON_KEY are set against a live local stack', () => {
    // Real contract tests in this folder require:
    //   1. `supabase start` (Docker)
    //   2. `supabase db reset` to apply migrations + seed
    //   3. Environment variables SUPABASE_URL and SUPABASE_ANON_KEY
    // See contracts/*.api.md for the per-endpoint cases enumerated in tasks.md T041–T046.
  });
});
