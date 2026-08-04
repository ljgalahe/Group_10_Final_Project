-- Allow invoices to be marked disputed after a billing dispute support request
alter type invoice_status add value if not exists 'disputed';
