begin;
create or replace function public.prevent_non_founder_role_change()
returns trigger language plpgsql security definer set search_path=''
as $$ begin
 if old.role is distinct from new.role and coalesce(auth.jwt()->>'role','')<>'service_role'
 and not (auth.uid() is null and session_user in ('postgres','supabase_admin'))
 and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='FOUNDER' and p.status in ('активен','одобрено') and auth.jwt()->>'aal'='aal2') then
 raise exception using errcode='42501',message='FOUNDER_MFA_REQUIRED';end if;
 return new;
end; $$;
revoke all on function public.prevent_non_founder_role_change() from public,anon,authenticated;
create or replace function scg_private.manage_region(p_region text)
returns boolean language sql stable security definer set search_path=''
as $$ select auth.jwt()->>'aal'='aal2' and scg_private.mfa_satisfied() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status in ('активен','одобрено')
and (p.role in ('FOUNDER','UNION_LEAD','STAFF','SYSTEMS') or (p.role='REGIONAL_EXECUTIVE' and p.region is not null and p.region=p_region))); $$;
create or replace function scg_private.edit_content()
returns boolean language sql stable security definer set search_path=''
as $$ select auth.jwt()->>'aal'='aal2' and scg_private.mfa_satisfied() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status in ('активен','одобрено') and p.role in ('FOUNDER','UNION_LEAD','STAFF','PR','SYSTEMS')); $$;
create or replace function public.is_admin_user(uid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select auth.jwt()->>'aal'='aal2' and scg_private.mfa_satisfied() and exists(select 1 from public.profiles p where p.id=uid and p.role in ('FOUNDER','UNION_LEAD','REGIONAL_EXECUTIVE','STAFF','SYSTEMS') and p.status in ('активен','одобрено')); $$;
create or replace function public.is_system_admin(uid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select auth.jwt()->>'aal'='aal2' and scg_private.mfa_satisfied() and exists(select 1 from public.profiles p where p.id=uid and p.role in ('FOUNDER','STAFF','SYSTEMS') and p.status in ('активен','одобрено')); $$;
create or replace function scg_private.consume_limit(p_action text,p_limit integer,p_seconds integer)
returns void language plpgsql security definer set search_path=''
as $$ declare w timestamptz;n integer;begin
 if auth.uid() is null then raise exception using errcode='28000',message='AUTH_REQUIRED';end if;
 if not scg_private.mfa_satisfied() then raise exception using errcode='42501',message='MFA_REQUIRED';end if;
 w:=to_timestamp(floor(extract(epoch from now())/p_seconds)*p_seconds);
 insert into scg_private.rate_limits(user_id,action,window_start,hits) values(auth.uid(),p_action,w,1)
 on conflict(user_id,action,window_start) do update set hits=scg_private.rate_limits.hits+1 returning hits into n;
 if n>p_limit then raise exception using errcode='54000',message='REQUEST_LIMIT';end if;
end; $$;
-- pg_trgm functions/operators retain their OIDs, including dependent indexes.
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;
grant usage on schema extensions to authenticated,service_role;
commit;
