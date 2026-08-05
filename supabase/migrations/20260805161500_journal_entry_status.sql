alter table public.journal_entries
  add column if not exists status text not null default 'posted',
  add column if not exists posted_at timestamptz;

alter table public.journal_entries
  drop constraint if exists journal_entries_status_chk;

alter table public.journal_entries
  add constraint journal_entries_status_chk
  check (status in ('draft', 'ready', 'posted'));

update public.journal_entries
set posted_at = coalesce(posted_at, updated_at, created_at)
where status = 'posted' and posted_at is null;

alter table public.journal_entries
  alter column status set default 'draft';
