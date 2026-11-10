create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 2 and 100),
  phone text not null check(phone ~ '^01[0125][0-9]{8}$'),
  email text not null check(length(email) between 3 and 254),
  body text not null check(length(body) between 10 and 3000),
  status text not null default 'new' check(status in ('new','read','replied','closed')),
  created_at timestamptz not null default now()
);
create index contact_messages_date_idx on public.contact_messages(created_at desc);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from public,anon,authenticated;
grant all on public.contact_messages to service_role;
