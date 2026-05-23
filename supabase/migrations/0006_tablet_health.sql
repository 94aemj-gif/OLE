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
