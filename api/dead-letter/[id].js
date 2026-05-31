import { sql, json, readBody } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return json(res, 405, { error: 'method not allowed' });
  }
  try {
    const { id } = req.query;
    const body = await readBody(req);
    const next = body.state;
    if (!['replayed', 'discarded'].includes(next)) {
      return json(res, 400, { error: 'invalid state transition' });
    }
    const rows = await sql`
      update public.dead_letter
      set state = ${next},
          resolved_by = ${body.resolved_by ?? null},
          resolved_at = now()
      where id = ${id} and state = 'pending'
      returning *`;
    return json(res, 200, rows);
  } catch (err) {
    console.error('dead-letter patch error', err);
    return json(res, 500, { error: String(err.message ?? err) });
  }
}
