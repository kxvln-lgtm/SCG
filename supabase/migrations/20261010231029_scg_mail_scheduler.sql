begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;
create table scg_private.mail_invocations(
 token_hash text primary key,expires_at timestamptz not null,used_at timestamptz);
alter table scg_private.mail_invocations enable row level security;
revoke all on scg_private.mail_invocations from public,anon,authenticated,service_role;
create or replace function public.scg_consume_mail_invocation(p_token text)
returns boolean language plpgsql security definer set search_path=''
as $$ begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception using errcode='42501',message='SERVICE_REQUIRED';end if;
 if length(p_token)<>36 then return false;end if;
 update scg_private.mail_invocations set used_at=now()
 where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and used_at is null and expires_at>now();
 return found;
end; $$;
revoke all on function public.scg_consume_mail_invocation(text) from public,anon,authenticated;
grant execute on function public.scg_consume_mail_invocation(text) to service_role;
create or replace function scg_private.dispatch_mail()
returns bigint language plpgsql security definer set search_path=''
as $$ declare token text;request bigint;begin
 delete from scg_private.mail_invocations where expires_at<now()-interval '1 day';
 if not exists(select 1 from public.scg_email_outbox where (status='queued' or(status='sending' and claimed_at<now()-interval '10 minutes')) and available_at<=now() and attempts<5) then return null;end if;
 token:=gen_random_uuid()::text;
 insert into scg_private.mail_invocations(token_hash,expires_at) values(encode(sha256(convert_to(token,'UTF8')),'hex'),now()+interval '5 minutes');
 select net.http_post(
 url:='https://snmcoapfubdnvaoowjjk.supabase.co/functions/v1/scg-email',
 headers:=jsonb_build_object('Content-Type','application/json','apikey','sb_publishable_xUhRuWKpfJ58JEiHu4ygHw_44etd9SJ'),
 body:=jsonb_build_object('cron_token',token),
 timeout_milliseconds:=100000) into request;
 return request;
end; $$;
revoke all on function scg_private.dispatch_mail() from public,anon,authenticated,service_role;
select cron.schedule('scg-mail-queue','*/2 * * * *','select scg_private.dispatch_mail()');
-- Only the database owner may schedule jobs or issue arbitrary outbound requests.
revoke usage on schema cron,net from public,anon,authenticated;
revoke all on all tables in schema cron,net from public,anon,authenticated;
revoke execute on all functions in schema cron,net from public,anon,authenticated;
commit;
