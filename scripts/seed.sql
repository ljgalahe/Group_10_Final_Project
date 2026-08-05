-- GreenScape Commercial Services — demo seed data
-- Safe to re-run: clears demo records first, then reloads.
-- Run in Supabase SQL Editor AFTER initial_schema migration.

-- Customer portal "View as: Customer" uses Riverside Office Park:
--   11111111-1111-1111-1111-111111111101

-- Clear demo data (child tables first)
delete from payments;
delete from invoice_lines;
delete from invoices;
delete from visit_costs;
delete from service_visits;
delete from extra_work_orders;
delete from contract_services;
delete from support_requests;
delete from customer_payment_methods;
delete from contracts;
delete from customers;

-- ─── CUSTOMERS (4 commercial properties) ───────────────────────────────────

insert into customers (id, name, property_type, address, contact_name, contact_email, created_at) values
  ('11111111-1111-1111-1111-111111111101', 'Riverside Office Park', 'Office Park', '1200 University Ave, Oxford, MS', 'Maria Chen', 'mchen@riverside-op.com', '2023-03-15 10:00:00+00'),
  ('11111111-1111-1111-1111-111111111102', 'Summit Retail Center', 'Retail Center', '450 Jackson Ave W, Oxford, MS', 'James Ortiz', 'jortiz@summitretail.com', '2024-01-10 10:00:00+00'),
  ('11111111-1111-1111-1111-111111111103', 'Harbor View HOA', 'HOA', '88 South Lamar Blvd, Oxford, MS', 'Pat Simmons', 'psimmons@harborviewhoa.org', '2024-06-01 10:00:00+00'),
  ('11111111-1111-1111-1111-111111111104', 'Metro Industrial Complex', 'Industrial', '900 Molly Barr Rd, Oxford, MS', 'Dana Brooks', 'dbrooks@metroindustrial.com', '2025-02-20 10:00:00+00');

-- ─── CUSTOMER PAYMENT METHODS (Riverside portal defaults) ────────────────────

insert into customer_payment_methods (customer_id, nickname, display_label) values
  ('11111111-1111-1111-1111-111111111101', null, 'Card ending in 4242'),
  ('11111111-1111-1111-1111-111111111101', null, 'Bank account ending in 8821');

-- ─── CONTRACTS (seasonal maintenance agreements) ───────────────────────────

insert into contracts (id, customer_id, title, status, season_start, season_end, monthly_fee, visits_per_week, billing_method, notes) values
  -- Riverside: only Grounds is near end (within 45 days as of ~Aug 2026); others farther out
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', '2026 Grounds Maintenance — Riverside', 'active', '2026-04-01', '2026-09-15', 2400.00, 2, 'monthly', 'Includes spring cleanup and fall leaf removal.'),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111101', '2026 Irrigation Monitoring — Riverside', 'active', '2026-04-01', '2026-10-31', 650.00, 1, 'monthly', 'Weekly system checks and minor head adjustments. Major repairs billed separately.'),
  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111101', '2026 Parking Lot Islands — Riverside', 'active', '2026-05-01', '2026-11-30', 900.00, 1, 'monthly', 'Shrub beds and tree rings in the north and south parking lots.'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', '2026 Landscape Care — Summit Retail', 'active', '2026-04-01', '2026-10-15', 3200.00, 3, 'monthly', 'High-traffic retail center requires extra edging.'),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', '2026 HOA Common Areas — Harbor View', 'active', '2026-04-01', '2026-11-01', 1800.00, 1, 'monthly', 'Common areas and entrance beds only.'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111104', '2026 Industrial Grounds — Metro', 'active', '2026-04-01', '2026-12-15', 4500.00, 2, 'monthly', 'Large lot with detention pond maintenance.');

-- ─── INCLUDED SERVICES ───────────────────────────────────────────────────────

