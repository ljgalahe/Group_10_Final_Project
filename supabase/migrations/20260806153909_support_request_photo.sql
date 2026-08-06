-- Optional photo attachment on customer Contact Us support requests
alter table public.support_requests
  add column if not exists photo_path text;

-- Public bucket so customers/ops can view uploaded issue photos via public URL
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-photos',
  'support-photos',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read support photos" on storage.objects;
create policy "Public read support photos"
  on storage.objects for select
  to public
  using (bucket_id = 'support-photos');

drop policy if exists "Authenticated upload support photos" on storage.objects;
create policy "Authenticated upload support photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'support-photos');

drop policy if exists "Authenticated update support photos" on storage.objects;
create policy "Authenticated update support photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'support-photos')
  with check (bucket_id = 'support-photos');

-- Demo / service-role path may use anon key with elevated client in app;
-- allow anon insert for demo Contact Us uploads when using anon client.
drop policy if exists "Anon upload support photos" on storage.objects;
create policy "Anon upload support photos"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'support-photos');
