-- GreenScape Commercial Services — demo seed data
-- Safe to re-run: clears demo records first, then reloads.
-- Run in Supabase SQL Editor AFTER initial_schema migration.

-- Customer portal "View as: Customer" uses Riverside Office Park:
--   11111111-1111-1111-1111-111111111101

-- Clear demo data (child tables first)
delete from equipment_usage;
delete from equipment;
delete from payments;
delete from invoice_lines;
delete from invoices;
do $$ begin
  delete from visit_labor_entries;
exception
  when undefined_table then null;
end $$;
delete from visit_costs;
delete from service_visits;
delete from extra_work_orders;
delete from contract_services;
delete from support_requests;
delete from customer_payment_methods;
delete from contracts;
delete from customers;

-- ─── CUSTOMERS (4 commercial properties) ───────────────────────────────────

insert into customers (id, name, property_type, address, contact_name, contact_email, contact_phone, created_at, notification_prefs, customer_notes) values
  ('11111111-1111-1111-1111-111111111101', 'Riverside Office Park', 'Office Park', '1200 University Ave, Oxford, MS', 'Maria Chen', 'mchen@riverside-op.com', '(662) 555-0142', '2023-03-15 10:00:00+00',
    '{"invoice_reminders":{"enabled":true,"channel":"email","email":"mchen@riverside-op.com","phone":"(662) 555-0142"},"visit_reminders":{"enabled":true,"channel":"email","email":"mchen@riverside-op.com","phone":"(662) 555-0142"},"support_updates":{"enabled":true,"channel":"email","email":"mchen@riverside-op.com","phone":"(662) 555-0142"},"renewal_notices":{"enabled":false,"channel":"email","email":"mchen@riverside-op.com","phone":"(662) 555-0142"}}'::jsonb,
    E'Office park has a security dog that barks at crews near the rear lot — do not approach the fenced kennel area.\nPark trailers only in the designated service bay; front entrance must stay clear for tenants.'),
  ('11111111-1111-1111-1111-111111111102', 'Summit Retail Center', 'Retail Center', '450 Jackson Ave W, Oxford, MS', 'James Ortiz', 'jortiz@summitretail.com', null, '2024-01-10 10:00:00+00', '{}'::jsonb,
    E'Retail center: avoid leaf blowing near storefronts before 9:00 AM.\nIrrigation controller is inside the locked utility closet — key is in the crew lockbox.'),
  ('11111111-1111-1111-1111-111111111103', 'Harbor View HOA', 'HOA', '88 South Lamar Blvd, Oxford, MS', 'Pat Simmons', 'psimmons@harborviewhoa.org', null, '2024-06-01 10:00:00+00', '{}'::jsonb,
    E'HOA common areas: resident owns a dog that may bite if the side gate is left open — keep gate latched.\nDo not mow within 3 feet of playground equipment during school pickup hours.'),
  ('11111111-1111-1111-1111-111111111104', 'Metro Industrial Complex', 'Industrial', '900 Molly Barr Rd, Oxford, MS', 'Dana Brooks', 'dbrooks@metroindustrial.com', null, '2025-02-20 10:00:00+00', '{}'::jsonb,
    E'Industrial site: PPE required (vest + boots). Check in at the guard booth before entering.\nDetention pond bank can be slick after rain — use caution and avoid lone work near the edge.');

-- ─── CUSTOMER PAYMENT METHODS (Riverside portal defaults) ────────────────────

insert into customer_payment_methods (customer_id, nickname, display_label, method_type, is_default, last_four, expires_month, expires_year, billing_name) values
  ('11111111-1111-1111-1111-111111111101', null, 'Card ending in 4242', 'card', true, '4242', 8, 2027, 'Maria Chen'),
  ('11111111-1111-1111-1111-111111111101', null, 'Bank account ending in 8821', 'bank', false, '8821', null, null, 'Riverside Office Park');

-- ─── CONTRACTS (seasonal maintenance agreements) ───────────────────────────

