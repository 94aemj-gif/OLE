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
