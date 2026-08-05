-- Optional manager notes visible to the customer when they open a request
alter table support_requests
  add column if not exists resolution_notes text;
