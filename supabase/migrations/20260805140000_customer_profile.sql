-- Customer profile fields + richer payment method metadata (demo)

alter table customers
  add column if not exists contact_phone text;

alter table customers
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;

alter table customer_payment_methods
  add column if not exists method_type text not null default 'card'
    check (method_type in ('card', 'bank'));

alter table customer_payment_methods
  add column if not exists is_default boolean not null default false;

alter table customer_payment_methods
  add column if not exists last_four text;

alter table customer_payment_methods
  add column if not exists expires_month int;

alter table customer_payment_methods
  add column if not exists expires_year int;

alter table customer_payment_methods
  add column if not exists billing_name text;

-- Seed defaults for Riverside (safe if already seeded — only fills empty phone/prefs)
update customers
set
  contact_phone = coalesce(nullif(trim(contact_phone), ''), '(662) 555-0142'),
  notification_prefs = case
    when notification_prefs is null
      or notification_prefs = '{}'::jsonb
      or notification_prefs = 'null'::jsonb
    then jsonb_build_object(
      'invoice_reminders', jsonb_build_object(
        'enabled', true,
        'channel', 'email',
        'contact', coalesce(contact_email, 'mchen@riverside-op.com')
      ),
      'visit_reminders', jsonb_build_object(
        'enabled', true,
        'channel', 'email',
        'contact', coalesce(contact_email, 'mchen@riverside-op.com')
      ),
      'support_updates', jsonb_build_object(
        'enabled', true,
        'channel', 'email',
        'contact', coalesce(contact_email, 'mchen@riverside-op.com')
      ),
      'renewal_notices', jsonb_build_object(
        'enabled', false,
        'channel', 'email',
        'contact', coalesce(contact_email, 'mchen@riverside-op.com')
      )
    )
    else notification_prefs
  end
where id = '11111111-1111-1111-1111-111111111101';

-- Tag existing Riverside payment methods
update customer_payment_methods
set
  method_type = case
    when lower(display_label) like '%bank%' then 'bank'
    else 'card'
  end,
  last_four = right(regexp_replace(display_label, '\D', '', 'g'), 4),
  is_default = (display_label = 'Card ending in 4242')
where customer_id = '11111111-1111-1111-1111-111111111101';
