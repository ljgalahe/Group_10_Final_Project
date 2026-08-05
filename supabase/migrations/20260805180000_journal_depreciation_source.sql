alter table public.journal_entries drop constraint if exists journal_entries_source_check;

alter table public.journal_entries
  add constraint journal_entries_source_check
  check (source in ('invoice', 'payment', 'visit', 'manual', 'depreciation'));
