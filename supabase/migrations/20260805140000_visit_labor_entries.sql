-- Per-person visit labor hours (crew hours + accountant labor billing)

create table if not exists public.visit_labor_entries (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.service_visits(id) on delete cascade,
  member_demo_id text not null,
  member_name text not null,
  member_role text not null default 'Crew Member',
  hours numeric(8,2) not null check (hours >= 0),
  hourly_rate numeric(10,2) not null check (hourly_rate >= 0),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (visit_id, member_demo_id)
);

create index if not exists idx_visit_labor_entries_visit
  on public.visit_labor_entries(visit_id);
create index if not exists idx_visit_labor_entries_member
  on public.visit_labor_entries(member_demo_id);

alter table public.visit_labor_entries enable row level security;

create policy "Staff manage visit_labor_entries"
  on public.visit_labor_entries for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Crew members may read labor rows (demo scopes own rows in the app UI).
create policy "Crew member read visit_labor_entries"
  on public.visit_labor_entries for select to authenticated
  using (
    public.is_staff()
    or public.is_crew_member()
  );

create policy "Demo anon read visit_labor_entries"
  on public.visit_labor_entries for select to anon using (true);

create policy "Demo anon write visit_labor_entries"
  on public.visit_labor_entries for all to anon
  using (true)
  with check (true);
