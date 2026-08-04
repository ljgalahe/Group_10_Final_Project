-- Demo mode: allow reads (and basic writes) without Supabase auth session
create policy "Demo anon read customers" on customers for select to anon using (true);
create policy "Demo anon read contracts" on contracts for select to anon using (true);
create policy "Demo anon read contract_services" on contract_services for select to anon using (true);
create policy "Demo anon read service_visits" on service_visits for select to anon using (true);
create policy "Demo anon read visit_costs" on visit_costs for select to anon using (true);
create policy "Demo anon read extra_work_orders" on extra_work_orders for select to anon using (true);
create policy "Demo anon read invoices" on invoices for select to anon using (true);
create policy "Demo anon read invoice_lines" on invoice_lines for select to anon using (true);
create policy "Demo anon read payments" on payments for select to anon using (true);

create policy "Demo anon write service_visits" on service_visits for update to anon using (true) with check (true);
create policy "Demo anon insert visit_costs" on visit_costs for insert to anon with check (true);
create policy "Demo anon insert invoices" on invoices for insert to anon with check (true);
create policy "Demo anon insert invoice_lines" on invoice_lines for insert to anon with check (true);
create policy "Demo anon update invoices" on invoices for update to anon using (true) with check (true);
create policy "Demo anon insert payments" on payments for insert to anon with check (true);
create policy "Demo anon update extra_work_orders" on extra_work_orders for update to anon using (true) with check (true);
