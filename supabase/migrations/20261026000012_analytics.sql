create table public.analytics_events(id uuid primary key default gen_random_uuid(),event text not null check(event in ('view_item','search','select_item','add_to_cart','begin_checkout','part_request','purchase')),product_id text references public.products(id),amount bigint check(amount>=0),dedupe_key text unique,created_at timestamptz not null default now());
alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon,authenticated;
grant all on public.analytics_events to service_role;
create index analytics_event_date_idx on public.analytics_events(event,created_at);
