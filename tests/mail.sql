begin;
do $$
declare token text := gen_random_uuid()::text;
begin
 if has_function_privilege('anon','public.scg_consume_mail_invocation(text)','EXECUTE') or has_function_privilege('authenticated','public.scg_consume_mail_invocation(text)','EXECUTE') then raise exception 'Mail invocation exposed'; end if;
 insert into scg_private.mail_invocations(token_hash,expires_at) values(encode(sha256(convert_to(token,'UTF8')),'hex'),now()+interval '5 minutes');
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 if not public.scg_consume_mail_invocation(token) then raise exception 'Valid token rejected'; end if;
 if public.scg_consume_mail_invocation(token) then raise exception 'Replayed token accepted'; end if;
 if public.scg_consume_mail_invocation(gen_random_uuid()::text) then raise exception 'Unknown token accepted'; end if;
end $$;
select 'Mail nonce permissions, consumption and replay checks passed; fixtures rolled back' as result;
rollback;
