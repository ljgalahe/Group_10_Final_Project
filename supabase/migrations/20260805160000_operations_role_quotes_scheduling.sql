-- Operations role, quote requests, contract dual-approval, visit scheduling fields

alter type user_role add value 'operations';

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select role in ('manager', 'accountant', 'crew_lead', 'operations')
     from public.profiles
     where id = auth.uid()),
    true
  );
$$;

create or replace function public.is_operations()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select role = 'operations' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Quote pipeline (Ops inbox)
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

create table if not exists quote_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  service_description text not null,
  notes text,
  related_contract_id uuid references contracts(id) on delete set null,
  status quote_status not null default 'new',
  property_address text,
  budget_hours numeric(10, 2),
  budget_supplies text,
  survey_visit_id uuid references service_visits(id) on delete set null,
  draft_contract_id uuid references contracts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_requests_customer_idx on quote_requests (customer_id);
create index if not exists quote_requests_status_idx on quote_requests (status);

alter table quote_requests enable row level security;

drop policy if exists "Allow read quote_requests" on quote_requests;
create policy "Allow read quote_requests" on quote_requests
  for select to authenticated using (true);

drop policy if exists "Allow insert quote_requests customers" on quote_requests;
create policy "Allow insert quote_requests customers" on quote_requests
  for insert to authenticated with check (true);

drop policy if exists "Allow staff write quote_requests" on quote_requests;
create policy "Allow staff write quote_requests" on quote_requests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Contract dual approval (additive; existing active contracts remain visible)
alter table contracts
  add column if not exists approval_state text not null default 'approved',
  add column if not exists manager_approved_at timestamptz,
  add column if not exists accountant_approved_at timestamptz,
  add column if not exists quote_id uuid references quote_requests(id) on delete set null,
  add column if not exists drafted_by_role text;

comment on column contracts.approval_state is
  'draft | pending_approvals | approved | changes_requested — customer sees approved (and legacy) only';

-- Visit scheduling fields for Ops
alter table service_visits
  add column if not exists visit_kind text not null default 'service',
  add column if not exists crew_lead_name text,
  add column if not exists quote_id uuid references quote_requests(id) on delete set null;

comment on column service_visits.visit_kind is 'service | survey';

-- Member scheduling: operations (and managers for transition) can review
create or replace function public.can_review_member_scheduling()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select role in ('operations', 'manager')
     from public.profiles
     where id = auth.uid()),
    false
  );
$$;
