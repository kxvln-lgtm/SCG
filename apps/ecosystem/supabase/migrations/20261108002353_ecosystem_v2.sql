-- Additive Services foundation. LOCAL ONLY until release gates pass.
-- No changes to existing Auth, profiles, projects, assignments or roles.
begin;
create schema if not exists scg_services_private;
revoke all on schema scg_services_private from public;
grant usage on schema scg_services_private to authenticated;
create table public.service_organizations (
 id uuid primary key default gen_random_uuid(), legal_name text not null check(length(trim(legal_name)) between 2 and 250),
 legal_form text not null check(legal_form in ('legal_entity','individual_entrepreneur')),
 registration_id text not null check(registration_id ~ '^[0-9]{12}$'), city text not null check(length(trim(city)) between 2 and 150),
 status text not null default 'pending' check(status in ('pending','needs_information','verified','rejected','suspended')),
 created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(),
 reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, review_reason text,
 unique(registration_id)
);
create table public.service_organization_members (
 organization_id uuid not null references public.service_organizations(id), user_id uuid not null references public.profiles(id),
 role text not null check(role in ('owner','manager','viewer')), authorized boolean not null default false,
 revoked_at timestamptz, primary key(organization_id,user_id)
);
create table public.service_catalog (
 id text primary key, division text not null check(division in ('BSU','BSS','CB','SCN')),
 title text not null, pricing_mode text not null check(pricing_mode in ('volunteer_review','indicative_rate','fixed_package','custom_quote')),
 published boolean not null default false, max_quantity integer not null default 500 check(max_quantity between 1 and 1000),
 check(division<>'BSU' or pricing_mode='volunteer_review')
);
insert into public.service_catalog(id,division,title,pricing_mode,published) values
 ('volunteers','BSU','Волонтёрское сопровождение','volunteer_review',true),
 ('event_staff','BSS','Персонал мероприятия','custom_quote',true),
 ('photographers','CB','Фотосъёмка','custom_quote',true),
 ('dancers','SCN','Танцевальная команда','custom_quote',true);
