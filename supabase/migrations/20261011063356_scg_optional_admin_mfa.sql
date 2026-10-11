begin;
-- The owner explicitly requested that Command Center not require MFA.
-- Keep role, status, ownership, region, and voluntary member MFA checks.
create or replace function scg_private.mfa_satisfied()
returns boolean language sql stable security definer set search_path=''
as $$ select auth.uid() is not null and (
 coalesce(auth.jwt()->>'aal'='aal2',false)
 or exists(select 1 from public.profiles p where p.id=auth.uid()
   and p.status in ('активен','одобрено')
   and p.role in ('FOUNDER','UNION_LEAD','REGIONAL_EXECUTIVE','STAFF','PR','SYSTEMS'))
 or not exists(select 1 from auth.mfa_factors f where f.user_id=auth.uid() and f.status='verified')
); $$;
create or replace function scg_private.manage_region(p_region text)
returns boolean language sql stable security definer set search_path=''
as $$ select scg_private.mfa_satisfied() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status in ('активен','одобрено')
and (p.role in ('FOUNDER','UNION_LEAD','STAFF','SYSTEMS') or (p.role='REGIONAL_EXECUTIVE' and p.region is not null and p.region=p_region))); $$;
create or replace function scg_private.edit_content()
returns boolean language sql stable security definer set search_path=''
as $$ select scg_private.mfa_satisfied() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status in ('активен','одобрено') and p.role in ('FOUNDER','UNION_LEAD','STAFF','PR','SYSTEMS')); $$;
create or replace function public.is_admin_user(uid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select scg_private.mfa_satisfied() and exists(select 1 from public.profiles p where p.id=uid and p.role in ('FOUNDER','UNION_LEAD','REGIONAL_EXECUTIVE','STAFF','SYSTEMS') and p.status in ('активен','одобрено')); $$;
create or replace function public.is_system_admin(uid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select scg_private.mfa_satisfied() and exists(select 1 from public.profiles p where p.id=uid and p.role in ('FOUNDER','STAFF','SYSTEMS') and p.status in ('активен','одобрено')); $$;
create or replace function public.prevent_non_founder_role_change()
returns trigger language plpgsql security definer set search_path=''
as $$ begin
 if old.role is distinct from new.role and coalesce(auth.jwt()->>'role','')<>'service_role'
 and not (auth.uid() is null and session_user in ('postgres','supabase_admin'))
 and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='FOUNDER' and p.status in ('активен','одобрено') and scg_private.mfa_satisfied()) then
 raise exception using errcode='42501',message='FOUNDER_REQUIRED';end if;
 return new;
end; $$;
create or replace function public.scg_change_member_access(p_member uuid,p_role text,p_department text,p_region text,p_status text)
returns boolean language plpgsql security definer set search_path=''
as $$ begin
 if not scg_private.mfa_satisfied() or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='FOUNDER' and p.status in ('активен','одобрено')) then raise exception using errcode='42501',message='FOUNDER_REQUIRED'; end if;
 if p_status is null or p_status not in ('активен','одобрено','ожидание','отклонено') then raise exception using errcode='22023',message='INVALID_STATUS';end if;
 if p_role='REGIONAL_EXECUTIVE' and (p_department is distinct from 'UNION' or nullif(trim(p_region),'') is null) then raise exception using errcode='22023',message='REGION_REQUIRED';end if;
 if p_role is null or p_role not in ('VOLUNTEER','UNION_LEAD','REGIONAL_EXECUTIVE','STAFF','PR','SYSTEMS','QUORUM','CAST') then raise exception using errcode='22023',message='INVALID_ROLE'; end if;
 if exists(select 1 from public.profiles p where p.id=p_member and p.role='FOUNDER') then raise exception using errcode='42501',message='FOUNDER_PROTECTED'; end if;
 update public.profiles set role=p_role,department=nullif(trim(p_department),''),division=nullif(trim(p_department),''),region=case when p_department='UNION' then nullif(trim(p_region),'') else null end,status=p_status where id=p_member;
 return found;
end; $$;
-- CREATE OR REPLACE preserves existing, restrictive EXECUTE grants.
commit;
