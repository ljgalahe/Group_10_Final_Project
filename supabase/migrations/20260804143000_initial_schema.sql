-- GreenScape Commercial Services — initial schema

create type user_role as enum ('manager', 'accountant', 'crew_lead', 'customer');
create type contract_status as enum ('draft', 'active', 'completed', 'cancelled');
create type billing_method as enum ('monthly', 'per_visit', 'seasonal');
create type visit_status as enum ('scheduled', 'completed', 'cancelled');
create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue');
create type extra_work_status as enum ('quoted', 'approved', 'completed', 'declined');
create type cost_type as enum ('labor', 'materials', 'equipment');

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  property_type text,
  address text,
  contact_name text,
  contact_email text,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'manager',
  customer_id uuid references customers(id),
  created_at timestamptz not null default now()
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  title text not null,
  status contract_status not null default 'active',
  season_start date not null,
  season_end date not null,
  monthly_fee numeric(10,2),
  visits_per_week int,
  billing_method billing_method not null default 'monthly',
  notes text,
  created_at timestamptz not null default now()
);

create table contract_services (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  service_name text not null,
  included boolean not null default true
);

create table service_visits (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  scheduled_date date not null,
  status visit_status not null default 'scheduled',
  crew_notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table visit_costs (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references service_visits(id) on delete cascade,
  cost_type cost_type not null,
  description text,
  amount numeric(10,2) not null,
  quantity numeric(10,2),
  created_at timestamptz not null default now()
);

create table extra_work_orders (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  title text not null,
  description text,
  quoted_amount numeric(10,2) not null,
  status extra_work_status not null default 'quoted',
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  invoice_number text not null unique,
  issue_date date not null,
  due_date date not null,
  status invoice_status not null default 'draft',
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  amount_paid numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  amount numeric(10,2) not null,
  line_type text
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(10,2) not null,
  payment_date date not null,
  payment_method text not null default 'simulated',
  notes text,
  created_at timestamptz not null default now()
);

create index idx_contracts_customer on contracts(customer_id);
create index idx_visits_contract on service_visits(contract_id);
create index idx_invoices_customer on invoices(customer_id);
create index idx_invoices_status on invoices(status);
create index idx_payments_invoice on payments(invoice_id);

alter table customers enable row level security;
alter table profiles enable row level security;
alter table contracts enable row level security;
alter table contract_services enable row level security;
alter table service_visits enable row level security;
alter table visit_costs enable row level security;
alter table extra_work_orders enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;
alter table payments enable row level security;

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

create policy "Allow read customers for authenticated" on customers for select to authenticated using (true);
create policy "Allow staff write customers" on customers for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Allow read own profile" on profiles for select to authenticated using (auth.uid() = id or public.is_staff());
create policy "Allow update own profile" on profiles for update to authenticated using (auth.uid() = id);

create policy "Allow read contracts" on contracts for select to authenticated using (true);
create policy "Allow staff write contracts" on contracts for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Allow read contract_services" on contract_services for select to authenticated using (true);
create policy "Allow staff write contract_services" on contract_services for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Allow read service_visits" on service_visits for select to authenticated using (true);
create policy "Allow staff write service_visits" on service_visits for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Allow read visit_costs" on visit_costs for select to authenticated using (true);
create policy "Allow staff write visit_costs" on visit_costs for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Allow read extra_work_orders" on extra_work_orders for select to authenticated using (true);
create policy "Allow staff write extra_work_orders" on extra_work_orders for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Allow read invoices" on invoices for select to authenticated using (true);
create policy "Allow staff write invoices" on invoices for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Allow read invoice_lines" on invoice_lines for select to authenticated using (true);
create policy "Allow staff write invoice_lines" on invoice_lines for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Allow read payments" on payments for select to authenticated using (true);
create policy "Allow staff write payments" on payments for all to authenticated using (public.is_staff()) with check (public.is_staff());
