-- Step 2 of restore: reclassify demo hand tools (after enum value is committed).
update equipment
set category = 'Hand/power tools'
where id in (
  '66666666-6666-6666-6666-666666666606',
  '66666666-6666-6666-6666-666666666607'
)
and category = 'Other';
