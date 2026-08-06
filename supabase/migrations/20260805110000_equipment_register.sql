-- Fixed asset register for accountant Equipment tab (unit-of-production depreciation)

create type equipment_category as enum (
  'Mowers',
  'Trucks',
  'Trailers',
  'Tractors',
  'Skid steers',
  'Irrigation tools',
  'Hand/power tools',
  'Other'
);

create type equipment_status as enum ('active', 'retired');

create table equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category equipment_category not null,
  purchase_date date not null,
  cost numeric(12,2) not null check (cost >= 0),
  salvage_value numeric(12,2) not null default 0 check (salvage_value >= 0),
  useful_life_years integer not null default 0 check (useful_life_years >= 0),
  useful_life_months integer not null default 0 check (useful_life_months >= 0 and useful_life_months < 12),
  estimated_total_hours numeric(12,2) not null check (estimated_total_hours > 0),
  status equipment_status not null default 'active',
  retired_at date,
  notes text,
  created_at timestamptz not null default now(),
  constraint equipment_salvage_lte_cost check (salvage_value <= cost),
  constraint equipment_useful_life_positive check (
    useful_life_years > 0 or useful_life_months > 0
  )
);

create table equipment_usage (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment(id) on delete cascade,
  visit_id uuid not null references service_visits(id) on delete cascade,
  hours numeric(10,2) not null check (hours > 0),
  used_on date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_equipment_category on equipment(category);
create index idx_equipment_status on equipment(status);
create index idx_equipment_usage_equipment on equipment_usage(equipment_id);
create index idx_equipment_usage_visit on equipment_usage(visit_id);
create index idx_equipment_usage_used_on on equipment_usage(used_on desc);

alter table equipment enable row level security;
alter table equipment_usage enable row level security;

create policy "Allow read equipment" on equipment
  for select to authenticated using (true);
create policy "Allow staff write equipment" on equipment
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Allow read equipment_usage" on equipment_usage
  for select to authenticated using (true);
create policy "Allow staff write equipment_usage" on equipment_usage
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Demo anon policies (match other tables)
create policy "Demo anon read equipment" on equipment
  for select to anon using (true);
create policy "Demo anon write equipment" on equipment
  for all to anon using (true) with check (true);

create policy "Demo anon read equipment_usage" on equipment_usage
  for select to anon using (true);
create policy "Demo anon write equipment_usage" on equipment_usage
  for all to anon using (true) with check (true);
