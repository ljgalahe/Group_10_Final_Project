-- Expand inquiry property types for hospitality and institutional campuses.
alter table public.inquiries
  drop constraint if exists inquiries_property_type_check;

alter table public.inquiries
  add constraint inquiries_property_type_check
  check (
    property_type in (
      'office_park',
      'retail_center',
      'hospitality',
      'institutional',
      'industrial',
      'multifamily',
      'other'
    )
  );
