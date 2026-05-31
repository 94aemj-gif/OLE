import { sql, json, readBody } from './_db.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await sql`select * from public.config where id = 1`;
      return json(res, 200, rows);
    }

    if (req.method === 'PATCH') {
      const { data, expectedUpdatedAt } = await readBody(req);
      const rows = expectedUpdatedAt
        ? await sql`
            update public.config
            set data = ${JSON.stringify(data)}::jsonb
            where id = 1 and updated_at = ${expectedUpdatedAt}
            returning *`
        : await sql`
            insert into public.config (id, data)
            values (1, ${JSON.stringify(data)}::jsonb)
            on conflict (id) do update
              set data = excluded.data
            returning *`;
      if (rows.length === 0) {
        return json(res, 409, { error: 'updated_at mismatch' });
      }
      return json(res, 200, rows);
    }

    res.setHeader('Allow', 'GET, PATCH');
    return json(res, 405, { error: 'method not allowed' });
  } catch (err) {
    console.error('config error', err);
    return json(res, 500, { error: String(err.message ?? err) });
  }
}
