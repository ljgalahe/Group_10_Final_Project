-- Demo mode: allow creating contracts and customers without auth session
drop policy if exists "Demo anon insert contracts" on contracts;
create policy "Demo anon insert contracts" on contracts for insert to anon with check (true);

drop policy if exists "Demo anon insert customers" on customers;
create policy "Demo anon insert customers" on customers for insert to anon with check (true);
