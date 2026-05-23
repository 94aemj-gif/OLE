create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  occurred_at  timestamptz not null default now(),
  actor_type   text not null check (actor_type in ('operator','manager','system')),
  actor_id     text not null,
  actor_name   text not null,
  action       text not null,
  entity_type  text,
  entity_id    text,
  detail       jsonb not null default '{}'::jsonb
);

create index if not exists audit_log_occurred_at_idx
  on public.audit_log (occurred_at desc);

create index if not exists audit_log_actor_idx
  on public.audit_log (actor_type, actor_id);
