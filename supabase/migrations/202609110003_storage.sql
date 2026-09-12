-- Supabase Storage-specific objects (the core DB tests use a small storage fixture).
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('media','media',false,5242880,array['image/jpeg'])
 on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg'];
create policy media_upload on storage.objects for insert to authenticated with check(bucket_id='media' and exists(select 1 from public.media m where m.path=name and m.owner_id=auth.uid() and m.status='pending'));
create policy media_download on storage.objects for select to authenticated using(bucket_id='media' and public.can_read_media(name));
-- No client UPDATE/DELETE: immutable uploads cannot replace an approved image.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
  alter publication supabase_realtime add table public.messages;
 end if;
end $$;
