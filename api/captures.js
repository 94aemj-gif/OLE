import { sql, json, readBody } from './_db.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const watermark = url.searchParams.get('watermark') ?? '1970-01-01T00:00:00Z';
      const includeUndone = url.searchParams.get('includeUndone') === '1';
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '1000', 10), 5000);
      const rows = includeUndone
        ? await sql`select * from public.captures
                    where updated_at >= ${watermark}
                    order by updated_at asc limit ${limit}`
        : await sql`select * from public.captures
                    where updated_at >= ${watermark} and undone = false
                    order by updated_at asc limit ${limit}`;
      return json(res, 200, rows);
    }

    if (req.method === 'POST') {
      const p = await readBody(req);
      const rows = await sql`
        insert into public.captures
          (line_id, operator_number, client_timestamp, shift_id, hour_bucket,
           units_produced, scrap_rows, downtime_rows, payload_hash, client_id)
        values
          (${p.line_id}, ${p.operator_number}, ${p.client_timestamp}, ${p.shift_id},
           ${p.hour_bucket}, ${p.units_produced},
           ${JSON.stringify(p.scrap_rows ?? [])}::jsonb,
           ${JSON.stringify(p.downtime_rows ?? [])}::jsonb,
           ${p.payload_hash}, ${p.client_id})
        on conflict (line_id, operator_number, client_timestamp, payload_hash)
        do nothing
        returning *`;
      if (rows.length === 0) {
        const existing = await sql`
          select * from public.captures
          where line_id = ${p.line_id}
            and operator_number = ${p.operator_number}
            and client_timestamp = ${p.client_timestamp}
            and payload_hash = ${p.payload_hash}
          limit 1`;
        return json(res, 409, existing);
      }
      return json(res, 201, rows);
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const start = url.searchParams.get('start');
      const end = url.searchParams.get('end');
      if (!start || !end) return json(res, 400, { error: 'start and end required' });
      await sql`
        delete from public.captures
        where hour_bucket >= ${start} and hour_bucket < ${end}`;
      return json(res, 204, null);
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return json(res, 405, { error: 'method not allowed' });
  } catch (err) {
    console.error('captures error', err);
    return json(res, 500, { error: String(err.message ?? err) });
  }
}
