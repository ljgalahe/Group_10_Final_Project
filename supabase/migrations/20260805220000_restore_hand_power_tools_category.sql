-- Step 1 of restore: add enum value (must commit before use).
alter type equipment_category add value if not exists 'Hand/power tools' before 'Other';
