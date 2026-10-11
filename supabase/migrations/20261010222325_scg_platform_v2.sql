begin;
create schema if not exists scg_private;
revoke all on schema scg_private from public,anon;
grant usage on schema scg_private to authenticated,service_role;

create or replace function scg_private.active_member()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status in ('активен','одобрено')); $$;
create or replace function scg_private.manage_region(p_region text)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status in ('активен','одобрено')
 and (p.role in ('FOUNDER','UNION_LEAD','STAFF','SYSTEMS')
 or (p.role='REGIONAL_EXECUTIVE' and p.region is not null and p.region=p_region))); $$;
create or replace function scg_private.edit_content()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status in ('активен','одобрено')
 and p.role in ('FOUNDER','UNION_LEAD','STAFF','PR','SYSTEMS')); $$;
revoke all on function scg_private.active_member(),scg_private.manage_region(text),scg_private.edit_content() from public,anon;
grant execute on function scg_private.active_member(),scg_private.manage_region(text),scg_private.edit_content() to authenticated,service_role;

alter table public.profiles add column if not exists email_projects_enabled boolean not null default false;
alter table public.profiles add column if not exists email_announcements_enabled boolean not null default false;
alter table public.profiles add column if not exists email_posts_enabled boolean not null default false;
alter table public.profiles add column if not exists email_support_enabled boolean not null default false;
alter table public.posts add column if not exists title text;

