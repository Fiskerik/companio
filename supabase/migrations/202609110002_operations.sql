alter table households add column suspended boolean not null default false;
create table public.content_rules(pattern text primary key,enabled boolean not null default true);
insert into content_rules(pattern) values ('(sexträff|sextraff|swinger|escort service|send nudes)'),('(https?://[^[:space:]]+[[:space:]]*){4,}');
alter table content_rules enable row level security;
create function public.filter_content() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare content text;begin
 content:=concat_ws(' ',to_jsonb(new)->>'body',to_jsonb(new)->>'bio',to_jsonb(new)->>'greeting',to_jsonb(new)->>'description',to_jsonb(new)->>'title',to_jsonb(new)->>'name',to_jsonb(new)->>'practical');
 if exists(select 1 from content_rules where enabled and content~*pattern) then raise exception 'CONTENT_REVIEW'; end if;
 return new;
end $$;
create trigger filter_message before insert or update on messages for each row execute function filter_content();
create trigger filter_profile before insert or update on profiles for each row execute function filter_content();
create trigger filter_household before insert or update on households for each row execute function filter_content();
create trigger filter_contact before insert or update on contacts for each row execute function filter_content();
create trigger filter_event before insert or update on events for each row execute function filter_content();
create trigger filter_group before insert or update on groups for each row execute function filter_content();

