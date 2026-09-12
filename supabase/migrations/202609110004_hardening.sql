alter table households add constraint valid_interests check(interests<@array['coffee','walks','food','games','outdoors','culture','playground','exercise']);
alter table households add constraint valid_children check(child_ages<@array['0–1','2–3','4–6','7–10','11–14','15–17']);
alter table households add constraint valid_languages check(cardinality(languages) between 1 and 10 and length(array_to_string(languages,','))<=100);
alter table households add constraint valid_preferred_kinds check(preferred_kinds<@array['couple','family','single_parent']);
alter table availability add constraint valid_availability_activity check(activity in ('coffee','walks','food','games','outdoors','culture','playground','exercise'));
alter table events add constraint valid_event_activity check(activity in ('coffee','walks','food','games','outdoors','culture','playground','exercise'));
create index on audit_events(user_id,created_at);
create index on notification_outbox(next_attempt_at) where sent_at is null;
create index on household_members(user_id,household_id);

-- Resolve a push target through current RLS. Expired/revoked resources return null.
create function public.resolve_notification(p_kind text,p_reference uuid) returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 select case p_kind
 when 'message' then (select jsonb_build_object('kind','conversation','id',conversation_id) from messages where id=p_reference)
 when 'contact' then (select jsonb_build_object('kind','inbox') from contacts where id=p_reference)
 when 'attendance' then (select jsonb_build_object('kind','event','id',event_id) from attendance where id=p_reference and household_id=my_household())
 when 'reminder' then (select jsonb_build_object('kind','event','id',id) from events where id=p_reference and status='active' and starts_at>now())
 when 'availability' then (select jsonb_build_object('kind','household','id',household_id) from availability where id=p_reference)
 else null end
$$;
create function public.conversation_history(p_conversation uuid,p_before_time timestamptz default null,p_before_id uuid default null) returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(to_jsonb(m)||jsonb_build_object('image_path',case when can_read_media(m.image_path) then m.image_path end,'reactions',coalesce((select jsonb_object_agg(emoji,users) from (select emoji,jsonb_agg(user_id) users from message_reactions where message_id=m.id group by emoji) r),'{}'))),'[]')
 from (select * from messages where conversation_id=p_conversation and (p_before_time is null or (created_at,id)<(p_before_time,p_before_id)) order by created_at desc,id desc limit 50) m
$$;
revoke execute on function resolve_notification(text,uuid),conversation_history(uuid,timestamptz,uuid) from public,anon;
grant execute on function resolve_notification(text,uuid),conversation_history(uuid,timestamptz,uuid) to authenticated;
