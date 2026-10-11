create or replace function public.resolve_scd_for_checkin(p_scd text)
returns table(id uuid,first_name text,last_name text,scd_id text,department text,region text)
language plpgsql security definer set search_path=''
as $$ begin
 if not public.is_admin_user(auth.uid()) then raise exception using errcode='42501',message='COMMAND_CENTER_FORBIDDEN';end if;
 return query select p.id,p.first_name,p.last_name,p.scd_id,p.department,p.region
 from public.profiles p where p.scd_id=trim(p_scd) and scg_private.manage_region(p.region) limit 1;
end; $$;
revoke all on function public.resolve_scd_for_checkin(text) from public,anon;
grant execute on function public.resolve_scd_for_checkin(text) to authenticated;