create table if not exists public.scg_support_tickets(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
 subject text not null check(char_length(subject) between 3 and 160),
 category text not null default 'other' check(category in ('account','project','documents','bug','other')),
 status text not null default 'new' check(status in ('new','in_progress','resolved','closed')),
 priority text not null default 'normal' check(priority in ('normal','high')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.scg_support_messages(
 id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.scg_support_tickets(id),
 author_id uuid not null references public.profiles(id),body text not null check(char_length(body) between 1 and 5000),
 created_at timestamptz not null default now()
);
create table if not exists public.scg_content_drafts(
 id uuid primary key default gen_random_uuid(),author_id uuid not null references public.profiles(id),
 title text not null check(char_length(title) between 1 and 160),body text not null default '' check(char_length(body)<=12000),
 status text not null default 'idea' check(status in ('idea','draft','review','published')),
 planned_at timestamptz,post_id uuid references public.posts(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.scg_document_acknowledgements(
 user_id uuid not null references public.profiles(id),document_slug text not null,
 document_version text not null,acknowledged_at timestamptz not null default now(),
 primary key(user_id,document_slug,document_version)
);
create table if not exists public.scg_email_outbox(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
 kind text not null check(kind in ('project','announcement','post','support','application')),
 subject text not null,payload jsonb not null,
 status text not null default 'queued' check(status in ('queued','sending','sent','failed','skipped')),
 attempts integer not null default 0,available_at timestamptz not null default now(),
 claimed_at timestamptz,sent_at timestamptz,last_error text,
 created_at timestamptz not null default now(),dedupe_key text unique
);
create table if not exists scg_private.rate_limits(
 user_id uuid not null,action text not null,window_start timestamptz not null,hits integer not null,
 primary key(user_id,action,window_start)
);
create index if not exists scg_support_owner_idx on public.scg_support_tickets(user_id,created_at desc);
create index if not exists scg_support_queue_idx on public.scg_support_tickets(status,updated_at desc);
create index if not exists scg_support_messages_ticket_idx on public.scg_support_messages(ticket_id,created_at);
create index if not exists scg_content_status_idx on public.scg_content_drafts(status,planned_at);
create index if not exists scg_email_queue_idx on public.scg_email_outbox(status,available_at) where status in ('queued','sending');
create index if not exists scg_ai_messages_owner_time_idx on public.ai_messages(user_id,created_at desc);

alter table public.scg_support_tickets enable row level security;
alter table public.scg_support_messages enable row level security;
alter table public.scg_content_drafts enable row level security;
alter table public.scg_document_acknowledgements enable row level security;
alter table public.scg_email_outbox enable row level security;
alter table scg_private.rate_limits enable row level security;
revoke all on public.scg_support_tickets,public.scg_support_messages,public.scg_content_drafts,public.scg_document_acknowledgements,public.scg_email_outbox from anon,public;
grant select on public.scg_support_tickets,public.scg_support_messages to authenticated;
grant select,insert,update on public.scg_content_drafts to authenticated;
grant select,insert on public.scg_document_acknowledgements to authenticated;
grant all on public.scg_support_tickets,public.scg_support_messages,public.scg_content_drafts,public.scg_document_acknowledgements,public.scg_email_outbox to service_role;
create policy scg_tickets_read on public.scg_support_tickets for select to authenticated
 using(user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=user_id and scg_private.manage_region(p.region)));
create policy scg_messages_read on public.scg_support_messages for select to authenticated
 using(exists(select 1 from public.scg_support_tickets t where t.id=ticket_id));
create policy scg_drafts_read on public.scg_content_drafts for select to authenticated using(scg_private.edit_content());
create policy scg_drafts_insert on public.scg_content_drafts for insert to authenticated with check(author_id=(select auth.uid()) and scg_private.edit_content() and status<>'published' and post_id is null);
create policy scg_drafts_update on public.scg_content_drafts for update to authenticated using(scg_private.edit_content() and status<>'published') with check(scg_private.edit_content() and status<>'published' and post_id is null);
create policy scg_ack_read on public.scg_document_acknowledgements for select to authenticated using(user_id=(select auth.uid()));
create policy scg_ack_insert on public.scg_document_acknowledgements for insert to authenticated
 with check(user_id=(select auth.uid()) and document_slug in ('organizational','member','leadership','regional','project','disciplinary','brand') and document_version='2026-09-20');

create or replace function scg_private.consume_limit(p_action text,p_limit integer,p_seconds integer)
returns void language plpgsql security definer set search_path=''
as $$ declare w timestamptz; n integer; begin
 if auth.uid() is null then raise exception using errcode='28000',message='AUTH_REQUIRED'; end if;
 w:=to_timestamp(floor(extract(epoch from now())/p_seconds)*p_seconds);
 insert into scg_private.rate_limits(user_id,action,window_start,hits) values(auth.uid(),p_action,w,1)
 on conflict(user_id,action,window_start) do update set hits=scg_private.rate_limits.hits+1 returning hits into n;
 if n>p_limit then raise exception using errcode='54000',message='REQUEST_LIMIT'; end if;
end; $$;
revoke all on function scg_private.consume_limit(text,integer,integer) from public,anon,authenticated;

create or replace function public.scg_create_ticket(p_subject text,p_category text,p_body text)
returns uuid language plpgsql security definer set search_path=''
as $$ declare ticket uuid; begin
 perform scg_private.consume_limit('support_create',5,3600);
 insert into public.scg_support_tickets(user_id,subject,category) values(auth.uid(),trim(p_subject),p_category) returning id into ticket;
 insert into public.scg_support_messages(ticket_id,author_id,body) values(ticket,auth.uid(),trim(p_body));
 return ticket;
end; $$;
create or replace function public.scg_reply_ticket(p_ticket uuid,p_body text,p_status text default null)
returns uuid language plpgsql security definer set search_path=''
as $$ declare t public.scg_support_tickets; m uuid; manager boolean; begin
 perform scg_private.consume_limit('support_reply',30,3600);
 select * into t from public.scg_support_tickets where id=p_ticket for update;
 if not found then raise exception using errcode='42501',message='TICKET_FORBIDDEN'; end if;
 select scg_private.manage_region(p.region) into manager from public.profiles p where p.id=t.user_id;
 if t.user_id<>auth.uid() and not coalesce(manager,false) then raise exception using errcode='42501',message='TICKET_FORBIDDEN'; end if;
 if p_status is not null and not manager then raise exception using errcode='42501',message='STATUS_FORBIDDEN'; end if;
 insert into public.scg_support_messages(ticket_id,author_id,body) values(t.id,auth.uid(),trim(p_body)) returning id into m;
 update public.scg_support_tickets set status=coalesce(p_status,case when manager then 'in_progress' else 'new' end),updated_at=now() where id=t.id;
 if manager and t.user_id<>auth.uid() then
  insert into public.notifications(user_id,title,body) values(t.user_id,'Поддержка ответила','Новый ответ по обращению «'||t.subject||'». Открой раздел «Поддержка».');
  if exists(select 1 from public.profiles p where p.id=t.user_id and p.email_support_enabled) then
   insert into public.scg_email_outbox(user_id,kind,subject,payload,dedupe_key) values(t.user_id,'support','Поддержка SCG: новый ответ',jsonb_build_object('title',t.subject,'body','В твоём обращении появился новый ответ.','url','https://stagecraft.kz/backstage/#support'), 'support:'||m::text) on conflict do nothing;
  end if;
 end if;
 return m;
end; $$;

create or replace function public.scg_public_projects()
returns table(id uuid,title text,description text,location text,event_date timestamptz,status text,department text,region text,volunteers_required integer,application_deadline timestamptz,cover_url text,dress_code text,start_time timestamptz,end_time timestamptz,schedule text,map_url text)
language sql stable security definer set search_path=''
as $$ select p.id,p.title,p.description,p.location,p.event_date,p.status,p.department,p.region,p.volunteers_required,p.application_deadline,p.cover_url,p.dress_code,p.start_time,p.end_time,p.schedule,p.map_url
 from public.projects p where p.status in ('open','closed','completed') order by p.event_date desc nulls last limit 100; $$;

create or replace function public.scg_apply_project(p_project uuid)
returns uuid language plpgsql security definer set search_path=''
as $$ declare p public.projects; application uuid; current_status text; begin
 perform scg_private.consume_limit('project_apply',20,3600);
 if not scg_private.active_member() then raise exception using errcode='42501',message='MEMBER_NOT_ACTIVE'; end if;
 select * into p from public.projects where id=p_project for share;
 if not found or p.status<>'open' or (p.application_deadline is not null and p.application_deadline<=now()) then raise exception using errcode='22023',message='APPLICATIONS_CLOSED'; end if;
 select a.id,a.status into application,current_status from public.project_applications a where a.project_id=p.id and a.user_id=auth.uid() for update;
 if current_status in ('pending','approved') then return application; end if;
 if application is null then insert into public.project_applications(project_id,user_id,status) values(p.id,auth.uid(),'pending') returning id into application;
 else update public.project_applications set status='pending',created_at=now() where id=application; end if;
 return application;
end; $$;
create or replace function public.scg_cancel_application(p_application uuid)
returns boolean language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception using errcode='28000',message='AUTH_REQUIRED'; end if;
 update public.project_applications set status='cancelled' where id=p_application and user_id=auth.uid() and status='pending';
 return found;
end; $$;

create or replace function public.scg_admin_overview()
returns jsonb language plpgsql security definer set search_path=''
as $$ begin
 if not public.is_admin_user(auth.uid()) and not scg_private.edit_content() then raise exception using errcode='42501',message='COMMAND_CENTER_FORBIDDEN'; end if;
 return jsonb_build_object('members',(select count(*) from public.profiles p where scg_private.manage_region(p.region)),
 'projects',(select count(*) from public.projects p where scg_private.manage_region(p.region)),
 'pending',(select count(*) from public.project_applications a join public.projects p on p.id=a.project_id where a.status='pending' and scg_private.manage_region(p.region)),
 'support',(select count(*) from public.scg_support_tickets t join public.profiles p on p.id=t.user_id where t.status in ('new','in_progress') and scg_private.manage_region(p.region)),
 'drafts',(select count(*) from public.scg_content_drafts where status<>'published' and scg_private.edit_content()),
 'email_queued',(select count(*) from public.scg_email_outbox where status='queued' and public.is_system_admin(auth.uid())));
end; $$;

create or replace function public.scg_change_member_access(p_member uuid,p_role text,p_department text,p_region text,p_status text)
returns boolean language plpgsql security definer set search_path=''
as $$ begin
 if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='FOUNDER' and p.status in ('активен','одобрено')) then raise exception using errcode='42501',message='FOUNDER_REQUIRED'; end if;
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
  hrs:=least(24,round(extract(epoch from(now()-a.checked_in_at))/3600.0,2));
  update public.project_assignments set status='completed',checked_out_at=now() where id=a.id;
  insert into public.volunteer_hours(user_id,project_id,assignment_id,hours,role,created_by) values(member.id,p.id,a.id,hrs,a.team_role,auth.uid());
 else raise exception using errcode='22023',message='INVALID_MODE'; end if;
 return jsonb_build_object('name',concat_ws(' ',member.first_name,member.last_name),'scd_id',member.scd_id,'mode',p_mode,'hours',hrs);
end; $$;

create or replace function public.scg_publish_draft(p_draft uuid)
returns uuid language plpgsql security definer set search_path=''
as $$ declare d public.scg_content_drafts; post uuid; begin
 if not scg_private.edit_content() then raise exception using errcode='42501',message='CONTENT_FORBIDDEN'; end if;
 select * into d from public.scg_content_drafts where id=p_draft for update;
 if not found or char_length(trim(d.body))<1 then raise exception using errcode='22023',message='DRAFT_EMPTY'; end if;
 if d.status='published' then return d.post_id; end if;
 insert into public.posts(author_id,title,body,visibility) values(auth.uid(),d.title,d.body,'public') returning id into post;
 update public.scg_content_drafts set status='published',post_id=post,updated_at=now() where id=d.id;
 return post;
end; $$;

-- Server-side alerts; opt-in email only. No retroactive mail is sent.
create or replace function scg_private.project_notifications()
returns trigger language plpgsql security definer set search_path=''
as $$ declare p record; newly_open boolean; begin
 if TG_OP='INSERT' then newly_open:=new.status='open';else newly_open:=new.status='open' and old.status<>'open';end if;
 if not newly_open then return new; end if;
 for p in select id,email_projects_enabled,project_notifications_enabled from public.profiles where status in ('активен','одобрено')
 and (new.department is null or new.department='' or coalesce(department,division)=new.department)
 and (new.region is null or new.region='' or region=new.region) loop
  if p.project_notifications_enabled then insert into public.notifications(user_id,title,body) values(p.id,'Новый проект: '||new.title,'Открой раздел «Проекты», чтобы узнать детали и подать заявку.');end if;
  if p.email_projects_enabled then insert into public.scg_email_outbox(user_id,kind,subject,payload,dedupe_key) values(p.id,'project','SCG: новый проект — '||new.title,jsonb_build_object('title',new.title,'body',left(coalesce(new.description,''),600),'url','https://stagecraft.kz/backstage/#projects'),'project:'||new.id::text||':'||p.id::text) on conflict do nothing;end if;
 end loop;
 return new;
end; $$;
create trigger scg_project_alerts after insert or update of status on public.projects for each row execute function scg_private.project_notifications();
create or replace function scg_private.announcement_notifications()
returns trigger language plpgsql security definer set search_path=''
as $$ declare p record; begin
 for p in select id,email_announcements_enabled,announcement_notifications_enabled from public.profiles where status in ('активен','одобрено')
 and (new.department is null or new.department='' or coalesce(department,division)=new.department)
 and (new.region is null or new.region='' or region=new.region) loop
  if p.announcement_notifications_enabled then insert into public.notifications(user_id,title,body) values(p.id,new.title,left(new.body,600));end if;
  if p.email_announcements_enabled then insert into public.scg_email_outbox(user_id,kind,subject,payload,dedupe_key) values(p.id,'announcement','SCG: '||new.title,jsonb_build_object('title',new.title,'body',left(new.body,600),'url','https://stagecraft.kz/backstage/#notifications'),'announcement:'||new.id::text||':'||p.id::text) on conflict do nothing;end if;
 end loop;
 return new;
end; $$;
create trigger scg_announcement_alerts after insert on public.announcements for each row execute function scg_private.announcement_notifications();
create or replace function scg_private.post_notifications()
returns trigger language plpgsql security definer set search_path=''
as $$ declare p record; begin
 if new.visibility<>'public' then return new;end if;
 for p in select pr.id,pr.email_posts_enabled from public.follows f join public.profiles pr on pr.id=f.follower_id where f.following_id=new.author_id and pr.id<>new.author_id and pr.status in ('активен','одобрено') loop
  insert into public.notifications(user_id,title,body) values(p.id,'Новый пост в SCG',left(new.body,200));
  if p.email_posts_enabled then insert into public.scg_email_outbox(user_id,kind,subject,payload,dedupe_key) values(p.id,'post','SCG: новая публикация',jsonb_build_object('title',coalesce(new.title,'Новая публикация'),'body',left(new.body,500),'url','https://stagecraft.kz/backstage/#feed'),'post:'||new.id::text||':'||p.id::text) on conflict do nothing;end if;
 end loop;
 return new;
end; $$;
create trigger scg_post_alerts after insert on public.posts for each row execute function scg_private.post_notifications();

-- Internal mail worker claims a short lease; abandoned work is retryable.
create or replace function public.scg_claim_email_batch(p_limit integer default 10)
returns setof public.scg_email_outbox language plpgsql security definer set search_path=''
as $$ begin
 if auth.role()<>'service_role' then raise exception using errcode='42501',message='SERVICE_REQUIRED';end if;
 return query with picked as (select id from public.scg_email_outbox where (status='queued' or (status='sending' and claimed_at<now()-interval '10 minutes')) and available_at<=now() and attempts<5 order by created_at for update skip locked limit least(greatest(p_limit,1),25))
 update public.scg_email_outbox o set status='sending',claimed_at=now(),attempts=o.attempts+1 from picked where o.id=picked.id returning o.*;
end; $$;
revoke all on function public.scg_claim_email_batch(integer) from public,anon,authenticated;
grant execute on function public.scg_claim_email_batch(integer) to service_role;

-- Enforce conversation ownership even when a caller guesses a conversation UUID.
create policy scg_ai_message_conversation_owner on public.ai_messages as restrictive for insert to authenticated
with check(role='user' and exists(select 1 from public.ai_conversations c where c.id=conversation_id and c.user_id=(select auth.uid())));
revoke update on public.scg_content_drafts from authenticated;
grant update(title,body,status,planned_at) on public.scg_content_drafts to authenticated;

do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'scg_%' and p.proname<>'scg_claim_email_batch' loop
  execute format('revoke all on function %s from public,anon',f.signature);
  execute format('grant execute on function %s to authenticated,service_role',f.signature);
 end loop;
end; $$;
grant execute on function public.scg_public_projects() to anon;
revoke all on function scg_private.project_notifications(),scg_private.announcement_notifications(),scg_private.post_notifications() from public,anon,authenticated;
commit;
