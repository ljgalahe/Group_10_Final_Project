-- Materials inventory for accountant Inventory tab

create type inventory_category as enum (
  'Mulch & beds',
  'Fertilizer & soil',
  'Fuel & fluids',
  'Irrigation',
  'Sod & turf',
  'General supplies'
);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  category inventory_category not null default 'General supplies',
  unit text not null default 'each',
  quantity_on_hand numeric(12,2) not null default 0 check (quantity_on_hand >= 0),
  par_level numeric(12,2) not null check (par_level > 0),
  unit_cost numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_inventory_items_category on inventory_items(category);
create index idx_inventory_items_name on inventory_items(name);

alter table inventory_items enable row level security;

create policy "Allow read inventory_items" on inventory_items
  for select to authenticated using (true);
create policy "Allow staff write inventory_items" on inventory_items
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Demo anon read inventory_items" on inventory_items
  for select to anon using (true);
create policy "Demo anon write inventory_items" on inventory_items
  for all to anon using (true) with check (true);

-- Demo stock levels (several items below 25% of par)
insert into inventory_items (name, sku, category, unit, quantity_on_hand, par_level, unit_cost, notes) values
  ('Mulch', 'MUL-2CY', 'Mulch & beds', 'bags', 15, 100, 4.50, 'Brown hardwood — spring bed refresh'),
  ('Fertilizer', 'FERT-46', 'Fertilizer & soil', 'bags', 8, 40, 28.00, '46-0-0 commercial blend'),
  ('Fuel Mix', 'FUEL-2C', 'Fuel & fluids', 'gallons', 5, 50, 6.25, '2-cycle mix for trimmers and blowers'),
  ('Sod Patches', 'SOD-PAT', 'Sod & turf', 'pallets', 45, 80, 185.00, 'Warm-season repair pallets'),
  ('Edger Line / Blades', 'EDGE-LN', 'General supplies', 'spools', 30, 40, 12.00, null),
  ('Pre-Emergent', 'PRE-EM', 'Fertilizer & soil', 'gallons', 12, 24, 42.00, 'Bed weed prevention'),
  ('Replacement Emitters', 'IRR-EM', 'Irrigation', 'each', 18, 120, 1.85, 'Standard drip emitters'),
  ('PVC Fittings', 'IRR-PVC', 'Irrigation', 'each', 6, 60, 3.20, 'Assorted elbows and couplers'),
  ('Leaf Bags', 'GEN-LB', 'General supplies', 'bags', 22, 200, 0.45, 'Heavy-duty lawn bags'),
  ('Riprap Stone', 'POND-RR', 'Mulch & beds', 'tons', 2, 12, 95.00, 'Detention pond maintenance');
