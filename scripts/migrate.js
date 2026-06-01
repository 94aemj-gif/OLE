// Apply the captures.product_id migration and reseed the config catalog.
// Run with a DATABASE_URL in the environment:
//   node --env-file=.env.local scripts/migrate.js
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sql = neon(url);

// neon's http client is tagged-template only (no .query). Execute a literal,
// parameter-free SQL statement by handing it a template-strings object.
function raw(text) {
  const t = Object.assign([text], { raw: [text] });
  return sql(t);
}

async function main() {
  console.log('1/3 add captures.product_id (if missing)…');
  await raw('alter table public.captures add column if not exists product_id text');

  console.log('2/3 ensure product index…');
  await raw(
    'create index if not exists captures_product_idx on public.captures (product_id, hour_bucket)'
  );

  console.log('3/3 backup current config, then reseed…');
  const current = await sql`select data from public.config where id = 1`;
  if (current.length) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = resolve(here, `../db/config-backup-${stamp}.json`);
    await writeFile(backupPath, JSON.stringify(current[0].data, null, 2));
    console.log(`   backup written: ${backupPath}`);
  } else {
    console.log('   no existing config row to back up');
  }
  const seed = await readFile(resolve(here, '../db/seed.sql'), 'utf8');
  await raw(seed); // seed.sql is a single insert … on conflict do update

  const [{ has_products }] = await sql`
    select (data ? 'products') as has_products from public.config where id = 1`;
  const cols = await sql`
    select column_name from information_schema.columns
    where table_name = 'captures' and column_name = 'product_id'`;
  console.log(`done. config.products present: ${has_products}; captures.product_id col: ${cols.length === 1}`);
}

main().catch((err) => {
  console.error('migration failed:', err.message ?? err);
  process.exit(1);
});
