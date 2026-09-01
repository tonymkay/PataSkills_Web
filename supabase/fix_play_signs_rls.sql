-- 1. Drop any restrictive unique constraint on image_path (so signs can be freely swapped/assigned)
alter table play_signs drop constraint if exists play_signs_image_path_key;

-- 2. Enable RLS on play_signs
alter table play_signs enable row level security;

-- 3. Drop any old/partial policies
drop policy if exists "allow anon update on play_signs" on play_signs;
drop policy if exists "public read play_signs" on play_signs;
drop policy if exists "allow all on play_signs" on play_signs;

-- 4. Create full permissions policy (SELECT, INSERT, UPDATE, DELETE) for anon + authenticated on play_signs
create policy "allow all on play_signs"
  on play_signs
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- 5. Allow uploading images to play-assets storage bucket
create policy "allow public upload to play-assets"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'play-assets');

create policy "allow public update to play-assets"
  on storage.objects
  for update
  to anon, authenticated
  using (bucket_id = 'play-assets')
  with check (bucket_id = 'play-assets');


