-- Internal controls: manager approval queue + contract audit log

create table if not exists contract_change_requests (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  customer_id uuid references customers(id),
  requested_by_role text not null default 'accountant',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  proposed_contract jsonb not null,
  proposed_customer jsonb,
  summary text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_role text
);

create table if not exists contract_audit_logs (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  action text not null,
  actor_role text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_change_requests_contract on contract_change_requests(contract_id);
create index if not exists idx_change_requests_status on contract_change_requests(status);
create index if not exists idx_audit_logs_contract on contract_audit_logs(contract_id);

alter table contract_change_requests enable row level security;
alter table contract_audit_logs enable row level security;

drop policy if exists "Demo anon read change requests" on contract_change_requests;
create policy "Demo anon read change requests" on contract_change_requests for select to anon using (true);
drop policy if exists "Demo anon write change requests" on contract_change_requests;
create policy "Demo anon write change requests" on contract_change_requests for all to anon using (true) with check (true);

drop policy if exists "Demo anon read audit logs" on contract_audit_logs;
create policy "Demo anon read audit logs" on contract_audit_logs for select to anon using (true);
drop policy if exists "Demo anon insert audit logs" on contract_audit_logs;
create policy "Demo anon insert audit logs" on contract_audit_logs for insert to anon with check (true);
