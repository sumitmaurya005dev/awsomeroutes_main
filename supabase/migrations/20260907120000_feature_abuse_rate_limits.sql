-- Atomic per-feature throttling for authenticated expensive operations.
-- Browser roles cannot read or mutate this table or invoke the RPC directly.
create table if not exists public.feature_rate_limits (
  scope text not null check (scope ~ '^[a-z0-9:_-]{1,80}$'),
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, fingerprint)
);

create index if not exists feature_rate_limits_updated_at_idx
  on public.feature_rate_limits (updated_at);

alter table public.feature_rate_limits enable row level security;
alter table public.feature_rate_limits force row level security;
revoke all on table public.feature_rate_limits from public, anon, authenticated;
grant all on table public.feature_rate_limits to service_role;

create or replace function public.consume_feature_rate_limit(
  p_scope text,
  p_fingerprint text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rate_row public.feature_rate_limits%rowtype;
  elapsed_seconds integer;
begin
  if p_scope !~ '^[a-z0-9:_-]{1,80}$'
     or p_fingerprint !~ '^[a-f0-9]{64}$'
     or p_limit < 1 or p_limit > 10000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid feature rate-limit arguments.' using errcode = '22023';
  end if;

  delete from public.feature_rate_limits
  where updated_at < now() - interval '30 days';

  insert into public.feature_rate_limits (scope, fingerprint, request_count)
  values (p_scope, p_fingerprint, 0)
  on conflict (scope, fingerprint) do nothing;

  select * into rate_row
  from public.feature_rate_limits
  where scope = p_scope and fingerprint = p_fingerprint
  for update;

  elapsed_seconds := greatest(
    0,
    floor(extract(epoch from (now() - rate_row.window_started_at)))::integer
  );

  if elapsed_seconds >= p_window_seconds then
    update public.feature_rate_limits
    set window_started_at = now(), request_count = 1, updated_at = now()
    where scope = p_scope and fingerprint = p_fingerprint;
    return jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
  end if;

  if rate_row.request_count >= p_limit then
    return jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', greatest(1, p_window_seconds - elapsed_seconds)
    );
  end if;

  update public.feature_rate_limits
  set request_count = request_count + 1, updated_at = now()
  where scope = p_scope and fingerprint = p_fingerprint;
  return jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
end;
$$;

revoke all on function public.consume_feature_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_feature_rate_limit(text, text, integer, integer)
  to service_role;
