-- Add new invoice_status enum values (must commit before using them)

ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'partially_paid';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'past_due';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'voided';
