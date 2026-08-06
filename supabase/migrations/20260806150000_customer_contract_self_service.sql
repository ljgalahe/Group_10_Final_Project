-- Customer self-service: pause window + decline notes on contracts
alter table contracts
  add column if not exists service_paused_until date,
  add column if not exists customer_declined_at timestamptz,
  add column if not exists customer_decline_notes text;

comment on column contracts.service_paused_until is
  'When set and >= today, service is paused; auto-resumes the day after (Ops treats as inactive for new visits until date passes). Each customer pause extends by 1 calendar month.';

comment on column contracts.customer_declined_at is
  'Customer declined a Proposed Contract instead of signing.';
