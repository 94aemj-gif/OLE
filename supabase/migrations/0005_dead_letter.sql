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
