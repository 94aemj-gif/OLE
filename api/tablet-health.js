import { sql, json, readBody } from './_db.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await sql`
        select * from public.tablet_health order by tablet_id asc`;
      return json(res, 200, rows);
    }

    if (req.method === 'POST') {
      const p = await readBody(req);
      await sql`
        insert into public.tablet_health
          (tablet_id, assigned_line_id, last_heartbeat,
           push_queue_depth, dead_letter_24h,
           last_successful_sync, local_vs_server_delta, app_version)
        values
          (${p.tablet_id}, ${p.assigned_line_id ?? null}, ${p.last_heartbeat},
           ${p.push_queue_depth ?? 0}, ${p.dead_letter_24h ?? 0},
           ${p.last_successful_sync ?? null}, ${p.local_vs_server_delta ?? 0},
           ${p.app_version})
        on conflict (tablet_id) do update set
          assigned_line_id = excluded.assigned_line_id,
          last_heartbeat = excluded.last_heartbeat,
          push_queue_depth = excluded.push_queue_depth,
          dead_letter_24h = excluded.dead_letter_24h,
          last_successful_sync = excluded.last_successful_sync,
          local_vs_server_delta = excluded.local_vs_server_delta,
          app_version = excluded.app_version`;
      return json(res, 200, null);
    }

    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'method not allowed' });
  } catch (err) {
    console.error('tablet-health error', err);
    return json(res, 500, { error: String(err.message ?? err) });
  }
}
