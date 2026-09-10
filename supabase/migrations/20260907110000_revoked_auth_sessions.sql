-- Application-level deny-list for already-issued Supabase access tokens.
-- Supabase global sign-out revokes refresh tokens; this table closes the short
-- access-token validity window for this admin portal immediately after logout.
create table if not exists public.revoked_auth_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  revoked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint revoked_auth_sessions_expiry_check check (expires_at > revoked_at)
);

create index if not exists revoked_auth_sessions_expiry_idx
  on public.revoked_auth_sessions (expires_at);

alter table public.revoked_auth_sessions enable row level security;
alter table public.revoked_auth_sessions force row level security;

revoke all on table public.revoked_auth_sessions from anon, authenticated;

create or replace function public.is_auth_session_revoked(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.revoked_auth_sessions revoked
    where revoked.session_id = p_session_id
      and revoked.user_id = auth.uid()
      and revoked.expires_at > now()
  );
$$;

revoke all on function public.is_auth_session_revoked(uuid) from public, anon;
grant execute on function public.is_auth_session_revoked(uuid) to authenticated;

