-- Companio. Apply to a fresh Supabase project. No demo users are seeded here.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, name text not null check(length(name) between 1 and 60),
 locale text not null default 'sv' check(locale in ('sv','en')), avatar_path text, adult_confirmed_at timestamptz not null default now()
);
create table public.households (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('couple','family','single_parent','solo')),
 area text not null check(length(area) between 1 and 100), latitude double precision not null check(latitude between -90 and 90), longitude double precision not null check(longitude between -180 and 180),
 bio text not null default '' check(length(bio)<=600), interests text[] not null default '{}', languages text[] not null default '{sv}', child_ages text[] not null default '{}',
 child_mode text not null default 'either' check(child_mode in ('with','without','either')), radius_km integer not null default 30 check(radius_km between 1 and 300),
 preferred_kinds text[] not null default '{}', energy text not null default 'balanced' check(energy in ('quiet','balanced','lively')), created_at timestamptz not null default now()
);
create table public.household_members (household_id uuid not null references households on delete cascade, user_id uuid primary key references profiles on delete cascade, joined_at timestamptz not null default now());
create index on household_members(household_id);
create table public.blocks (household_id uuid references households on delete cascade, target_id uuid references households on delete cascade, primary key(household_id,target_id), check(household_id<>target_id));
create table public.contacts (
 id uuid primary key default gen_random_uuid(), from_household uuid not null references households on delete cascade, to_household uuid not null references households on delete cascade,
 greeting text not null check(length(greeting) between 1 and 500), status text not null default 'pending' check(status in ('pending','accepted','declined')), created_at timestamptz not null default now(), check(from_household<>to_household)
);
create unique index contact_pair on contacts(least(from_household,to_household),greatest(from_household,to_household));
create table public.favorites (household_id uuid references households on delete cascade, target_id uuid references households on delete cascade, notify boolean not null default false, primary key(household_id,target_id),check(household_id<>target_id));
create table public.availability (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references households on delete cascade, activity text not null check(length(activity) between 1 and 100),
 starts_at timestamptz not null, ends_at timestamptz not null, visibility text not null default 'matches' check(visibility in ('matches','nearby')),
 child_mode text not null check(child_mode in ('with','without','either')), adults integer not null default 1 check(adults between 1 and 2), check(ends_at>starts_at and ends_at<=starts_at+interval '24 hours')
);
create index on availability(ends_at,household_id);
create table public.groups (id uuid primary key default gen_random_uuid(), owner_household uuid not null references households on delete cascade, name text not null check(length(name) between 1 and 100), description text not null default '' check(length(description)<=1000), area text not null, approval boolean not null default false);
create table public.group_members (group_id uuid references groups on delete cascade, household_id uuid references households on delete cascade, status text not null default 'accepted' check(status in ('pending','accepted')), primary key(group_id,household_id));
create table public.events (
 id uuid primary key default gen_random_uuid(), host_household uuid not null references households on delete cascade, title text not null check(length(title) between 1 and 100), description text not null default '' check(length(description)<=2000),
 activity text not null, starts_at timestamptz not null, ends_at timestamptz not null, area text not null, latitude double precision not null check(latitude between -90 and 90), longitude double precision not null check(longitude between -180 and 180),
 visibility text not null default 'public' check(visibility in ('public','private')), child_mode text not null check(child_mode in ('with','without','either')), capacity integer not null check(capacity between 2 and 100),
 approval boolean not null default false, cost text not null default '' check(length(cost)<=200), practical text not null default '' check(length(practical)<=600), status text not null default 'active' check(status in ('active','cancelled')),
 group_id uuid references groups on delete set null, check(ends_at>starts_at and ends_at<=starts_at+interval '24 hours')
);
create index on events(starts_at);
-- Addresses live separately: a private address never appears in a discovery row.
create table public.event_locations(event_id uuid primary key references events on delete cascade, location text not null check(length(location) between 1 and 300));
create table public.event_invitations(event_id uuid references events on delete cascade, household_id uuid references households on delete cascade, primary key(event_id,household_id));
create table public.attendance (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references events on delete cascade, household_id uuid not null references households on delete cascade,
 adults integer not null check(adults between 1 and 2), children integer not null default 0 check(children between 0 and 12), status text not null check(status in ('pending','accepted','waitlist','cancelled')), created_at timestamptz not null default now(), unique(event_id,household_id)
);
create index on attendance(event_id,status,created_at);
create table public.event_feedback(event_id uuid references events on delete cascade, user_id uuid references profiles on delete cascade, happened boolean not null, again boolean not null default false, created_at timestamptz not null default now(), primary key(event_id,user_id));
create table public.conversations (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('household','event','group')), title text not null default '',
 household_a uuid references households on delete cascade, household_b uuid references households on delete cascade, event_id uuid unique references events on delete cascade, group_id uuid unique references groups on delete cascade,
 check((kind='household' and household_a is not null and household_b is not null and event_id is null and group_id is null) or (kind='event' and event_id is not null and group_id is null and household_a is null and household_b is null) or (kind='group' and group_id is not null and event_id is null and household_a is null and household_b is null))
);
create unique index conversation_pair on conversations(least(household_a,household_b),greatest(household_a,household_b)) where kind='household';
create table public.media (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles on delete cascade, path text unique not null, status text not null default 'pending' check(status in ('pending','approved','rejected')), created_at timestamptz not null default now());
create table public.messages (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references conversations on delete cascade, author_id uuid references profiles on delete cascade,
 body text not null default '' check(length(body)<=4000), image_path text references media(path) on delete set null, event_id uuid references events on delete set null,
 reply_to uuid references messages on delete set null, created_at timestamptz not null default now(), system boolean not null default false,
 check(body<>'' or image_path is not null or event_id is not null)
);
create index on messages(conversation_id,created_at);
create table public.message_reactions(message_id uuid references messages on delete cascade,user_id uuid references profiles on delete cascade,emoji text not null check(emoji in ('❤️','👍','😊','🎉')),primary key(message_id,user_id,emoji));
create table public.conversation_preferences(user_id uuid references profiles on delete cascade,conversation_id uuid references conversations on delete cascade,muted boolean not null default false,archived boolean not null default false,read_at timestamptz not null default now(),primary key(user_id,conversation_id));
create table public.partner_invitations(id uuid primary key default gen_random_uuid(),household_id uuid not null references households on delete cascade,token_hash text unique not null,expires_at timestamptz not null,created_by uuid not null references profiles on delete cascade,consumed_at timestamptz);
create table public.moderators(user_id uuid primary key references profiles on delete cascade);
create table public.reports(id uuid primary key default gen_random_uuid(),reporter_id uuid references profiles on delete set null,target_type text not null check(target_type in ('household','message','event','group')),target_id uuid not null,reason text not null check(length(reason) between 5 and 2000),status text not null default 'open' check(status in ('open','resolved')),created_at timestamptz not null default now());
create table public.device_tokens(user_id uuid references profiles on delete cascade,token text not null,platform text not null check(platform in ('ios','android')),updated_at timestamptz not null default now(),primary key(user_id,token));
create table public.notification_outbox(id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles on delete cascade,kind text not null,reference_id uuid not null,created_at timestamptz not null default now(),sent_at timestamptz,attempts integer not null default 0,next_attempt_at timestamptz not null default now(),unique(user_id,kind,reference_id));
create table public.audit_events(id uuid primary key default gen_random_uuid(),user_id uuid references profiles on delete set null,action text not null,created_at timestamptz not null default now());

