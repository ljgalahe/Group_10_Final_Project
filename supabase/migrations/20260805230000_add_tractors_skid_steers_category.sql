-- Add Tractors/skid steers equipment category
alter type equipment_category add value if not exists 'Tractors/skid steers' before 'Irrigation tools';
