-- Enable RLS on every public table; declare anon-role policies per data-model.md.

alter table public.config         enable row level security;
alter table public.captures       enable row level security;
alter table public.audit_log      enable row level security;
alter table public.events         enable row level security;
alter table public.dead_letter    enable row level security;
alter table public.tablet_health  enable row level security;

-- ---- config: anon SELECT, anon UPDATE (front-end PIN-gated); INSERT/DELETE blocked
create policy config_select on public.config
  for select to anon using (true);
create policy config_update on public.config
  for update to anon using (true) with check (true);

-- ---- captures: anon SELECT, anon INSERT;
--                 UPDATE only undone=true within 10s of server_timestamp;
--                 DELETE only on rows updated_at > now() - interval '36 hours'.
create policy captures_select on public.captures
  for select to anon using (true);

create policy captures_insert on public.captures
  for insert to anon with check (true);

create policy captures_update_undo on public.captures
  for update to anon
  using (server_timestamp > now() - interval '10 seconds')
  with check (
    undone = true
    and server_timestamp > now() - interval '10 seconds'
  );

create policy captures_delete_36h on public.captures
  for delete to anon
  using (updated_at > now() - interval '36 hours');

-- ---- audit_log: append-only for anon (SELECT + INSERT)
create policy audit_log_select on public.audit_log
  for select to anon using (true);
create policy audit_log_insert on public.audit_log
  for insert to anon with check (true);

-- ---- events: SELECT + INSERT
create policy events_select on public.events
  for select to anon using (true);
create policy events_insert on public.events
  for insert to anon with check (true);

-- ---- dead_letter: SELECT, INSERT, UPDATE (state transitions only)
create policy dead_letter_select on public.dead_letter
  for select to anon using (true);
create policy dead_letter_insert on public.dead_letter
  for insert to anon with check (true);
create policy dead_letter_update on public.dead_letter
  for update to anon
  using (state = 'pending')
  with check (state in ('replayed','discarded'));

-- ---- tablet_health: SELECT + INSERT + UPDATE (upsert pattern)
create policy tablet_health_select on public.tablet_health
  for select to anon using (true);
create policy tablet_health_insert on public.tablet_health
  for insert to anon with check (true);
create policy tablet_health_update on public.tablet_health
  for update to anon using (true) with check (true);
