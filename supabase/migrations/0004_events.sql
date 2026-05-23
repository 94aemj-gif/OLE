create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('day_reset')),
  payload    jsonb not null,
  issued_at  timestamptz not null default now(),
  issued_by  text not null
);

create index if not exists events_kind_issued_idx
  on public.events (kind, issued_at desc);