insert into contracts (id, customer_id, title, status, season_start, season_end, monthly_fee, visits_per_week, billing_method, notes, assigned_crew, account_manager, renewal_date) values
  -- Riverside: only Grounds is near end (within 45 days as of ~Aug 2026); others farther out
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', '2026 Grounds Maintenance — Riverside', 'active', '2026-04-01', '2026-09-15', 2400.00, 2, 'monthly', 'Includes spring cleanup and fall leaf removal.', 'Crew A', 'Alex Rivera', '2026-11-30'),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111101', '2026 Irrigation Monitoring — Riverside', 'active', '2026-04-01', '2026-10-31', 650.00, 1, 'monthly', 'Weekly system checks and minor head adjustments. Major repairs billed separately.', 'Crew A', 'Alex Rivera', '2026-11-30'),
  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111101', '2026 Parking Lot Islands — Riverside', 'active', '2026-05-01', '2026-11-30', 900.00, 1, 'monthly', 'Shrub beds and tree rings in the north and south parking lots.', 'Crew A', 'Alex Rivera', '2026-11-30'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', '2026 Landscape Care — Summit Retail', 'active', '2026-04-01', '2026-10-15', 3200.00, 3, 'monthly', 'High-traffic retail center requires extra edging.', 'Crew B', 'Jordan Lee', '2026-11-30'),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', '2026 HOA Common Areas — Harbor View', 'active', '2026-04-01', '2026-11-01', 1800.00, 1, 'monthly', 'Common areas and entrance beds only.', 'Crew A', 'Alex Rivera', '2026-11-30'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111104', '2026 Industrial Grounds — Metro', 'active', '2026-04-01', '2026-12-15', 4500.00, 2, 'monthly', 'Large lot with detention pond maintenance.', 'Crew C', 'Sam Patel', '2026-11-30');

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

