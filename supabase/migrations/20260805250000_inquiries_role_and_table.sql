-- Inquiries demo role + prospect table.
-- Also ensures quote_requests exists so Ops can convert inquiries into the Quotes pipeline.

do $$ begin
  alter type user_role add value 'inquiries';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type quote_status as enum (
    'new',
    'survey_scheduled',
    'budgeted',
    'contract_drafted',
    'closed'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  service_description text not null,
  notes text,
  related_contract_id uuid references public.contracts (id) on delete set null,
  status quote_status not null default 'new',
  property_address text,
  budget_hours numeric(10, 2),
  budget_supplies text,
  survey_visit_id uuid references public.service_visits (id) on delete set null,
  draft_contract_id uuid references public.contracts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_requests_customer_idx on public.quote_requests (customer_id);
create index if not exists quote_requests_status_idx on public.quote_requests (status);

alter table public.quote_requests enable row level security;

drop policy if exists "Allow read quote_requests" on public.quote_requests;
create policy "Allow read quote_requests" on public.quote_requests
  for select to authenticated, anon using (true);

drop policy if exists "Allow insert quote_requests" on public.quote_requests;
create policy "Allow insert quote_requests" on public.quote_requests
  for insert to authenticated, anon with check (true);

drop policy if exists "Allow update quote_requests" on public.quote_requests;
create policy "Allow update quote_requests" on public.quote_requests
  for update to authenticated, anon using (true) with check (true);

drop policy if exists "Demo insert customers" on public.customers;
create policy "Demo insert customers" on public.customers
  for insert to authenticated, anon with check (true);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  property_address text not null,
  property_type text not null
    check (
      property_type in (
        'office_park',
        'retail_center',
        'industrial',
        'multifamily',
        'other'
      )
    ),
  services_interested text[] not null default '{}',
  message text,
  status text not null default 'New'
    check (
      status in (
        'New',
        'Under review',
        'Converted to quote',
        'Closed - Won',
        'Closed - Lost'
      )
    ),
  quote_id uuid references public.quote_requests (id) on delete set null,
  converted_customer_id uuid references public.customers (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiries_services_valid check (
    services_interested <@ array[
      'mowing',
      'irrigation',
      'seasonal_color',
      'snow_removal',
      'other'
    ]::text[]
  )
);

create index if not exists inquiries_status_idx on public.inquiries (status);
create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);

alter table public.inquiries enable row level security;

drop policy if exists "Public insert inquiries" on public.inquiries;
create policy "Public insert inquiries" on public.inquiries
  for insert to anon, authenticated
  with check (true);

drop policy if exists "Staff read inquiries" on public.inquiries;
create policy "Staff read inquiries" on public.inquiries
  for select to authenticated
  using (true);

drop policy if exists "Staff update inquiries" on public.inquiries;
create policy "Staff update inquiries" on public.inquiries
  for update to authenticated
  using (true)
  with check (true);

drop policy if exists "Demo anon read inquiries" on public.inquiries;
create policy "Demo anon read inquiries" on public.inquiries
  for select to anon
  using (true);

drop policy if exists "Demo anon update inquiries" on public.inquiries;
create policy "Demo anon update inquiries" on public.inquiries
  for update to anon
  using (true)
  with check (true);
