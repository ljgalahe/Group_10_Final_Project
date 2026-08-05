-- Manager Payments workflow: invoice statuses + payment attribution fields
-- Additive only — does not rename or drop existing columns.
-- Safe for databases that already include partially_paid and/or past_due.

do $$
begin
  alter type invoice_status add value if not exists 'partially_paid';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type invoice_status add value if not exists 'canceled';
exception
  when duplicate_object then null;
end $$;

-- Teammate environments may already use voided for non-collectible invoices.
do $$
begin
  alter type invoice_status add value if not exists 'voided';
exception
  when duplicate_object then null;
end $$;

-- Some environments use overdue; others use past_due. Keep both available.
do $$
begin
  alter type invoice_status add value if not exists 'overdue';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type invoice_status add value if not exists 'past_due';
exception
  when duplicate_object then null;
end $$;

alter table payments
  add column if not exists reference_number text,
  add column if not exists recorded_by uuid,
  add column if not exists recorded_by_name text,
  add column if not exists status text not null default 'applied',
  add column if not exists payment_number text,
  add column if not exists customer_id uuid references customers(id),
  add column if not exists applied_amount numeric(10,2),
  add column if not exists unapplied_amount numeric(10,2) default 0;

comment on column payments.reference_number is 'Check or external reference number';
comment on column payments.recorded_by is 'auth.users / profiles id when available';
comment on column payments.recorded_by_name is 'Display name for recorder (demo-friendly)';
comment on column payments.status is 'applied | unapplied | void';
comment on column payments.payment_number is 'Human-readable cash receipt number (e.g. CR-0001)';

-- Normalize legacy simulated method labels when present
update payments set payment_method = 'ach' where payment_method = 'simulated_ach';
update payments set payment_method = 'check' where payment_method = 'simulated_check';
update payments set payment_method = 'card' where payment_method = 'simulated_card';

-- Align partial invoices that still use unpaid-family statuses
update invoices
set status = 'partially_paid'
where amount_paid > 0
  and amount_paid < total
  and status in ('sent', 'overdue', 'past_due', 'draft');

-- Atomic payment + invoice balance/status update for manager Record Payment
create or replace function public.record_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_date date,
  p_reference_number text default null,
  p_notes text default null,
  p_recorded_by uuid default null,
  p_recorded_by_name text default null,
  p_payment_number text default null,
  p_customer_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice invoices%rowtype;
  v_remaining numeric(10,2);
  v_new_paid numeric(10,2);
  v_new_status invoice_status;
  v_payment_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if p_payment_method = 'check' and (p_reference_number is null or btrim(p_reference_number) = '') then
    raise exception 'Check payments require a reference / check number';
  end if;

  select * into v_invoice
  from invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;

  if v_invoice.status::text in ('canceled', 'voided') then
    raise exception 'Canceled or voided invoices cannot receive payments';
  end if;

  if v_invoice.status::text = 'paid' then
    raise exception 'This invoice is already fully paid';
  end if;

  v_remaining := round((v_invoice.total - v_invoice.amount_paid)::numeric, 2);
  if v_remaining <= 0 then
    raise exception 'This invoice has no remaining balance';
  end if;

  if p_amount > v_remaining then
    raise exception 'Payment cannot exceed the remaining balance of %', v_remaining;
  end if;

  insert into payments (
    invoice_id,
    customer_id,
    payment_number,
    amount,
    applied_amount,
    unapplied_amount,
    payment_date,
    payment_method,
    notes,
    reference_number,
    recorded_by,
    recorded_by_name,
    status
  ) values (
    p_invoice_id,
    coalesce(p_customer_id, v_invoice.customer_id),
    p_payment_number,
    p_amount,
    p_amount,
    0,
    p_payment_date,
    p_payment_method,
    nullif(btrim(coalesce(p_notes, '')), ''),
    nullif(btrim(coalesce(p_reference_number, '')), ''),
    p_recorded_by,
    p_recorded_by_name,
    'applied'
  )
  returning id into v_payment_id;

  v_new_paid := round((v_invoice.amount_paid + p_amount)::numeric, 2);

  if v_new_paid <= 0 then
    v_new_status := v_invoice.status;
  elsif v_new_paid >= v_invoice.total then
    v_new_status := 'paid';
  else
    v_new_status := 'partially_paid';
  end if;

  update invoices
  set amount_paid = v_new_paid,
      status = v_new_status
  where id = p_invoice_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'amount_paid', v_new_paid,
    'status', v_new_status,
    'remaining', round((v_invoice.total - v_new_paid)::numeric, 2)
  );
end;
$$;

grant execute on function public.record_invoice_payment(
  uuid, numeric, text, date, text, text, uuid, text, text, uuid
) to anon, authenticated, service_role;