-- Stories:
--   INV-0001 fully paid (ACH)
--   INV-0003 fully paid (check)
--   INV-0005 partially paid with multiple payments (check + card)
--   INV-0006 canceled (cannot receive payments)
insert into invoices (id, contract_id, customer_id, invoice_number, issue_date, due_date, status, subtotal, total, amount_paid) values
  ('55555555-5555-5555-5555-555555555501', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'INV-0001', '2026-05-01', '2026-05-31', 'paid', 2400.00, 2400.00, 2400.00),
  ('55555555-5555-5555-5555-555555555502', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'INV-0002', '2026-06-01', '2026-07-01', 'sent', 4250.00, 4250.00, 0.00),
  ('55555555-5555-5555-5555-555555555506', '22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111101', 'INV-0006', '2026-06-01', '2026-07-01', 'sent', 650.00, 650.00, 0.00),
  ('55555555-5555-5555-5555-555555555507', '22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111101', 'INV-0007', '2026-06-01', '2026-07-01', 'sent', 900.00, 900.00, 0.00),
  ('55555555-5555-5555-5555-555555555503', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'INV-0003', '2026-06-01', '2026-07-01', 'paid', 3200.00, 3200.00, 3200.00),
  ('55555555-5555-5555-5555-555555555504', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111104', 'INV-0004', '2026-04-01', '2026-05-01', 'past_due', 4500.00, 4500.00, 0.00),
  ('55555555-5555-5555-5555-555555555505', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', 'INV-0005', '2026-07-01', '2026-07-15', 'partially_paid', 1800.00, 1800.00, 900.00),
  ('55555555-5555-5555-5555-555555555508', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'INV-0008', '2026-08-01', '2026-08-31', 'draft', 1200.00, 1200.00, 0.00),
  ('55555555-5555-5555-5555-555555555509', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'INV-0009', '2026-08-01', '2026-08-31', 'approved', 3200.00, 3200.00, 0.00);

insert into invoice_lines (invoice_id, description, amount, line_type) values
  ('55555555-5555-5555-5555-555555555501', 'Monthly maintenance — Riverside (May 2026)', 2400.00, 'recurring'),
  ('55555555-5555-5555-5555-555555555502', 'Monthly maintenance — Riverside (June 2026)', 2400.00, 'recurring'),
  ('55555555-5555-5555-5555-555555555502', 'Extra work: Mulch Installation — Entrance Beds', 1850.00, 'extra_work'),
  ('55555555-5555-5555-5555-555555555506', 'Irrigation monitoring — Riverside (June 2026)', 650.00, 'recurring'),
  ('55555555-5555-5555-5555-555555555507', 'Parking lot islands — Riverside (June 2026)', 900.00, 'recurring'),
  ('55555555-5555-5555-5555-555555555503', 'Monthly maintenance — Summit Retail (June 2026)', 3200.00, 'recurring'),
  ('55555555-5555-5555-5555-555555555504', 'Monthly maintenance — Metro Industrial (April 2026)', 4500.00, 'recurring'),
  ('55555555-5555-5555-5555-555555555505', 'Monthly maintenance — Harbor View HOA (July 2026)', 1800.00, 'recurring'),
  ('55555555-5555-5555-5555-555555555508', 'Seasonal bed prep — Riverside (August 2026)', 1200.00, 'extra_work'),
  ('55555555-5555-5555-5555-555555555509', 'Monthly maintenance — Summit Retail (August 2026)', 3200.00, 'recurring');

-- ─── PAYMENTS (simulated) ────────────────────────────────────────────────────
-- Demonstrates: full ACH, full check, multi-payment partial (check + card)
insert into payments (payment_number, invoice_id, customer_id, amount, applied_amount, unapplied_amount, payment_date, payment_method, notes) values
  ('CR-0001', '55555555-5555-5555-5555-555555555501', '11111111-1111-1111-1111-111111111101', 2400.00, 2400.00, 0, '2026-05-28', 'simulated_ach', 'On-time payment'),
  ('CR-0002', '55555555-5555-5555-5555-555555555503', '11111111-1111-1111-1111-111111111102', 3200.00, 3200.00, 0, '2026-06-15', 'simulated_check', 'Received by mail'),
  ('CR-0003', '55555555-5555-5555-5555-555555555505', '11111111-1111-1111-1111-111111111103', 900.00, 900.00, 0, '2026-07-10', 'simulated_check', 'Partial payment — balance remaining');

-- ─── SUPPORT REQUESTS (Riverside customer portal demo) ─────────────────────

insert into support_requests (customer_id, category, message, linked_type, linked_id, status, resolution_notes, created_at) values
  ('11111111-1111-1111-1111-111111111101', 'question', 'Can you confirm the irrigation visit schedule for July?', 'contract', '22222222-2222-2222-2222-222222222205', 'Resolved', 'We confirmed your irrigation schedule for July and emailed Maria Chen the visit dates (weekly zones on Tuesdays).', '2026-06-15 14:00:00+00'),
  -- Open requests should not include resolution notes until management resolves them
  ('11111111-1111-1111-1111-111111111101', 'billing_dispute', 'Please review the mulch line item on INV-0002.', 'invoice', '55555555-5555-5555-5555-555555555502', 'Open', null, '2026-07-02 10:30:00+00'),
  -- Field requests visible to Crew Lead (questions / concerns / complaints)
  ('11111111-1111-1111-1111-111111111102', 'concern', 'Gate code at the north entrance was changed — crews need the updated code before the next mow.', 'contract', '22222222-2222-2222-2222-222222222202', 'Open', null, '2026-08-01 15:20:00+00'),
  ('11111111-1111-1111-1111-111111111103', 'complaint', 'Edging along the front walk was missed on the last visit. Please correct on the next stop.', 'contract', '22222222-2222-2222-2222-222222222203', 'In Progress', null, '2026-08-03 11:05:00+00');

-- --- EQUIPMENT (fixed assets - unit of production) -------------------------

insert into equipment (id, name, category, purchase_date, cost, salvage_value, useful_life_years, useful_life_months, estimated_total_hours, status, notes) values
  ('66666666-6666-6666-6666-666666666601', 'Exmark Lazer Z X-Series', 'Mowers', '2023-03-15', 14500.00, 2500.00, 5, 0, 4000, 'active', 'Primary commercial zero-turn'),
  ('66666666-6666-6666-6666-666666666602', 'Toro Groundsmaster 4000', 'Mowers', '2022-04-01', 22000.00, 4000.00, 6, 0, 5000, 'active', 'Wide-area mower for large lots'),
  ('66666666-6666-6666-6666-666666666603', 'Ford F-250 Crew Cab', 'Trucks/Trailers', '2021-09-10', 48500.00, 12000.00, 8, 0, 8000, 'active', 'Main crew transport'),
  ('66666666-6666-6666-6666-666666666604', '16ft Landscape Trailer', 'Trailers', '2022-11-20', 6200.00, 800.00, 10, 0, 6000, 'active', 'Hauls mowers and materials'),
  ('66666666-6666-6666-6666-666666666605', 'Hunter ICC2 Irrigation Controller Kit', 'Irrigation tools', '2024-02-01', 1850.00, 200.00, 4, 6, 1500, 'active', 'Controller + diagnostic kit'),
  ('66666666-6666-6666-6666-666666666606', 'Stihl BR 800 X Backpack Blower', 'Hand/power tools', '2023-06-01', 780.00, 100.00, 3, 0, 1200, 'active', null),
  ('66666666-6666-6666-6666-666666666607', 'Echo SRM-2620T Trimmer Pair', 'Hand/power tools', '2024-03-12', 520.00, 50.00, 2, 6, 900, 'active', 'Two-pack for crews'),
  ('66666666-6666-6666-6666-666666666608', 'Older Walk-Behind Mower', 'Mowers', '2018-05-01', 3200.00, 200.00, 5, 0, 2500, 'retired', 'Retired — parts donor');

update equipment set retired_at = '2025-11-01' where id = '66666666-6666-6666-6666-666666666608';

insert into equipment_usage (equipment_id, visit_id, hours, used_on, notes) values
  ('66666666-6666-6666-6666-666666666601', '33333333-3333-3333-3333-333333333301', 3.0, '2026-06-02', 'Riverside grounds mow'),
  ('66666666-6666-6666-6666-666666666606', '33333333-3333-3333-3333-333333333301', 1.5, '2026-06-02', 'Blow-off after mow'),
  ('66666666-6666-6666-6666-666666666601', '33333333-3333-3333-3333-333333333302', 2.0, '2026-06-09', 'Entrance hedge support'),
  ('66666666-6666-6666-6666-666666666607', '33333333-3333-3333-3333-333333333302', 2.5, '2026-06-09', 'Trimming'),
  ('66666666-6666-6666-6666-666666666602', '33333333-3333-3333-3333-333333333304', 4.0, '2026-06-03', 'Summit retail frontage'),
  ('66666666-6666-6666-6666-666666666603', '33333333-3333-3333-3333-333333333304', 4.0, '2026-06-03', 'Crew transport'),
  ('66666666-6666-6666-6666-666666666604', '33333333-3333-3333-3333-333333333304', 4.0, '2026-06-03', 'Equipment haul'),
  ('66666666-6666-6666-6666-666666666602', '33333333-3333-3333-3333-333333333305', 5.0, '2026-06-04', 'Metro industrial lot'),
  ('66666666-6666-6666-6666-666666666603', '33333333-3333-3333-3333-333333333305', 5.5, '2026-06-04', 'Extended day'),
  ('66666666-6666-6666-6666-666666666605', '33333333-3333-3333-3333-333333333308', 2.0, '2026-06-10', 'Zone 3 diagnostics'),
  ('66666666-6666-6666-6666-666666666601', '33333333-3333-3333-3333-333333333310', 2.0, '2026-06-11', 'North island mow'),
  ('66666666-6666-6666-6666-666666666606', '33333333-3333-3333-3333-333333333310', 1.0, '2026-06-11', 'Cleanup blow');
