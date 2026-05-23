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