insert into contract_services (contract_id, service_name, included) values
  ('22222222-2222-2222-2222-222222222201', 'Mowing', true),
  ('22222222-2222-2222-2222-222222222201', 'Edging', true),
  ('22222222-2222-2222-2222-222222222201', 'Trimming', true),
  ('22222222-2222-2222-2222-222222222201', 'Spring Cleanup', true),
  ('22222222-2222-2222-2222-222222222205', 'Irrigation inspection', true),
  ('22222222-2222-2222-2222-222222222205', 'Seasonal watering', true),
  ('22222222-2222-2222-2222-222222222205', 'Controller adjustments', true),
  ('22222222-2222-2222-2222-222222222206', 'Island mowing', true),
  ('22222222-2222-2222-2222-222222222206', 'Bed weeding', true),
  ('22222222-2222-2222-2222-222222222206', 'Mulch top-up', false),
  ('22222222-2222-2222-2222-222222222202', 'Mowing', true),
  ('22222222-2222-2222-2222-222222222202', 'Edging', true),
  ('22222222-2222-2222-2222-222222222202', 'Fertilization', true),
  ('22222222-2222-2222-2222-222222222203', 'Mowing', true),
  ('22222222-2222-2222-2222-222222222203', 'Bed Weeding', true),
  ('22222222-2222-2222-2222-222222222204', 'Mowing', true),
  ('22222222-2222-2222-2222-222222222204', 'Detention Pond Maintenance', true);

-- ─── SERVICE VISITS (crew schedule) ──────────────────────────────────────────

insert into service_visits (id, contract_id, scheduled_date, status, crew_notes, completed_at) values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', '2026-06-02', 'completed', 'Standard mow and edge — all areas', '2026-06-02 14:00:00+00'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', '2026-06-09', 'completed', 'Trimmed hedges near main entrance', '2026-06-09 15:30:00+00'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', '2026-08-05', 'scheduled', null, null),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222202', '2026-06-03', 'completed', 'Retail frontage mowed', '2026-06-03 10:00:00+00'),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222204', '2026-06-04', 'completed', 'Extra time on pond area — costs running high', '2026-06-04 16:00:00+00'),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222203', '2026-08-06', 'scheduled', null, null),
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222202', '2026-08-07', 'scheduled', null, null),
  ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222205', '2026-06-10', 'completed', 'Fixed zone 3 low pressure — courtyard beds', '2026-06-10 11:30:00+00'),
  ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222205', '2026-08-12', 'scheduled', null, null),
  ('33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222206', '2026-06-11', 'completed', 'North island mowed and edged', '2026-06-11 13:00:00+00'),
  ('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222206', '2026-08-13', 'scheduled', null, null);

-- ─── VISIT COSTS (labor, materials, equipment) ───────────────────────────────

insert into visit_costs (visit_id, cost_type, description, amount, quantity) values
  ('33333333-3333-3333-3333-333333333301', 'labor', '2 crew members x 3 hours', 180.00, 6),
  ('33333333-3333-3333-3333-333333333301', 'equipment', 'Mower and edger usage', 45.00, 1),
  ('33333333-3333-3333-3333-333333333302', 'labor', '2 crew members x 2.5 hours', 150.00, 5),
  ('33333333-3333-3333-3333-333333333304', 'labor', '3 crew members x 4 hours', 360.00, 12),
  ('33333333-3333-3333-3333-333333333304', 'materials', 'Fertilizer application', 85.00, 1),
  ('33333333-3333-3333-3333-333333333305', 'labor', '4 crew members x 5 hours', 600.00, 20),
  ('33333333-3333-3333-3333-333333333305', 'equipment', 'Extended equipment rental', 120.00, 1),
  ('33333333-3333-3333-3333-333333333305', 'materials', 'Pond treatment chemicals', 95.00, 1),
  ('33333333-3333-3333-3333-333333333308', 'labor', '1 tech x 2 hours', 90.00, 2),
  ('33333333-3333-3333-3333-333333333308', 'materials', 'Replacement sprinkler heads', 48.00, 4),
  ('33333333-3333-3333-3333-333333333310', 'labor', '2 crew members x 2 hours', 120.00, 4);

-- ─── EXTRA WORK ORDERS (outside original contract) ───────────────────────────

insert into extra_work_orders (id, contract_id, title, description, quoted_amount, status, approved_at) values
  ('44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201', 'Mulch Installation — Entrance Beds', 'Customer requested 12 yards of premium mulch for front entrance beds.', 1850.00, 'approved', '2026-05-20 10:00:00+00'),
  ('44444444-4444-4444-4444-444444444403', '22222222-2222-2222-2222-222222222205', 'Leak repair — Zone 3 main line', 'Emergency repair quote after pressure drop in courtyard irrigation.', 620.00, 'quoted', null),
  ('44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222203', 'Storm Damage Cleanup', 'Quoted for fallen branch removal after May storm.', 950.00, 'quoted', null);

