-- Backfill statuses and add activity audit trail

UPDATE invoices SET status = 'past_due' WHERE status = 'overdue';
UPDATE invoices SET status = 'partially_paid'
  WHERE amount_paid > 0 AND amount_paid < total AND status NOT IN ('voided', 'draft', 'approved');

CREATE TABLE IF NOT EXISTS invoice_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_activity_invoice ON invoice_activity(invoice_id);

ALTER TABLE invoice_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo anon read invoice_activity" ON invoice_activity FOR SELECT TO anon USING (true);
CREATE POLICY "Demo anon insert invoice_activity" ON invoice_activity FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow read invoice_activity" ON invoice_activity FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff write invoice_activity" ON invoice_activity FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

INSERT INTO invoice_activity (invoice_id, action, details, created_at)
SELECT id, 'Invoice created', 'Initial invoice generated from contract terms', created_at
FROM invoices
WHERE NOT EXISTS (SELECT 1 FROM invoice_activity ia WHERE ia.invoice_id = invoices.id);

INSERT INTO invoice_activity (invoice_id, action, details, created_at)
SELECT invoice_id, 'Payment recorded', 'Payment of $' || amount::text || ' via ' || payment_method, created_at
FROM payments
WHERE NOT EXISTS (
  SELECT 1 FROM invoice_activity ia
  WHERE ia.invoice_id = payments.invoice_id AND ia.action = 'Payment recorded'
    AND ia.details LIKE '%' || payments.amount::text || '%'
);
