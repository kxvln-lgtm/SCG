-- All fixture rows and effects are rolled back. No email provider is called.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into auth.users(id,email,raw_user_meta_data,created_at,updated_at) values
 ('f0000000-0000-4000-8000-000000000001','scg-test-owner@invalid.test','{"first_name":"Test","role":"FOUNDER"}',now(),now()),
 ('f0000000-0000-4000-8000-000000000002','scg-test-other@invalid.test','{}',now(),now()),
 ('f0000000-0000-4000-8000-000000000003','scg-test-region@invalid.test','{}',now(),now());
do $$ begin
 if (select role from public.profiles where id='f0000000-0000-4000-8000-000000000001')<>'VOLUNTEER' then raise exception 'User metadata granted a role';end if;
end; $$;
update public.profiles set role='REGIONAL_EXECUTIVE',department='UNION',region='SCG_TEST_NORTH' where id='f0000000-0000-4000-8000-000000000003';
update public.profiles set department='UNION',region='SCG_TEST_NORTH',scd_id='SCG-ROLLBACK-OWNER' where id='f0000000-0000-4000-8000-000000000001';
update public.profiles set department='UNION',region='SCG_TEST_SOUTH',scd_id='SCG-ROLLBACK-OTHER' where id='f0000000-0000-4000-8000-000000000002';
select set_config('scg.test.own_scd',(select scd_id from public.profiles where id='f0000000-0000-4000-8000-000000000001'),true);
select set_config('scg.test.other_scd',(select scd_id from public.profiles where id='f0000000-0000-4000-8000-000000000002'),true);
insert into public.projects(id,title,status,region,created_by) values
 ('f1000000-0000-4000-8000-000000000001','SCG test accepting','open','SCG_TEST_NORTH','f0000000-0000-4000-8000-000000000003'),
 ('f1000000-0000-4000-8000-000000000002','SCG test private','draft','SCG_TEST_SOUTH','f0000000-0000-4000-8000-000000000003');
insert into public.notifications(id,user_id,title,body) values('f2000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000002','test','test');
insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,created_at,updated_at,secret) values('f3000000-0000-4000-8000-000000000003','f0000000-0000-4000-8000-000000000003','Rollback admin factor','totp','verified',now(),now(),'rollback-only');
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"f0000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
do $$ declare a uuid;t uuid;begin
 if (select count(*) from public.profiles)<>1 then raise exception 'Private profiles leak';end if;
 if exists(select 1 from public.notifications where id='f2000000-0000-4000-8000-000000000001') then raise exception 'Cross-account notification leak';end if;
 begin perform public.command_center_members();raise exception 'Volunteer can list members';exception when insufficient_privilege then null;end;
 begin update public.profiles set role='FOUNDER' where id=auth.uid();raise exception 'Volunteer can elevate role';exception when insufficient_privilege then null;end;
 a:=public.scg_apply_project('f1000000-0000-4000-8000-000000000001');
 if a is distinct from public.scg_apply_project('f1000000-0000-4000-8000-000000000001') then raise exception 'Duplicate application created';end if;
 if not public.scg_cancel_application(a) then raise exception 'Own pending cancellation failed';end if;
 begin perform public.scg_apply_project('f1000000-0000-4000-8000-000000000002');raise exception 'Draft accepting applications';exception when invalid_parameter_value then null;end;
 t:=public.scg_create_ticket('Test subject','other','Test message');
 if not exists(select 1 from public.scg_support_tickets where id=t and user_id=auth.uid()) then raise exception 'Own ticket inaccessible';end if;
 if not public.scg_ai_allowed() then raise exception 'Active member AI denied';end if;
end; $$;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"f0000000-0000-4000-8000-000000000002","aal":"aal1"}',true);
do $$ declare t uuid;begin
 if exists(select 1 from public.scg_support_tickets where user_id='f0000000-0000-4000-8000-000000000001') then raise exception 'Cross-account support leak';end if;
 if exists(select 1 from public.project_applications where user_id='f0000000-0000-4000-8000-000000000001') then raise exception 'Cross-account application leak';end if;
end; $$;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"f0000000-0000-4000-8000-000000000003","aal":"aal1"}',true);
do $$ begin
 if not public.is_admin_user(auth.uid()) then raise exception 'Regional AAL1 admin denied';end if;
 if scg_private.manage_region('SCG_TEST_SOUTH') then raise exception 'Regional scope bypass';end if;
 if not scg_private.manage_region('SCG_TEST_NORTH') then raise exception 'Own region denied';end if;
 if exists(select 1 from public.resolve_scd_for_checkin(current_setting('scg.test.other_scd'))) then raise exception 'Check-in lookup leaks another region';end if;
 if (select count(*) from public.resolve_scd_for_checkin(current_setting('scg.test.own_scd')))<>1 then raise exception 'Own region check-in lookup denied';end if;
 begin perform public.scg_project_team('f1000000-0000-4000-8000-000000000002');raise exception 'Other region team exposed';exception when insufficient_privilege then null;end;
 begin update public.profiles set department='UNION',region='SCG_TEST_SOUTH',scd_id='SCG-ROLLBACK-OTHER' where id=auth.uid();raise exception 'Manager widened own scope';exception when insufficient_privilege then null;end;
end; $$;
reset role;
insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,created_at,updated_at,secret) values('f3000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000001','Rollback test','totp','verified',now(),now(),'rollback-only');
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"f0000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
do $$ begin
 if exists(select 1 from public.profiles) then raise exception 'AAL1 reads private profile';end if;
 if public.scg_ai_allowed() then raise exception 'AAL1 bypasses AI MFA';end if;
 begin perform public.scg_create_ticket('MFA test','other','test');raise exception 'Definer MFA bypass';exception when insufficient_privilege then null;end;
 begin perform public.get_direct_messages('f0000000-0000-4000-8000-000000000002');raise exception 'Private message MFA bypass';exception when insufficient_privilege then null;end;
end; $$;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"f0000000-0000-4000-8000-000000000001","aal":"aal2"}',true);
do $$ begin if (select count(*) from public.profiles)<>1 then raise exception 'AAL2 own profile denied';end if;end; $$;
reset role;
rollback;
select 'SCG access checks passed; all fixtures rolled back' as result;
