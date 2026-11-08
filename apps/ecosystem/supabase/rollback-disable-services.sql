-- Operational rollback: stop new writes while preserving all newly collected data.
-- Run only as the database owner if Services has been deployed and needs disabling.
-- Then restore the previous frontend release. No tables or existing data are deleted.
begin;
revoke execute on function public.scg_services_command(text,jsonb) from authenticated;
revoke execute on function scg_services_private.command(text,jsonb) from authenticated;
commit;
