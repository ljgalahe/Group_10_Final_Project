-- Cash receipt IDs and unapplied cash support

ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_number text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS applied_amount numeric(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS unapplied_amount numeric(10,2) NOT NULL DEFAULT 0;

ALTER TABLE payments ALTER COLUMN invoice_id DROP NOT NULL;

-- Backfill from linked invoices
UPDATE payments p
SET customer_id = i.customer_id,
    applied_amount = p.amount,
    unapplied_amount = 0
FROM invoices i
WHERE p.invoice_id = i.id AND p.customer_id IS NULL;

-- Assign cash receipt numbers
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM payments
  WHERE payment_number IS NULL
)
UPDATE payments p
SET payment_number = 'CR-' || LPAD(numbered.rn::text, 4, '0')
FROM numbered
WHERE p.id = numbered.id;

ALTER TABLE payments ALTER COLUMN payment_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_payment_number ON payments(payment_number);

-- Ensure applied_amount is set for existing rows
UPDATE payments SET applied_amount = amount WHERE applied_amount IS NULL AND invoice_id IS NOT NULL;
UPDATE payments SET applied_amount = 0 WHERE applied_amount IS NULL AND invoice_id IS NULL;
