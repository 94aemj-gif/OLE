import { sql, json, readBody } from './_db.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const watermark = url.searchParams.get('watermark') ?? '1970-01-01T00:00:00Z';
      const rows = await sql`
        select * from public.events
        where issued_at >= ${watermark}
        order by issued_at asc`;
      return json(res, 200, rows);
    }

    if (req.method === 'POST') {
      const e = await readBody(req);
      const rows = await sql`
        insert into public.events (kind, payload, issued_by)
        values (${e.kind}, ${JSON.stringify(e.payload)}::jsonb, ${e.issued_by})
        returning *`;
      return json(res, 201, rows);
    }

    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'method not allowed' });
  } catch (err) {
    console.error('events error', err);
    return json(res, 500, { error: String(err.message ?? err) });
  }
}
