-- Ops pipeline: Inquiry → Site Survey → Quote approval → Customer-signed contract → Schedule
-- Project: ashhludptczpogtwmzvd only

-- ---------------------------------------------------------------------------
-- inquiries: acres + survey status
-- ---------------------------------------------------------------------------
alter table public.inquiries
  add column if not exists acres numeric(10, 2),
  add column if not exists survey_status text not null default 'needs_scheduling',
  add column if not exists survey_id uuid;

do $$ begin
  alter table public.inquiries
    drop constraint if exists inquiries_survey_status_check;
  alter table public.inquiries
    add constraint inquiries_survey_status_check
    check (survey_status in ('needs_scheduling', 'scheduled', 'completed'));
exception
  when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- site_surveys
-- ---------------------------------------------------------------------------
create table if not exists public.site_surveys (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  property_address text not null,
  acres numeric(10, 2),
  interested_services text[] not null default '{}',
  proposed_services jsonb not null default '[]'::jsonb,
  catalog_snapshot jsonb not null default '[]'::jsonb,
  initial_notes text,
  property_concerns text,
  photo_urls text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'in_progress', 'completed')),
  scheduled_visit_id uuid references public.service_visits (id) on delete set null,
  quote_id uuid references public.quote_requests (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_surveys_inquiry_idx on public.site_surveys (inquiry_id);
create index if not exists site_surveys_status_idx on public.site_surveys (status);
create index if not exists site_surveys_quote_idx on public.site_surveys (quote_id);

alter table public.site_surveys enable row level security;

drop policy if exists "Allow read site_surveys" on public.site_surveys;
create policy "Allow read site_surveys" on public.site_surveys
  for select to authenticated, anon using (true);

drop policy if exists "Allow insert site_surveys" on public.site_surveys;
create policy "Allow insert site_surveys" on public.site_surveys
  for insert to authenticated, anon with check (true);

drop policy if exists "Allow update site_surveys" on public.site_surveys;
create policy "Allow update site_surveys" on public.site_surveys
  for update to authenticated, anon using (true) with check (true);

drop policy if exists "Allow delete site_surveys" on public.site_surveys;
create policy "Allow delete site_surveys" on public.site_surveys
  for delete to authenticated, anon using (true);

-- Link inquiries.survey_id after table exists
do $$ begin
  alter table public.inquiries
    drop constraint if exists inquiries_survey_id_fkey;
  alter table public.inquiries
    add constraint inquiries_survey_id_fkey
    foreign key (survey_id) references public.site_surveys (id) on delete set null;
exception
  when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- quote_requests: approval pipeline fields + statuses
-- ---------------------------------------------------------------------------
do $$ begin
  alter type public.quote_status add value if not exists 'pending_manager_approval';
exception
  when others then null;
end $$;

do $$ begin
  alter type public.quote_status add value if not exists 'approved';
exception
  when others then null;
end $$;

do $$ begin
  alter type public.quote_status add value if not exists 'rejected';
exception
  when others then null;
end $$;

do $$ begin
  alter type public.quote_status add value if not exists 'changes_requested';
exception
  when others then null;
end $$;

alter table public.quote_requests
  add column if not exists survey_id uuid references public.site_surveys (id) on delete set null,
  add column if not exists line_items jsonb not null default '[]'::jsonb,
  add column if not exists visits_per_week numeric(4, 1),
  add column if not exists visit_frequency_notes text,
  add column if not exists season_start date,
  add column if not exists season_end date,
  add column if not exists monthly_fee numeric(12, 2),
  add column if not exists manager_approved_at timestamptz,
  add column if not exists submitted_for_approval_at timestamptz;

create index if not exists quote_requests_survey_idx on public.quote_requests (survey_id);

-- ---------------------------------------------------------------------------
-- contracts: customer signature (Manager approves quotes; customer signs contracts)
-- ---------------------------------------------------------------------------
alter table public.contracts
  add column if not exists customer_signed_at timestamptz,
  add column if not exists customer_signature_name text;

comment on column public.contracts.approval_state is
  'draft | pending_approvals | pending_customer | approved | changes_requested — pipeline uses pending_customer for Proposed Contract; customer_signed_at gates Ops scheduling';

-- ---------------------------------------------------------------------------
-- Seed demo inquiries with acres / survey status (idempotent by company name)
-- ---------------------------------------------------------------------------
insert into public.inquiries (
  company_name,
  contact_name,
  contact_email,
  contact_phone,
  property_address,
  property_type,
  services_interested,
  message,
  status,
  acres,
  survey_status
)
select *
from (
  values
    (
      'Lakeside Office Commons',
      'Jordan Hale',
      'jordan.hale@lakeside-demo.example',
      '555-0101',
      '1200 Lakeside Pkwy, Springfield',
      'office_park',
      array['mowing', 'irrigation']::text[],
      'Need a pre-season grounds proposal for our 4-acre campus.',
      'New',
      4.00::numeric,
      'needs_scheduling'
    ),
    (
      'Harbor Retail Plaza',
      'Sam Ortiz',
      'sam.ortiz@harbor-demo.example',
      '555-0102',
      '88 Harbor Ave, Springfield',
      'retail_center',
      array['mowing', 'seasonal_color']::text[],
      'Looking for weekly mowing plus spring color beds.',
      'Under review',
      2.50::numeric,
      'needs_scheduling'
    ),
    (
      'Northridge Multifamily',
      'Casey Nguyen',
      'casey.nguyen@northridge-demo.example',
      '555-0103',
      '450 Northridge Dr, Springfield',
      'multifamily',
      array['mowing', 'snow_removal', 'irrigation']::text[],
      'Full-service grounds + winter snow for 8 acres.',
      'New',
      8.00::numeric,
      'needs_scheduling'
    )
) as v(
  company_name,
  contact_name,
  contact_email,
  contact_phone,
  property_address,
  property_type,
  services_interested,
  message,
  status,
  acres,
  survey_status
)
where not exists (
  select 1 from public.inquiries i where i.company_name = v.company_name
);

-- Prefer demo customer for Customer role Proposed Contract click-path
update public.inquiries
set converted_customer_id = '11111111-1111-1111-1111-111111111101'
where company_name = 'Lakeside Office Commons'
  and exists (
    select 1 from public.customers c
    where c.id = '11111111-1111-1111-1111-111111111101'
  );
