-- Split Tractors/skid steers into separate categories

alter type equipment_category add value if not exists 'Tractors' before 'Irrigation tools';
alter type equipment_category add value if not exists 'Skid steers' before 'Irrigation tools';
