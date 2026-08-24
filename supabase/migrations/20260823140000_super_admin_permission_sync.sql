begin;

create or replace function public.grant_new_permission_to_super_admin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.role_permissions (role_id, permission_id)
  select role.id, new.id
  from public.roles as role
  where role.slug = 'super_admin'
  on conflict (role_id, permission_id) do nothing;

  return new;
end;
$$;

revoke all on function public.grant_new_permission_to_super_admin() from public;

drop trigger if exists permissions_grant_super_admin on public.permissions;
create trigger permissions_grant_super_admin
after insert on public.permissions
for each row execute function public.grant_new_permission_to_super_admin();

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles as role
cross join public.permissions as permission
where role.slug = 'super_admin'
on conflict (role_id, permission_id) do nothing;

commit;
