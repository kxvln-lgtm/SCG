begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into auth.users(id,email,raw_user_meta_data,created_at,updated_at) values
 ('f4000000-0000-4000-8000-000000000001','scg-test-manager@invalid.test','{}',now(),now()),
 ('f4000000-0000-4000-8000-000000000002','scg-test-member@invalid.test','{}',now(),now());
update public.profiles set role='STAFF',status='одобрено' where id='f4000000-0000-4000-8000-000000000001';
update public.profiles set email_projects_enabled=true,email_support_enabled=true where id='f4000000-0000-4000-8000-000000000002';
insert into public.projects(id,title,status,created_by) values('f4100000-0000-4000-8000-000000000001','SCG workflow test','open','f4000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"f4000000-0000-4000-8000-000000000002","aal":"aal1"}',true);
select public.scg_apply_project('f4100000-0000-4000-8000-000000000001');
select public.scg_create_ticket('Workflow support','project','Test reply workflow');
select public.scg_create_post('A rollback-only publication');
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(select id from public.profiles where role='FOUNDER'),'aal','aal1')::text,true);
do $$ begin
 begin perform public.scg_change_member_access('f4000000-0000-4000-8000-000000000002','VOLUNTEER',null,null,'одобрено');raise exception 'Founder access without MFA';exception when insufficient_privilege then null;end;
end; $$;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"f4000000-0000-4000-8000-000000000001","aal":"aal2"}',true);
do $$ declare a uuid;t uuid;d uuid;scd text;begin
 select id into a from public.project_applications where project_id='f4100000-0000-4000-8000-000000000001';
 perform public.command_center_application_action(a,'approve','Volunteer');
 begin perform public.command_center_application_action(a,'approve','Volunteer');raise exception 'Repeated approval allowed';exception when invalid_parameter_value then null;end;
 select scd_id into scd from public.profiles where id='f4000000-0000-4000-8000-000000000002';
 perform public.scg_checkin('f4100000-0000-4000-8000-000000000001',scd,'in');
 begin perform public.scg_checkin('f4100000-0000-4000-8000-000000000001',scd,'in');raise exception 'Repeated check-in allowed';exception when invalid_parameter_value then null;end;
 select id into t from public.scg_support_tickets where user_id='f4000000-0000-4000-8000-000000000002';
 perform public.scg_reply_ticket(t,'Reply from the team','resolved');
 insert into public.scg_content_drafts(author_id,title,body,status) values(auth.uid(),'Test material','A rollback-only draft','review') returning id into d;
 perform public.scg_publish_draft(d);
 if not exists(select 1 from public.scg_content_drafts where id=d and status='published' and post_id is not null) then raise exception 'Publication not atomic';end if;
end; $$;
reset role;
update public.project_assignments set checked_in_at=now()-interval '2 hours' where project_id='f4100000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ declare scd text;begin
 select scd_id into scd from public.profiles where id='f4000000-0000-4000-8000-000000000002';
 perform public.scg_checkin('f4100000-0000-4000-8000-000000000001',scd,'out');
 begin perform public.scg_checkin('f4100000-0000-4000-8000-000000000001',scd,'out');raise exception 'Repeated check-out allowed';exception when invalid_parameter_value then null;end;
 if (select sum(hours) from public.volunteer_hours where user_id='f4000000-0000-4000-8000-000000000002')<>2 then raise exception 'Hours wrong';end if;
 update public.projects set status='completed' where id='f4100000-0000-4000-8000-000000000001';
end; $$;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"f4000000-0000-4000-8000-000000000002","aal":"aal1"}',true);
do $$ declare c public.certificates;begin
 c:=public.issue_own_certificate('f4100000-0000-4000-8000-000000000001');
 if c.hours<>2 then raise exception 'Certificate uses unrecorded hours';end if;
end; $$;
reset role;
do $$ begin
 if not exists(select 1 from public.scg_email_outbox where user_id='f4000000-0000-4000-8000-000000000002' and kind='support') then raise exception 'Opted-in support mail missing';end if;
 if not exists(select 1 from public.scg_email_outbox where user_id='f4000000-0000-4000-8000-000000000002' and kind='application') then raise exception 'Opted-in application mail missing';end if;
end; $$;
rollback;
select 'SCG approval, attendance, hours, certificate, support, content and mail queue checks passed; fixtures rolled back' as result;
