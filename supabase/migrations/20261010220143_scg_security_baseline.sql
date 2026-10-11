-- SCG: close anonymous service operations without deleting user data.
begin;
revoke create on schema public from public, anon, authenticated;

do $migration$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature,p.proname,p.prorettype
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public,anon',f.signature);
    if f.prorettype in ('trigger'::regtype,'event_trigger'::regtype)
       or f.proname in ('link_telegram_profile','cleanup_telegram_registration_sessions','mark_project_telegram_notified') then
      execute format('revoke execute on function %s from authenticated',f.signature);
      execute format('grant execute on function %s to service_role',f.signature);
    else
      execute format('grant execute on function %s to authenticated,service_role',f.signature);
    end if;
  end loop;
end;
$migration$;
-- Public feed contains only posts explicitly published by their authors.
grant execute on function public.get_public_feed(integer,integer) to anon;

create or replace function public.is_admin_user(uid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles p where p.id=uid
  and p.role in ('FOUNDER','UNION_LEAD','REGIONAL_EXECUTIVE','STAFF','SYSTEMS')
  and p.status in ('активен','одобрено')); $$;
create or replace function public.is_system_admin(uid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles p where p.id=uid
  and p.role in ('FOUNDER','STAFF','SYSTEMS')
  and p.status in ('активен','одобрено')); $$;
revoke all on function public.is_admin_user(uuid),public.is_system_admin(uuid) from public,anon;
grant execute on function public.is_admin_user(uuid),public.is_system_admin(uuid) to authenticated,service_role;

create or replace function public.protect_profile_system_fields()
returns trigger language plpgsql security definer set search_path=''
as $$
declare trusted boolean := coalesce(auth.role()='service_role',false)
  or (auth.uid() is null and session_user in ('postgres','supabase_admin'));
begin
  if not trusted and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='FOUNDER') then
    if old.role is distinct from new.role or old.status is distinct from new.status
       or old.scd_id is distinct from new.scd_id or old.id is distinct from new.id then
      raise exception using errcode='42501',message='SYSTEM_FIELDS_PROTECTED';
    end if;
  end if;
  if not trusted and (
       old.telegram_id is distinct from new.telegram_id
       or old.phone_verified is distinct from new.phone_verified
       or old.phone_verified_at is distinct from new.phone_verified_at
       or old.phone_verified_via is distinct from new.phone_verified_via
       or old.source_hours is distinct from new.source_hours
       or old.created_at is distinct from new.created_at) then
    raise exception using errcode='42501',message='VERIFIED_FIELDS_PROTECTED';
  end if;
  if new.department is distinct from 'UNION' then new.region:=null; end if;
  new.updated_at:=now();
  return new;
end; $$;
revoke all on function public.protect_profile_system_fields() from public,anon,authenticated;

-- A notification recipient may mark it read, not rewrite its content or owner.
revoke update on public.notifications from authenticated;
grant update(read) on public.notifications to authenticated;
revoke update on public.direct_messages from authenticated;
grant update(read_at) on public.direct_messages to authenticated;
-- Friendship transitions are already provided by validated RPCs.
revoke insert,update on public.friend_requests from authenticated;

drop policy if exists "public can view volunteer hours" on public.volunteer_hours;
create policy "members read own hours" on public.volunteer_hours for select to authenticated
using(user_id=(select auth.uid()) or public.is_admin_user((select auth.uid())));

-- A signed-in user cannot submit to a draft/closed/expired project by calling REST directly.
drop policy if exists "users apply" on public.project_applications;
create policy "users apply to accepting projects" on public.project_applications for insert to authenticated
with check(user_id=(select auth.uid()) and status='pending'
 and exists(select 1 from public.projects p where p.id=project_id and p.status='open'
   and (p.application_deadline is null or p.application_deadline>now()))
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status in ('активен','одобрено')));

-- Limits apply to new uploads; existing documents stay intact and private.
update storage.buckets set file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='avatars';
update storage.buckets set file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'] where id='identity-documents';
commit;
