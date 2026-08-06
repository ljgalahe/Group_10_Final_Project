-- Hand/power tools are not depreciated and have no useful life tracking.
update equipment
set
  salvage_value = 0,
  estimated_total_hours = 1,
  useful_life_years = 0,
  useful_life_months = 1
where category = 'Hand/power tools';
