begin;
create or replace function public.scg_change_member_access(p_member uuid,p_role text,p_department text,p_region text,p_status text)
returns boolean language plpgsql security definer set search_path=''
as $$ begin
 if coalesce(auth.jwt()->>'aal','')<>'aal2' or not scg_private.mfa_satisfied() or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='FOUNDER' and p.status in ('активен','одобрено')) then raise exception using errcode='42501',message='FOUNDER_REQUIRED'; end if;
 if p_status not in ('активен','одобрено','ожидание','отклонено') then raise exception using errcode='22023',message='INVALID_STATUS';end if;
 if p_role='REGIONAL_EXECUTIVE' and (p_department<>'UNION' or nullif(trim(p_region),'') is null) then raise exception using errcode='22023',message='REGION_REQUIRED';end if;
 if p_role not in ('VOLUNTEER','UNION_LEAD','REGIONAL_EXECUTIVE','STAFF','PR','SYSTEMS','QUORUM','CAST') then raise exception using errcode='22023',message='INVALID_ROLE'; end if;
 if exists(select 1 from public.profiles p where p.id=p_member and p.role='FOUNDER') then raise exception using errcode='42501',message='FOUNDER_PROTECTED'; end if;
 update public.profiles set role=p_role,department=nullif(trim(p_department),''),division=nullif(trim(p_department),''),region=case when p_department='UNION' then nullif(trim(p_region),'') else null end,status=p_status where id=p_member;
 return found;
end; $$;

create or replace function public.scg_create_post(p_body text)
returns uuid language plpgsql security definer set search_path=''
as $$ declare post uuid;begin
if not scg_private.active_member() then raise exception using errcode='42501',message='MEMBER_NOT_ACTIVE';end if;
perform scg_private.consume_limit('post_create',10,3600);
if char_length(trim(p_body)) not between 1 and 5000 then raise exception using errcode='22023',message='POST_INVALID';end if;
insert into public.posts(author_id,body,visibility) values(auth.uid(),trim(p_body),'public') returning id into post;
return post;
end; $$;
revoke all on function public.scg_create_post(text) from public,anon;
grant execute on function public.scg_create_post(text) to authenticated,service_role;
revoke insert on public.posts from authenticated;
create policy scg_posts_mfa on public.posts as restrictive for all to authenticated using(scg_private.mfa_satisfied()) with check(scg_private.mfa_satisfied());
create policy scg_likes_mfa on public.post_likes as restrictive for all to authenticated using(scg_private.mfa_satisfied()) with check(scg_private.mfa_satisfied());
create policy scg_follow_mfa on public.follows as restrictive for all to authenticated using(scg_private.mfa_satisfied()) with check(scg_private.mfa_satisfied());
commit;
