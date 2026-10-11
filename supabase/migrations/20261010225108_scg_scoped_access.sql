begin;
create or replace function scg_private.mfa_satisfied()
returns boolean language sql stable security definer set search_path=''
as $$ select coalesce(auth.jwt()->>'aal'='aal2',false) or not exists(
 select 1 from auth.mfa_factors f where f.user_id=auth.uid() and f.status='verified'); $$;
revoke all on function scg_private.mfa_satisfied() from public,anon;
grant execute on function scg_private.mfa_satisfied() to authenticated,service_role;
create or replace function scg_private.active_member()
returns boolean language sql stable security definer set search_path=''
as $$ select scg_private.mfa_satisfied() and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status in ('активен','одобрено')); $$;
create or replace function scg_private.manage_region(p_region text)
returns boolean language sql stable security definer set search_path=''
as $$ select scg_private.mfa_satisfied() and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status in ('активен','одобрено')
 and (p.role in ('FOUNDER','UNION_LEAD','STAFF','SYSTEMS') or (p.role='REGIONAL_EXECUTIVE' and p.region is not null and p.region=p_region))); $$;
create or replace function scg_private.edit_content()
returns boolean language sql stable security definer set search_path=''
as $$ select scg_private.mfa_satisfied() and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status in ('активен','одобрено') and p.role in ('FOUNDER','UNION_LEAD','STAFF','PR','SYSTEMS')); $$;
create or replace function public.is_admin_user(uid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select scg_private.mfa_satisfied() and exists(select 1 from public.profiles p where p.id=uid and p.role in ('FOUNDER','UNION_LEAD','REGIONAL_EXECUTIVE','STAFF','SYSTEMS') and p.status in ('активен','одобрено')); $$;
create or replace function public.is_system_admin(uid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select scg_private.mfa_satisfied() and exists(select 1 from public.profiles p where p.id=uid and p.role in ('FOUNDER','STAFF','SYSTEMS') and p.status in ('активен','одобрено')); $$;

-- Once a TOTP factor is enrolled, an AAL1 session cannot read/write private tables.
do $$ declare t text; begin
 foreach t in array array['profiles','projects','project_applications','project_assignments','notifications','announcements','communities','certificates','access_audit_log','direct_messages','volunteer_hours','friend_requests','friendships','ai_conversations','ai_messages','scg_support_tickets','scg_support_messages','scg_content_drafts','scg_document_acknowledgements'] loop
  execute format('create policy scg_mfa_guard on public.%I as restrictive for all to authenticated using(scg_private.mfa_satisfied()) with check(scg_private.mfa_satisfied())',t);
 end loop;
end; $$;
create policy scg_identity_mfa_guard on storage.objects as restrictive for all to authenticated
 using(bucket_id<>'identity-documents' or scg_private.mfa_satisfied())
 with check(bucket_id<>'identity-documents' or scg_private.mfa_satisfied());

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy scg_profiles_read on public.profiles for select to authenticated
 using(id=(select auth.uid()) or scg_private.manage_region(region));
drop policy if exists "admins create projects" on public.projects;
create policy scg_projects_create on public.projects for insert to authenticated
 with check(created_by=(select auth.uid()) and scg_private.manage_region(region));
drop policy if exists "system admins update projects" on public.projects;
create policy scg_projects_update on public.projects for update to authenticated
 using(scg_private.manage_region(region)) with check(scg_private.manage_region(region));
-- No hard-delete operation is offered by the new UI.
revoke delete on public.projects,public.profiles from authenticated;
revoke insert,update,delete on public.project_assignments from authenticated;
revoke update on public.project_applications from authenticated;
revoke insert,update,delete on public.volunteer_hours from authenticated;
-- Hour edits and attendance go through guarded server operations.
drop policy if exists "admins create announcements" on public.announcements;
create policy scg_announcements_create on public.announcements for insert to authenticated
 with check(created_by=(select auth.uid()) and scg_private.edit_content());
drop policy if exists "authenticated view announcements" on public.announcements;
create policy scg_announcements_read on public.announcements for select to authenticated
 using(scg_private.edit_content() or ((department is null or department='' or department=(select coalesce(p.department,p.division) from public.profiles p where p.id=auth.uid()))
 and (region is null or region='' or region=(select p.region from public.profiles p where p.id=auth.uid()))));
create policy scg_assignments_scope on public.project_assignments as restrictive for select to authenticated
 using(user_id=(select auth.uid()) or exists(select 1 from public.projects p where p.id=project_id and scg_private.manage_region(p.region)));
create policy scg_applications_scope on public.project_applications as restrictive for select to authenticated
 using(user_id=(select auth.uid()) or exists(select 1 from public.projects p where p.id=project_id and scg_private.manage_region(p.region)));
create policy scg_hours_scope on public.volunteer_hours as restrictive for select to authenticated
 using(user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=user_id and scg_private.manage_region(p.region)));
drop policy if exists identity_docs_leadership_select on storage.objects;
create policy scg_identity_team_read on storage.objects for select to authenticated
 using(bucket_id='identity-documents' and exists(select 1 from public.profiles p where p.id::text=(storage.foldername(name))[1] and scg_private.manage_region(p.region)));

create or replace function public.command_center_members(p_query text default null)
returns table(id uuid,first_name text,last_name text,role text,department text,division text,region text,scd_id text,city text,phone text,status text,created_at timestamptz,telegram_id bigint,telegram_username text,username text)
language plpgsql security definer set search_path=''
as $$ declare q text:=lower(left(trim(coalesce(p_query,'')),100));begin
 if not public.is_admin_user(auth.uid()) then raise exception using errcode='42501',message='COMMAND_CENTER_FORBIDDEN';end if;
 return query select p.id,p.first_name,p.last_name,p.role,p.department,p.division,p.region,p.scd_id,p.city,p.phone,p.status,p.created_at,p.telegram_id,p.telegram_username,p.username
 from public.profiles p where scg_private.manage_region(p.region)
 and (q='' or lower(concat_ws(' ',p.first_name,p.last_name,p.scd_id,p.city,p.username,p.telegram_username,p.phone)) like '%'||q||'%')
 order by p.created_at desc nulls last limit 250;
end; $$;
create or replace function public.get_pending_project_applications()
returns table(id uuid,status text,created_at timestamptz,project_id uuid,user_id uuid,project_title text,first_name text,last_name text,department text,region text,scd_id text)
language plpgsql security definer set search_path=''
as $$ begin
 if not public.is_admin_user(auth.uid()) then raise exception using errcode='42501',message='COMMAND_CENTER_FORBIDDEN';end if;
 return query select a.id,a.status,a.created_at,a.project_id,a.user_id,p.title,u.first_name,u.last_name,coalesce(u.department,u.division),u.region,u.scd_id
 from public.project_applications a join public.projects p on p.id=a.project_id join public.profiles u on u.id=a.user_id
 where a.status='pending' and scg_private.manage_region(p.region) order by a.created_at limit 150;
end; $$;
create or replace function public.command_center_application_action(p_application_id uuid,p_action text,p_team_role text default 'Volunteer')
returns jsonb language plpgsql security definer set search_path=''
as $$ declare a public.project_applications; p public.projects; r text:=left(coalesce(nullif(trim(p_team_role),''),'Volunteer'),80);begin
 select * into a from public.project_applications where id=p_application_id for update;
 if not found then raise exception using errcode='P0002',message='APPLICATION_NOT_FOUND';end if;
 select * into p from public.projects where id=a.project_id;
 if not scg_private.manage_region(p.region) then raise exception using errcode='42501',message='COMMAND_CENTER_FORBIDDEN';end if;
 if a.status<>'pending' then raise exception using errcode='22023',message='ALREADY_REVIEWED';end if;
 if p_action='approve' then
  if p.status in ('draft','completed') then raise exception using errcode='22023',message='PROJECT_NOT_ACTIVE';end if;
  update public.project_applications set status='approved' where id=a.id;
  insert into public.project_assignments(project_id,user_id,status,team_role) values(p.id,a.user_id,'assigned',r)
   on conflict(project_id,user_id) do update set status='assigned',team_role=excluded.team_role;
  insert into public.notifications(user_id,title,body) values(a.user_id,'Заявка одобрена: '||p.title,'Тебя назначили на проект. Роль: '||r||'. Детали — в разделе «Моё участие».');
 elsif p_action='reject' then
  update public.project_applications set status='rejected' where id=a.id;
  update public.project_assignments set status='cancelled' where project_id=p.id and user_id=a.user_id and status='assigned';
  insert into public.notifications(user_id,title,body) values(a.user_id,'Решение по заявке: '||p.title,'Заявка отклонена. Если нужна помощь, обратись в поддержку.');
 else raise exception using errcode='22023',message='INVALID_ACTION';end if;
 if exists(select 1 from public.profiles pr where pr.id=a.user_id and pr.email_projects_enabled) then
  insert into public.scg_email_outbox(user_id,kind,subject,payload,dedupe_key) values(a.user_id,'application','SCG: решение по заявке',jsonb_build_object('title',p.title,'body',case when p_action='approve' then 'Заявка одобрена. Роль на проекте: '||r else 'Заявка отклонена.' end,'url','https://stagecraft.kz/backstage/#activity'),'application:'||a.id::text||':'||p_action||':'||a.created_at::text) on conflict do nothing;
 end if;
 return jsonb_build_object('success',true,'action',p_action,'application_id',a.id);
end; $$;
-- Remove obsolete alternative admin APIs that bypass scoped checks or refer to old columns.
revoke execute on function public.command_center_search_members(text),public.command_center_review_application(uuid,text),public.command_center_update_member_access(uuid,text,text,text),public.command_center_set_role(uuid,text),public.command_center_delete_project(uuid),public.get_member_directory(),public.search_member_directory(text),public.get_hub_stats() from authenticated;

create or replace function public.scg_project_team(p_project uuid)
returns table(assignment_id uuid,member_name text,scd_id text,team_role text,status text,checked_in_at timestamptz,checked_out_at timestamptz)
language plpgsql security definer set search_path=''
as $$ declare reg text;begin
 select region into reg from public.projects where id=p_project;
 if not found or not scg_private.manage_region(reg) then raise exception using errcode='42501',message='PROJECT_FORBIDDEN';end if;
 return query select a.id,concat_ws(' ',p.first_name,p.last_name),p.scd_id,a.team_role,a.status,a.checked_in_at,a.checked_out_at
 from public.project_assignments a join public.profiles p on p.id=a.user_id where a.project_id=p_project order by p.first_name,p.last_name;
end; $$;
create or replace function public.scg_ai_allowed()
returns boolean language sql stable security definer set search_path=''
as $$ select scg_private.active_member(); $$;
create or replace function public.scg_ai_budget(p_user uuid)
returns void language plpgsql security definer set search_path=''
as $$ declare w timestamptz;d timestamptz;n integer;begin
 if auth.role()<>'service_role' then raise exception using errcode='42501',message='SERVICE_REQUIRED';end if;
 w:=date_trunc('minute',now());d:=date_trunc('day',now());
 insert into scg_private.rate_limits(user_id,action,window_start,hits) values(p_user,'ai_minute',w,1) on conflict(user_id,action,window_start) do update set hits=scg_private.rate_limits.hits+1 returning hits into n;
 if n>5 then raise exception using errcode='54000',message='REQUEST_LIMIT';end if;
 insert into scg_private.rate_limits(user_id,action,window_start,hits) values(p_user,'ai_day',d,1) on conflict(user_id,action,window_start) do update set hits=scg_private.rate_limits.hits+1 returning hits into n;
 if n>30 then raise exception using errcode='54000',message='REQUEST_LIMIT';end if;
end; $$;
revoke all on function public.scg_project_team(uuid),public.scg_ai_allowed(),public.scg_ai_budget(uuid) from public,anon;
grant execute on function public.scg_project_team(uuid),public.scg_ai_allowed() to authenticated,service_role;
revoke execute on function public.scg_ai_budget(uuid) from authenticated;
grant execute on function public.scg_ai_budget(uuid) to service_role;

-- A regional manager cannot widen their own scope by editing their profile.
create or replace function scg_private.guard_profile_scope()
returns trigger language plpgsql security definer set search_path=''
as $$ begin
 if auth.role()='authenticated' and old.role<>'VOLUNTEER' and (old.department is distinct from new.department or old.division is distinct from new.division or old.region is distinct from new.region)
 and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='FOUNDER' and scg_private.mfa_satisfied()) then raise exception using errcode='42501',message='SCOPE_PROTECTED';end if;
 return new;
