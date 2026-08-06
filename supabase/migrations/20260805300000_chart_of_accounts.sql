create table if not exists public.chart_of_accounts (
  code text primary key,
  name text not null,
  account_type text not null check (
    account_type in ('asset', 'liability', 'equity', 'revenue', 'expense')
  ),
  created_at timestamptz not null default now()
);

alter table public.chart_of_accounts enable row level security;

create policy "Demo anon read chart_of_accounts" on public.chart_of_accounts
  for select to anon using (true);
create policy "Demo anon insert chart_of_accounts" on public.chart_of_accounts
  for insert to anon with check (true);

insert into public.chart_of_accounts (code, name, account_type) values
  ('1000', 'Cash', 'asset'),
  ('1200', 'Accounts Receivable', 'asset'),
  ('1500', 'Accumulated Depreciation', 'asset'),
  ('2000', 'Accounts Payable', 'liability'),
  ('2100', 'Accrued Expenses', 'liability'),
  ('4000', 'Service Revenue', 'revenue'),
  ('5010', 'Direct Labor', 'expense'),
  ('5020', 'Materials', 'expense'),
  ('5030', 'Equipment', 'expense'),
  ('5040', 'Depreciation Expense', 'expense'),
  ('5900', 'Other Expense', 'expense')
on conflict (code) do nothing;
