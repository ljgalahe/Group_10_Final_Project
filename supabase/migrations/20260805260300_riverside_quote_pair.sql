-- Riverside Office Park: one unresolved quote + one resolved quote (demo)
insert into public.quote_requests (
  id, customer_id, service_description, notes, property_address, status, budget_hours, budget_supplies, created_at, updated_at
) values
(
  'b2000000-0000-4000-8000-000000000011',
  '11111111-1111-1111-1111-111111111101',
  'Mulch / bed refresh — north courtyard (Riverside)',
  'OPEN: Waiting on final bed layout sketch from property manager. Priority before fall.',
  '1200 University Ave, Oxford, MS',
  'new',
  10.0,
  'Hardwood mulch, seasonal annuals',
  now() - interval '4 days',
  now() - interval '4 days'
),
(
  'b2000000-0000-4000-8000-000000000012',
  '11111111-1111-1111-1111-111111111101',
  'Spring cleanup catch-up — parking island edges (Riverside)',
  'RESOLVED: Scope completed and billed on INV-0001 season. Closed after customer sign-off.',
  '1200 University Ave, Oxford, MS',
  'closed',
  6.0,
  null,
  now() - interval '45 days',
  now() - interval '20 days'
)
on conflict (id) do update set
  service_description = excluded.service_description,
  notes = excluded.notes,
  status = excluded.status;
