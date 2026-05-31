import { sql, json, readBody } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method not allowed' });
  }
  try {
    const e = await readBody(req);
    await sql`
      insert into public.audit_log
        (actor_type, actor_id, actor_name, action, entity_type, entity_id, detail)
      values
        (${e.actor_type}, ${e.actor_id}, ${e.actor_name}, ${e.action},
         ${e.entity_type ?? null}, ${e.entity_id ?? null},
         ${JSON.stringify(e.detail ?? {})}::jsonb)`;
    return json(res, 201, null);
  } catch (err) {
    console.error('audit error', err);
    return json(res, 500, { error: String(err.message ?? err) });
  }
}
