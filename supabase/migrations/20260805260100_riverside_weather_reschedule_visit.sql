-- Demo weather-rescheduled visit for Riverside (customer presentation)
insert into public.service_visits (id, contract_id, scheduled_date, status, crew_notes, completed_at)
values (
  '33333333-3333-3333-3333-333333333320',
  '22222222-2222-2222-2222-222222222201',
  '2026-08-05',
  'rescheduled',
  'Rescheduled due to severe thunderstorms and lightning safety. Original visit postponed; now first on the schedule for Aug 5, 2026.',
  null
)
on conflict (id) do update set
  scheduled_date = excluded.scheduled_date,
  status = excluded.status,
  crew_notes = excluded.crew_notes;