-- ─── INVOICES & LINE ITEMS ───────────────────────────────────────────────────
-- Story: Riverside has open June invoice w/ extra work | Metro is 90+ days overdue

insert into invoices (id, contract_id, customer_id, invoice_number, issue_date, due_date, status, subtotal, total, amount_paid) values
  ('55555555-5555-5555-5555-555555555501', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'INV-0001', '2026-05-01', '2026-05-31', 'paid', 2400.00, 2400.00, 2400.00),
  ('55555555-5555-5555-5555-555555555502', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'INV-0002', '2026-06-01', '2026-07-01', 'sent', 4250.00, 4250.00, 0.00),
  ('55555555-5555-5555-5555-555555555506', '22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111101', 'INV-0006', '2026-06-01', '2026-07-01', 'sent', 650.00, 650.00, 0.00),
  ('55555555-5555-5555-5555-555555555507', '22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111101', 'INV-0007', '2026-06-01', '2026-07-01', 'sent', 900.00, 900.00, 0.00),
  ('55555555-5555-5555-5555-555555555503', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'INV-0003', '2026-06-01', '2026-07-01', 'paid', 3200.00, 3200.00, 3200.00),
  ('55555555-5555-5555-5555-555555555504', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111104', 'INV-0004', '2026-04-01', '2026-05-01', 'overdue', 4500.00, 4500.00, 0.00),
  ('55555555-5555-5555-5555-555555555505', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', 'INV-0005', '2026-07-01', '2026-07-15', 'sent', 1800.00, 1800.00, 900.00);

insert into invoice_lines (invoice_id, description, amount, line_type) values
  ('55555555-5555-5555-5555-555555555501', 'Monthly maintenance — Riverside (May 2026)', 2400.00, 'recurring'),
  ('55555555-5555-5555-5555-555555555502', 'Monthly maintenance — Riverside (June 2026)', 2400.00, 'recurring'),
  ('55555555-5555-5555-5555-555555555502', 'Extra work: Mulch Installation — Entrance Beds', 1850.00, 'extra_work'),
  ('55555555-5555-5555-5555-555555555506', 'Irrigation monitoring — Riverside (June 2026)', 650.00, 'recurring'),
  ('55555555-5555-5555-5555-555555555507', 'Parking lot islands — Riverside (June 2026)', 900.00, 'recurring'),
  ('55555555-5555-5555-5555-555555555503', 'Monthly maintenance — Summit Retail (June 2026)', 3200.00, 'recurring'),
  ('55555555-5555-5555-5555-555555555504', 'Monthly maintenance — Metro Industrial (April 2026)', 4500.00, 'recurring'),
  ('55555555-5555-5555-5555-555555555505', 'Monthly maintenance — Harbor View HOA (July 2026)', 1800.00, 'recurring');

-- ─── PAYMENTS (simulated) ────────────────────────────────────────────────────

insert into payments (invoice_id, amount, payment_date, payment_method, notes) values
  ('55555555-5555-5555-5555-555555555501', 2400.00, '2026-05-28', 'simulated_ach', 'On-time payment'),
  ('55555555-5555-5555-5555-555555555503', 3200.00, '2026-06-15', 'simulated_check', 'Received by mail'),
  ('55555555-5555-5555-5555-555555555505', 900.00, '2026-07-10', 'simulated_check', 'Partial payment — balance remaining');

-- ─── SUPPORT REQUESTS (Riverside customer portal demo) ─────────────────────

insert into support_requests (customer_id, category, message, linked_type, linked_id, status, resolution_notes, created_at) values
  ('11111111-1111-1111-1111-111111111101', 'question', 'Can you confirm the irrigation visit schedule for July?', 'contract', '22222222-2222-2222-2222-222222222205', 'Resolved', 'We confirmed your irrigation schedule for July and emailed Maria Chen the visit dates (weekly zones on Tuesdays).', '2026-06-15 14:00:00+00'),
  -- Open requests should not include resolution notes until management resolves them
  ('11111111-1111-1111-1111-111111111101', 'billing_dispute', 'Please review the mulch line item on INV-0002.', 'invoice', '55555555-5555-5555-5555-555555555502', 'Open', null, '2026-07-02 10:30:00+00');
