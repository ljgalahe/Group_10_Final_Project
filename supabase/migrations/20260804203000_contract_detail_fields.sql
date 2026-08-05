-- Add editable contract detail fields for crew, account manager, and renewal

alter table contracts
  add column if not exists assigned_crew text,
  add column if not exists account_manager text,
  add column if not exists renewal_date date;

-- Demo mode: allow anon updates for contract detail editing
create policy "Demo anon update contracts"
  on contracts for update to anon using (true) with check (true);

create policy "Demo anon update customers"
  on customers for update to anon using (true) with check (true);
