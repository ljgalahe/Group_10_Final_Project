create policy "Demo anon delete journal_entries" on public.journal_entries
  for delete to anon using (true);
