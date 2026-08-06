-- Small demo set of prospect inquiries + a few quotes for Operations presentation

insert into public.inquiries (
  id,
  company_name,
  contact_name,
  contact_email,
  contact_phone,
  property_address,
  property_type,
  services_interested,
  message,
  status,
  created_at
) values
  (
    'a1000000-0000-4000-8000-000000000001',
    'Oakwood Retail Plaza',
    'Kim Alvarez',
    'kalvarez@oakwoodplaza.com',
    '(662) 555-0188',
    '2100 Jackson Ave E, Oxford, MS',
    'retail_center',
    array['mowing', 'seasonal_color'],
    'Need curb appeal package before fall leasing season.',
    'New',
    now() - interval '2 days'
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'North Lamar Medical Offices',
    'Dr. Evan Parks',
    'facilities@nlmed.example',
    '(662) 555-0192',
    '450 North Lamar Blvd, Oxford, MS',
    'office_park',
    array['mowing', 'irrigation', 'snow_removal'],
    'Year-round grounds + parking lot snow priority for patients.',
    'Under review',
    now() - interval '5 days'
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'Westside Logistics Yard',
    'Taylor Quinn',
    'tquinn@westside-logistics.com',
    null,
    '880 Industrial Blvd, Oxford, MS',
    'industrial',
    array['mowing', 'other'],
    'Perimeter mowing only; must badge with security.',
    'New',
    now() - interval '1 day'
  ),
  (
    'a1000000-0000-4000-8000-000000000004',
    'Sycamore Court Apartments',
    'Riley Grant',
    'rgrant@sycamorecourt.com',
    '(662) 555-0170',
    '75 Sycamore Dr, Oxford, MS',
    'multifamily',
    array['mowing', 'irrigation', 'seasonal_color'],
    'Went with another vendor after site walk — keeping for pipeline demo.',
    'Closed - Lost',
    now() - interval '12 days'
  )
on conflict (id) do update set
  company_name = excluded.company_name,
  contact_name = excluded.contact_name,
  contact_email = excluded.contact_email,
  status = excluded.status,
  message = excluded.message,
  services_interested = excluded.services_interested;

-- Quotes for known seed-style customer IDs when present
insert into public.quote_requests (
  id,
  customer_id,
  service_description,
  notes,
  property_address,
  status,
  budget_hours,
  budget_supplies,
  created_at
)
select * from (values
  (
    'b2000000-0000-4000-8000-000000000001'::uuid,
    '11111111-1111-1111-1111-111111111101'::uuid,
    'Seasonal color rotation — front entrance beds (Fall)',
    'Customer asked for warm palette beds at University Ave entry.',
    '1200 University Ave, Oxford, MS',
    'new'::quote_status,
    12.0::numeric,
    'Mum trays, hardwood mulch top-up',
    now() - interval '3 days'
  ),
  (
    'b2000000-0000-4000-8000-000000000002'::uuid,
    '11111111-1111-1111-1111-111111111102'::uuid,
    'Irrigation zone upgrade — south retail frontage',
    'Survey scheduled after converted water meters.',
    '450 Jackson Ave W, Oxford, MS',
    'survey_scheduled'::quote_status,
    8.0::numeric,
    'Hunter heads, controller expansion module',
    now() - interval '6 days'
  ),
  (
    'b2000000-0000-4000-8000-000000000003'::uuid,
    '11111111-1111-1111-1111-111111111103'::uuid,
    'HOA common-area snow priority package',
    'Budgeting salt, plows, and response SLA for winter 2026–27.',
    '88 South Lamar Blvd, Oxford, MS',
    'budgeted'::quote_status,
    0.0::numeric,
    'Salt bulk reserve, plow blades',
    now() - interval '10 days'
  ),
  (
    'b2000000-0000-4000-8000-000000000004'::uuid,
    '11111111-1111-1111-1111-111111111104'::uuid,
    'Industrial perimeter mowing + detention pond bank care',
    'Out-of-scope add for Metro — PPE / escort required.',
    '900 Molly Barr Rd, Oxford, MS',
    'new'::quote_status,
    16.0::numeric,
    null,
    now() - interval '1 day'
  )
) as v(id, customer_id, service_description, notes, property_address, status, budget_hours, budget_supplies, created_at)
where exists (select 1 from public.customers c where c.id = v.customer_id)
on conflict (id) do update set
  service_description = excluded.service_description,
  notes = excluded.notes,
  status = excluded.status,
  budget_hours = excluded.budget_hours,
  budget_supplies = excluded.budget_supplies;
