-- Neon Postgres schema for OLE production logger.
-- Apply with: psql "$DATABASE_URL" -f db/schema.sql

create table if not exists public.config (
  id          int primary key default 1,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  constraint  config_singleton check (id = 1)
);

create or replace function public.touch_config_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists config_touch on public.config;
create trigger config_touch
  before update on public.config
  for each row execute function public.touch_config_updated_at();

create table if not exists public.captures (
  id                 uuid primary key default gen_random_uuid(),
  line_id            text not null,
  operator_number    text not null check (operator_number ~ '^\d{5}$'),
  client_timestamp   timestamptz not null,
  server_timestamp   timestamptz not null default now(),
  shift_id           text not null,
  hour_bucket        timestamptz not null,
  units_produced     int  not null check (units_produced >= 0),
  scrap_rows         jsonb not null default '[]'::jsonb,
  downtime_rows      jsonb not null default '[]'::jsonb,
  payload_hash       text not null,
  client_id          text not null,
  undone             boolean not null default false,
  undone_at          timestamptz,
  updated_at         timestamptz not null default now()
);

create unique index if not exists captures_idempotency
  on public.captures (line_id, operator_number, client_timestamp, payload_hash);

create index if not exists captures_updated_at_idx
  on public.captures (updated_at);

create index if not exists captures_hour_bucket_idx
  on public.captures (line_id, hour_bucket);

create or replace function public.touch_captures_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists captures_touch on public.captures;
create trigger captures_touch
  before update on public.captures
  for each row execute function public.touch_captures_updated_at();

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

create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('day_reset')),
  payload    jsonb not null,
  issued_at  timestamptz not null default now(),
  issued_by  text not null
);

create index if not exists events_kind_issued_idx
  on public.events (kind, issued_at desc);

create table if not exists public.dead_letter (
  id                uuid primary key default gen_random_uuid(),
  original_payload  jsonb not null,
  line_id           text not null,
  operator_number   text,
  client_timestamp  timestamptz not null,
  client_id         text not null,
  reject_reason     text not null,
  state             text not null default 'pending'
                    check (state in ('pending','replayed','discarded')),
  resolved_by       text,
  resolved_at       timestamptz
);

create index if not exists dead_letter_state_idx
  on public.dead_letter (state, client_timestamp);

create table if not exists public.tablet_health (
  tablet_id              text primary key,
  assigned_line_id       text,
  last_heartbeat         timestamptz not null,
  push_queue_depth       int not null default 0 check (push_queue_depth >= 0),
  dead_letter_24h        int not null default 0 check (dead_letter_24h >= 0),
  last_successful_sync   timestamptz,
  local_vs_server_delta  int not null default 0 check (local_vs_server_delta >= 0),
  app_version            text not null
);
