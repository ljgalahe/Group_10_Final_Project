-- Expand inquiry service options to match featured commercial services.
alter table public.inquiries
  drop constraint if exists inquiries_services_valid;

alter table public.inquiries
  add constraint inquiries_services_valid check (
    services_interested <@ array[
      'lawn_mowing_edging',
      'flower_beds_seasonal',
      'sprinkler_watering',
      'tree_bush_trimming',
      'mulch_landscape_beds',
      'sidewalk_parking_cleanup',
      'leaf_debris_removal',
      'snow_ice_clearing',
      -- legacy demo values
      'mowing',
      'irrigation',
      'seasonal_color',
      'snow_removal',
      'other'
    ]::text[]
  );
