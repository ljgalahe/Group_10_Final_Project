-- Retire Hand/power tools category: move assets to Other, recreate enum without it.

alter table equipment
  alter column category type text
  using category::text;

update equipment
set category = 'Other'
where category = 'Hand/power tools';

drop type equipment_category;

create type equipment_category as enum (
  'Mowers',
  'Trucks',
  'Trailers',
  'Irrigation tools',
  'Other'
);

alter table equipment
  alter column category type equipment_category
  using category::equipment_category;