create function public.my_household() returns uuid language sql stable security definer set search_path=public,pg_temp as $$ select household_id from household_members where user_id=auth.uid() $$;
create function public.is_adult() returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from profiles where id=auth.uid()) $$;
create function public.is_moderator() returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from moderators where user_id=auth.uid()) $$;
create function public.blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from blocks where (household_id=a and target_id=b) or (household_id=b and target_id=a)) $$;
create function public.matched(a uuid,b uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select not blocked(a,b) and exists(select 1 from contacts where status='accepted' and ((from_household=a and to_household=b) or (from_household=b and to_household=a))) $$;
create function public.can_see_household(h uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select is_adult() and my_household() is not null and not blocked(my_household(),h) $$;
create function public.can_see_event(e uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select is_adult() and exists(select 1 from events where id=e and not blocked(my_household(),host_household) and
 (visibility='public' or host_household=my_household() or exists(select 1 from event_invitations where event_id=e and household_id=my_household())))
$$;
create function public.can_read_conversation(c uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select is_adult() and exists(select 1 from conversations where id=c and (
 (kind='household' and my_household() in (household_a,household_b) and matched(household_a,household_b)) or
 (kind='event' and can_see_event(event_id) and exists(select 1 from attendance a where a.event_id=conversations.event_id and a.household_id=my_household() and a.status='accepted')) or
 (kind='group' and exists(select 1 from group_members gm join groups g on g.id=gm.group_id where gm.group_id=conversations.group_id and gm.household_id=my_household() and gm.status='accepted' and not blocked(my_household(),g.owner_household)))))
$$;
create function public.can_read_message(m uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from messages where id=m and can_read_conversation(conversation_id) and (author_id is null or not blocked(my_household(),(select household_id from household_members where user_id=author_id)))) $$;
create function public.can_read_media(p text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select is_adult() and exists(select 1 from media where path=p and (owner_id=auth.uid() or is_moderator() or (status='approved' and (
 exists(select 1 from profiles pr join household_members hm on hm.user_id=pr.id where pr.avatar_path=p and can_see_household(hm.household_id)) or exists(select 1 from messages m where m.image_path=p and can_read_message(m.id))))))
$$;

alter table profiles enable row level security;
create policy profiles_read on profiles for select to authenticated using(id=auth.uid() or is_moderator() or exists(select 1 from household_members hm where hm.user_id=id and can_see_household(hm.household_id)));
alter table households enable row level security;
create policy households_read on households for select to authenticated using(can_see_household(id));
alter table household_members enable row level security;
create policy members_read on household_members for select to authenticated using(can_see_household(household_id));
alter table blocks enable row level security;
create policy blocks_read on blocks for select to authenticated using(household_id=my_household() or target_id=my_household());
alter table contacts enable row level security;
create policy contacts_read on contacts for select to authenticated using(my_household() in (from_household,to_household) and not blocked(from_household,to_household));
alter table favorites enable row level security;
create policy favorites_read on favorites for select to authenticated using(household_id=my_household() and not blocked(household_id,target_id));
alter table availability enable row level security;
create policy availability_read on availability for select to authenticated using(can_see_household(household_id) and ends_at>now() and (household_id=my_household() or visibility='nearby' or matched(my_household(),household_id)));
alter table groups enable row level security;
create policy groups_read on groups for select to authenticated using(can_see_household(owner_household));
alter table group_members enable row level security;
create policy group_members_read on group_members for select to authenticated using(can_see_household(household_id) and exists(select 1 from groups g where g.id=group_id));
alter table events enable row level security;
create policy events_read on events for select to authenticated using(can_see_event(id));
alter table event_locations enable row level security;
create policy locations_read on event_locations for select to authenticated using(can_see_event(event_id) and exists(select 1 from events e where e.id=event_id and (e.visibility='public' or e.host_household=my_household() or exists(select 1 from attendance a where a.event_id=e.id and a.household_id=my_household() and a.status='accepted'))));
alter table event_invitations enable row level security;
create policy invitations_read on event_invitations for select to authenticated using(household_id=my_household() or exists(select 1 from events e where e.id=event_id and e.host_household=my_household()));
alter table attendance enable row level security;
create policy attendance_read on attendance for select to authenticated using(can_see_event(event_id) and can_see_household(household_id) and (status='accepted' or household_id=my_household() or exists(select 1 from events e where e.id=event_id and e.host_household=my_household())));
alter table event_feedback enable row level security;
create policy feedback_read on event_feedback for select to authenticated using(user_id=auth.uid());
alter table conversations enable row level security;
create policy conversations_read on conversations for select to authenticated using(can_read_conversation(id));
alter table messages enable row level security;
create policy messages_read on messages for select to authenticated using(can_read_message(id));
alter table message_reactions enable row level security;
create policy reactions_read on message_reactions for select to authenticated using(can_read_message(message_id));
alter table conversation_preferences enable row level security;
create policy conversation_preferences_read on conversation_preferences for select to authenticated using(user_id=auth.uid() and can_read_conversation(conversation_id));
alter table media enable row level security;
create policy media_read on media for select to authenticated using(can_read_media(path));
alter table reports enable row level security;
create policy reports_read on reports for select to authenticated using(reporter_id=auth.uid() or is_moderator());
alter table partner_invitations enable row level security;
alter table moderators enable row level security;
alter table device_tokens enable row level security;
alter table notification_outbox enable row level security;
alter table audit_events enable row level security;
-- All writes go through the validated transaction function; not through table grants.
revoke all on all tables in schema public from anon,authenticated;
grant select on profiles,households,household_members,blocks,contacts,favorites,availability,groups,group_members,events,event_locations,event_invitations,attendance,event_feedback,conversations,messages,message_reactions,conversation_preferences,media,reports to authenticated;

create function public.promote_waitlist(e uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare remaining integer; b attendance; begin
 perform 1 from events where id=e for update;
 select capacity-coalesce((select sum(adults+children) from attendance where event_id=e and status='accepted'),0) into remaining from events where id=e and status='active' and starts_at>now();
 if remaining is null then return; end if;
 for b in select * from attendance where event_id=e and status='waitlist' order by created_at,id loop
  if blocked(b.household_id,(select host_household from events where id=e)) then update attendance set status='cancelled' where id=b.id; continue; end if;
  if b.adults+b.children>remaining then exit; end if;
  update attendance set status='accepted' where id=b.id; remaining:=remaining-b.adults-b.children;
  insert into notification_outbox(user_id,kind,reference_id) select user_id,'attendance',b.id from household_members where household_id=b.household_id on conflict do nothing;
 end loop;
end $$;

create function public.app_command(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); h uuid:=my_household(); target uuid; ident uuid; conv uuid; tok text; ev events; ct contacts; inv partner_invitations; a integer; k integer; occupied integer; next_status text; old_h uuid; msg messages; group_row groups;
begin
 if u is null then raise exception 'AUTH_REQUIRED'; end if;
 -- Per-account rolling rate limit, stored without payloads or message contents.
 if (select count(*) from audit_events where user_id=u and created_at>now()-interval '1 minute')>=120 then raise exception 'RATE_LIMIT'; end if;
 if p_action='onboard' then
  if coalesce((p_payload->>'adult_confirmed')::boolean,false)=false then raise exception 'ADULT_CONFIRMATION_REQUIRED'; end if;
  if h is not null then raise exception 'ALREADY_IN_HOUSEHOLD'; end if;
  insert into profiles(id,name,locale) values(u,trim(p_payload->>'name'),coalesce(p_payload->>'locale','sv')) on conflict(id) do update set name=excluded.name,locale=excluded.locale;
  insert into households(kind,area,latitude,longitude,interests,languages,child_mode) values(p_payload->>'kind',trim(p_payload->>'area'),round((p_payload->>'latitude')::numeric,2),round((p_payload->>'longitude')::numeric,2),array(select jsonb_array_elements_text(coalesce(p_payload->'interests','[]'))),array(select jsonb_array_elements_text(coalesce(p_payload->'languages','["sv"]'))),coalesce(p_payload->>'child_mode','either')) returning id into h;
  insert into household_members values(h,u,now());
 elsif p_action='partner_accept' then
  if not is_adult() then
   if coalesce((p_payload->>'adult_confirmed')::boolean,false)=false then raise exception 'ADULT_CONFIRMATION_REQUIRED'; end if;
   insert into profiles(id,name,locale) values(u,trim(p_payload->>'name'),coalesce(p_payload->>'locale','sv'));
  end if;
  if h is not null then raise exception 'LEAVE_CURRENT_HOUSEHOLD_FIRST'; end if;
  select * into inv from partner_invitations where token_hash=encode(sha256(convert_to(p_payload->>'token','UTF8')),'hex') and consumed_at is null and expires_at>now() for update;
  if inv.id is null then raise exception 'INVALID_INVITATION'; end if;
  perform 1 from households where id=inv.household_id for update;
  if (select kind from households where id=inv.household_id) not in ('couple','family') or (select count(*) from household_members where household_id=inv.household_id)>=2 then raise exception 'HOUSEHOLD_FULL'; end if;
  insert into household_members values(inv.household_id,u,now()); h:=inv.household_id;
  update partner_invitations set consumed_at=now() where household_id=h and consumed_at is null;
  insert into messages(conversation_id,body,system) select id,'partner_joined:'||(select name from profiles where id=u),true from conversations where can_read_conversation(id);
 elsif not is_adult() then raise exception 'ONBOARDING_REQUIRED';
 elsif p_action='account_delete' then
  -- Auth deletion cascades through authored content. Partner accounts are separate.
  delete from auth.users where id=u;
  if h is not null and not exists(select 1 from household_members where household_id=h) then delete from households where id=h; end if;
  return jsonb_build_object('ok',true);
 elsif h is null then raise exception 'HOUSEHOLD_REQUIRED';
 elsif p_action='profile_update' then
  update profiles set name=coalesce(nullif(trim(p_payload->>'name'),''),name),locale=coalesce(p_payload->>'locale',locale) where id=u;
  update households set bio=coalesce(p_payload->>'bio',bio),radius_km=coalesce((p_payload->>'radius_km')::integer,radius_km),child_mode=coalesce(p_payload->>'child_mode',child_mode),energy=coalesce(p_payload->>'energy',energy),
   interests=case when p_payload?'interests' then array(select jsonb_array_elements_text(p_payload->'interests')) else interests end,
   languages=case when p_payload?'languages' then array(select jsonb_array_elements_text(p_payload->'languages')) else languages end,
   preferred_kinds=case when p_payload?'preferred_kinds' then array(select jsonb_array_elements_text(p_payload->'preferred_kinds')) else preferred_kinds end,
   child_ages=case when p_payload?'child_ages' then array(select jsonb_array_elements_text(p_payload->'child_ages')) else child_ages end,
   area=coalesce(nullif(trim(p_payload->>'area'),''),area),latitude=coalesce(round((p_payload->>'latitude')::numeric,2),latitude),longitude=coalesce(round((p_payload->>'longitude')::numeric,2),longitude) where id=h;
  if exists(select 1 from households where id=h and (not child_ages<@array['0–1','2–3','4–6','7–10','11–14','15–17'] or not preferred_kinds<@array['couple','family','single_parent'])) then raise exception 'INVALID_PREFERENCES'; end if;
 elsif p_action in ('favorite_toggle','favorite_notify','contact_request','block') then
  target:=(p_payload->>'target_id')::uuid;
  if target=h or not exists(select 1 from households where id=target) then raise exception 'INVALID_HOUSEHOLD'; end if;
  if p_action='block' then
   insert into blocks values(h,target) on conflict do nothing;
   delete from favorites where (household_id=h and target_id=target) or (household_id=target and target_id=h);
   update attendance set status='cancelled' where (household_id=target and event_id in (select id from events where host_household=h)) or (household_id=h and event_id in (select id from events where host_household=target));
   for ident in select id from events where host_household in (h,target) and status='active' loop perform promote_waitlist(ident); end loop;
  else
   if blocked(h,target) then raise exception 'NOT_AVAILABLE'; end if;
   if p_action='favorite_toggle' then
    if exists(select 1 from favorites where household_id=h and target_id=target) then delete from favorites where household_id=h and target_id=target; else insert into favorites values(h,target,false); end if;
   elsif p_action='favorite_notify' then
    if (p_payload->>'notify')::boolean and not matched(h,target) then raise exception 'MATCH_REQUIRED'; end if;
    update favorites set notify=(p_payload->>'notify')::boolean where household_id=h and target_id=target;
   else
    if exists(select 1 from households where id in (h,target) and kind='solo') then raise exception 'GROUPS_ONLY'; end if;
    if (select count(*) from contacts where from_household=h and created_at>now()-interval '1 day')>=20 then raise exception 'CONTACT_LIMIT'; end if;
    insert into contacts(from_household,to_household,greeting) values(h,target,trim(p_payload->>'greeting')) on conflict do nothing;
   end if;
  end if;
 elsif p_action='contact_respond' then
  select * into ct from contacts where id=(p_payload->>'id')::uuid and to_household=h and status='pending' for update;
  if ct.id is null or blocked(ct.from_household,h) then raise exception 'NOT_AVAILABLE'; end if;
  if (p_payload->>'accept')::boolean then
   update contacts set status='accepted' where id=ct.id;
   insert into conversations(kind,household_a,household_b) values('household',ct.from_household,h) returning id into conv;
   insert into messages(conversation_id,body,system) values(conv,'connected',true);
  else update contacts set status='declined' where id=ct.id; end if;
 elsif p_action='availability_create' then
  if (p_payload->>'starts_at')::timestamptz<now()-interval '1 minute' then raise exception 'INVALID_TIME'; end if;
  insert into availability(household_id,activity,starts_at,ends_at,visibility,child_mode,adults) values(h,p_payload->>'activity',(p_payload->>'starts_at')::timestamptz,(p_payload->>'ends_at')::timestamptz,coalesce(p_payload->>'visibility','matches'),p_payload->>'child_mode',coalesce((p_payload->>'adults')::integer,1)) returning id into ident;
  insert into notification_outbox(user_id,kind,reference_id) select hm.user_id,'availability',ident from favorites f join household_members hm on hm.household_id=f.household_id where f.target_id=h and f.notify and matched(f.household_id,h);
 elsif p_action='availability_delete' then delete from availability where id=(p_payload->>'id')::uuid and household_id=h;
 elsif p_action='partner_invite' then
  perform 1 from households where id=h for update;
  if (select kind from households where id=h) not in ('couple','family') or (select count(*) from household_members where household_id=h)>=2 then raise exception 'HOUSEHOLD_FULL'; end if;
  tok:=gen_random_uuid()::text||gen_random_uuid()::text;
  update partner_invitations set consumed_at=now() where household_id=h and consumed_at is null;
  insert into partner_invitations(household_id,token_hash,expires_at,created_by) values(h,encode(sha256(convert_to(tok,'UTF8')),'hex'),now()+interval '48 hours',u);
  return jsonb_build_object('token',tok);
 elsif p_action='household_leave' then
  insert into messages(conversation_id,body,system) select id,'partner_left:'||(select name from profiles where id=u),true from conversations where can_read_conversation(id);
  delete from partner_invitations where household_id=h;
  delete from household_members where user_id=u;
  if not exists(select 1 from household_members where household_id=h) then delete from households where id=h; end if;
 elsif p_action in ('event_create','event_update') then
  if (p_payload->>'starts_at')::timestamptz<now() then raise exception 'INVALID_TIME'; end if;
  if p_action='event_create' then
   if nullif(p_payload->>'group_id','') is not null and not exists(select 1 from group_members where group_id=(p_payload->>'group_id')::uuid and household_id=h and status='accepted') then raise exception 'GROUP_MEMBERSHIP_REQUIRED'; end if;
   insert into events(host_household,title,description,activity,starts_at,ends_at,area,latitude,longitude,visibility,child_mode,capacity,approval,cost,practical,group_id)
    select h,trim(p_payload->>'title'),coalesce(p_payload->>'description',''),p_payload->>'activity',(p_payload->>'starts_at')::timestamptz,(p_payload->>'ends_at')::timestamptz,area,latitude,longitude,coalesce(p_payload->>'visibility','public'),p_payload->>'child_mode',(p_payload->>'capacity')::integer,coalesce((p_payload->>'approval')::boolean,false),coalesce(p_payload->>'cost',''),coalesce(p_payload->>'practical',''),nullif(p_payload->>'group_id','')::uuid from households where id=h returning id into ident;
   a:=coalesce((p_payload->>'adults')::integer,1); k:=coalesce((p_payload->>'children')::integer,0);
   if a+k>(p_payload->>'capacity')::integer or (p_payload->>'child_mode'='without' and k>0) then raise exception 'INVALID_PARTY'; end if;
   insert into attendance(event_id,household_id,adults,children,status) values(ident,h,a,k,'accepted');
   insert into conversations(kind,event_id,title) values('event',ident,p_payload->>'title');
  else
   select * into ev from events where id=(p_payload->>'id')::uuid and host_household=h and status='active' for update;
   if ev.id is null then raise exception 'NOT_AVAILABLE'; end if; ident:=ev.id;
   select coalesce(sum(adults+children),0) into occupied from attendance where event_id=ident and status='accepted';
   if (p_payload->>'capacity')::integer<occupied then raise exception 'CAPACITY_BELOW_ATTENDANCE'; end if;
   update events set title=p_payload->>'title',description=coalesce(p_payload->>'description',''),starts_at=(p_payload->>'starts_at')::timestamptz,ends_at=(p_payload->>'ends_at')::timestamptz,capacity=(p_payload->>'capacity')::integer,cost=coalesce(p_payload->>'cost',''),practical=coalesce(p_payload->>'practical','') where id=ident;
   update conversations set title=p_payload->>'title' where event_id=ident;
   insert into messages(conversation_id,body,system) select id,'event_updated',true from conversations where event_id=ident;
   perform promote_waitlist(ident);
  end if;
  insert into event_locations values(ident,trim(p_payload->>'location')) on conflict(event_id) do update set location=excluded.location;
 elsif p_action in ('event_join','event_respond','event_cancel_attendance','event_cancel','event_invite','event_feedback') then
  ident:=(p_payload->>'event_id')::uuid;
  select * into ev from events where id=ident for update;
  if ev.id is null or not can_see_event(ident) then raise exception 'NOT_AVAILABLE'; end if;
  if p_action='event_feedback' then
   if ev.ends_at>now() or not exists(select 1 from attendance where event_id=ident and household_id=h and status='accepted') then raise exception 'NOT_AVAILABLE'; end if;
   insert into event_feedback values(ident,u,(p_payload->>'happened')::boolean,coalesce((p_payload->>'again')::boolean,false),now()) on conflict(event_id,user_id) do update set happened=excluded.happened,again=excluded.again;
  elsif p_action='event_cancel' then
   if ev.host_household<>h then raise exception 'HOST_REQUIRED'; end if;
   update events set status='cancelled' where id=ident;
   insert into messages(conversation_id,body,system) select id,'event_cancelled',true from conversations where event_id=ident;
  elsif p_action='event_cancel_attendance' then
   if ev.host_household=h then raise exception 'HOST_MUST_CANCEL_EVENT'; end if;
   update attendance set status='cancelled' where event_id=ident and household_id=h;
   perform promote_waitlist(ident);
  elsif ev.status<>'active' or ev.starts_at<=now() then raise exception 'EVENT_CLOSED';
  elsif p_action='event_invite' then
   target:=(p_payload->>'target_id')::uuid;
   if ev.host_household<>h or not matched(h,target) then raise exception 'MATCH_REQUIRED'; end if;
   insert into event_invitations values(ident,target) on conflict do nothing;
  else
   target:=h;
   if p_action='event_respond' then
    if ev.host_household<>h then raise exception 'HOST_REQUIRED'; end if;
    target:=(p_payload->>'household_id')::uuid;
    select adults,children into a,k from attendance where event_id=ident and household_id=target and status in ('pending','waitlist');
    if a is null or blocked(h,target) then raise exception 'NOT_AVAILABLE'; end if;
    if not (p_payload->>'accept')::boolean then update attendance set status='cancelled' where event_id=ident and household_id=target; return '{"ok":true}'; end if;
   else
    a:=(p_payload->>'adults')::integer;k:=coalesce((p_payload->>'children')::integer,0);
    if exists(select 1 from attendance where event_id=ident and household_id=h and status<>'cancelled') then return '{"ok":true}'; end if;
   end if;
   if a is null or a not between 1 and 2 or k not between 0 and 12 or (ev.child_mode='without' and k>0) then raise exception 'INVALID_PARTY'; end if;
   select coalesce(sum(adults+children),0) into occupied from attendance where event_id=ident and status='accepted';
   next_status:=case when p_action='event_join' and ev.approval then 'pending' when occupied+a+k>ev.capacity then 'waitlist' else 'accepted' end;
   insert into attendance(event_id,household_id,adults,children,status) values(ident,target,a,k,next_status) on conflict(event_id,household_id) do update set adults=excluded.adults,children=excluded.children,status=excluded.status,created_at=now();
  end if;
 elsif p_action in ('group_create','group_join','group_respond','group_leave','group_remove') then
  if p_action='group_create' then
   insert into groups(owner_household,name,description,area,approval) select h,trim(p_payload->>'name'),coalesce(p_payload->>'description',''),area,coalesce((p_payload->>'approval')::boolean,false) from households where id=h returning id into ident;
   insert into group_members values(ident,h,'accepted'); insert into conversations(kind,group_id,title) values('group',ident,p_payload->>'name');
  else
   ident:=(p_payload->>'group_id')::uuid; select * into group_row from groups where id=ident;
   if group_row.id is null or blocked(h,group_row.owner_household) then raise exception 'NOT_AVAILABLE'; end if;
   if p_action='group_join' then insert into group_members values(ident,h,case when group_row.approval then 'pending' else 'accepted' end) on conflict do nothing;
   elsif p_action='group_leave' then if group_row.owner_household=h then raise exception 'OWNER_CANNOT_LEAVE'; end if; delete from group_members where group_id=ident and household_id=h;
   else
    if group_row.owner_household<>h then raise exception 'HOST_REQUIRED'; end if; target:=(p_payload->>'household_id')::uuid;
    if target=h then raise exception 'OWNER_CANNOT_LEAVE'; end if;
    if p_action='group_remove' or not coalesce((p_payload->>'accept')::boolean,false) then delete from group_members where group_id=ident and household_id=target;
    else update group_members set status='accepted' where group_id=ident and household_id=target; end if;
   end if;
  end if;
 elsif p_action in ('message_send','message_react','conversation_preference') then
  conv:=(p_payload->>'conversation_id')::uuid;
  if not can_read_conversation(conv) then raise exception 'NOT_AVAILABLE'; end if;
  if p_action='message_send' then
   if nullif(p_payload->>'reply_to','') is not null and not exists(select 1 from messages where id=(p_payload->>'reply_to')::uuid and conversation_id=conv and can_read_message(id)) then raise exception 'INVALID_REPLY'; end if;
   if nullif(p_payload->>'image_path','') is not null and not exists(select 1 from media where path=p_payload->>'image_path' and owner_id=u and status<>'rejected') then raise exception 'INVALID_MEDIA'; end if;
   if nullif(p_payload->>'event_id','') is not null and not can_see_event((p_payload->>'event_id')::uuid) then raise exception 'NOT_AVAILABLE'; end if;
   insert into messages(conversation_id,author_id,body,image_path,event_id,reply_to) values(conv,u,trim(coalesce(p_payload->>'body','')),nullif(p_payload->>'image_path',''),nullif(p_payload->>'event_id','')::uuid,nullif(p_payload->>'reply_to','')::uuid) returning id into ident;
  elsif p_action='message_react' then
   ident:=(p_payload->>'message_id')::uuid;
   if not exists(select 1 from messages where id=ident and conversation_id=conv and can_read_message(id)) then raise exception 'NOT_AVAILABLE'; end if;
   if exists(select 1 from message_reactions where message_id=ident and user_id=u and emoji=p_payload->>'emoji') then delete from message_reactions where message_id=ident and user_id=u and emoji=p_payload->>'emoji';
   else insert into message_reactions values(ident,u,p_payload->>'emoji'); end if;
  else
   insert into conversation_preferences(user_id,conversation_id) values(u,conv) on conflict do nothing;
   update conversation_preferences set muted=coalesce((p_payload->>'muted')::boolean,muted),archived=coalesce((p_payload->>'archived')::boolean,archived),read_at=case when p_payload?'read' then now() else read_at end where user_id=u and conversation_id=conv;
  end if;
 elsif p_action='report' then
  target:=(p_payload->>'target_id')::uuid;
  if not (case p_payload->>'target_type' when 'household' then can_see_household(target) when 'message' then can_read_message(target) when 'event' then can_see_event(target) when 'group' then exists(select 1 from groups where id=target and can_see_household(owner_household)) else false end) then raise exception 'NOT_AVAILABLE'; end if;
  insert into reports(reporter_id,target_type,target_id,reason) values(u,p_payload->>'target_type',target,trim(p_payload->>'reason'));
 elsif p_action='report_resolve' then
  if not is_moderator() then raise exception 'MODERATOR_REQUIRED'; end if;
  update reports set status='resolved' where id=(p_payload->>'id')::uuid;
 elsif p_action='media_register' then
  ident:=gen_random_uuid();tok:=u::text||'/'||ident::text||'.jpg'; insert into media(id,owner_id,path) values(ident,u,tok);return jsonb_build_object('path',tok);
 elsif p_action='avatar_set' then
  if not exists(select 1 from media where path=p_payload->>'path' and owner_id=u and status<>'rejected') then raise exception 'INVALID_MEDIA'; end if;
  update profiles set avatar_path=p_payload->>'path' where id=u;
 elsif p_action='media_review' then
  if not is_moderator() then raise exception 'MODERATOR_REQUIRED'; end if;
  update media set status=case when (p_payload->>'approve')::boolean then 'approved' else 'rejected' end where id=(p_payload->>'id')::uuid;
 elsif p_action='device_register' then
  if length(p_payload->>'token') not between 16 and 512 then raise exception 'INVALID_TOKEN'; end if;
  insert into device_tokens values(u,p_payload->>'token',p_payload->>'platform',now()) on conflict(user_id,token) do update set updated_at=now();
 else raise exception 'UNKNOWN_ACTION';
 end if;
 insert into audit_events(user_id,action) values(u,p_action);
 return jsonb_build_object('ok',true,'id',ident,'conversation_id',conv);
end $$;

create function public.app_snapshot() returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object(
 'adult',(select to_jsonb(p) from profiles p where id=auth.uid()),'household_id',my_household(),'is_moderator',is_moderator(),
 'households',coalesce((select jsonb_agg(to_jsonb(h)||jsonb_build_object('members',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'locale',p.locale,'avatar_path',case when can_read_media(p.avatar_path) then p.avatar_path end)),'[]') from household_members hm join profiles p on p.id=hm.user_id where hm.household_id=h.id))) from households h),'[]'),
 'availability',coalesce((select jsonb_agg(a) from availability a),'[]'), 'contacts',coalesce((select jsonb_agg(c) from contacts c),'[]'), 'favorites',coalesce((select jsonb_agg(f) from favorites f),'[]'),
 'conversations',coalesce((select jsonb_agg(c) from conversations c),'[]'),
 'messages',coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('image_path',case when can_read_media(m.image_path) then m.image_path end,'reactions',coalesce((select jsonb_object_agg(emoji,users) from (select emoji,jsonb_agg(user_id) users from message_reactions where message_id=m.id group by emoji) r),'{}'))) from (select * from messages order by created_at desc limit 500) m),'[]'),
 'conversation_preferences',coalesce((select jsonb_agg(c) from conversation_preferences c),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('location',(select location from event_locations where event_id=e.id))) from events e),'[]'),
 'attendance',coalesce((select jsonb_agg(a) from attendance a),'[]'),'groups',coalesce((select jsonb_agg(g) from groups g),'[]'),'group_members',coalesce((select jsonb_agg(g) from group_members g),'[]'),
 'reports',coalesce((select jsonb_agg(r) from reports r),'[]'),'blocked_ids',coalesce((select jsonb_agg(case when household_id=my_household() then target_id else household_id end) from blocks),'[]'),
 'media_queue',case when is_moderator() then coalesce((select jsonb_agg(m) from media m where status='pending'),'[]') else '[]'::jsonb end
 )
$$;

-- Never grant internal mutation helpers, including waitlist promotion, to clients.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function my_household(),is_adult(),is_moderator(),blocked(uuid,uuid),matched(uuid,uuid),can_see_household(uuid),can_see_event(uuid),can_read_conversation(uuid),can_read_message(uuid),can_read_media(text),app_snapshot(),app_command(text,jsonb) to authenticated;
