import { sql, json, readBody } from '../../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method not allowed' });
  }
  try {
    const { id } = req.query;
    const { undoneAt } = await readBody(req);
    const rows = await sql`
      update public.captures
      set undone = true, undone_at = ${undoneAt}
      where id = ${id}
        and server_timestamp > now() - interval '10 seconds'
      returning *`;
    return json(res, 200, rows);
  } catch (err) {
    console.error('undo error', err);
    return json(res, 500, { error: String(err.message ?? err) });
  }
}
