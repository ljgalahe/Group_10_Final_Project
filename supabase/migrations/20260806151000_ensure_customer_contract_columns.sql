-- Apply on project ashhludptczpogtwmzvd (SQL Editor or MCP execute_sql).
-- Required for Customer Proposed Contract + self-service (pause/decline).

alter table public.contracts
  add column if not exists approval_state text not null default 'approved',
  add column if not exists manager_approved_at timestamptz,
  add column if not exists accountant_approved_at timestamptz,
  add column if not exists quote_id uuid,
  add column if not exists drafted_by_role text,
  add column if not exists customer_signed_at timestamptz,
  add column if not exists customer_signature_name text,
  add column if not exists service_paused_until date,
  add column if not exists customer_declined_at timestamptz,
  add column if not exists customer_decline_notes text;

comment on column public.contracts.approval_state is
  'draft | pending_approvals | pending_customer | approved | changes_requested — pipeline uses pending_customer for Proposed Contract; customer_signed_at gates Ops scheduling';

comment on column public.contracts.service_paused_until is
  'When set and >= today, service is paused; auto-resumes the day after. Each customer pause extends by 1 calendar month.';

comment on column public.contracts.customer_declined_at is
  'Customer declined a Proposed Contract instead of signing.';
