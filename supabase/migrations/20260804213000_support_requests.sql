-- Customer support / feedback requests

create type support_category as enum (
  'question',
  'concern',
  'complaint',
  'billing_dispute'
);

create type support_link_type as enum (
  'contract',
  'visit',
  'invoice'
);

create table support_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  category support_category not null,
  message text not null,
  linked_type support_link_type,
  linked_id uuid,
  status text not null default 'Open',
  created_at timestamptz not null default now()
);

create index idx_support_requests_customer on support_requests(customer_id);
create index idx_support_requests_created on support_requests(created_at desc);

alter table support_requests enable row level security;

create policy "Allow read support_requests" on support_requests
  for select to authenticated using (true);

create policy "Allow insert support_requests" on support_requests
  for insert to authenticated with check (true);

create policy "Allow staff write support_requests" on support_requests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