create table public.service_requests (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.service_organizations(id),
 created_by uuid not null references public.profiles(id), title text not null check(length(trim(title)) between 3 and 250), city text not null check(length(trim(city)) between 2 and 150), venue text not null check(length(trim(venue)) between 2 and 500),
 starts_at timestamptz not null, ends_at timestamptz not null, timezone text not null default 'Asia/Almaty' check(timezone='Asia/Almaty'),
 brief text not null default '' check(length(brief)<=10000),
 status text not null default 'draft' check(status in ('draft','submitted','under_review','awaiting_acceptance','confirmed','cancelled','rejected')),
 version integer not null default 1, idempotency_key uuid not null, submitted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,idempotency_key), check(ends_at>starts_at)
);
create table public.service_request_items (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.service_requests(id),
 service_id text not null references public.service_catalog(id), quantity integer not null check(quantity between 1 and 1000),
 requirements text not null default '' check(length(requirements)<=5000), unique(request_id,service_id)
);
create table public.service_proposals (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.service_requests(id),
 version integer not null, total_kzt numeric(14,2) not null check(total_kzt>=0), terms text not null check(length(trim(terms)) between 10 and 20000),
 volunteer_terms text not null default '', approved_by uuid not null references public.profiles(id),
 approved_at timestamptz not null default now(), accepted_by uuid references public.profiles(id), accepted_at timestamptz,
 superseded_at timestamptz, unique(request_id,version)
);
create table public.service_workstreams (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.service_requests(id),
 project_id uuid not null unique references public.projects(id),
 division text not null check(division in ('BSU','BSS','CB','SCN')), target_count integer not null check(target_count>0),
 status text not null default 'approved_to_staff' check(status in ('approved_to_staff','recruiting','partially_staffed','staffed','active','completed','blocked','cancelled')),
 unique(request_id,division)
);
create table public.service_audit_log (
 id bigint generated always as identity primary key, actor_id uuid references public.profiles(id),
 organization_id uuid references public.service_organizations(id), request_id uuid references public.service_requests(id),
 action text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create index service_members_user on public.service_organization_members(user_id);
create index service_requests_org on public.service_requests(organization_id,created_at desc);
create index service_audit_org on public.service_audit_log(organization_id,created_at desc);

create function scg_services_private.hq() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce(auth.jwt()->>'aal','')='aal2'
 and exists(select 1 from public.profiles where id=auth.uid() and role='FOUNDER' and status in ('активен','одобрено'))
$$;
create function scg_services_private.member(p_org uuid,p_write boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and status in ('активен','одобрено')) and exists(select 1 from public.service_organization_members m
 join public.service_organizations o on o.id=m.organization_id
 where m.organization_id=p_org and m.user_id=auth.uid() and m.revoked_at is null
 and o.status<>'suspended' and (not p_write or (m.authorized and m.role in ('owner','manager'))))
$$;
create function scg_services_private.request_access(p_request uuid) returns boolean language sql stable security definer set search_path='' as $$
 select scg_services_private.hq() or exists(select 1 from public.service_requests r where r.id=p_request and scg_services_private.member(r.organization_id))
$$;
revoke all on all functions in schema scg_services_private from public,anon;
grant execute on all functions in schema scg_services_private to authenticated;

alter table public.service_organizations enable row level security;
alter table public.service_organization_members enable row level security;
alter table public.service_catalog enable row level security;
alter table public.service_requests enable row level security;
alter table public.service_request_items enable row level security;
alter table public.service_proposals enable row level security;
alter table public.service_workstreams enable row level security;
alter table public.service_audit_log enable row level security;
-- Reads use RLS; no direct client mutations are granted.
grant select on public.service_catalog to anon,authenticated;
grant select on public.service_organizations,public.service_organization_members,public.service_requests,public.service_request_items,public.service_proposals,public.service_workstreams,public.service_audit_log to authenticated;
revoke insert,update,delete,truncate,references,trigger on public.service_organizations,public.service_organization_members,public.service_catalog,public.service_requests,public.service_request_items,public.service_proposals,public.service_workstreams,public.service_audit_log from anon,authenticated;
create policy catalog_read on public.service_catalog for select to anon,authenticated using(published);
create policy organization_read on public.service_organizations for select to authenticated using(scg_services_private.hq() or scg_services_private.member(id));
create policy membership_read on public.service_organization_members for select to authenticated using(scg_services_private.hq() or scg_services_private.member(organization_id));
create policy request_read on public.service_requests for select to authenticated using(scg_services_private.hq() or scg_services_private.member(organization_id));
create policy item_read on public.service_request_items for select to authenticated using(scg_services_private.request_access(request_id));
create policy proposal_read on public.service_proposals for select to authenticated using(scg_services_private.request_access(request_id));
create policy workstream_read on public.service_workstreams for select to authenticated using(scg_services_private.request_access(request_id));
create policy audit_read on public.service_audit_log for select to authenticated using(scg_services_private.hq() or scg_services_private.member(organization_id));

create function scg_services_private.command(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); oid uuid; rid uuid; req public.service_requests; org public.service_organizations;
 proposal public.service_proposals; entry jsonb; catalog public.service_catalog; result jsonb; is_hq boolean;
 stream record; pid uuid; notification_title text;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and status in ('активен','одобрено')) then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if p_data is null or jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>60000 then raise exception 'INVALID_PAYLOAD'; end if;
 is_hq:=scg_services_private.hq();
 if p_action='register_organization' then
  perform pg_advisory_xact_lock(hashtextextended(uid::text,1));
  if (select count(*) from public.service_organizations where created_by=uid)>9 then raise exception 'ORGANIZATION_LIMIT'; end if;
  insert into public.service_organizations(legal_name,legal_form,registration_id,city,created_by)
  values(trim(p_data->>'legal_name'),p_data->>'legal_form',p_data->>'registration_id',trim(p_data->>'city'),uid) returning id into oid;
  insert into public.service_organization_members values(oid,uid,'owner',false,null);
  result:=jsonb_build_object('id',oid,'status','pending');
 elsif p_action='review_organization' then
  if not is_hq then raise exception 'HQ_MFA_REQUIRED' using errcode='42501'; end if;
  oid:=(p_data->>'id')::uuid;
  if p_data->>'status' not in ('verified','needs_information','rejected','suspended') or length(trim(coalesce(p_data->>'reason','')))<5 then raise exception 'REVIEW_REASON_REQUIRED'; end if;
  select * into org from public.service_organizations where id=oid for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  update public.service_organizations set status=p_data->>'status',review_reason=p_data->>'reason',reviewed_by=uid,reviewed_at=now() where id=oid;
  -- Founder verifies both legal registration and this representative's authority.
  update public.service_organization_members set authorized=(p_data->>'status'='verified') where organization_id=oid and user_id=org.created_by;
  result:=jsonb_build_object('id',oid,'status',p_data->>'status');
 elsif p_action='save_request' then
  oid:=(p_data->>'organization_id')::uuid;
  select * into org from public.service_organizations where id=oid for share;
  if not scg_services_private.member(oid) or not exists(select 1 from public.service_organization_members where organization_id=oid and user_id=uid and role in ('owner','manager') and revoked_at is null) then raise exception 'ORGANIZATION_ACCESS_DENIED' using errcode='42501'; end if;
  if jsonb_typeof(p_data->'items') is distinct from 'array' then raise exception 'ITEMS_REQUIRED'; end if;
  if jsonb_array_length(p_data->'items') not between 1 and 30 then raise exception 'ITEMS_REQUIRED'; end if;
  if length(trim(coalesce(p_data->>'title','')))<3 or length(trim(coalesce(p_data->>'city','')))<2 or length(trim(coalesce(p_data->>'venue','')))<2 then raise exception 'EVENT_DETAILS_REQUIRED'; end if;
  -- Serialize all saves for the organization, including repeated idempotency keys.
  perform pg_advisory_xact_lock(hashtextextended(oid::text,0));
  select * into req from public.service_requests where organization_id=oid and idempotency_key=(p_data->>'idempotency_key')::uuid for update;
  if found then
   if req.status<>'draft' then raise exception 'REQUEST_LOCKED'; end if;
   if req.version is distinct from (p_data->>'version')::integer then raise exception 'VERSION_CONFLICT'; end if;
   rid:=req.id;
   update public.service_requests set title=trim(p_data->>'title'),city=trim(p_data->>'city'),venue=trim(p_data->>'venue'),starts_at=(p_data->>'starts_at')::timestamptz,ends_at=(p_data->>'ends_at')::timestamptz,brief=coalesce(p_data->>'brief',''),version=version+1,updated_at=now() where id=rid;
   delete from public.service_request_items where request_id=rid;
  else
   insert into public.service_requests(organization_id,created_by,title,city,venue,starts_at,ends_at,brief,idempotency_key)
   values(oid,uid,trim(p_data->>'title'),trim(p_data->>'city'),trim(p_data->>'venue'),(p_data->>'starts_at')::timestamptz,(p_data->>'ends_at')::timestamptz,coalesce(p_data->>'brief',''),(p_data->>'idempotency_key')::uuid) returning id into rid;
  end if;
  for entry in select value from jsonb_array_elements(p_data->'items') loop
   select * into catalog from public.service_catalog where id=entry->>'service_id' and published;
   if not found or (entry->>'quantity')::integer not between 1 and catalog.max_quantity then raise exception 'INVALID_SERVICE_QUANTITY'; end if;
   insert into public.service_request_items(request_id,service_id,quantity,requirements) values(rid,catalog.id,(entry->>'quantity')::integer,coalesce(entry->>'requirements',''));
  end loop;
  select jsonb_build_object('id',id,'version',version,'status',status) into result from public.service_requests where id=rid;
 elsif p_action in ('submit_request','issue_proposal','accept_proposal','confirm_request','cancel_request') then
  rid:=(p_data->>'id')::uuid;
  select * into req from public.service_requests where id=rid for update;
  if not found then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  oid:=req.organization_id;
  select * into org from public.service_organizations where id=oid for share;
  if p_action in ('issue_proposal','confirm_request') then
   if not is_hq then raise exception 'HQ_MFA_REQUIRED' using errcode='42501'; end if;
  elsif not scg_services_private.member(oid,true) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if org.status<>'verified' then raise exception 'ORGANIZATION_NOT_VERIFIED' using errcode='42501'; end if;
  if p_action='submit_request' then
   if req.status<>'draft' then return jsonb_build_object('id',rid,'status',req.status); end if;
   if not coalesce((p_data->>'terms_accepted')::boolean,false) then raise exception 'TERMS_REQUIRED'; end if;
   if not exists(select 1 from public.service_request_items where request_id=rid) or req.starts_at<=now() then raise exception 'INVALID_EVENT'; end if;
   update public.service_requests set status='submitted',submitted_at=now(),updated_at=now() where id=rid;
  elsif p_action='issue_proposal' then
   if req.status not in ('submitted','under_review','awaiting_acceptance') then raise exception 'INVALID_TRANSITION'; end if;
   if (p_data->>'expected_proposal_version')::integer is distinct from (select coalesce(max(version),0) from public.service_proposals where request_id=rid) then raise exception 'PROPOSAL_VERSION_CONFLICT'; end if;
   if exists(select 1 from public.service_request_items i join public.service_catalog c on c.id=i.service_id where i.request_id=rid and c.division='BSU') and length(trim(coalesce(p_data->>'volunteer_terms','')))<10 then raise exception 'VOLUNTEER_TERMS_REQUIRED'; end if;
   if not exists(select 1 from public.service_request_items i join public.service_catalog c on c.id=i.service_id where i.request_id=rid and c.division<>'BSU') and (p_data->>'total_kzt')::numeric<>0 then raise exception 'VOLUNTEERS_NOT_PAID_LABOUR'; end if;
   update public.service_proposals set superseded_at=now() where request_id=rid and superseded_at is null;
   insert into public.service_proposals(request_id,version,total_kzt,terms,volunteer_terms,approved_by)
   select rid,coalesce(max(version),0)+1,(p_data->>'total_kzt')::numeric,p_data->>'terms',coalesce(p_data->>'volunteer_terms',''),uid from public.service_proposals where request_id=rid returning * into proposal;
   update public.service_requests set status='awaiting_acceptance',updated_at=now() where id=rid;
  elsif p_action='accept_proposal' then
   if req.status<>'awaiting_acceptance' then raise exception 'INVALID_TRANSITION'; end if;
   if not coalesce((p_data->>'terms_accepted')::boolean,false) then raise exception 'TERMS_REQUIRED'; end if;
   select * into proposal from public.service_proposals where id=(p_data->>'proposal_id')::uuid and request_id=rid and superseded_at is null for update;
   if not found then raise exception 'PROPOSAL_SUPERSEDED'; end if;
   if proposal.accepted_at is not null then return jsonb_build_object('id',rid,'status',req.status); end if;
   update public.service_proposals set accepted_by=uid,accepted_at=now() where id=proposal.id;
  elsif p_action='confirm_request' then
   if req.status='confirmed' then return jsonb_build_object('id',rid,'status','confirmed'); end if;
   if req.status<>'awaiting_acceptance' or not exists(select 1 from public.service_proposals where id=(p_data->>'proposal_id')::uuid and request_id=rid and superseded_at is null and accepted_at is not null) then raise exception 'CLIENT_ACCEPTANCE_REQUIRED'; end if;
   -- Existing operational project engine, created as drafts: no public recruitment
   -- or participant notifications until a coordinator explicitly publishes them.
   for stream in select c.division,sum(i.quantity)::integer target_count from public.service_request_items i join public.service_catalog c on c.id=i.service_id where i.request_id=rid group by c.division loop
    insert into public.projects(title,description,location,event_date,status,created_by,department,volunteers_required,start_time,end_time)
    values(req.title||' · '||stream.division,'Комплектование направления заказа SCG Services.',req.city||' · '||req.venue,req.starts_at,'draft',uid,
      case stream.division when 'BSU' then 'UNION' when 'BSS' then 'STAFF' when 'CB' then 'PR' else 'CAST' end,
      stream.target_count,req.starts_at,req.ends_at) returning id into pid;
    insert into public.service_workstreams(request_id,project_id,division,target_count) values(rid,pid,stream.division,stream.target_count);
   end loop;
   update public.service_requests set status='confirmed',updated_at=now() where id=rid;
  else
   if req.status not in ('draft','submitted','under_review','awaiting_acceptance') then raise exception 'CANCELLATION_REVIEW_REQUIRED'; end if;
   update public.service_requests set status='cancelled',updated_at=now() where id=rid;
  end if;
  select jsonb_build_object('id',id,'status',status) into result from public.service_requests where id=rid;
 else raise exception 'UNKNOWN_ACTION'; end if;
 insert into public.service_audit_log(actor_id,organization_id,request_id,action,detail) values(uid,oid,rid,p_action,jsonb_build_object('result',result));
 if p_action in ('register_organization','submit_request','accept_proposal') then
  notification_title:=case p_action when 'register_organization' then 'SCG Services: организация на проверке' when 'submit_request' then 'SCG Services: новый запрос' else 'SCG Services: предложение принято' end;
  insert into public.notifications(user_id,title,body)
  select id,notification_title,'Откройте защищённую очередь SCG Services для рассмотрения.' from public.profiles where role='FOUNDER' and status in ('активен','одобрено');
 elsif p_action in ('review_organization','issue_proposal','confirm_request') then
  notification_title:=case p_action when 'review_organization' then 'SCG Services: обновлена проверка организации' when 'issue_proposal' then 'SCG Services: новое предложение' else 'SCG Services: заказ подтверждён' end;
  insert into public.notifications(user_id,title,body)
  select m.user_id,notification_title,'Откройте SCG Services, чтобы посмотреть решение и следующий шаг.' from public.service_organization_members m
  join public.profiles p on p.id=m.user_id where m.organization_id=oid and m.revoked_at is null and p.status in ('активен','одобрено');
 end if;
 return result;
end $$;
revoke all on function scg_services_private.command(text,jsonb) from public,anon;
grant execute on function scg_services_private.command(text,jsonb) to authenticated;
create function public.scg_services_command(p_action text,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$ select scg_services_private.command(p_action,p_data) $$;
revoke all on function public.scg_services_command(text,jsonb) from public,anon;
grant execute on function public.scg_services_command(text,jsonb) to authenticated;
commit;
