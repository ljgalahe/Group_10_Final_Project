-- Saved payment methods for the customer portal (demo only — no real cards)

create table customer_payment_methods (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  nickname text,
  display_label text not null,
  created_at timestamptz not null default now()
);

create index idx_customer_payment_methods_customer
  on customer_payment_methods(customer_id);

alter table customer_payment_methods enable row level security;

create policy "Allow read customer_payment_methods" on customer_payment_methods
  for select to authenticated using (true);

create policy "Allow insert customer_payment_methods" on customer_payment_methods
  for insert to authenticated with check (true);

create policy "Allow staff write customer_payment_methods" on customer_payment_methods
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Riverside demo defaults
insert into customer_payment_methods (customer_id, nickname, display_label) values
  ('11111111-1111-1111-1111-111111111101', null, 'Card ending in 4242'),
  ('11111111-1111-1111-1111-111111111101', null, 'Bank account ending in 8821');
