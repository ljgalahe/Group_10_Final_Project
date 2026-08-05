-- Crew Member role + member scheduling (availability / time-off) requests

alter type user_role add value 'crew_member';

-- Staff write access stays manager / accountant / crew_lead only (not crew_member).
create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select role in ('manager', 'accountant', 'crew_lead')
     from public.profiles
     where id = auth.uid()),
    true
  );
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select role = 'manager' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_crew_member()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select role = 'crew_member' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Optional visit↔assignment for RLS scoping (demo may still use client-side defaults).
create table if not exists visit_crew_assignments (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references service_visits(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  assignment_role text not null check (assignment_role in ('crew_lead', 'crew_member')),
  created_at timestamptz not null default now(),
  unique (visit_id, profile_id)
);

create index if not exists idx_visit_crew_assignments_visit
  on visit_crew_assignments(visit_id);
create index if not exists idx_visit_crew_assignments_profile
  on visit_crew_assignments(profile_id);

alter table visit_crew_assignments enable row level security;

create or replace function public.is_assigned_to_visit(p_visit_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.visit_crew_assignments a
    where a.visit_id = p_visit_id
      and a.profile_id = auth.uid()
  );
$$;

-- Member availability + time-off requests (crew_member write exception).
create type member_request_kind as enum ('availability', 'time_off');
create type member_request_status as enum (
  'pending',
  'approved',
  'denied',
  'needs_info'
);

create table member_scheduling_requests (
  id uuid primary key default gen_random_uuid(),
  member_profile_id uuid references profiles(id) on delete set null,
  member_demo_id text,
  member_name text not null,
  kind member_request_kind not null,
  start_date date not null,
  end_date date not null,
  reason text,
  availability_notes text,
  status member_request_status not null default 'pending',
  denial_reason text,
  manager_message text,
  seen_by_manager boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index idx_member_scheduling_member
  on member_scheduling_requests(member_profile_id);
create index idx_member_scheduling_status
  on member_scheduling_requests(status);

alter table member_scheduling_requests enable row level security;

-- Assignments: staff full access; crew members read own assignments only.
create policy "Staff read visit_crew_assignments"
  on visit_crew_assignments for select to authenticated
  using (public.is_staff() or profile_id = auth.uid());

create policy "Staff write visit_crew_assignments"
  on visit_crew_assignments for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "Demo anon read visit_crew_assignments"
  on visit_crew_assignments for select to anon using (true);

-- Scheduling requests: own insert/select/update (for resubmit); managers manage all.
create policy "Crew member insert own scheduling requests"
  on member_scheduling_requests for insert to authenticated
  with check (
    public.is_crew_member()
    and (member_profile_id is null or member_profile_id = auth.uid())
  );

create policy "Crew member read own scheduling requests"
  on member_scheduling_requests for select to authenticated
  using (
    public.is_manager()
    or public.is_staff()
    or member_profile_id = auth.uid()
  );

create policy "Crew member update own pending or needs_info requests"
  on member_scheduling_requests for update to authenticated
  using (
    public.is_manager()
    or (
      public.is_crew_member()
      and member_profile_id = auth.uid()
      and status in ('pending', 'needs_info')
    )
  )
  with check (
    public.is_manager()
    or (
      public.is_crew_member()
      and member_profile_id = auth.uid()
    )
  );

create policy "Manager delete scheduling requests"
  on member_scheduling_requests for delete to authenticated
  using (public.is_manager());

-- Demo anon policies (cookie demo / localStorage-backed UI still primary).
create policy "Demo anon read member_scheduling_requests"
  on member_scheduling_requests for select to anon using (true);
create policy "Demo anon insert member_scheduling_requests"
  on member_scheduling_requests for insert to anon with check (true);
create policy "Demo anon update member_scheduling_requests"
  on member_scheduling_requests for update to anon using (true) with check (true);

-- Tighten service_visits writes remain staff-only via is_staff() (crew_member excluded).
-- Crew members may only read visits they are assigned to when authenticated with a profile.
drop policy if exists "Allow read service_visits" on service_visits;
create policy "Allow read service_visits" on service_visits for select to authenticated
using (
  public.is_staff()
  or public.is_assigned_to_visit(id)
  or not public.is_crew_member()
);
