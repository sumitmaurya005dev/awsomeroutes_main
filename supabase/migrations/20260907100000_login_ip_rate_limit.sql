-- Enforce the deployment requirement: at most five failed login attempts per
-- one-minute IP bucket. The application HMACs the raw IP before this RPC.
create or replace function public.record_login_attempt(
  p_fingerprint text,
  p_succeeded boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rate_row public.login_rate_limits%rowtype;
  next_count integer;
begin
  delete from public.login_rate_limits
  where updated_at < now() - interval '30 days';

  if p_succeeded then
    delete from public.login_rate_limits where fingerprint = p_fingerprint;
    return;
  end if;

  insert into public.login_rate_limits (fingerprint)
  values (p_fingerprint)
  on conflict (fingerprint) do nothing;

  select * into rate_row
  from public.login_rate_limits
  where fingerprint = p_fingerprint
  for update;

  if rate_row.window_started_at < now() - interval '1 minute' then
    next_count := 1;
    update public.login_rate_limits
    set failure_count = next_count,
        window_started_at = now(),
        blocked_until = null,
        updated_at = now()
    where fingerprint = p_fingerprint;
  else
    next_count := rate_row.failure_count + 1;
    update public.login_rate_limits
    set failure_count = next_count,
        blocked_until = case
          when next_count >= 5 then now() + interval '15 minutes'
          else blocked_until
        end,
        updated_at = now()
    where fingerprint = p_fingerprint;
  end if;
end;
$$;

revoke all on function public.record_login_attempt(text, boolean)
  from public, anon, authenticated;
grant execute on function public.record_login_attempt(text, boolean)
  to service_role;
