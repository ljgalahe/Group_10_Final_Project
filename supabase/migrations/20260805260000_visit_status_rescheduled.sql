-- Allow rescheduled visit status for weather demo stories (enum only; data in seed / follow-up)
alter type visit_status add value if not exists 'rescheduled';