end; $$;
create trigger scg_profile_scope_guard before update on public.profiles for each row execute function scg_private.guard_profile_scope();
revoke all on function scg_private.guard_profile_scope() from public,anon,authenticated;
drop policy if exists scg_ack_insert on public.scg_document_acknowledgements;
create policy scg_ack_insert on public.scg_document_acknowledgements for insert to authenticated
 with check(user_id=(select auth.uid()) and document_slug in ('organizational','member','leadership','regional','project','disciplinary','brand') and document_version='original-1');

-- Preserve existing SCG IDs; assign IDs to future email registrations.
create or replace function scg_private.ensure_profile_identity()
returns trigger language plpgsql security definer set search_path=''
as $$ begin
 if new.scd_id is null or trim(new.scd_id)='' then new.scd_id:=public.make_scd_id(new.birth_date,new.id);end if;
 return new;
end; $$;
create trigger scg_profile_identity before insert on public.profiles for each row execute function scg_private.ensure_profile_identity();
revoke all on function scg_private.ensure_profile_identity() from public,anon,authenticated;

-- Existing private/social RPCs must respect the enrolled second factor.
CREATE OR REPLACE FUNCTION public.get_direct_messages(p_other_user_id uuid, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, sender_id uuid, recipient_id uuid, body text, created_at timestamp with time zone, read_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='42501',message='MFA_REQUIRED';end if; return query select m.id,m.sender_id,m.recipient_id,m.body,m.created_at,m.read_at
  from public.direct_messages m
  where (m.sender_id=auth.uid() and m.recipient_id=p_other_user_id)
     or (m.sender_id=p_other_user_id and m.recipient_id=auth.uid())
  order by m.created_at desc limit greatest(1,least(coalesce(p_limit,100),200)); end;$function$;
CREATE OR REPLACE FUNCTION public.get_message_threads()
 RETURNS TABLE(other_user_id uuid, other_name text, other_username text, other_avatar_url text, last_body text, last_created_at timestamp with time zone, unread_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='42501',message='MFA_REQUIRED';end if; return query with uid as (select auth.uid() as id), pairs as (
    select case when m.sender_id=(select id from uid) then m.recipient_id else m.sender_id end as other_id,
           m.body,m.created_at,m.recipient_id,m.sender_id
    from public.direct_messages m
    where m.sender_id=(select id from uid) or m.recipient_id=(select id from uid)
  ), ranked as (
    select *,row_number() over(partition by other_id order by created_at desc) rn from pairs
  )
  select r.other_id,concat_ws(' ',p.first_name,p.last_name),p.username,p.avatar_url,r.body,r.created_at,
         (select count(*) from public.direct_messages m where m.sender_id=r.other_id and m.recipient_id=(select id from uid) and m.read_at is null)
  from ranked r join public.profiles p on p.id=r.other_id
  where r.rn=1 order by r.created_at desc; end;$function$;
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_other_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='42501',message='MFA_REQUIRED';end if; update public.direct_messages set read_at=now()
  where sender_id=p_other_user_id and recipient_id=auth.uid() and read_at is null; end;$function$;
CREATE OR REPLACE FUNCTION public.send_friend_request(p_target_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare uid uuid:=auth.uid(); existing_status text; req_id uuid; a uuid; b uuid; begin if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='42501',message='MFA_REQUIRED';end if; if uid is null then raise exception 'Authentication required'; end if; if uid=p_target_user_id then raise exception 'You cannot add yourself'; end if; select friend_status into existing_status from public.get_friend_info(p_target_user_id); if existing_status='friends' then return 'friends'; end if; if existing_status='outgoing' then return 'outgoing'; end if; if existing_status='incoming' then select id into req_id from public.friend_requests where sender_id=p_target_user_id and receiver_id=uid and status='pending' limit 1; update public.friend_requests set status='accepted',responded_at=now() where id=req_id; a:=least(uid,p_target_user_id); b:=greatest(uid,p_target_user_id); insert into public.friendships(user_a,user_b) values(a,b) on conflict do nothing; return 'friends'; end if; insert into public.friend_requests(sender_id,receiver_id,status) values(uid,p_target_user_id,'pending') on conflict(sender_id,receiver_id) do update set status='pending',created_at=now(),responded_at=null; return 'outgoing'; end; $function$;
CREATE OR REPLACE FUNCTION public.respond_friend_request(p_request_id uuid, p_accept boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare uid uuid:=auth.uid(); r public.friend_requests; a uuid; b uuid; begin if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='42501',message='MFA_REQUIRED';end if; select * into r from public.friend_requests where id=p_request_id and receiver_id=uid and status='pending' for update; if not found then raise exception 'Friend request not found'; end if; if p_accept then update public.friend_requests set status='accepted',responded_at=now() where id=r.id; a:=least(r.sender_id,r.receiver_id); b:=greatest(r.sender_id,r.receiver_id); insert into public.friendships(user_a,user_b) values(a,b) on conflict do nothing; return 'friends'; else update public.friend_requests set status='rejected',responded_at=now() where id=r.id; return 'rejected'; end if; end; $function$;
CREATE OR REPLACE FUNCTION public.remove_friend(p_target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare uid uuid:=auth.uid(); a uuid; b uuid; begin if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='42501',message='MFA_REQUIRED';end if; if uid is null then raise exception 'Authentication required'; end if; a:=least(uid,p_target_user_id); b:=greatest(uid,p_target_user_id); delete from public.friendships where user_a=a and user_b=b; return found; end; $function$;
CREATE OR REPLACE FUNCTION public.get_friend_info(p_target_user_id uuid)
 RETURNS TABLE(friend_count bigint, friend_status text, request_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='42501',message='MFA_REQUIRED';end if; return query with me as (select auth.uid() uid), pair as (select least((select uid from me),p_target_user_id) a,greatest((select uid from me),p_target_user_id) b) select (select count(*) from public.friendships f where f.user_a=p_target_user_id or f.user_b=p_target_user_id),case when (select uid from me) is null or (select uid from me)=p_target_user_id then 'self' when exists(select 1 from public.friendships f where f.user_a=(select a from pair) and f.user_b=(select b from pair)) then 'friends' when exists(select 1 from public.friend_requests r where r.sender_id=(select uid from me) and r.receiver_id=p_target_user_id and r.status='pending') then 'outgoing' when exists(select 1 from public.friend_requests r where r.sender_id=p_target_user_id and r.receiver_id=(select uid from me) and r.status='pending') then 'incoming' else 'none' end,(select r.id from public.friend_requests r where ((r.sender_id=(select uid from me) and r.receiver_id=p_target_user_id) or (r.sender_id=p_target_user_id and r.receiver_id=(select uid from me))) and r.status='pending' order by r.created_at desc limit 1); end;$function$;
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
 RETURNS TABLE(id uuid, first_name text, last_name text, username text, scd_id text, role text, department text, region text, city text, bio text, avatar_url text, friend_count bigint, posts_count bigint, volunteer_hours numeric, friend_status text, request_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='42501',message='MFA_REQUIRED';end if; return query select p.id,p.first_name,p.last_name,p.username,p.scd_id,p.role,coalesce(p.department,p.division),p.region,p.city,p.bio,p.avatar_url,(select count(*) from public.friendships f where f.user_a=p.id or f.user_b=p.id),(select count(*) from public.posts x where x.author_id=p.id and x.visibility='public'),coalesce((select sum(v.hours) from public.volunteer_hours v where v.user_id=p.id),0),coalesce((select friend_status from public.get_friend_info(p.id)),'none'),(select request_id from public.get_friend_info(p.id)) from public.profiles p where p.id=p_user_id; end;$function$;
CREATE OR REPLACE FUNCTION public.search_public_profiles(p_query text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, first_name text, last_name text, username text, scd_id text, role text, department text, region text, city text, bio text, avatar_url text, friend_count bigint, posts_count bigint, volunteer_hours numeric, friend_status text, request_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='42501',message='MFA_REQUIRED';end if; return query with q as (select lower(trim(replace(coalesce(p_query,''),'@',''))) term) select p.id,p.first_name,p.last_name,p.username,p.scd_id,p.role,coalesce(p.department,p.division),p.region,p.city,p.bio,p.avatar_url,(select count(*) from public.friendships f where f.user_a=p.id or f.user_b=p.id),(select count(*) from public.posts x where x.author_id=p.id and x.visibility='public'),coalesce((select sum(v.hours) from public.volunteer_hours v where v.user_id=p.id),0),coalesce((select friend_status from public.get_friend_info(p.id)),'none'),(select request_id from public.get_friend_info(p.id)) from public.profiles p,q where q.term='' or lower(concat_ws(' ',p.first_name,p.last_name)) like '%'||q.term||'%' or lower(coalesce(p.username,'')) like '%'||q.term||'%' or lower(coalesce(p.scd_id,'')) like '%'||q.term||'%' or lower(coalesce(p.department,p.division,'')) like '%'||q.term||'%' or lower(coalesce(p.city,'')) like '%'||q.term||'%' order by p.created_at desc limit 50; end;$function$;
CREATE OR REPLACE FUNCTION public.get_social_stats(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(followers_count bigint, following_count bigint, posts_count bigint, likes_received bigint, volunteer_hours numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='42501',message='MFA_REQUIRED';end if; return query with u as (select coalesce(p_user_id,auth.uid()) as uid)
  select
    (select count(*) from public.follows f,u where f.following_id=u.uid),
    (select count(*) from public.follows f,u where f.follower_id=u.uid),
    (select count(*) from public.posts po,u where po.author_id=u.uid),
    (select count(*) from public.post_likes l join public.posts po on po.id=l.post_id,u where po.author_id=u.uid),
    (select coalesce(sum(v.hours),0) from public.volunteer_hours v,u where v.user_id=u.uid); end;$function$;
CREATE OR REPLACE FUNCTION public.toggle_follow(p_target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); exists_follow boolean;
begin if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='42501',message='MFA_REQUIRED';end if;
  if uid is null then raise exception 'Authentication required'; end if;
  if uid = p_target_user_id then raise exception 'You cannot follow yourself'; end if;
  select exists(select 1 from public.follows where follower_id=uid and following_id=p_target_user_id) into exists_follow;
  if exists_follow then
    delete from public.follows where follower_id=uid and following_id=p_target_user_id;
    return false;
  else
    insert into public.follows(follower_id,following_id) values(uid,p_target_user_id) on conflict do nothing;
    return true;
  end if;
end;
$function$;
CREATE OR REPLACE FUNCTION public.issue_own_certificate(p_project_id uuid)
 RETURNS certificates
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  a public.project_assignments;
  p public.projects;
  c public.certificates;
  cert_no text;
  hrs numeric;
begin if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='42501',message='MFA_REQUIRED';end if;
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into p from public.projects where id=p_project_id and status='completed';
  if not found then raise exception 'Project is not completed'; end if;
  select * into a from public.project_assignments where project_id=p_project_id and user_id=auth.uid();
  if not found then raise exception 'Assignment not found'; end if;
  if a.checked_in_at is null or a.checked_out_at is null then raise exception 'Check-in and check-out are required'; end if;
  if a.status<>'completed' then raise exception 'Completed assignment required';end if;
  select sum(v.hours) into hrs from public.volunteer_hours v where v.assignment_id=a.id and v.user_id=auth.uid();
  if hrs is null or hrs<0 then raise exception 'Recorded attendance hours required';end if;
  cert_no:='BS-'||to_char(current_date,'YYYY')||'-'||coalesce((select scd_id from public.profiles where id=auth.uid()),'MEMBER')||'-'||upper(left(replace(p_project_id::text,'-',''),6));
  insert into public.certificates(user_id,project_id,certificate_number,role,hours)
  values(auth.uid(),p_project_id,cert_no,coalesce(a.team_role,'Volunteer'),hrs)
  on conflict (user_id,project_id) do update set certificate_number=excluded.certificate_number,role=excluded.role,hours=excluded.hours
  returning * into c;
  return c;
end;
$function$;

create or replace function scg_private.consume_limit(p_action text,p_limit integer,p_seconds integer)
returns void language plpgsql security definer set search_path=''
as $$ declare w timestamptz; n integer; begin
 if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='28000',message='AUTH_REQUIRED'; end if;
 w:=to_timestamp(floor(extract(epoch from now())/p_seconds)*p_seconds);
 insert into scg_private.rate_limits(user_id,action,window_start,hits) values(auth.uid(),p_action,w,1)
 on conflict(user_id,action,window_start) do update set hits=scg_private.rate_limits.hits+1 returning hits into n;
 if n>p_limit then raise exception using errcode='54000',message='REQUEST_LIMIT'; end if;
end; $$;
create or replace function public.scg_cancel_application(p_application uuid)
returns boolean language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null or not scg_private.mfa_satisfied() then raise exception using errcode='28000',message='AUTH_REQUIRED'; end if;
 update public.project_applications set status='cancelled' where id=p_application and user_id=auth.uid() and status='pending';
 return found;
end; $$;
create or replace function public.scg_change_member_access(p_member uuid,p_role text,p_department text,p_region text,p_status text)
returns boolean language plpgsql security definer set search_path=''
as $$ begin
 if not scg_private.mfa_satisfied() or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='FOUNDER' and p.status in ('активен','одобрено')) then raise exception using errcode='42501',message='FOUNDER_REQUIRED'; end if;
 if p_status not in ('активен','одобрено','ожидание','отклонено') then raise exception using errcode='22023',message='INVALID_STATUS';end if;
 if p_role='REGIONAL_EXECUTIVE' and (p_department<>'UNION' or nullif(trim(p_region),'') is null) then raise exception using errcode='22023',message='REGION_REQUIRED';end if;
 if p_role not in ('VOLUNTEER','UNION_LEAD','REGIONAL_EXECUTIVE','STAFF','PR','SYSTEMS','QUORUM','CAST') then raise exception using errcode='22023',message='INVALID_ROLE'; end if;
 if exists(select 1 from public.profiles p where p.id=p_member and p.role='FOUNDER') then raise exception using errcode='42501',message='FOUNDER_PROTECTED'; end if;
 update public.profiles set role=p_role,department=nullif(trim(p_department),''),division=nullif(trim(p_department),''),region=case when p_department='UNION' then nullif(trim(p_region),'') else null end,status=p_status where id=p_member;
 return found;
end; $$;
create or replace function public.scg_checkin(p_project uuid,p_scd text,p_mode text)
returns jsonb language plpgsql security definer set search_path=''
as $$ declare p public.projects; a public.project_assignments; member public.profiles; hrs numeric; begin
 select * into p from public.projects where id=p_project;
 if not found or not scg_private.manage_region(p.region) then raise exception using errcode='42501',message='CHECKIN_FORBIDDEN'; end if;
 if p.status in ('draft','completed') then raise exception using errcode='22023',message='PROJECT_NOT_ACTIVE'; end if;
 select * into member from public.profiles where scd_id=trim(p_scd) limit 1;
 if not found then raise exception using errcode='P0002',message='MEMBER_NOT_FOUND'; end if;
 select * into a from public.project_assignments where project_id=p.id and user_id=member.id for update;
 if not found or a.status='cancelled' then raise exception using errcode='22023',message='ASSIGNMENT_REQUIRED'; end if;
 if p_mode='in' then
  if a.status<>'assigned' then raise exception using errcode='22023',message='ALREADY_CHECKED_IN'; end if;
  update public.project_assignments set status='checked_in',checked_in_at=now(),checked_out_at=null where id=a.id;
 elsif p_mode='out' then
  if a.status<>'checked_in' or a.checked_in_at is null then raise exception using errcode='22023',message='CHECKIN_REQUIRED'; end if;
  hrs:=round(extract(epoch from(now()-a.checked_in_at))/3600.0,2);
  if hrs<0 or hrs>24 then raise exception using errcode='22023',message='ATTENDANCE_REVIEW_REQUIRED';end if;
  update public.project_assignments set status='completed',checked_out_at=now() where id=a.id;
  insert into public.volunteer_hours(user_id,project_id,assignment_id,hours,role,created_by) values(member.id,p.id,a.id,hrs,a.team_role,auth.uid());
 else raise exception using errcode='22023',message='INVALID_MODE'; end if;
 return jsonb_build_object('name',concat_ws(' ',member.first_name,member.last_name),'scd_id',member.scd_id,'mode',p_mode,'hours',hrs);
end; $$;
-- Bot-only operations still enforce eligibility and legal state transitions.
create or replace function public.scg_telegram_apply(p_user uuid,p_project uuid)
returns uuid language plpgsql security definer set search_path=''
as $$ declare p public.projects;a public.project_applications;begin
 if auth.role()<>'service_role' then raise exception using errcode='42501',message='SERVICE_REQUIRED';end if;
 if not exists(select 1 from public.profiles where id=p_user and telegram_id is not null and status in ('активен','одобрено')) then raise exception using errcode='42501',message='MEMBER_NOT_ACTIVE';end if;
 select * into p from public.projects where id=p_project for share;
 if not found or p.status<>'open' or (p.application_deadline is not null and p.application_deadline<=now()) then raise exception using errcode='22023',message='APPLICATIONS_CLOSED';end if;
 insert into public.project_applications(project_id,user_id,status) values(p.id,p_user,'pending') on conflict(project_id,user_id) do update set status=case when public.project_applications.status in ('pending','approved') then public.project_applications.status else 'pending' end returning * into a;
 return a.id;
end; $$;
create or replace function public.scg_telegram_attendance(p_user uuid,p_assignment uuid,p_mode text)
returns boolean language plpgsql security definer set search_path=''
as $$ declare a public.project_assignments;p public.projects;hrs numeric;begin
 if auth.role()<>'service_role' then raise exception using errcode='42501',message='SERVICE_REQUIRED';end if;
 if not exists(select 1 from public.profiles where id=p_user and telegram_id is not null and status in ('активен','одобрено')) then raise exception using errcode='42501',message='MEMBER_NOT_ACTIVE';end if;
 select * into a from public.project_assignments where id=p_assignment and user_id=p_user for update;
 if not found then raise exception using errcode='42501',message='ASSIGNMENT_REQUIRED';end if;
 select * into p from public.projects where id=a.project_id;
 if not found or p.status in ('draft','completed') then raise exception using errcode='22023',message='PROJECT_NOT_ACTIVE';end if;
 if p_mode='in' and a.status='assigned' then update public.project_assignments set status='checked_in',checked_in_at=now(),checked_out_at=null where id=a.id;
 elsif p_mode='out' and a.status='checked_in' and a.checked_in_at is not null then
  hrs:=round(extract(epoch from(now()-a.checked_in_at))/3600.0,2);
  if hrs<0 or hrs>24 then raise exception using errcode='22023',message='ATTENDANCE_REVIEW_REQUIRED';end if;
  update public.project_assignments set status='completed',checked_out_at=now() where id=a.id;
  insert into public.volunteer_hours(user_id,project_id,assignment_id,hours,role,created_by) values(p_user,a.project_id,a.id,hrs,a.team_role,p_user);
 else raise exception using errcode='22023',message='ATTENDANCE_STATE_INVALID';end if;
 return true;
end; $$;
create or replace function public.scg_notify_allowed(p_kind text,p_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select case when p_kind='project' then exists(select 1 from public.projects where id=p_id and status='open' and scg_private.manage_region(region)) when p_kind='announcement' then scg_private.edit_content() and exists(select 1 from public.announcements where id=p_id) else false end; $$;
revoke all on function public.scg_telegram_apply(uuid,uuid),public.scg_telegram_attendance(uuid,uuid,text),public.scg_notify_allowed(text,uuid) from public,anon,authenticated;
grant execute on function public.scg_telegram_apply(uuid,uuid),public.scg_telegram_attendance(uuid,uuid,text) to service_role;
grant execute on function public.scg_notify_allowed(text,uuid) to authenticated,service_role;

-- New email registrations only accept non-privileged, bounded metadata.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path=''
as $$ begin
 insert into public.profiles(id,first_name,last_name,city,language,theme,role,status,created_at,updated_at)
 values(new.id,left(coalesce(new.raw_user_meta_data->>'first_name',''),80),left(coalesce(new.raw_user_meta_data->>'last_name',''),80),nullif(left(new.raw_user_meta_data->>'city',100),''),case when new.raw_user_meta_data->>'language' in ('ru','kz','en') then new.raw_user_meta_data->>'language' else 'ru' end,case when new.raw_user_meta_data->>'theme' in ('light','dark') then new.raw_user_meta_data->>'theme' else 'light' end,'VOLUNTEER','активен',now(),now()) on conflict(id) do nothing;
 return new;
end; $$;
revoke all on function public.handle_new_auth_user() from public,anon,authenticated;
alter table scg_private.rate_limits enable row level security;

commit;
