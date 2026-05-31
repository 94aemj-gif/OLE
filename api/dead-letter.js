import { sql, json, readBody } from './_db.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await sql`
        select * from public.dead_letter
        where state = 'pending'
        order by client_timestamp desc
        limit 100`;
      return json(res, 200, rows);
    }

    if (req.method === 'POST') {
      const p = await readBody(req);
      const rows = await sql`
        insert into public.dead_letter
          (original_payload, line_id, operator_number, client_timestamp,
           client_id, reject_reason)
        values
          (${JSON.stringify(p.original_payload)}::jsonb, ${p.line_id},
           ${p.operator_number ?? null}, ${p.client_timestamp},
           ${p.client_id}, ${p.reject_reason})
        returning *`;
      return json(res, 201, rows);
    }

    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'method not allowed' });
  } catch (err) {
    console.error('dead-letter error', err);
    return json(res, 500, { error: String(err.message ?? err) });
  }
}