create or replace function public.can_see_household(h uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select is_adult() and my_household() is not null and not blocked(my_household(),h) and exists(select 1 from households where id=h and (not suspended or id=my_household()))
$$;
create function public.nearby_household(h uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from households me join households other on other.id=h where me.id=my_household() and 6371*2*asin(least(1.0,sqrt(power(sin(radians(other.latitude-me.latitude)/2),2)+cos(radians(me.latitude))*cos(radians(other.latitude))*power(sin(radians(other.longitude-me.longitude)/2),2))))<=me.radius_km)
$$;
drop policy availability_read on availability;
create policy availability_read on availability for select to authenticated using(can_see_household(household_id) and ends_at>now() and (household_id=my_household() or matched(my_household(),household_id) or (visibility='nearby' and nearby_household(household_id))));

create table public.storage_deletion_queue(path text primary key,created_at timestamptz not null default now());
alter table storage_deletion_queue enable row level security;
create function public.queue_media_deletion() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ begin insert into storage_deletion_queue(path) values(old.path) on conflict do nothing;return old;end $$;
create trigger queue_media_deletion after delete on media for each row execute function queue_media_deletion();

create function public.queue_message_notification() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare member record;previous text:=current_setting('request.jwt.claim.sub',true);begin
 for member in select user_id from household_members where user_id is distinct from new.author_id loop
  perform set_config('request.jwt.claim.sub',member.user_id::text,true);
  if can_read_message(new.id) and not exists(select 1 from conversation_preferences where user_id=member.user_id and conversation_id=new.conversation_id and muted) then
   insert into notification_outbox(user_id,kind,reference_id) values(member.user_id,'message',new.id) on conflict do nothing;
  end if;
 end loop;
 perform set_config('request.jwt.claim.sub',coalesce(previous,''),true);return new;
end $$;
create trigger queue_message_notification after insert on messages for each row execute function queue_message_notification();
create function public.queue_contact_notification() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ begin
 insert into notification_outbox(user_id,kind,reference_id) select user_id,'contact',new.id from household_members where household_id=new.to_household on conflict do nothing;return new;end $$;
create trigger queue_contact_notification after insert on contacts for each row execute function queue_contact_notification();
create function public.queue_attendance_notification() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if tg_op='UPDATE' and new.status=old.status then return new;end if;
 if new.status in ('accepted','waitlist','pending') then
  insert into notification_outbox(user_id,kind,reference_id) select user_id,'attendance',new.id from household_members where household_id=new.household_id on conflict(user_id,kind,reference_id) do update set sent_at=null,attempts=0,next_attempt_at=now();
 end if;return new;end $$;
create trigger queue_attendance_notification after insert or update on attendance for each row execute function queue_attendance_notification();

create function public.push_batch() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare n notification_outbox;previous text:=current_setting('request.jwt.claim.sub',true);ok boolean;result jsonb:='[]';begin
 -- Called only by the server worker. Revalidate permissions immediately before dispatch.
 insert into notification_outbox(user_id,kind,reference_id)
 select hm.user_id,'reminder',e.id from events e join attendance a on a.event_id=e.id and a.status='accepted' join household_members hm on hm.household_id=a.household_id
 where e.status='active' and e.starts_at>now() and e.starts_at<=now()+interval '2 hours' on conflict do nothing;
 for n in select * from notification_outbox where sent_at is null and next_attempt_at<=now() and attempts<8 order by created_at for update skip locked limit 50 loop
  perform set_config('request.jwt.claim.sub',n.user_id::text,true);
  ok:=case n.kind
   when 'message' then can_read_message(n.reference_id) and not exists(select 1 from messages m join conversation_preferences cp on cp.conversation_id=m.conversation_id where m.id=n.reference_id and cp.user_id=n.user_id and cp.muted)
   when 'availability' then exists(select 1 from availability a join favorites f on f.target_id=a.household_id where a.id=n.reference_id and a.ends_at>now() and f.household_id=my_household() and f.notify and matched(my_household(),a.household_id))
   when 'attendance' then exists(select 1 from attendance a where a.id=n.reference_id and a.household_id=my_household() and a.status in ('accepted','pending','waitlist') and can_see_event(a.event_id))
   when 'reminder' then exists(select 1 from events e join attendance a on a.event_id=e.id where e.id=n.reference_id and e.starts_at>now() and e.status='active' and a.household_id=my_household() and a.status='accepted' and can_see_event(e.id))
   when 'contact' then exists(select 1 from contacts where id=n.reference_id and to_household=my_household() and status='pending' and not blocked(from_household,to_household))
   else false end;
  if not ok then update notification_outbox set sent_at=now() where id=n.id;continue;end if;
  update notification_outbox set attempts=attempts+1,next_attempt_at=now()+interval '5 minutes' where id=n.id;
  result:=result||jsonb_build_array(jsonb_build_object('id',n.id,'kind',n.kind,'reference_id',n.reference_id,'tokens',coalesce((select jsonb_agg(jsonb_build_object('token',token,'platform',platform)) from device_tokens where user_id=n.user_id),'[]')));
 end loop;
 perform set_config('request.jwt.claim.sub',coalesce(previous,''),true);return result;
end $$;
create function public.push_ack(p_id uuid) returns void language sql security definer set search_path=public,pg_temp as $$ update notification_outbox set sent_at=now() where id=p_id $$;

create function public.export_my_data() returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object('exported_at',now(),'adult',(select to_jsonb(p) from profiles p where id=auth.uid()),
 'household',(select to_jsonb(h) from households h where id=my_household()),'favorites',coalesce((select jsonb_agg(f) from favorites f),'[]'),
 'my_messages',coalesce((select jsonb_agg(m) from messages m where author_id=auth.uid()),'[]'),'my_reports',coalesce((select jsonb_agg(r) from reports r where reporter_id=auth.uid()),'[]'),
 'availability',coalesce((select jsonb_agg(a) from availability a where household_id=my_household()),'[]'),'attendance',coalesce((select jsonb_agg(a) from attendance a where household_id=my_household()),'[]'),
 'feedback',coalesce((select jsonb_agg(f) from event_feedback f),'[]'),'group_memberships',coalesce((select jsonb_agg(g) from group_members g where household_id=my_household()),'[]'),
 'contacts',coalesce((select jsonb_agg(c) from contacts c),'[]'),'conversation_preferences',coalesce((select jsonb_agg(p) from conversation_preferences p),'[]'))
$$;

create table public.moderation_actions(id uuid primary key default gen_random_uuid(),moderator_id uuid references profiles on delete set null,report_id uuid references reports,action text not null,created_at timestamptz not null default now());
alter table moderation_actions enable row level security;
create function public.moderate_report(p_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$ declare r reports;begin
 if not is_moderator() then raise exception 'MODERATOR_REQUIRED';end if;
 select * into r from reports where id=p_id for update;if r.id is null then raise exception 'NOT_AVAILABLE';end if;
 case r.target_type
 when 'household' then update households set suspended=true where id=r.target_id;
 when 'message' then delete from messages where id=r.target_id;
 when 'event' then update events set status='cancelled' where id=r.target_id;
 when 'group' then delete from groups where id=r.target_id;
 end case;
 update reports set status='resolved' where id=p_id;
 insert into moderation_actions(moderator_id,report_id,action) values(auth.uid(),p_id,'remove_or_suspend');
end $$;

revoke execute on function filter_content(),nearby_household(uuid),queue_media_deletion(),queue_message_notification(),queue_contact_notification(),queue_attendance_notification(),push_batch(),push_ack(uuid),export_my_data(),moderate_report(uuid) from public,anon,authenticated;
grant execute on function nearby_household(uuid),export_my_data(),moderate_report(uuid) to authenticated;
grant execute on function push_batch(),push_ack(uuid) to service_role;
grant all on storage_deletion_queue,notification_outbox,device_tokens,content_rules,moderation_actions to service_role;

create view public.pilot_metrics with (security_invoker=true) as
 select h.kind,count(distinct h.id) as households,count(distinct h.id) filter(where f.happened) as households_reporting_meetup,count(distinct h.id) filter(where f.again) as households_wanting_another
 from households h left join household_members hm on hm.household_id=h.id left join event_feedback f on f.user_id=hm.user_id group by h.kind;
revoke all on pilot_metrics from anon,authenticated;
grant select on pilot_metrics to service_role;
