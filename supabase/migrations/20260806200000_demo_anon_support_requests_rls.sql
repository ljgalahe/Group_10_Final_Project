-- Match contracts/customers/invoices: demo View-as mode often uses the anon key.
drop policy if exists "Demo anon read support_requests" on public.support_requests;
create policy "Demo anon read support_requests"
  on public.support_requests for select
  to anon
  using (true);

drop policy if exists "Demo anon insert support_requests" on public.support_requests;
create policy "Demo anon insert support_requests"
  on public.support_requests for insert
  to anon
  with check (true);

drop policy if exists "Demo anon update support_requests" on public.support_requests;
create policy "Demo anon update support_requests"
  on public.support_requests for update
  to anon
  using (true)
  with check (true);
