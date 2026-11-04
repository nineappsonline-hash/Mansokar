create table public.newsletter_subscribers (
  email text primary key check(length(email) between 3 and 254),
  locale text not null check(locale in ('ar','en')),
  subscribed_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from public,anon,authenticated;
grant all on public.newsletter_subscribers to service_role;
