-- Accountant journal entries (manual + automated posts)
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_number text not null unique,
  entry_date date not null,
  source text not null check (source in ('invoice', 'payment', 'visit', 'manual')),
  source_id uuid null,
  memo text not null,
  reference text not null default '',
  customer_name text not null default '',
  contract_title text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  line_no int not null,
  account_code text not null,
  account_name text not null,
  debit numeric(12,2) not null default 0,
  credit numeric(12,2) not null default 0,
  constraint journal_entry_lines_amount_chk check (debit >= 0 and credit >= 0),
  constraint journal_entry_lines_one_side_chk check (not (debit > 0 and credit > 0))
);

create unique index if not exists journal_entries_source_unique
  on public.journal_entries (source, source_id)
  where source_id is not null and source <> 'manual';

create index if not exists journal_entry_lines_entry_idx
  on public.journal_entry_lines (journal_entry_id, line_no);

alter table public.journal_entries enable row level security;
alter table public.journal_entry_lines enable row level security;

create policy "Demo anon read journal_entries" on public.journal_entries
  for select to anon using (true);
create policy "Demo anon insert journal_entries" on public.journal_entries
  for insert to anon with check (true);
create policy "Demo anon update journal_entries" on public.journal_entries
  for update to anon using (true) with check (true);

create policy "Demo anon read journal_entry_lines" on public.journal_entry_lines
  for select to anon using (true);
create policy "Demo anon insert journal_entry_lines" on public.journal_entry_lines
  for insert to anon with check (true);
create policy "Demo anon update journal_entry_lines" on public.journal_entry_lines
  for update to anon using (true) with check (true);
create policy "Demo anon delete journal_entry_lines" on public.journal_entry_lines
  for delete to anon using (true);
